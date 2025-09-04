import { NextRequest } from "next/server";
import { addMessage } from "@/lib/chat";

export async function POST(req: NextRequest) {
  try {
    const { user, text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Texto é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const msg = addMessage(user ?? "", text);
    return new Response(JSON.stringify(msg), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
