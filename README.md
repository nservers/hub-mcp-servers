# nServers Hub - MCP Servers Official Collection

Coleção oficial de servidores de código aberto compatíveis com o **Model Context Protocol (MCP)** desenvolvidos e mantidos pela equipe da **nServers**.

Cada servidor nesta coleção foi projetado para rodar em containers leves (Docker/Alpine), com transporte **Server-Sent Events (SSE)** nativo, autenticação Bearer e políticas rígidas de segurança Zero-Trust.

---

## Servidores Disponíveis

| Diretório | Nome | Transporte | Imagem Docker (GHCR) | Descrição |
|---|---|---|---|---|
| [`database-mcp/`](./database-mcp) | **Database MCP (PostgreSQL & MySQL)** | SSE (Porta 3000) | `ghcr.io/nservers/hub-mcp-database:latest` | Inspeção de tabelas, schemas e queries seguras somente-leitura (read-only guard) com explain plan. |

---

## Como Rodar Localmente (Exemplo: `database-mcp`)

### 1. Requisitos
- Node.js 22 LTS ou superior
- npm

### 2. Instalação e Testes
```bash
cd database-mcp
npm install
npm test
```

### 3. Execução em Desenvolvimento
```bash
npm run dev
```

O servidor iniciará em `http://localhost:3000`, disponibilizando:
- `GET /health`: Healthcheck sem autenticação.
- `GET /sse`: Endpoint MCP Server-Sent Events (exige header `Authorization: Bearer <token>`).
- `POST /messages`: Rota de mensagens JSON-RPC 2.0.

---

## Publicação Automática de Imagens (CI/CD)

Este repositório utiliza **GitHub Actions** para compilar e publicar automaticamente as imagens no **GitHub Container Registry (`ghcr.io`)** a cada push na branch `main`.

---

## Licença

Distribuído sob a licença **Apache 2.0**. Consulte os arquivos de licença individuais para mais informações.
