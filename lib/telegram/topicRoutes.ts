import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { telegram } from "@/lib/telegram/client";
import { HUB_TOPICS, type HubTopic } from "@/lib/telegram/topics";

export async function topicOf(chatId: number, threadId: number): Promise<HubTopic | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("telegram_topic_routes")
    .select("topic")
    .eq("chat_id", chatId)
    .eq("thread_id", threadId)
    .maybeSingle();
  if (error) throw error;
  return (data?.topic as HubTopic) ?? null;
}

export async function threadOfTopic(chatId: number, topic: HubTopic): Promise<number | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("telegram_topic_routes")
    .select("thread_id")
    .eq("chat_id", chatId)
    .eq("topic", topic)
    .maybeSingle();
  if (error) throw error;
  return (data?.thread_id as number) ?? null;
}

/**
 * Cria no grupo os tópicos que ainda não existem e grava o id de cada um.
 * Rodar de novo não duplica. Exige o bot como admin com "Gerenciar tópicos".
 */
export async function setupHubTopics(chatId: number): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("telegram_topic_routes")
    .select("topic")
    .eq("chat_id", chatId);
  if (error) throw error;
  const existing = new Set((data ?? []).map((r) => r.topic as string));

  const created: string[] = [];
  for (const topic of HUB_TOPICS) {
    if (existing.has(topic.key)) continue;
    const forum = await telegram<{ message_thread_id: number }>("createForumTopic", {
      chat_id: chatId,
      name: topic.name,
    });
    const { error: insertError } = await supabase.from("telegram_topic_routes").insert({
      chat_id: chatId,
      thread_id: forum.message_thread_id,
      topic: topic.key,
    });
    if (insertError) throw insertError;
    created.push(topic.name);
  }
  return created;
}
