export type ChatMessage = {
  id: string;
  user: string;
  text: string;
  ts: number;
};

type Subscriber = (msg: ChatMessage) => void;

const messages: ChatMessage[] = [];
const subscribers = new Set<Subscriber>();

export function getHistory(): ChatMessage[] {
  return messages;
}

export function addMessage(user: string, text: string): ChatMessage {
  const msg: ChatMessage = {
    id: Math.random().toString(36).slice(2),
    user: user?.trim() || "Anônimo",
    text: text?.toString() || "",
    ts: Date.now(),
  };
  messages.push(msg);
  if (messages.length > 200) messages.shift();
  for (const sub of subscribers) sub(msg);
  return msg;
}

export function subscribe(handler: Subscriber): () => void {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}

