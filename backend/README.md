# Backend - Chat AI System

Backend do sistema de chat inteligente com integração Claude 3.7 Sonnet, sistema de ferramentas MCP.

## 🏗️ Arquitetura

### Estrutura do Projeto

```
src/
├── adapters/           # Adaptadores externos
│   ├── anthropic/      # Cliente Anthropic Claude
│   ├── files/          # Sistema de arquivos
│   └── mcp/           # Model Context Protocol
├── application/        # Lógica de negócio
│   ├── aiService.ts   # Serviço principal da IA
│   ├── session.ts     # Gerenciamento de sessões
│   └── tools.ts       # Sistema de ferramentas
├── domain/            # Domínio da aplicação
│   ├── errors.ts      # Tratamento de erros
│   └── types.ts       # Tipos TypeScript
├── infrastructure/    # Infraestrutura
│   ├── config.ts      # Configurações
│   ├── logger.ts      # Sistema de logs
│   ├── metrics.ts     # Métricas Prometheus
│   └── tracing.ts     # OpenTelemetry
├── ports/             # Interfaces/Contratos
│   ├── ai.ts          # Interface IA
│   └── files.ts       # Interface arquivos
├── transport/         # Camada de transporte
│   ├── ws.ts          # WebSocket server
│   ├── emitter.ts     # Emissor de eventos
│   ├── events.ts      # Tipos de eventos
│   └── schemas.ts     # Validação Zod
└── server/
    └── index.ts       # Entry point
```

## 🚀 Tecnologias

### Core
- **Node.js** - Runtime JavaScript
- **TypeScript** - Tipagem estática

### Comunicação
- **ws** - WebSocket server para comunicação real-time
- **Zod** - Validação de schemas e tipos

### IA e Ferramentas
- **@anthropic-ai/sdk** - SDK oficial Claude
- **Model Context Protocol (MCP)** - Sistema de ferramentas

### Observabilidade
- **pino** - Logger estruturado de alta performance
- **prometheus** - Métricas e monitoramento
- **@opentelemetry** - Tracing distribuído

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend:

```bash
# API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Servidor
PORT=4000
NODE_ENV=development

# WebSocket
WS_MAX_PAYLOAD=262144  # 256KB

# IA Configuration
AI_MODEL=claude-3-7-sonnet-20250219
AI_PROVIDER=anthropic
MAX_MESSAGE_LENGTH=4000

# Observabilidade
LOG_LEVEL=info
JAEGER_ENDPOINT=http://localhost:4318/v1/traces

# Arquivos
FILE_OUTPUT_DIR=./outputs
```

### Exemplo `.env`

```bash
# Copie e personalize
cp .env.example .env
```

## 🔧 Instalação e Execução

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento (com hot reload)
npm run dev

# Executar em modo produção
npm run build
npm start
```

### Docker compose para instalar os serviços necessários

```bash
# Na raiz do projeto
docker-compose up -d
```

## 📡 API e WebSocket

### Endpoints HTTP

- `GET /health` - Health check
- `GET /metrics` - Métricas Prometheus

### WebSocket Events

#### Cliente → Servidor

**Mensagem de Chat:**
```typescript
{
  type: "message",
  text: string,
  correlationId?: string
}
```

**Decisão de Ferramenta:**
```typescript
{
  type: "tool_decision",
  requestId: string,
  approved: boolean,
  params?: Record<string, any>,
  tool?: string,
  correlationId?: string
}
```

#### Servidor → Cliente

**Histórico:**
```typescript
{
  type: "history",
  messages: ChatMessage[]
}
```

**Mensagem:**
```typescript
{
  type: "message",
  payload: {
    id: string,
    user: string,
    text: string,
    ts: number,
    streamId?: string,
    messageType?: string
  },
  correlationId?: string
}
```

**Solicitação de Ferramenta:**
```typescript
{
  type: "tool_request",
  requestId: string,
  tool: string,
  params: Record<string, unknown>,
  explanation: string,
  correlationId?: string
}
```

**Stream de Ferramenta:**
```typescript
{
  type: "tool_stream",
  requestId: string,
  done: boolean,
  bytes?: number,
  total?: number,
  chunk?: string,
  path?: string,
  correlationId?: string
}
```

**Stream de IA:**
```typescript
{
  type: "ai_stream",
  text: string,
  correlationId?: string
}
```

**IA Finalizada:**
```typescript
{
  type: "ai_done",
  text?: string,
  correlationId?: string
}
```

## 🛠️ Sistema de Ferramentas

### Ferramentas Disponíveis

#### `mcp_create_file`
Cria arquivos de texto no diretório de saída.

**Parâmetros:**
- `content` (obrigatório): Conteúdo do arquivo
- `path` (opcional): Caminho relativo no diretório de saída

**Exemplo:**
```typescript
{
  tool: "mcp_create_file",
  params: {
    content: "console.log('Hello World');",
    path: "scripts/hello.js"
  }
}
```

### Fluxo de Aprovação

1. **IA Solicita Ferramenta**: IA identifica necessidade de usar ferramenta
2. **Pausa para Aprovação**: Backend pausa execução e envia `tool_request`
3. **Usuário Decide**: Frontend mostra modal, usuário aprova/nega
4. **Processamento**: Backend recebe decisão via `tool_decision`
5. **Execução/Negação**: 
   - Se aprovado: executa ferramenta com streaming
   - Se negado: envia mensagem de negação e continua conversa

### Streaming de Execução

Durante a execução de ferramentas aprovadas:

1. **Início**: Mensagem "Executando {tool}..." é enviada
2. **Progresso**: Updates de `tool_stream` com chunks de dados
3. **Finalização**: `tool_stream` com `done: true` e resultado final

## 📊 Observabilidade

### Logs Estruturados

O sistema usa **pino** para logs estruturados em JSON:

```typescript
// Exemplo de log
{
  "level": 30,
  "time": 1640995200000,
  "msg": "User message received",
  "service": "chat-backend",
  "version": "0.1.0",
  "sessionId": "123",
  "correlationId": "abc-def-123",
  "textLength": 25
}
```

### Métricas Prometheus

**Contadores:**
- `ws_connections_total` - Total de conexões WebSocket
- `messages_total` - Total de mensagens por tipo
- `tool_executions_total` - Execuções de ferramentas
- `ai_requests_total` - Requisições para IA

**Histogramas:**
- `message_size_bytes` - Tamanho das mensagens
- `ai_request_duration_seconds` - Duração das requisições de IA
- `tool_execution_duration_seconds` - Duração de execução de ferramentas

### Tracing OpenTelemetry

Traces automáticos para:
- Requisições WebSocket
- Chamadas de IA
- Execução de ferramentas
- Operações de arquivo

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Lint
npm run lint
```

### Estrutura de Testes

```
tests/
├── unit/              # Testes unitários
├── integration/       # Testes de integração
└── e2e/              # Testes end-to-end
```

## 🔒 Segurança

### Validação de Entrada

Todos os payloads são validados com Zod:

```typescript
const messageEventSchema = z.object({
  type: z.literal('message'),
  text: z.string().min(1).max(MAX_MESSAGE_TEXT),
  correlationId: z.string().optional(),
}).strict()
```

### Tratamento de Erros

Errors são categorizados e tratados adequadamente:

```typescript
type ErrorCategory = 'user' | 'infra' | 'provider'
```

## 🚀 Deploy

### Produção

```bash
# Build
npm run build

# Executar
NODE_ENV=production npm start
```

## 🔧 Troubleshooting

### Problemas Comuns

**WebSocket não conecta:**
- Verifique se a porta 4000 está disponível
- Confirme as configurações de CORS

**IA não responde:**
- Verifique a `ANTHROPIC_API_KEY`
- Confirme conectividade com API Anthropic

**Métricas não aparecem:**
- Verifique se Prometheus está acessível
- Confirme endpoint `/metrics`

**Logs não aparecem:**
- Ajuste `LOG_LEVEL` no .env
- Verifique configuração do pino

### Debug

```bash
# Debug mode
DEBUG=* npm run dev

# Logs detalhados
LOG_LEVEL=debug npm run dev
```

---

**Para mais informações, consulte o [README principal](../README.md)**
