import logging

from app.models.analysis import LLMAnalysisResult
from app.models.nutrition import ImageDetailResult
from app.services.llm_service import vision_call, text_call

logger = logging.getLogger(__name__)


# ── Phase 1: Detailed Image Description ───────────────────────────

IMAGE_DETAIL_SYSTEM_PROMPT = (
    "Você é um analista visual especializado em alimentos e produtos alimentícios brasileiros. "
    "Sua tarefa é descrever detalhadamente uma foto de refeição para subsidiar cálculos nutricionais precisos. "
    "Foque em: textos visíveis, rótulos nutricionais, marcas, tamanhos relativos, embalagens, volumes e pesos indicados. "
    "NÃO tente calcular nutrientes — apenas descreva o que vê com o máximo de detalhe. "
    "Responda SEMPRE com JSON válido apenas, sem markdown, sem explicações."
)

IMAGE_DETAIL_USER_PROMPT = """Analise esta foto de refeição com foco em detalhes relevantes para cálculo nutricional.

Retorne um objeto JSON com exatamente estes campos:
{{
  "detailed_description": "Descrição rica e detalhada da imagem: aparência dos alimentos, cores, texturas, contexto visual, tipo de prato/embalagem, tamanho aparente das porções.",
  "visible_nutrition_info": [
    {{"product": "nome do produto", "nutrient": "nome do nutriente", "value": 30.0, "unit": "g", "context": "de onde veio a informação (ex: rótulo frontal, tabela nutricional)"}}
  ],
  "product_identifiers": [
    {{"name": "nome do produto completo", "brand": "marca se visível", "type": "tipo do produto (ex: suplemento proteico, refrigerante, iogurte)"}}
  ],
  "portion_context": "pistas visuais sobre tamanho/volume da porção"
}}

Ingredientes já identificados na refeição: {ingredients}

Regras:
- detailed_description: descreva tudo que vê — ambiente, prato, talheres, embalagens, tamanhos relativos. Seja específico sobre aparência dos alimentos (cor, textura, quantidade visual)
- visible_nutrition_info: APENAS informações nutricionais que você consegue LER na imagem (rótulos, tabelas nutricionais, textos na embalagem como "30g de proteína"). Se não há rótulos visíveis, retorne lista vazia []
- product_identifiers: marcas, nomes de produto e textos visíveis em embalagens. Se não há produtos identificáveis, retorne lista vazia []
- portion_context: descreva pistas visuais de tamanho — tipo de prato (raso, fundo, marmita), referências de escala (colher, garfo, garrafa de Xml), se a porção parece grande/média/pequena para um adulto

Retorne APENAS o objeto JSON."""

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
    "Use todas as pistas visuais disponíveis: tipo de prato, embalagem, referências de escala. "
    "Responda SEMPRE com JSON válido apenas, sem markdown, sem explicações."
)

PORTION_USER_PROMPT = """Analise esta foto de refeição e estime as porções dos ingredientes confirmados.

Ingredientes confirmados: {ingredients}

{image_context_block}

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
- Se há informações de volume/peso na embalagem (ex: garrafa de 500ml), use como referência direta
- Arredonde para múltiplos de 10g
- TODOS os ingredientes da lista devem ter uma estimativa

Regras para plate_composition:
- Agrupe ingredientes similares (ex: "arroz branco" e "feijão carioca" podem ser "Arroz e feijão")
- Cada grupo deve ter uma porcentagem visual no prato
- A soma das porcentagens deve ser exatamente 100
- Máximo 5 grupos — agrupe itens menores
- Use nomes curtos e descritivos para os labels

Retorne APENAS o objeto JSON."""


# ── Phase 4: Reconciliation & Validation ──────────────────────────

RECONCILIATION_SYSTEM_PROMPT = (
    "Você é um nutricionista senior brasileiro revisando cálculos nutricionais automatizados. "
    "Sua tarefa é verificar se os valores calculados são consistentes com o que a imagem mostra "
    "e corrigir inconsistências evidentes. "
    "Responda SEMPRE com JSON válido apenas, sem markdown, sem explicações."
)

RECONCILIATION_USER_PROMPT = """Revise os cálculos nutricionais abaixo e verifique consistência.

Descrição detalhada da imagem:
{detailed_description}

Informações nutricionais visíveis em rótulos/embalagens:
{visible_nutrition_info}

Produtos identificados:
{product_identifiers}

Ingredientes com cálculos atuais:
{ingredient_calculations}

Macronutrientes totais calculados:
{macro_totals}

Pense passo a passo:
1. Para cada ingrediente, os gramas estimados fazem sentido visual?
2. Se há rótulos visíveis com valores nutricionais, os cálculos correspondem?
3. Os macronutrientes totais fazem sentido para esse tipo de refeição?
4. Há inconsistências gritantes? (ex: bebida proteica com <10g proteína, refeição completa com 0 kcal)

Retorne um objeto JSON:
{{
  "adjustments": [
    {{
      "ingredient": "nome do ingrediente",
      "field": "nome do nutriente (ex: protein_g, energy_kcal)",
      "original_value": 0.0,
      "adjusted_value": 0.0,
      "reason": "justificativa em 1 frase",
      "source": "label" | "web_search" | "llm_estimate"
    }}
  ],
  "validation_notes": ["nota sobre a validação geral"],
  "overall_confidence": 0.0
}}

Regras:
- Se TODOS os valores parecem razoáveis, retorne adjustments vazio e confidence alta (>= 0.8)
- Só proponha ajustes quando houver evidência clara de inconsistência
- Para rótulos visíveis: SEMPRE prefira o valor do rótulo sobre o calculado
- overall_confidence: 0.0-1.0 refletindo confiança geral nos resultados finais

Retorne APENAS o objeto JSON."""


# ── Functions ─────────────────────────────────────────────────────


async def extract_image_detail(
    image_bytes: bytes,
    media_type: str,
    ingredients: list[str],
) -> ImageDetailResult:
    """Extract detailed description, visible labels, and product identifiers from meal photo."""
    prompt = IMAGE_DETAIL_USER_PROMPT.format(ingredients=", ".join(ingredients))
    try:
        data = await vision_call(image_bytes, media_type, IMAGE_DETAIL_SYSTEM_PROMPT, prompt)
        return ImageDetailResult(**data)
    except Exception as exc:
        logger.error("Image detail extraction failed: %s", exc)
        return ImageDetailResult()


async def estimate_portions(
    image_bytes: bytes,
    media_type: str,
    ingredients: list[str],
    image_detail: ImageDetailResult | None = None,
) -> dict:
    """Estimate portion sizes (grams) and plate composition from meal photo."""
    context_block = ""
    if image_detail and (image_detail.detailed_description or image_detail.portion_context):
        parts = []
        if image_detail.portion_context:
            parts.append(f"Pistas de porção: {image_detail.portion_context}")
        if image_detail.detailed_description:
            parts.append(f"Contexto visual: {image_detail.detailed_description[:500]}")
        context_block = "Contexto adicional da imagem:\n" + "\n".join(parts)

    prompt = PORTION_USER_PROMPT.format(
        ingredients=", ".join(ingredients),
        image_context_block=context_block,
    )
    try:
        return await vision_call(image_bytes, media_type, PORTION_SYSTEM_PROMPT, prompt)
    except Exception as exc:
        logger.error("Portion estimation failed: %s", exc)
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


async def reconcile_nutrition(
    detailed_description: str,
    visible_nutrition_info: list[dict],
    product_identifiers: list[dict],
    ingredient_calculations: list[dict],
    macro_totals: dict,
) -> dict:
    """Cross-check computed nutrition against image evidence and propose adjustments."""
    import json
    prompt = RECONCILIATION_USER_PROMPT.format(
        detailed_description=detailed_description or "Não disponível",
        visible_nutrition_info=json.dumps(visible_nutrition_info, ensure_ascii=False) if visible_nutrition_info else "Nenhum rótulo visível",
        product_identifiers=json.dumps(product_identifiers, ensure_ascii=False) if product_identifiers else "Nenhum produto identificado",
        ingredient_calculations=json.dumps(ingredient_calculations, ensure_ascii=False),
        macro_totals=json.dumps(macro_totals, ensure_ascii=False),
    )
    try:
        return await text_call(RECONCILIATION_SYSTEM_PROMPT, prompt, max_tokens=1024)
    except Exception as exc:
        logger.error("Nutrition reconciliation failed: %s", exc)
        return {"adjustments": [], "validation_notes": [], "overall_confidence": 0.5}


async def analyze_meal_image(image_bytes: bytes, media_type: str = "image/jpeg") -> LLMAnalysisResult:
    try:
        data = await vision_call(image_bytes, media_type, SYSTEM_PROMPT, USER_PROMPT)
        return LLMAnalysisResult(**data)
    except Exception as exc:
        logger.error("All LLM providers failed for meal analysis: %s", exc)
        return LLMAnalysisResult()
