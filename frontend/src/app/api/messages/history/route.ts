import { getHistory } from "@/lib/chat";

export async function GET() {
  return new Response(JSON.stringify(getHistory()), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
