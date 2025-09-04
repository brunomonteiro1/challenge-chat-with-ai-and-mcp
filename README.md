# Chat AI com Sistema de Ferramentas

Um sistema de chat inteligente com integração de IA (Claude 3.7 Sonnet) e capacidade de execução de ferramentas com aprovação manual.

## 📋 Visão Geral

Este projeto consiste em um sistema de chat em tempo real que permite:

- **Chat com IA**: Conversas inteligentes usando Claude 3.7 Sonnet
- **Sistema de Aprovação**: Controle manual de execução de ferramentas
- **Streaming em Tempo Real**: Visualização do progresso de execução
- **Observabilidade Completa**: Métricas, tracing e logs estruturados
- **Persistência**: Histórico de conversas e streams salvos

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │   Chat UI       │ │  Tool Approval  │ │   Streaming  │  │
│  │   Components    │ │     Modal       │ │   Cards      │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
│            │                  │                 │          │
│            └──────────────────┼─────────────────┘          │
│                               │                            │
└───────────────────────────────┼────────────────────────────┘
                                │ WebSocket
┌───────────────────────────────┼────────────────────────────┐
│                         Backend                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │   WebSocket     │ │   AI Service    │ │  Tool System │  │
│  │   Server        │ │  (Anthropic)    │ │    (MCP)     │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
│            │                  │                 │          │
│            └──────────────────┼─────────────────┘          │
│                               │                            │
└───────────────────────────────┼────────────────────────────┘
                                │
┌───────────────────────────────┼────────────────────────────┐
│                    Observabilidade                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │   Prometheus    │ │     Jaeger      │ │   Grafana    │  │
│  │   (Métricas)    │ │   (Tracing)     │ │ (Dashboard)  │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Chave da API Anthropic

### 1. Clone o repositório

```bash
git clone <repo-url>
cd chat-ai-system
```

### 2. Configure as variáveis de ambiente

**Backend:**
```bash
cd backend
cp .env.example .env
# Edite o .env com suas configurações
```

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local
# Edite o .env.local com suas configurações
```

### 3. Execute com Docker

```bash
# Na raiz do projeto execute os serviços necessários
docker-compose up -d
```

### 4. Execute em modo desenvolvimento

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend (novo terminal):**
```bash
cd frontend
npm install
npm run dev
```

## 📱 Acesso às Aplicações

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

## 🔧 Fluxo de Funcionamento

### 1. Chat Básico
1. Usuário digita mensagem no frontend
2. Mensagem é enviada via WebSocket para o backend
3. Backend processa com Claude 3.5 Sonnet
4. Resposta é transmitida em tempo real para o frontend

### 2. Sistema de Aprovação de Ferramentas
1. IA solicita uso de ferramenta (ex: criar arquivo)
2. Backend pausa e envia requisição de aprovação
3. Frontend mostra modal com detalhes da ferramenta
4. Usuário aprova ou nega a solicitação
5. Backend processa a decisão e executa (ou não) a ferramenta

### 3. Streaming de Execução
1. Durante execução de ferramenta aprovada
2. Backend envia updates de progresso via WebSocket
3. Frontend exibe componente de streaming com progresso
4. Usuário acompanha execução em tempo real

## 📊 Observabilidade ** Em Desenvolvimento **

### Métricas (Prometheus) ** Em Desenvolvimento **
- Contador de mensagens por tipo
- Latência de requisições
- Status de conexões WebSocket
- Métricas de uso de ferramentas

### Tracing (Jaeger) 
- Rastreamento de requisições fim-a-fim
- Spans de execução de ferramentas
- Performance de integração com IA

### Dashboards (Grafana) ** Em Desenvolvimento **
- Visualização de métricas em tempo real
- Alertas configuráveis
- Análise de performance

## 🔒 Segurança

- **Validação de entrada**: Zod schemas para todos os payloads
- **Aprovação manual**: Controle de execução de ferramentas
- **Sanitização**: Limpeza de dados de entrada

## 🧪 Testes

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📚 Documentação Adicional

- [Backend README](./backend/README.md) - Documentação específica do backend
- [Frontend README](./frontend/README.md) - Documentação específica do frontend