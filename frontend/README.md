# Frontend - Chat AI System

Interface web responsiva do sistema de chat inteligente com integração real-time, sistema de aprovação de ferramentas e streaming de execução.

## 🏗️ Arquitetura

### Estrutura do Projeto

```
src/
├── app/                    # App Router do Next.js
│   ├── globals.css        # Estilos globais
│   ├── layout.tsx         # Layout raiz da aplicação
│   └── page.tsx           # Página principal do chat
├── components/            # Componentes reutilizáveis
│   ├── chat/              # Componentes específicos do chat
│   │   ├── ChatMessage.tsx    # Componente de mensagem individual
│   │   ├── MessageList.tsx    # Lista de mensagens com scroll
│   │   └── StreamingCard.tsx  # Card de progresso de execução
│   ├── ui/                # Componentes de UI básicos
│   │   ├── Button.tsx     # Componente de botão
│   │   └── Input.tsx      # Componente de input
│   ├── ErrorBoundary.tsx      # Boundary de erro global
│   ├── ThemeToggle.tsx        # Toggle de tema claro/escuro
│   ├── ToolApprovalModal.tsx  # Modal de aprovação de ferramentas
│   ├── WebSocketErrorBoundary.tsx # Boundary específico para WebSocket
│   └── WsStatus.tsx           # Indicador de status da conexão
├── hooks/                 # Custom hooks
│   ├── useAutoScroll.ts   # Auto scroll para mensagens
│   ├── useChat.ts         # Gerenciamento do estado do chat
│   ├── useToolApproval.ts # Sistema de aprovação de ferramentas
│   └── useWebSocket.ts    # Cliente WebSocket com reconexão
├── stores/                # Contextos React (estado global)
│   ├── chatContext.tsx    # Contexto do chat
│   ├── themeContext.tsx   # Contexto do tema
│   └── toolApprovalContext.tsx # Contexto de aprovação
├── styles/                # Arquivos de estilo
│   └── globals.css        # CSS global com Tailwind
├── types/                 # Definições TypeScript
│   └── index.ts           # Tipos centralizados
└── utils/                 # Utilitários
    └── storage.ts         # Helpers de localStorage
```

## 🚀 Tecnologias

### Core
- **Next.js 15** - Framework React com App Router
- **React 19** - Biblioteca de interface reativa
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework de CSS utilitário

### UI/UX
- **react-perfect-scrollbar** - Scrollbar customizada
- **Lucide React** - Ícones modernos e leves
- **CSS Variables** - Sistema de temas dinâmico

### Comunicação
- **WebSocket API** - Comunicação real-time bidirecional

### Estado e Performance
- **React Context** - Gerenciamento de estado global
- **localStorage** - Persistência local
- **React.memo** - Otimização de re-renders
- **useCallback/useMemo** - Memoização de funções e valores

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do frontend:

```bash
# WebSocket Backend URL
NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:4000

# Ambiente
NODE_ENV=development
```

### Exemplo `.env.local`

```bash
# Copie e personalize
cp .env.local.example .env.local
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

### Build e Deploy

```bash
# Build para produção
npm run build

# Executar build
npm start

# Analisar bundle
npm run analyze
```

### Docker

```bash
# Build da imagem
docker build -t chat-frontend .

# Executar container
docker run -p 3000:3000 --env-file .env.local chat-frontend
```

## 🎯 Funcionalidades Principais

### 1. Chat em Tempo Real

**Componentes:**
- `ChatMessage.tsx` - Renderização individual de mensagens
- `MessageList.tsx` - Lista scrollável com auto-scroll
- `useChat.ts` - Gerenciamento de estado das mensagens

**Fluxo:**
1. Usuário digita mensagem no input
2. WebSocket envia mensagem para backend
3. Backend processa com IA e retorna streaming
4. Frontend exibe resposta em tempo real com indicador de digitação

### 2. Sistema de Aprovação de Ferramentas

**Componentes:**
- `ToolApprovalModal.tsx` - Modal de aprovação/negação
- `useToolApproval.ts` - Estado do sistema de aprovação

**Fluxo:**
1. IA solicita uso de ferramenta (ex: criar arquivo)
2. Backend pausa e envia `tool_request`
3. Frontend exibe modal com detalhes da ferramenta
4. Usuário aprova ou nega via botões
5. Frontend envia decisão via `tool_decision`
6. Backend executa ferramenta (se aprovada) com streaming

### 3. Streaming de Execução

**Componentes:**
- `StreamingCard.tsx` - Card expansível com progresso
- `useChat.ts` - Gerenciamento de streams ativos

**Recursos:**
- Progresso em tempo real
- Conteúdo expansível/colapsível
- Auto-scroll durante execução
- Exibição do arquivo criado (se aplicável)

### 4. Persistência e Recuperação

**Implementação:**
- **localStorage**: Histórico de mensagens e streams
- **Recuperação automática**: Ao reconectar, carrega histórico salvo
- **Limpeza inteligente**: Remove dados antigos automaticamente

## 🔄 Fluxo de Comunicação WebSocket

### Eventos Cliente → Servidor

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
  tool?: string,
  params?: Record<string, any>,
  correlationId?: string
}
```

### Eventos Servidor → Cliente

**Histórico:**
```typescript
{
  type: "history",
  messages: ChatMessage[]
}
```

**Nova Mensagem:**
```typescript
{
  type: "message",
  payload: {
    id: string,
    user: "user" | "assistant" | "system",
    text: string,
    ts: number,
    streamId?: string,
    messageType?: string
  }
}
```

**Solicitação de Ferramenta:**
```typescript
{
  type: "tool_request",
  requestId: string,
  tool: string,
  params: Record<string, unknown>,
  explanation: string
}
```

**Stream de Execução:**
```typescript
{
  type: "tool_stream",
  requestId: string,
  done: boolean,
  bytes?: number,
  total?: number,
  chunk?: string,
  path?: string
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

## 🎨 Sistema de Temas

### Implementação
- **Context API**: `themeContext.tsx` para estado global
- **CSS Variables**: Definidas em `globals.css`
- **Tailwind Classes**: `dark:` prefix para tema escuro
- **LocalStorage**: Persiste preferência do usuário

### Cores do Sistema
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 98%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --secondary: 222.2 84% 4.9%;
}
```

## 🚀 Otimizações de Performance

### Técnicas Implementadas

**1. Memoização de Componentes:**
```typescript
export const ChatMessage = memo<ChatMessageProps>(({ message, isStreaming }) => {
  // Evita re-renders desnecessários quando props não mudam
});
```

**2. Callbacks Memoizados:**
```typescript
const handleToggleStreamExpand = useCallback((rid: string) => {
  updateStream(rid, { expanded: !streams[rid].expanded });
}, [streams, updateStream]);
```

**3. Lazy Loading:**
```typescript
const ToolApprovalModal = dynamic(() => import('./ToolApprovalModal'), {
  ssr: false
});
```

**4. Scroll Otimizado:**
- `react-perfect-scrollbar` para performance nativa
- Auto-scroll inteligente apenas quando necessário
- Refs diretos para manipulação DOM

## 🔒 Tratamento de Erros

### Error Boundaries

**ErrorBoundary.tsx:**
- Captura erros JavaScript globais
- Exibe UI de fallback amigável
- Log de erros para debugging

**WebSocketErrorBoundary.tsx:**
- Específico para erros de conexão
- Botão de reconexão manual
- Indicadores de status da conexão

## 🧪 Testes

### Estrutura de Testes

```
__tests__/
├── components/           # Testes de componentes
├── hooks/               # Testes de custom hooks  
├── utils/               # Testes de utilitários
└── integration/         # Testes de integração
```

### Executar Testes

```bash
# Todos os testes
npm test
```

## 📱 Responsividade

### Componentes Adaptativos

- **MessageList**: Altura ajustável conforme viewport
- **ToolApprovalModal**: Layout responsivo mobile/desktop  
- **Navigation**: Collapse em telas pequenas
- **ChatMessage**: Quebra de texto inteligente

## 🔧 Customização

### Temas Personalizados

```css
/* globals.css */
.theme-custom {
  --primary: 120 100% 50%;
  --secondary: 180 100% 90%;
}
```

### Componentes Customizados

```typescript
// Extend Button component
interface CustomButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'custom';
}
```

## 🚀 Deploy

### Produção

```bash
# Build otimizada
npm run build

# Verificar build
npm run start

# Deploy para Vercel
vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Troubleshooting

### Problemas Comuns

**WebSocket não conecta:**
- Verifique `NEXT_PUBLIC_CHAT_WS_URL` no .env.local
- Confirme que backend está rodando na porta correta
- Teste conexão manual: `new WebSocket('ws://localhost:4000')`

## 🤝 Contribuindo

### Padrões de Código

1. **TypeScript**: Tipagem obrigatória
2. **ESLint/Prettier**: Formatação automática
3. **Conventional Commits**: Mensagens padronizadas
4. **Component Structure**: Props → Logic → Render → Export
---

**Para mais informações, consulte o [README principal](../README.md)**