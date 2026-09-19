# @nservers/hub-mcp-database

Conector Oficial nServers MCP para PostgreSQL & MySQL com transporte HTTP Server-Sent Events (SSE) nativo, autenticação Bearer timing-safe e proteção estrita contra operações destrutivas (Read-Only por padrão).

---

## 🚀 Recursos

- **Transporte SSE Nativo**: Totalmente compatível com a especificação Model Context Protocol (MCP) para conexões remotas em nuvem (`/sse` e `/messages`).
- **Suporte Dual a Bancos**: Compatível com PostgreSQL 12+ e MySQL 8.0+ / MariaDB 10.5+.
- **Zero-Trust & Read-Only**: Bloqueio de qualquer instrução de mutação ou DDL (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`).
- **Autenticação Segura**: Validação de token Bearer via header `Authorization: Bearer <MCP_AUTH_TOKEN>` ou query string.
- **Healthcheck Integrado**: Endpoints `/health` e `/ping` para monitoramento do orquestrador e testes de latência no painel nServers Hub.
- **Container Enxuto**: Multi-stage Dockerfile em Node.js 22 Alpine (~85MB) rodando com usuário não-root `node`.

---

## 🛠️ Ferramentas (MCP Tools)

1. `list_tables`: Lista todas as tabelas e views do banco de dados com seus schemas.
2. `describe_table`: Inspeciona colunas, tipos de dados, nulabilidade e chaves primárias de uma tabela.
3. `read_query`: Executa consultas SQL declarativas de leitura (`SELECT`, `EXPLAIN`) com limite de linhas seguro.
4. `database_stats`: Exibe telemetria de conexão, versão do banco e total de tabelas.

---

## ⚙️ Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_CONNECTION` | `pgsql` | Driver do banco (`pgsql` ou `mysql`). |
| `DB_HOST` | `127.0.0.1` | Host ou IP do servidor de banco de dados. |
| `DB_PORT` | `5432` / `3306` | Porta de conexão com o banco. |
| `DB_DATABASE` | `postgres` / `mysql` | Nome da base de dados. |
| `DB_USERNAME` | `postgres` / `root` | Usuário com permissão de leitura. |
| `DB_PASSWORD` | `""` | Senha de autenticação. |
| `DB_SSL` | `false` | Habilita conexão SSL/TLS (`true` ou `false`). |
| `MCP_AUTH_TOKEN` | `""` | Token Bearer esperado nos headers de conexão dos clientes MCP. |
| `PORT` | `3000` | Porta HTTP interna do container. |
| `MAX_ROWS` | `1000` | Limite máximo padrão de linhas retornadas por query (máx: 5000). |

---

## 📦 Execução Local

```bash
# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Executar testes unitários
npm test

# Iniciar servidor
npm start
```

---

## 🐳 Build da Imagem Docker

```bash
docker build -t ghcr.io/nservers/hub-mcp-database:1.0.0 .
```
