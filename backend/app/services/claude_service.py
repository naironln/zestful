import logging

from app.models.analysis import LLMAnalysisResult
from app.services.llm_service import vision_call, text_call

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "Você é um assistente especializado em análise visual de refeições para o contexto brasileiro. "
    "Seu objetivo é identificar APENAS os alimentos visíveis na foto — nunca infira ingredientes "
    "com base na receita típica do prato. Se não consegue ver, não inclua. "
    "Use a Tabela Brasileira de Composição de Alimentos (TACO) como referência de nomenclatura. "
    "Responda SEMPRE com JSON válido apenas, sem markdown, sem explicações."
)

USER_PROMPT = """Analise esta foto de refeição e retorne um objeto JSON com exatamente estes campos:
{
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "dish_name": "nome do prato em português (máx 60 caracteres)",
  "cuisine_origin": "brasileira" | "italiana" | "japonesa" | "árabe" | "americana" | "mexicana" | "chinesa" | "francesa" | "portuguesa" | "outra",
  "ingredients": ["ingrediente1", "ingrediente2", ...],
  "confidence": 0.0-1.0,
  "has_vegetables": true | false,
  "is_fruit": true | false,
  "is_dessert": true | false,
  "is_ultra_processed": true | false,
  "has_protein": true | false,
  "meal_source": "homemade" | "restaurant" | "delivery" | null
}

meal_type (mantenha os valores em inglês):
- "breakfast": café da manhã — pão, frutas, ovos, tapioca, iogurte, mingau
- "lunch": almoço — arroz, feijão, carne, salada, prato quente
- "dinner": jantar — prato quente em contexto noturno
- "snack": lanche, salgado, petisco, sobremesa, fruta isolada

dish_name: como um brasileiro descreveria o prato (ex: "Arroz com feijão e frango grelhado", "Coxinha de frango", "Spaghetti à bolonhesa")

cuisine_origin: origem culinária predominante do prato; use "brasileira" quando ambíguo com influência brasileira

ingredients — REGRA PRINCIPAL: liste SOMENTE o que você consegue ver ou identificar com certeza na foto:
- PROIBIDO inferir ingredientes com base na receita típica do prato — só inclua o que está visível
- Se não consegue distinguir visualmente, NÃO inclua
- Seja específico no que vê: "feijão carioca" não "feijão", "frango peito" não "frango", "arroz branco" não "arroz"
- Nomes regionais brasileiros quando identificável: "feijão fradinho", "farinha de mandioca", "couve manteiga", "linguiça calabresa"
- Para ingredientes internacionais sem tradução consolidada no Brasil, mantenha em inglês (ex: "cream cheese", "pulled pork")
- NÃO inclua sal, pimenta preta, água, óleo ou qualquer tempero invisível
- Máximo 10 ingredientes; prefira menos com certeza a mais com dúvida

has_vegetables: true se houver verduras, legumes ou salada visíveis (folhas, tomate, cenoura, brócolis, etc.)

is_fruit: true se a refeição for composta principalmente por fruta(s) — fruta isolada ou salada de frutas

is_dessert: true APENAS para doces e sobremesas propriamente ditos — chocolate, bolo, torta, sorvete, pudim, mousse, brigadeiro, bolacha/biscoito doce, brownie, açaí com cobertura doce. NÃO considere como doce: barra de proteína, iogurte natural, granola, barra de cereal, frutas in natura

is_ultra_processed: true APENAS para ultraprocessados (classificação NOVA grupo 4) — refrigerante, salgadinho de pacote, nuggets, biscoito recheado, embutidos (salsicha, presunto), macarrão instantâneo, sorvete industrializado, fast-food industrializado. NÃO considere ultraprocessado: alimentos apenas processados como queijo, pão artesanal, conservas simples, manteiga

has_protein: true se houver fonte proteica visível — carne vermelha, frango, peixe, ovos, leguminosas (feijão, lentilha, grão-de-bico), tofu

meal_source: identifique a origem da refeição — um dos três valores ou null:
- "homemade": refeição aparenta ser caseira/feita em casa — prato comum, panela, travessa, cozinha doméstica visível
- "restaurant": refeição aparenta ser de restaurante — prato decorado, apresentação profissional, ambiente de restaurante visível, buffet/self-service
- "delivery": refeição aparenta ser de delivery — embalagem descartável, marmita, caixa de papelão, sacola, embalagem de isopor/plástico
- null: quando a origem não se aplica ou não é identificável — fruta isolada, alimento avulso sem contexto de preparo, bebida simples
Na dúvida entre restaurante e delivery, observe a embalagem

Retorne APENAS o objeto JSON."""


CORRECTION_SYSTEM_PROMPT = (
    "Você é um assistente de análise de refeições. Uma refeição foi identificada por IA e o usuário "
    "quer corrigir a identificação em linguagem natural. Aplique apenas as correções mencionadas, "
    "mantendo o restante da análise original. "
    "Responda SEMPRE com JSON válido apenas, sem markdown, sem explicações."
)


NUTRITION_FLAGS_RULES = (
    "has_vegetables: true se houver verduras, legumes ou salada (folhas, tomate, cenoura, brócolis, etc.)\n"
    "is_fruit: true se a refeição for composta principalmente por fruta(s)\n"
    "is_dessert: true APENAS para doces/sobremesas (chocolate, bolo, sorvete, pudim, biscoito doce). "
    "NÃO é doce: barra de proteína, iogurte natural, granola, frutas in natura\n"
    "is_ultra_processed: true APENAS para ultraprocessados NOVA grupo 4 (refrigerante, salgadinho, nuggets, "
    "biscoito recheado, embutidos, macarrão instantâneo). NÃO é ultraprocessado: queijo, pão artesanal, conservas\n"
    "has_protein: true se houver fonte proteica (carne, frango, peixe, ovos, feijão, lentilha, tofu)\n"
    'meal_source: "homemade" se caseiro, "restaurant" se restaurante, "delivery" se delivery/marmita, null se não se aplica (fruta avulsa, alimento sem contexto de preparo)'
)


async def correct_meal_analysis(
    dish_name: str,
    ingredients: list[str],
    correction: str,
    cuisine_origin: str = "brasileira",
) -> dict:
    """Apply a natural language correction to an existing meal analysis."""
    prompt = (
        f"Prato identificado: \"{dish_name}\"\n"
        f"Ingredientes identificados: {', '.join(ingredients)}\n"
        f"Origem culinária: {cuisine_origin}\n\n"
        f"Correção do usuário: \"{correction}\"\n\n"
        "Aplique a correção e retorne o JSON atualizado:\n"
        "{\n"
        "  \"dish_name\": \"nome corrigido\",\n"
        "  \"ingredients\": [\"ingrediente1\", \"ingrediente2\", ...],\n"
        "  \"has_vegetables\": true | false,\n"
        "  \"is_fruit\": true | false,\n"
        "  \"is_dessert\": true | false,\n"
        "  \"is_ultra_processed\": true | false,\n"
        "  \"has_protein\": true | false,\n"
        "  \"meal_source\": \"homemade\" | \"restaurant\" | \"delivery\" | null\n"
        "}\n\n"
        "Regras:\n"
        "- Mantenha ingredientes não mencionados na correção\n"
        "- Remova ingredientes que o usuário disse que não existem\n"
        "- Adicione ingredientes que o usuário mencionou\n"
        "- Use nomes específicos em português (ex: \"feijão carioca\", \"frango peito\")\n"
        "- Para ingredientes internacionais sem tradução no Brasil, mantenha em inglês\n"
        "- Reavalie os flags com base nos ingredientes/prato APÓS a correção:\n"
        f"{NUTRITION_FLAGS_RULES}\n"
        "- Retorne APENAS o JSON"
    )
    try:
        return await text_call(CORRECTION_SYSTEM_PROMPT, prompt, max_tokens=512)
    except Exception as exc:
        logger.error("Correction LLM call failed: %s", exc)
        return {"dish_name": dish_name, "ingredients": ingredients}


PORTION_SYSTEM_PROMPT = (
    "Você é um nutricionista brasileiro especialista em estimativa visual de porções alimentares. "
    "Dado uma foto de refeição e uma lista de ingredientes já confirmados, estime a quantidade "
    "em gramas de cada ingrediente visível no prato e a proporção visual de cada grupo alimentar. "
    "Responda SEMPRE com JSON válido apenas, sem markdown, sem explicações."
)

PORTION_USER_PROMPT = """Analise esta foto de refeição e estime as porções dos ingredientes confirmados.

Ingredientes confirmados: {ingredients}

Retorne um objeto JSON com exatamente estes campos:
{{
  "portions": [
    {{"ingredient": "nome do ingrediente", "grams": <int estimado>}},
    ...
  ],
  "plate_composition": [
    {{"label": "grupo descritivo (ex: Arroz, Salada, Carne)", "percentage": <int 0-100>}},
    ...
  ]
}}

Regras para portions:
- Estime as gramas de cada ingrediente baseado no TAMANHO VISUAL no prato
- Use referências visuais: um prato padrão tem ~24cm de diâmetro
- Porções típicas brasileiras como referência: arroz ~150g, feijão ~80g, carne ~120g, salada ~50g
- Se o prato parece ter mais ou menos que o típico, ajuste proporcionalmente
- Arredonde para múltiplos de 10g
- TODOS os ingredientes da lista devem ter uma estimativa

Regras para plate_composition:
- Agrupe ingredientes similares (ex: "arroz branco" e "feijão carioca" podem ser "Arroz e feijão")
- Cada grupo deve ter uma porcentagem visual no prato
- A soma das porcentagens deve ser exatamente 100
- Máximo 5 grupos — agrupe itens menores
- Use nomes curtos e descritivos para os labels

Retorne APENAS o objeto JSON."""


async def estimate_portions(
    image_bytes: bytes,
    media_type: str,
    ingredients: list[str],
) -> dict:
    """Estimate portion sizes (grams) and plate composition from meal photo."""
    prompt = PORTION_USER_PROMPT.format(ingredients=", ".join(ingredients))
    try:
        return await vision_call(image_bytes, media_type, PORTION_SYSTEM_PROMPT, prompt)
    except Exception as exc:
        logger.error("Portion estimation failed: %s", exc)
        # Fallback: distribute equally with default 100g each
        n = len(ingredients)
        pct = 100 // max(n, 1)
        remainder = 100 - pct * n
        return {
            "portions": [
                {"ingredient": ing, "grams": 100} for ing in ingredients
            ],
            "plate_composition": [
                {"label": ing, "percentage": pct + (1 if i < remainder else 0)}
                for i, ing in enumerate(ingredients)
            ],
        }


async def analyze_meal_image(image_bytes: bytes, media_type: str = "image/jpeg") -> LLMAnalysisResult:
    try:
        data = await vision_call(image_bytes, media_type, SYSTEM_PROMPT, USER_PROMPT)
        return LLMAnalysisResult(**data)
    except Exception as exc:
        logger.error("All LLM providers failed for meal analysis: %s", exc)
        return LLMAnalysisResult()
