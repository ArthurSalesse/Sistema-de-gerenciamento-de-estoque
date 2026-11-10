# Sistema de gerenciamento de estoque

Monorepo com **backend** em Node.js (Express) e **frontend** em React (Vite).

```
.
├── backend/            # API Node.js + Express
│   ├── src/
│   │   ├── app.js      # Criação do app e rotas
│   │   └── server.js   # Inicialização do servidor
│   ├── test/           # Testes (node:test)
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
- **Sem Docker:** [Node.js](https://nodejs.org/) 22.9 ou superior (recomendado: 24 LTS)

## Passo a passo

### 1. Clonar e configurar as variáveis de ambiente

```bash
git clone https://github.com/ArthurSalesse/Sistema-de-gerenciamento-de-estoque.git
cd Sistema-de-gerenciamento-de-estoque
cp .env.example .env
```

Os valores padrão do `.env.example` já funcionam para desenvolvimento local.

### 2a. Rodar com Docker (recomendado)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/health

O código é montado como volume, então alterações nos arquivos recarregam automaticamente.
Para parar: `Ctrl+C` ou `docker compose down`.

> Se adicionar uma dependência nova, rode `docker compose up --build` de novo
> (ou `docker compose build --no-cache <servico>`), pois `node_modules` fica dentro do container.

### 2b. Rodar sem Docker

Em um terminal, o backend:

```bash
cd backend
npm install
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

## Scripts

| Pasta       | Comando                | O que faz                                  |
| ----------- | ---------------------- | ------------------------------------------ |
| `backend/`  | `npm run dev`          | Sobe a API com recarga automática          |
| `backend/`  | `npm start`            | Sobe a API sem recarga                     |
| `backend/`  | `npm test`             | Roda os testes                             |
| `frontend/` | `npm run dev`          | Sobe o servidor de desenvolvimento do Vite |
| `frontend/` | `npm run build`        | Gera o build de produção em `dist/`        |
| ambos       | `npm run format`       | Formata o código com Prettier              |
| ambos       | `npm run format:check` | Verifica a formatação (útil no CI)         |

## Variáveis de ambiente

Todas ficam no `.env` da raiz (veja `.env.example`):

| Variável        | Padrão                  | Descrição                                   |
| --------------- | ----------------------- | ------------------------------------------- |
| `NODE_ENV`      | `development`           | Ambiente de execução                        |
| `BACKEND_PORT`  | `3000`                  | Porta da API                                |
| `CORS_ORIGIN`   | `http://localhost:5173` | Origem autorizada a chamar a API            |
| `UPLOAD_DIR`    | `uploads`               | Pasta local para arquivos enviados          |
| `FRONTEND_PORT` | `5173`                  | Porta do frontend                           |
| `VITE_API_URL`  | `http://localhost:3000` | URL da API usada pelo navegador             |

> Variáveis lidas pelo frontend precisam começar com `VITE_` e ficam visíveis no navegador —
> nunca coloque segredos nelas.
