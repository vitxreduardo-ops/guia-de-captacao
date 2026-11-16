import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Memória curta: o bastante pra uma resposta completar a pergunta anterior.
// Conversa parada há mais de 2 h recomeça do zero.
const WINDOW_MS = 2 * 60 * 60 * 1000;
const MAX_MESSAGES = 12;

export interface ConversationKey {
  userId: string;
  chatId: number;
  threadId: number | null;
}

export async function loadHistory(key: ConversationKey) {
  const { data, error } = await getSupabaseServerClient()
    .from("agent_conversations")
    .select("role, content")
    .eq("user_id", key.userId)
    .eq("chat_id", key.chatId)
    .eq("thread_id", key.threadId ?? 0)
    .gt("created_at", new Date(Date.now() - WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(MAX_MESSAGES);
  if (error) throw error;
  return ((data ?? []) as { role: "user" | "assistant"; content: string }[]).reverse();
}

export async function saveTurn(key: ConversationKey, user: string, assistant: string) {
  const base = { user_id: key.userId, chat_id: key.chatId, thread_id: key.threadId ?? 0 };
  const { error } = await getSupabaseServerClient()
    .from("agent_conversations")
    .insert([
      { ...base, role: "user", content: user.slice(0, 4000) },
      { ...base, role: "assistant", content: assistant.slice(0, 4000) },
    ]);
  if (error) throw error;
}
