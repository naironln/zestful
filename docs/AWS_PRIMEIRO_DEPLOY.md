# Primeiro deploy na AWS + publicar no GitHub (Zestful)

Este guia cobre **duas frentes**: colocar o código no **GitHub** e fazer o **primeiro deploy** na **AWS** usando **EC2 + Docker Compose**, alinhado ao `docker-compose.prod.yml` deste repositório.

Arquitetura desse deploy: **uma instância EC2** roda **Neo4j**, **API FastAPI** e **frontend estático com nginx**. O nginx expõe a porta **80**, serve o React e encaminha chamadas **`/api/...`** para o backend (mesma origem no navegador, sem CORS extra para o fluxo principal).

---

## Parte 1 — Enviar o projeto para o GitHub

### 1.1 Pré-requisitos

- Conta no [GitHub](https://github.com).
- Git instalado na sua máquina (`git --version`).

### 1.2 Criar o repositório vazio no GitHub

1. Acesse **GitHub → New repository**.
2. Escolha um nome (ex.: `zestful`).
3. Deixe **público** ou **privado**, conforme preferir.
4. **Não** marque “Add a README” se você já tem projeto local (evita conflito no primeiro push).
5. Crie o repositório e copie a URL **HTTPS** ou **SSH** (ex.: `https://github.com/SEU_USUARIO/zestful.git`).

### 1.3 Conectar o projeto local e enviar

No diretório raiz do projeto (`zestful/`):

```bash
git status
```

Se ainda não houver commits:

```bash
git add .
git commit -m "Initial commit"
```

Adicione o remoto (troque pela sua URL):

```bash
git remote add origin https://github.com/SEU_USUARIO/zestful.git
```

Envie a branch principal (ajuste o nome se a sua for `master`):

```bash
git branch -M main
git push -u origin main
```

**Importante:** o arquivo `.env` com segredos **não** deve ir para o GitHub. Ele já está no `.gitignore`. Use sempre o `.env.example` como modelo e documente apenas variáveis **sem** valores secretos.

### 1.4 SSH (opcional, recomendado)

Para não digitar senha a cada `git push`:

1. Gere uma chave: `ssh-keygen -t ed25519 -C "seu-email@exemplo.com"`.
2. No GitHub: **Settings → SSH and GPG keys → New SSH key**, cole o conteúdo de `~/.ssh/id_ed25519.pub`.
3. Troque o remoto: `git remote set-url origin git@github.com:SEU_USUARIO/zestful.git`.

---

## Parte 2 — Primeiro deploy na AWS (EC2 + Docker)

### 2.1 O que você vai criar na AWS

| Item | Função |
|------|--------|
| **EC2** | Servidor Linux onde rodam os containers |
| **Security Group** | Liberar SSH (22) e HTTP (80); HTTPS (443) quando tiver TLS |
| **Elastic IP** (opcional) | IP fixo para não mudar após reiniciar a instância |
| **Par de chaves (.pem)** | Acesso SSH sem senha |

Banco **Neo4j** roda **no mesmo host** em rede Docker interna (portas Bolt/HTTP do Neo4j **não** precisam ficar abertas na internet se só os containers conversam entre si).

### 2.2 Criar a instância EC2

1. Console AWS → **EC2** → **Launch instance**.
2. **Nome**: ex. `zestful-prod`.
3. **AMI**: **Ubuntu Server 22.04 LTS** (ou 24.04).
4. **Tipo**: para testes, `t3.small` ou `t3.medium` (Neo4j + API + nginx consomem RAM; `t3.micro` pode apertar).
5. **Key pair**: crie ou escolha um par; baixe o `.pem` e guarde com permissão restrita: `chmod 400 sua-chave.pem`.
6. **Network settings** → Security group:
   - **SSH (22)** — origem: seu IP (`Meu IP`) ou rede confiável.
   - **HTTP (80)** — origem `0.0.0.0/0` para o site abrir na web (depois restrinja se quiser).
7. **Storage**: mínimo **20–30 GiB** gp3 (Neo4j + imagens de refeições crescem com o tempo).
8. **Launch instance**.

**Elastic IP (recomendado):** EC2 → **Elastic IPs** → Allocate → Associate com a instância. Anote o IP ou o domínio que apontará para ele.

### 2.3 Instalar Docker na EC2

Conecte por SSH (troque usuário/IP/chave; Ubuntu costuma ser `ubuntu@`):

```bash
ssh -i /caminho/sua-chave.pem ubuntu@SEU_IP_ELASTICO
```

Instale Docker e o plugin Compose (Ubuntu):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Saia e entre de novo no SSH (ou `newgrp docker`) para o grupo `docker` valer.

### 2.4 Trazer o código para a EC2

**Opção A — `git clone` (recomendado após o push no GitHub):**

```bash
sudo mkdir -p /opt/zestful
sudo chown ubuntu:ubuntu /opt/zestful
cd /opt/zestful
git clone https://github.com/SEU_USUARIO/zestful.git .
```

**Opção B — `scp` da sua máquina** (se ainda não usar Git na EC2):

```bash
scp -i sua-chave.pem -r /caminho/local/zestful ubuntu@SEU_IP:/opt/zestful
```

### 2.5 Arquivo `.env` na EC2

Na raiz do projeto (onde está `docker-compose.prod.yml`):

```bash
cd /opt/zestful
cp .env.example .env
nano .env
```

Ajuste no mínimo:

| Variável | Observação |
|----------|------------|
| `NEO4J_PASSWORD` | Senha forte; a mesma é referenciada pelo Compose para o serviço Neo4j. |
| `NEO4J_URI` | **No Compose de produção** o backend recebe `NEO4J_URI=bolt://neo4j:7687` por `environment` — pode **comentar** ou remover `NEO4J_URI` do `.env` na EC2 para não sobrescrever, ou deixe coerente com o compose. |
| `JWT_SECRET_KEY` | String longa e aleatória (não reutilize o exemplo). |
| `ANTHROPIC_API_KEY` | Se a API usar Claude. |
| `CORS_ORIGINS` | Se no futuro o frontend estiver em **outro domínio** que o da API, liste as origens HTTPS separadas por vírgula. Com o `docker-compose.prod.yml` atual (tudo no mesmo host via `/api`), o navegador fala só com o nginx; ainda assim você pode definir `CORS_ORIGINS=https://SEU_DOMINIO` quando usar domínio próprio. |

O backend lê `CORS_ORIGINS` (origens separadas por vírgula). Em desenvolvimento local, o padrão no código continua sendo `localhost:5173` e `localhost:3000`.

### 2.6 Subir a aplicação

```bash
cd /opt/zestful
docker compose -f docker-compose.prod.yml up -d --build
```

Verifique:

```bash
docker compose -f docker-compose.prod.yml ps
curl -s http://localhost/health
```

(`/health` no backend fica acessível como `http://SEU_IP/api/health` por causa do proxy.)

No navegador: `http://SEU_IP` (ou `http://SEU_DOMINIO` se o DNS já apontar para a EC2).

### 2.7 Atualizar depois de mudanças no código

```bash
cd /opt/zestful
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### 2.8 HTTPS e domínio (próximo passo)

Este primeiro deploy usa **HTTP na porta 80**. Para HTTPS:

- **Simples:** domínio na R53 (ou outro DNS) apontando para a EC2 + **Caddy** ou **nginx** no host com **Let’s Encrypt** na frente do container (terminação TLS na porta 443 e proxy para `127.0.0.1:80`), **ou**
- **Mais “AWS”:** **Application Load Balancer** com certificado no **ACM** e target group na instância.

Ajuste `CORS_ORIGINS` para `https://seudominio.com` quando o front for servido nesse domínio.

### 2.9 Custos e boas práticas

- Monitore **Billing** e alarmes no CloudWatch.
- Mantenha o security group com **22** restrito ao seu IP quando possível.
- Faça **backup** dos volumes Docker (Neo4j + `meal_images`) ou migre mídia para S3 em evoluções futuras.
- **Secrets:** prefira **AWS Secrets Manager** ou **SSM Parameter Store** em vez de `.env` em disco em cenários mais maduros.

---

## Referência rápida — arquivos deste repositório

| Arquivo | Uso |
|---------|-----|
| `docker-compose.prod.yml` | Orquestra Neo4j + backend + frontend (nginx na porta 80). |
| `frontend/Dockerfile.prod` | Build do Vite + nginx. |
| `frontend/nginx.prod.conf` | SPA + `proxy_pass` de `/api/` para o backend. |
| `.env.example` | Modelo de variáveis (sem segredos reais). |

Desenvolvimento local continua com `docker-compose.yml` e `frontend/Dockerfile` (modo dev Vite).

---

## Checklist final

- [ ] Repositório criado no GitHub e `git push` feito.
- [ ] `.env` **nunca** commitado.
- [ ] EC2 com Docker + compose plugin.
- [ ] Security group: 22 (seu IP), 80 (0.0.0.0/0 ou restrito).
- [ ] `.env` na EC2 com `NEO4J_PASSWORD`, `JWT_SECRET_KEY` e chaves de IA.
- [ ] `docker compose -f docker-compose.prod.yml up -d --build`.
- [ ] Site abre em `http://SEU_IP` e login/registro funcionam.

Se algo falhar, veja logs: `docker compose -f docker-compose.prod.yml logs -f backend`.
