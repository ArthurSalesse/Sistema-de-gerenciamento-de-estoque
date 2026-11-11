# Sistema de gerenciamento de estoque

Monorepo com **backend** em Node.js (Express), **frontend** em React (Vite) e banco
**PostgreSQL** (migrations com Knex).

```
.
├── backend/            # API Node.js + Express
│   ├── src/
│   │   ├── app.js      # Criação do app e rotas
│   │   ├── server.js   # Inicialização do servidor
│   │   ├── storage/    # Serviço de armazenamento de imagens
│   │   ├── middlewares/
│   │   └── database/
│   │       ├── connection.js
│   │       ├── migrations/
│   │       └── seeds/
│   ├── test/           # Testes (node:test)
│   ├── knexfile.js     # Configuração do Knex (banco, migrations, seeds)
│   └── Dockerfile
├── frontend/           # React + Vite
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml
├── .env.example        # Variáveis de ambiente necessárias
├── .prettierrc         # Padrão de formatação (compartilhado)
└── .editorconfig
```

## Pré-requisitos

- **Com Docker:** [Docker](https://docs.docker.com/get-docker/) com Docker Compose v2
- **Sem Docker:** [Node.js](https://nodejs.org/) 22.9 ou superior (recomendado: 24 LTS) e um
  PostgreSQL acessível (dá para subir só o banco com `docker compose up -d db`)

## Passo a passo

### 1. Clonar e configurar as variáveis de ambiente

```bash
git clone https://github.com/ArthurSalesse/Sistema-de-gerenciamento-de-estoque.git
cd Sistema-de-gerenciamento-de-estoque
cp .env.example .env
```

Os valores padrão do `.env.example` funcionam para desenvolvimento local, exceto o
`JWT_SECRET`, que deve ser trocado por um valor aleatório (o backend não sobe sem ele):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 2a. Rodar com Docker (recomendado)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/health
- Banco: `localhost:5432` (usuário, senha e nome do banco no `.env`)

O backend aplica as migrations pendentes sozinho ao subir. Para popular o banco com dados de
teste, com os containers rodando:

```bash
docker compose exec backend npm run db:seed
```

O código é montado como volume, então alterações nos arquivos recarregam automaticamente.
Para parar: `Ctrl+C` ou `docker compose down`. Para apagar também os dados do banco:
`docker compose down -v`.

> Se alguma dependência mudar (ex.: depois de um `git pull`), suba com
> `docker compose up --build --renew-anon-volumes`. Sem essa flag o container reaproveita o
> `node_modules` antigo e quebra com erros como `knex: not found`.

### 2b. Rodar sem Docker

Em um terminal, o banco e o backend:

```bash
docker compose up -d db
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Em outro terminal, o frontend:

```bash
cd frontend
npm install
npm run dev
```

### 3. Verificar

```bash
curl -i http://localhost:3000/health
```

Deve retornar `HTTP/1.1 200 OK` com `{"status":"ok",...}`. A página inicial do frontend
mostra o status da API como **online**.

## Banco de dados

```
usuarios  id, nome, email (único), senha_hash, criado_em
roupas    id, usuario_id → usuarios, nome, quantidade (>= 0), valor (decimal 10,2),
          imagem_url, criado_em, atualizado_em, excluido_em (nulo = roupa ativa)
vendas    id, roupa_id → roupas, usuario_id → usuarios, quantidade (> 0),
          valor_unitario (decimal 10,2), vendido_em
```

- As restrições ficam no próprio banco (`CHECK`, `UNIQUE` e chaves estrangeiras), então valem
  mesmo que algum código esqueça de validar.
- Índices: `usuarios.email` (único), `roupas.usuario_id` e `vendas (usuario_id, vendido_em)`,
  que é a base das consultas de vendas por dia e por mês do dashboard.
- `vendas.valor_unitario` guarda o preço no momento da venda: mudar o preço da roupa depois não
  altera o histórico.
- As chaves estrangeiras usam `ON DELETE RESTRICT`. Para "excluir" uma roupa preencha
  `excluido_em` (soft delete), assim as vendas antigas continuam válidas.

### Imagens das roupas

As imagens passam pelo serviço em `backend/src/storage/`, que tem só duas operações:

```js
import { storage } from './storage/index.js';

const { url } = await storage.save(req.imagem); // salva e devolve a URL pública
await storage.remove(url); // apaga (aceita URL ou key; não falha se já não existir)
```

- **Validação** (`middlewares/upload-imagem.js`): aceita só JPG, PNG e WEBP, identificados
  pelos bytes do arquivo (não pela extensão), com no máximo 5 MB. Fora disso a API responde
  `415` ou `413` com `{ "erro": "<mensagem>" }`.
- **Nome do arquivo:** sempre um UUID gerado no servidor (`<uuid>.png`), nunca o nome original.
- **Acesso:** com o driver local, os arquivos ficam em `backend/uploads/` (fora do git) e são
  servidos em `http://localhost:3000/uploads/<arquivo>`.
- **Remoção:** use `storage.remove(url)` ao trocar a imagem de uma roupa e quando um cadastro
  falhar depois de a imagem já ter sido salva.
- **Trocar para nuvem:** crie um driver (ex.: `storage/s3-storage.js`) com `save` e `remove`,
  registre-o em `storage/index.js` e mude `STORAGE_DRIVER`. O resto do código não muda.

Uso numa rota (formulário `multipart/form-data` com o campo `imagem`):

```js
router.post('/roupas', uploadImagem('imagem'), async (req, res) => {
  const imagem = req.imagem && (await storage.save(req.imagem));
  try {
    // ... insere a roupa com imagem_url: imagem?.url
  } catch (erro) {
    await storage.remove(imagem?.url); // não deixa arquivo órfão
    throw erro;
  }
});
```

### Usuário de teste (seed)

| E-mail              | Senha      |
| ------------------- | ---------- |
| `teste@estoque.com` | `senha123` |

O seed cria esse usuário, 5 roupas (uma delas sem estoque) e 15 vendas espalhadas pelos últimos
~3 meses, com datas relativas ao dia em que o seed roda. Ele **apaga todos os dados** das três
tabelas antes de inserir, então use só em desenvolvimento.

## API

Erros sempre seguem o formato `{ "erro": "<mensagem>" }`. Em erros de validação (`400`) vem
também `campos`, com uma mensagem por campo.

### `POST /auth/cadastro`

Cria a conta de um lojista.

```json
{ "nome": "Maria", "email": "maria@loja.com", "senha": "********" }
```

| Campo   | Regras                                                                    |
| ------- | ------------------------------------------------------------------------- |
| `nome`  | Obrigatório, até 120 caracteres                                           |
| `email` | Obrigatório, formato válido; salvo em minúsculas e sem espaços nas pontas |
| `senha` | Obrigatória, de 8 a 72 caracteres; salva só como hash bcrypt              |

| Status | Quando                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `201`  | Conta criada. Retorna `{ id, nome, email, criado_em }` (nunca a senha)                                      |
| `400`  | Validação falhou. Ex.: `{ "erro": "Dados inválidos.", "campos": { "email": "Informe um e-mail válido." } }` |
| `409`  | E-mail já cadastrado (a comparação ignora maiúsculas e espaços)                                             |

### `POST /auth/login`

Autentica o lojista e devolve um token JWT.

```json
{ "email": "maria@loja.com", "senha": "********" }
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": { "id": 1, "nome": "Maria", "email": "maria@loja.com" }
}
```

| Status | Quando                                                                                             |
| ------ | -------------------------------------------------------------------------------------------------- |
| `200`  | Credenciais corretas                                                                               |
| `400`  | E-mail ou senha não enviados (com `campos`)                                                        |
| `401`  | `{ "erro": "E-mail ou senha inválidos." }`, tanto para e-mail inexistente quanto para senha errada |

O token é assinado (HS256) com `JWT_SECRET`, traz o id do usuário em `sub` e expira em
`JWT_EXPIRES_IN` (padrão `8h`). Envie-o nas próximas requisições no cabeçalho
`Authorization: Bearer <token>`.

### `GET /auth/me` 🔒

Retorna o usuário logado: `{ id, nome, email, criado_em }`.

### Rotas protegidas 🔒

`/auth/me`, `/roupas`, `/vendas` e `/dashboard` (e tudo abaixo delas) exigem o cabeçalho:

```
Authorization: Bearer <token>
```

Sem token, com token inválido/adulterado ou expirado, a API responde `401` com o cabeçalho
`WWW-Authenticate: Bearer` e uma mensagem em `erro` (ex.: `"Sessão expirada. Faça login
novamente."`). O frontend pode tratar qualquer `401` mandando o usuário para o login.

Para novas rotas, o middleware `autenticar` (`src/middlewares/autenticar.js`) deixa o usuário em
`req.usuario.id`. **Toda consulta deve filtrar por esse id**, para cada lojista ver só os
próprios dados:

```js
const roupas = await db('roupas').where({ usuario_id: req.usuario.id, excluido_em: null });
```

Rotas que não existem respondem `404` com `{ "erro": "Rota não encontrada." }`.

## Testes

Os testes de rotas que usam o banco rodam num banco separado, `<POSTGRES_DB>_test`, criado e
migrado automaticamente; os dados de desenvolvimento não são tocados. O Postgres precisa estar
de pé:

```bash
docker compose up -d db
cd backend
npm test
```

## Scripts

| Pasta       | Comando                | O que faz                                  |
| ----------- | ---------------------- | ------------------------------------------ |
| `backend/`  | `npm run dev`          | Sobe a API com recarga automática          |
| `backend/`  | `npm start`            | Sobe a API sem recarga                     |
| `backend/`  | `npm test`             | Roda os testes (precisa do banco de pé)    |
| `backend/`  | `npm run db:migrate`   | Aplica as migrations pendentes             |
| `backend/`  | `npm run db:rollback`  | Reverte todas as migrations                |
| `backend/`  | `npm run db:seed`      | Apaga os dados e insere os dados de teste  |
| `backend/`  | `npm run db:reset`     | Reverte, migra do zero e roda o seed       |
| `frontend/` | `npm run dev`          | Sobe o servidor de desenvolvimento do Vite |
| `frontend/` | `npm run build`        | Gera o build de produção em `dist/`        |
| ambos       | `npm run format`       | Formata o código com Prettier              |
| ambos       | `npm run format:check` | Verifica a formatação (útil no CI)         |

## Variáveis de ambiente

Todas ficam no `.env` da raiz (veja `.env.example`):

| Variável            | Padrão                  | Descrição                                                        |
| ------------------- | ----------------------- | ---------------------------------------------------------------- |
| `NODE_ENV`          | `development`           | Ambiente de execução                                             |
| `BACKEND_PORT`      | `3000`                  | Porta da API                                                     |
| `CORS_ORIGIN`       | `http://localhost:5173` | Origem autorizada a chamar a API                                 |
| `API_PUBLIC_URL`    | `http://localhost:3000` | URL pública da API (base das URLs das imagens)                   |
| `STORAGE_DRIVER`    | `local`                 | Onde guardar as imagens                                          |
| `UPLOAD_DIR`        | `uploads`               | Pasta das imagens (driver `local`)                               |
| `JWT_SECRET`        | —                       | Segredo que assina os tokens (mínimo 32 caracteres; obrigatório) |
| `JWT_EXPIRES_IN`    | `8h`                    | Validade do token                                                |
| `POSTGRES_USER`     | `estoque`               | Usuário do banco                                                 |
| `POSTGRES_PASSWORD` | `estoque_dev`           | Senha do banco (só para desenvolvimento)                         |
| `POSTGRES_DB`       | `estoque`               | Nome do banco                                                    |
| `DB_HOST`           | `localhost`             | Host do banco (no Docker vira `db`)                              |
| `DB_PORT`           | `5432`                  | Porta do banco                                                   |
| `FRONTEND_PORT`     | `5173`                  | Porta do frontend                                                |
| `VITE_API_URL`      | `http://localhost:3000` | URL da API usada pelo navegador                                  |

> Variáveis lidas pelo frontend precisam começar com `VITE_` e ficam visíveis no navegador —
> nunca coloque segredos nelas.
