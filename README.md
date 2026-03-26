<div align="center">
  <img src="https://raw.githubusercontent.com/willianOliveira-dev/nexio-api/main/public/static/images/logo.png" 
       alt="Nexio API" width="200" />
  
  <h1>Nexio API</h1>
  <p>Backend RESTful para análise e otimização de currículos com IA — focado em matching de vagas e conversão</p>

  ![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=nodedotjs)
  ![Hono](https://img.shields.io/badge/Hono-4.x-E36002?style=flat-square)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
  ![Drizzle](https://img.shields.io/badge/Drizzle_ORM-latest-C5F74F?style=flat-square)
  ![Groq](https://img.shields.io/badge/Groq-AI-F55036?style=flat-square)
  ![Better Auth](https://img.shields.io/badge/Better_Auth-Sessions-FF6B6B?style=flat-square)
  ![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-Storage-F38020?style=flat-square&logo=cloudflare)
</div>

---

### 1. Visão Geral

A **Nexio API** é o motor de inteligência artificial desenhado para alavancar a carreira de profissionais através da otimização de currículos. Servindo como o core para a plataforma Nexio, o backend gerencia o upload estruturado de currículos profissionais, análise semântica e scoring via IA corporativa (Groq), recomendações pragmáticas, geração de Cartas de Apresentação (Cover Letters), além do armazenamento robusto de documentos vitais da jornada do usuário. Tudo construído com arquitetura modular, máxima performance no processamento e exportação universal (PDF, DOCX, TXT).

<br/>
[🔗 Acessar Swagger UI / API Reference Locais (http://localhost:8000/docs)](http://localhost:8000/docs)

---

### 2. Decisões Técnicas

- **Por que Hono e não Express ou NestJS?**
  **Escolha:** Hono (rodando via `@hono/node-server`) combinado com `@hono/zod-openapi`.
  **Motivo:** Express é pesado e legado; NestJS impõe muita fricção com boilerplate OOP em APIs modernas. Hono é ultra-rápido, otimizado para a Edge, e a sua integração nativa com Zod (`zod-openapi`) fornece validação end-to-end tipada e gera descritores do Swagger/OpenAPI de forma automática, mantendo o tráfego da API estritamente protegido.

- **Por que Drizzle ORM e não Prisma?**
  **Escolha:** Drizzle ORM sobre `pg` (PostgreSQL) com suporte Neon Serverless.
  **Motivo:** Evita o overhead severo de memória atrelado ao motor binário (Rust) do Prisma. Drizzle atua como um construtor SQL nativo, permitindo modelar relações complexas (ex: Vagas x Experiências x Scores) sem abstrações ocultas, priorizando altíssima conversão I/O e cold-starts ínfimos se movido para edge functions.

- **Por que Better Auth e não PassportJS/Auth.js?**
  **Escolha:** Better Auth com persistência em PostgreSQL.
  **Motivo:** Fornece um esqueleto de autenticação coeso e plug-and-play que mapeia perfeitamente usuários aos provedores OAuth (Google, LinkedIn). Sua abstração nos exime da verificação braçal de tokens num ambiente de sessão e traz tipos integrados, desacoando a UI e o Backend.

- **Por que Groq SDK (Llama 3.3) invés de OpenAI puro?**
  **Escolha:** Modelos open-source altíssima velocidade rodando em LPU hardware na Groq.
  **Motivo:** Análises e sumarizações de currículos contêm grande quantidade de tokens, e o matching com Job Descriptions requer latência minúscula para manter a UX interativa. O modelo `llama-3.3-70b-versatile` suportado pela Groq reduz radicalmente o tempo-de-resposta (TTFT) barateando a operação.

- **Por que Cloudflare R2 e não AWS S3 local?**
  **Escolha:** Integração com Storage Cloudflare via `@aws-sdk/client-s3`.
  **Motivo:** Egressão de banda gratuita com performance e compatibilidade de API do S3. Extremamente vantajoso economicamente já que currículos gerados ou imagens pesam de forma acumulada e são muito requisitados para leitura ou export.

- **Por que arquitetura de Trabalhadores (pg-boss)?**
  **Escolha:** Fila de background baseada na solidez do PostgreSQL.
  **Motivo:** Extração e quebra de PDFs complexos aliado aos requests para IA (calculo de score / parser de metadados do Currículo) não podem bloquear o Event Loop primário do NodeJS, e falhas transitórias precisam de _retrys_ resilientes, além de cron jobs periódicos como os resgates de Limites Mensais e Geração de Exportações de modo assíncrono.

---

### 3. Arquitetura

```text
src/
├── app.ts                 # Bootstrap / Middlewares e Handlers do Hono OpenApi
├── server.ts              # Inicia o servidor Web NodeJS nativo
├── config/                # Environment variables type-safe (env.ts)
├── lib/                   
│   ├── ai/                # Instâncias e Prompts do Groq 
│   ├── auth/              # Configurações OAuth Better Auth
│   ├── db/                # Conexão Drizzle e Schemas SQL
│   ├── queue/             # Setup de Background Jobs (pg-boss)
│   └── r2/                # Uploaders p/ Nuvem Cloudflare
├── middlewares/           # Interceptadores HTTPS globais
├── modules/               # Verticais Core (Arquitetura Modular)
│   ├── auth               # Delegador de sessões
│   ├── resumes            # Gestão e Parsing/Scoring de currículos
│   ├── job-matches        # AI Job Matching (Vaga vs Resumo)
│   ├── cover-letters      # Fabricante de Cartas de Apresentação
│   └── exports            # Compiladores multi-formato (DOCX/PDF/TXT)
├── shared/                # Codebase comum (Prompts, Tipos, Templates)
└── workers/               # Implementação dos Job Listeners do pg-boss
```

**Fluxo End-to-end de uma requisição API:**
1. **Request** → Chega validado pelos headers (CORS) e ingressa na rota Hono instanciada.
2. **Middleware Auth** → O BetterAuth extrai a sessão/Cookie Bearer avaliando a vida útil no db caso protegido.
3. **Route (Zod Schema)** → Validação nativa em nível de Endpoints expurgando lixo do Body/Query.
4. **Controller/Service** → Core rules e mapeamento com Groq/R2 dependendo da vertical.
5. **Worker (Opcional)** → Envia payloads pesados p/ a pool do `pg-boss` (Ex: Converter um Resume PDF para Estrutura JSONB ou gerar export DOCX/PDF).

---

### 4. Módulos da API

#### Módulo: Auth
Gerenciamento de vida da Sessão.
| Método | O que faz |
|--------|-----------|
| ALL | Tratamento de login OAuth/Email transparente com provedores como Google e LinkedIn |

#### Módulo: Resumes
O cérebro de extração de dados Pessoais, de Base e Formações.
| Operação | Descrição |
|----------|-----------|
| Análises | Dispara Workers extraindo PDF em dados indexados e calcula Scoring IA do perfil |
| Versões | Possibilita ter currículos adaptados base num Core Profile comum |
| Gestão Completa | Cria, edita e remove seções acadêmicas, experiências, features em tempo-real |

#### Módulo: Job Matches
Integra a vaga pretendida no processo.
| Operação | Descrição |
|----------|-----------|
| Compatibilidade | IA pondera keywords requerentes com a estrutura de experiência profissional logada |
| Recomendador | Sugestão de melhorias que ampliam fit ao sistema ATS e ao RH humano |

#### Módulo: Cover Letters & AI Chat
Recursos gerativos conversacionais sob o framework Groq.
| Operação | Descrição |
|----------|-----------|
| Geração e Export | Invocação LLM forjando Cartas Profissionais adaptadas à empresa-alvo para múltiplos formatos |
| AI Chat Assitente | Agente LLM guiado conversando diretamente sobre deficiências das "Skills" do resumo logado |

#### Módulo Auxiliar: Exports
Motor construtor final usando `pdfkit`, `mammoth` e `docx`.
| Operação | Descrição |
|----------|-----------|
| Multi-Outputs | Renderização binária (PDF de extrema qualidade e formatação) e Office DOCX traduzíveis à N idiomas injetável na Nuvem R2 temporária |

---

### 5. Schema do Banco de Dados

`Drizzle ORM via PostgreSQL Dialect (NEON)`

O banco de dados do projeto prioriza uma separação ultra-atomizada das experiências, com `resumes` atuando como entidades base agregadas. O sistema estende os `users` do authn nativo utilizando a tabela complementar `user_profiles`.

Tabelas em Destaque Interdependentes:
- `users` ➔ O modelo primário vindo da Autenticação.
- `user_profiles` ➔ Configurações individuais.
- `usage_limits` ➔ Engine de cotas restritivo de rate-limiters de A.I (Ex: Free Limits).
A arquitetura do Currículo:
- `resumes` (Base Central) liga a: `work_experiences`, `educations`, `skills`, `languages`, `projects`, `certifications`, `volunteering` através de chaves relacionais estrangeiras. 
- `resume_scores` guarda notas semânticas.
- `job_matches` e `cover_letters` associam um ou mais Resumes específicos alinhados a um cargo/empresa específica, salvaguardando outputs da A.I.

---

### 6. Variáveis de Ambiente

Crie o setup na raíz `.env` embasado pelo molde `.env.example`. Validação Typesafe no deploy.

| Variável | Obrigt. | Descrição |
|----------|---------|-----------|
| `NODE_ENV` | ❌ | Default: `development` / `production` |
| `DATABASE_URL` | ✅ | Drizzle Connection Pool - NeonDB String URL |
| `BETTER_AUTH_SECRET` | ✅ | Hash Cripto Server-Side pra Cookies |
| `BETTER_AUTH_URL` | ❌ | Ex: `http://localhost:8000` |
| `GROQ_API_KEY` | ✅ | Chave Developer do parceiro LLM. Processamento inferencial de A.I. |
| `R2_ACCOUNT_ID` / `KEY_ID` / `SECRET` / `BUCKET` / `ENDPOINT` | ✅ | Coleção S3-Style para guardar documentos renderizados/PDFs de modo otimizado via Cloudflare |
| `GOOGLE_CLIENT_ID` / `SECRET` | ✅ | Autenticação Externa Social Configuração (Google) |
| `LINKEDIN_CLIENT_ID` / `SECRET` | ✅ | Autenticação Externa Redes Profissionais |
| `FRONTEND_URL` / `ALLOWED_ORIGINS` | ❌ | Base para URLs do Client-Target permitidos globalmente no CORS |

---

### 7. Como Rodar Localmente

#### Pré-requisitos
- Node.js 24+
- pnpm 10+
- PostgreSQL local ou servidor Neon DB

#### Instalação e Execução

```bash
# 1. Clone o projeto e entre na pasta
git clone <repository-url>
cd nexio-api

# 2. Reúna e cache dependências base
pnpm install

# 3. Modele os Segredos na raiz a partir do skeleton base
cp .env.example .env
# [!] Preencha as chaves: Banco de dados, Groq, Auth Secret, etc.

# 4. Transpile e execute alterações Drizzle no Postgres
pnpm run dz:push

# 5. Inicie o Event Loop dev do Hono c/ Typescript Watch App mode
pnpm dev

# Servidor online => http://localhost:8000
# Acesse Documentação Interativa em => http://localhost:8000/docs
```

---

### 8. Comandos Úteis (Tooling Múltiplo)

| Categoria | Comando | Descrição |
|-----------|---------|-----------|
| **Core** | `pnpm dev` | Carrega envs e `tsx watch` no `server.ts` |
| **Build** | `pnpm build` | Limpeza `dist` e build c/ resolução inteligente import (`tsc-alias`) |
| **Testes** | `pnpm test:coverage` | Motor nativo Vitest extraindo Test Suites coverage em 1 comando |
| **Drizzle** | `pnpm dz:migrate` | Roda as chaves físicas contra seu host BD remoto Neon/PG local |
| **Drizzle** | `pnpm dz:studio` | Dashboard Web Local Drizzle com edição visual UI relacional `local:4983` |
| **Lint** | `pnpm format` / `lint` | Biome Toolchain super-sônico - Check Format e Regras Restritivas TS |

---

### 9. Convenções de Arquitetura em Contribuição

- O Projeto se blinda de Try-Catch Spaghettis forçando um sistema robusto usando retornos Hono e classes instanciadas `AppError` onde o payload jamais escapa o Context log nativo sem tratativa Global do Router.
- Não existem exceções de nomenclatura misturadas, arquivos são obrigatoriamente declarados `kebab-case.ts`.
- Tipos unifificados sob schema `Zod` trafegando de Rota Hono (`zod-openapi`) para Lógica de Repositorio e validando respostas AI-Responses (Groq Structured JSON modes)!

---

## 👨‍💻 Autores
**Willian Oliveira**
[![GitHub](https://img.shields.io/badge/GitHub-willianOliveira--dev-181717?style=flat-square&logo=github)](https://github.com/willianOliveira-dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Willian_Oliveira-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/willian-oliveira-66a230353/)
