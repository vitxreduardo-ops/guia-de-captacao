import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeProducesContent,
  normalizeStageKind,
  type Prospect,
  type ProspectClientOption,
  type ProspectDocOption,
  type ProspectOwnerOption,
  type ProspectRow,
  type ProspectStage,
  type ProspectTouch,
  type ProspectTouchKind,
  type RadarCompany,
} from "@/lib/prospectTypes";

export type {
  Prospect,
  ProspectRow,
  ProspectStage,
  ProspectTouch,
} from "@/lib/prospectTypes";

// ---------------------------------------------------------------- helpers

function normalizeDate(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

/** "18:30" do input type=time; qualquer outra coisa vira null. */
function normalizeTime(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : null;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function positiveInt(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// ---------------------------------------------------------------- leitura

export async function listStages(): Promise<ProspectStage[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("prospect_stages")
    .select("*")
    .order("position");
  if (error) throw error;
  return (data ?? []) as ProspectStage[];
}

export interface ProspectBoard {
  prospects: ProspectRow[];
  stages: ProspectStage[];
  owners: ProspectOwnerOption[];
  clients: ProspectClientOption[];
}

/**
 * Todos os contatos com a etapa embutida e o resumo do histórico.
 *
 * As três telas (fila, ficha, tabela) partem daqui: são poucos registros —
 * uma lista de prospecção de estúdio vive na casa das dezenas —, então uma
 * leitura só e o recorte feito em memória sai mais barato que três consultas
 * com filtro diferente, e mantém a ordenação idêntica entre as telas.
 */
export async function getProspects(): Promise<ProspectBoard> {
  const supabase = getSupabaseServerClient();

  const [stagesResult, prospectsResult, touchesResult, ownersResult, clientsResult] =
    await Promise.all([
      supabase.from("prospect_stages").select("*").order("position"),
      supabase.from("prospects").select("*"),
      supabase
        .from("prospect_touches")
        .select("prospect_id, happened_at")
        .order("happened_at", { ascending: false }),
      supabase.from("users").select("id, username").order("username"),
      supabase.from("gallery_clients").select("id, name").order("name"),
    ]);

  for (const result of [
    stagesResult,
    prospectsResult,
    touchesResult,
    ownersResult,
    clientsResult,
  ]) {
    if (result.error) throw result.error;
  }

  const stages = (stagesResult.data ?? []) as ProspectStage[];
  const byStage = new Map(stages.map((stage) => [stage.id, stage]));

  // Os toques vêm ordenados do mais novo pro mais velho, então o primeiro de
  // cada contato já é o último acontecido — não precisa comparar data a data.
  const lastTouch = new Map<string, string>();
  const touchCount = new Map<string, number>();
  for (const row of (touchesResult.data ?? []) as {
    prospect_id: string;
    happened_at: string;
  }[]) {
    if (!lastTouch.has(row.prospect_id)) {
      lastTouch.set(row.prospect_id, row.happened_at);
    }
    touchCount.set(row.prospect_id, (touchCount.get(row.prospect_id) ?? 0) + 1);
  }

  const prospects = ((prospectsResult.data ?? []) as Prospect[])
    .map((prospect) => ({
      ...prospect,
      stage: byStage.get(prospect.stage_id)!,
      last_touch_at: lastTouch.get(prospect.id) ?? null,
      touch_count: touchCount.get(prospect.id) ?? 0,
    }))
    .filter((prospect) => prospect.stage)
    .sort(compareByNextContact);

  return {
    prospects,
    stages,
    owners: (ownersResult.data ?? []) as ProspectOwnerOption[],
    clients: (clientsResult.data ?? []) as ProspectClientOption[],
  };
}

/**
 * Ordem da fila: quem tem data marcada primeiro, do mais antigo pro mais
 * distante; quem não tem data vai pro fim da ordenação, mas a tela puxa esse
 * grupo pro topo — é o que precisa de decisão, não de lembrete.
 */
export function compareByNextContact(a: ProspectRow, b: ProspectRow): number {
  if (!a.next_contact_date && !b.next_contact_date) {
    return a.name.localeCompare(b.name, "pt-BR");
  }
  if (!a.next_contact_date) return 1;
  if (!b.next_contact_date) return -1;
  if (a.next_contact_date !== b.next_contact_date) {
    return a.next_contact_date < b.next_contact_date ? -1 : 1;
  }
  // Sem hora marcada o compromisso é do dia inteiro: vem depois dos que têm
  // hora, porque não disputa um horário específico.
  const timeA = a.next_contact_time ?? "99:99";
  const timeB = b.next_contact_time ?? "99:99";
  return timeA.localeCompare(timeB);
}

export async function getProspect(
  id: string
): Promise<{ prospect: ProspectRow; touches: ProspectTouch[] } | null> {
  const supabase = getSupabaseServerClient();

  const [prospectResult, touchesResult] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("prospect_touches")
      .select("*")
      .eq("prospect_id", id)
      .order("happened_at", { ascending: false }),
  ]);
  if (prospectResult.error) throw prospectResult.error;
  if (touchesResult.error) throw touchesResult.error;
  if (!prospectResult.data) return null;

  const prospect = prospectResult.data as Prospect;
  const touches = (touchesResult.data ?? []) as ProspectTouch[];

  const { data: stageRow, error: stageError } = await supabase
    .from("prospect_stages")
    .select("*")
    .eq("id", prospect.stage_id)
    .maybeSingle();
  if (stageError) throw stageError;
  if (!stageRow) return null;

  return {
    prospect: {
      ...prospect,
      stage: stageRow as ProspectStage,
      last_touch_at: touches[0]?.happened_at ?? null,
      touch_count: touches.length,
    },
    touches,
  };
}

/**
 * As peças que podem ser amarradas a um contato: orçamentos e contratos.
 *
 * Só o que o vínculo precisa (id, título, slug). Puxar a linha inteira traria
 * o corpo do contrato e as seções da proposta para montar um `<select>`.
 */
export async function listLinkableDocs(): Promise<{
  budgets: ProspectDocOption[];
  contracts: ProspectDocOption[];
}> {
  const supabase = getSupabaseServerClient();
  const [budgets, contracts] = await Promise.all([
    supabase
      .from("budgets")
      .select("id, title, slug")
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, title, slug")
      .eq("is_template", false)
      .order("created_at", { ascending: false }),
  ]);

  if (budgets.error) throw budgets.error;
  if (contracts.error) throw contracts.error;

  return {
    budgets: budgets.data ?? [],
    contracts: contracts.data ?? [],
  };
}

// ---------------------------------------------------------------- escrita

export interface ProspectInput {
  name: string;
  stage_id: string;
  client_id: string | null;
  owner_id: string | null;
  contact_name: string;
  role: string;
  phone: string;
  email: string;
  handle: string;
  origin: string;
  next_contact_date: string | null;
  next_contact_time: string | null;
  next_contact_minutes: number | null;
  next_contact_what: string;
  lost_reason: string;
  notes: string;
  value: number;
  budget_id: string | null;
  contract_id: string | null;
}

export function readProspectForm(formData: FormData): ProspectInput {
  return {
    name: text(formData.get("name")) || "Novo contato",
    stage_id: text(formData.get("stage_id")),
    client_id: text(formData.get("client_id")) || null,
    owner_id: text(formData.get("owner_id")) || null,
    contact_name: text(formData.get("contact_name")),
    role: text(formData.get("role")),
    phone: text(formData.get("phone")),
    email: text(formData.get("email")),
    handle: text(formData.get("handle")),
    origin: text(formData.get("origin")),
    next_contact_date: normalizeDate(formData.get("next_contact_date")),
    next_contact_time: normalizeTime(formData.get("next_contact_time")),
    next_contact_minutes: positiveInt(formData.get("next_contact_minutes")),
    next_contact_what: text(formData.get("next_contact_what")),
    lost_reason: text(formData.get("lost_reason")),
    notes: text(formData.get("notes")),
    value: money(formData.get("value")),
    budget_id: text(formData.get("budget_id")) || null,
    contract_id: text(formData.get("contract_id")) || null,
  };
}

/**
 * Aceita "2.500,00" e "2500.00" — o campo é digitado à mão e as duas formas
 * aparecem. Sem isso `Number("2.500,00")` é NaN e o valor vira zero calado,
 * que no painel comercial some da soma sem ninguém perceber.
 */
function money(value: FormDataEntryValue | null): number {
  const bruto = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
  if (!bruto) return 0;
  const normalizado = bruto.includes(",")
    ? bruto.replace(/\./g, "").replace(",", ".")
    : bruto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

export async function createProspect(fields: ProspectInput): Promise<Prospect> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("prospects")
    .insert(withoutStandaloneTime(fields))
    .select("*")
    .single();
  if (error) throw error;
  return data as Prospect;
}

export async function updateProspect(id: string, fields: ProspectInput) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("prospects")
    .update({ ...withoutStandaloneTime(fields), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Hora sem data não significa nada e faria o evento do Google virar um
 * compromisso sem dia. Limpa antes de gravar em vez de confiar no formulário.
 */
function withoutStandaloneTime(fields: ProspectInput): ProspectInput {
  if (fields.next_contact_date) return fields;
  return { ...fields, next_contact_time: null, next_contact_minutes: null };
}

export async function deleteProspect(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Registra um contato e reagenda o próximo numa tacada só — é sempre a mesma
 * ação na cabeça de quem usa ("falei, volto tal dia"), e separar em duas
 * abriria a porta pra registrar a conversa e sair sem próxima data, que é
 * exatamente o que este funil existe pra impedir.
 */
export async function logTouch(params: {
  prospectId: string;
  authorId: string | null;
  kind: ProspectTouchKind;
  message: string;
  happenedAt?: string;
  next: {
    date: string | null;
    time: string | null;
    minutes: number | null;
    what: string;
  };
}) {
  const supabase = getSupabaseServerClient();

  const { error: touchError } = await supabase.from("prospect_touches").insert({
    prospect_id: params.prospectId,
    author_id: params.authorId,
    kind: params.kind,
    message: params.message,
    happened_at: params.happenedAt ?? new Date().toISOString(),
  });
  if (touchError) throw touchError;

  const { error } = await supabase
    .from("prospects")
    .update({
      next_contact_date: params.next.date,
      next_contact_time: params.next.date ? params.next.time : null,
      next_contact_minutes: params.next.date ? params.next.minutes : null,
      next_contact_what: params.next.what,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.prospectId);
  if (error) throw error;
}

/** Move de etapa e deixa o rastro no histórico, com o motivo quando é perda. */
export async function moveProspect(params: {
  prospectId: string;
  stageId: string;
  authorId: string | null;
  lostReason: string;
}) {
  const supabase = getSupabaseServerClient();

  const [{ data: from }, { data: to }] = await Promise.all([
    supabase
      .from("prospects")
      .select("stage_id, name")
      .eq("id", params.prospectId)
      .maybeSingle(),
    supabase
      .from("prospect_stages")
      .select("id, name, kind")
      .eq("id", params.stageId)
      .maybeSingle(),
  ]);
  if (!to) throw new Error("Etapa não encontrada");
  if (from?.stage_id === params.stageId) return;

  const { data: fromStage } = await supabase
    .from("prospect_stages")
    .select("name")
    .eq("id", from?.stage_id ?? "")
    .maybeSingle();

  const kind = normalizeStageKind(to.kind);
  const patch: Record<string, unknown> = {
    stage_id: params.stageId,
    updated_at: new Date().toISOString(),
  };
  // O motivo só faz sentido na etapa de perda; sair dela limpa o campo pra
  // não sobrar uma justificativa velha num contato que voltou a andar.
  if (kind === "perdida") patch.lost_reason = params.lostReason;
  else patch.lost_reason = "";

  // A data de fechamento é gravada na hora da mudança de etapa, e não deduzida
  // depois de `updated_at`: qualquer correção posterior de telefone moveria
  // "fechou em agosto" para "fechou hoje". Sair da etapa de ganho limpa —
  // senão o mês passado continua contando um fechamento que se desfez.
  patch.closed_at = kind === "ganha" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("prospects")
    .update(patch)
    .eq("id", params.prospectId);
  if (error) throw error;

  const message = fromStage?.name
    ? `Moveu de ${fromStage.name} para ${to.name}`
    : `Entrou em ${to.name}`;
  const { error: touchError } = await supabase.from("prospect_touches").insert({
    prospect_id: params.prospectId,
    author_id: params.authorId,
    kind: "etapa",
    message:
      kind === "perdida" && params.lostReason
        ? `${message} — ${params.lostReason}`
        : message,
  });
  if (touchError) throw touchError;
}

// ----------------------------------------------------------------- etapas

export async function createStage(fields: {
  name: string;
  color: string;
  kind: string;
}): Promise<ProspectStage> {
  const supabase = getSupabaseServerClient();
  const { data: last } = await supabase
    .from("prospect_stages")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("prospect_stages")
    .insert({
      name: text(fields.name) || "Nova etapa",
      color: fields.color || "#6b7280",
      kind: normalizeStageKind(fields.kind),
      position: (last?.position ?? -1) + 1,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProspectStage;
}

export async function updateStage(
  id: string,
  fields: { name?: string; color?: string; kind?: string; playbook?: string }
) {
  const supabase = getSupabaseServerClient();
  const patch: Record<string, string> = {};
  if (fields.name !== undefined) patch.name = text(fields.name) || "Sem nome";
  if (fields.color !== undefined) patch.color = fields.color;
  if (fields.kind !== undefined) patch.kind = normalizeStageKind(fields.kind);
  if (fields.playbook !== undefined) patch.playbook = String(fields.playbook);
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("prospect_stages")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Apagar etapa com contato dentro deixaria o funil sem lugar pra eles — a FK
 * é `on delete restrict` de propósito. A checagem aqui existe pra virar um
 * aviso legível em vez do erro cru do Postgres.
 */
export async function deleteStage(id: string): Promise<{ ok: boolean; count: number }> {
  const supabase = getSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", id);
  if (countError) throw countError;
  if ((count ?? 0) > 0) return { ok: false, count: count ?? 0 };

  const { error } = await supabase.from("prospect_stages").delete().eq("id", id);
  if (error) throw error;
  return { ok: true, count: 0 };
}

export async function reorderStages(orderedIds: string[]) {
  const supabase = getSupabaseServerClient();
  await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("prospect_stages").update({ position }).eq("id", id)
    )
  );
}

// ----------------------------------------------------------------- radar

export type { RadarCompany } from "@/lib/prospectTypes";

function readRadarForm(formData: FormData) {
  return {
    company: text(formData.get("company")),
    sector: text(formData.get("sector")),
    instagram: text(formData.get("instagram")),
    produces_content: normalizeProducesContent(formData.get("produces_content")),
    contact: text(formData.get("contact")),
    comms_name: text(formData.get("comms_name")),
    referral: text(formData.get("referral")),
    notes: text(formData.get("notes")),
  };
}

export async function listRadar(): Promise<RadarCompany[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("prospect_radar")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RadarCompany[];
}

export async function createRadarCompany(formData: FormData) {
  const fields = readRadarForm(formData);
  const { error } = await getSupabaseServerClient()
    .from("prospect_radar")
    .insert(fields);
  if (error) throw error;
}

export async function updateRadarCompany(id: string, formData: FormData) {
  const { error } = await getSupabaseServerClient()
    .from("prospect_radar")
    .update({ ...readRadarForm(formData), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRadarCompany(id: string) {
  const { error } = await getSupabaseServerClient()
    .from("prospect_radar")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
