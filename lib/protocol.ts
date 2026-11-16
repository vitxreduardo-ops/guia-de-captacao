// Protocolo de 8 dígitos da ordem de serviço: CCCC TTTT (cliente + sequência).
// Sempre texto: os zeros à esquerda fazem parte. Quem gera é o Postgres
// (supabase/migrations/0112_protocolos.sql); aqui só se formata e se lê.

/** "00420017" → "0042 0017". Outro formato volta como veio. */
export function formatProtocol(code: string | null | undefined): string {
  return code && /^\d{8}$/.test(code) ? `${code.slice(0, 4)} ${code.slice(4)}` : (code ?? "");
}

/** Tira espaço, hífen e "OS" do que a pessoa digitou; null se não sobrar 8 dígitos. */
export function parseProtocol(input: string): string | null {
  const limpo = input.replace(/^\s*os\.?/i, "").replace(/[\s-]/g, "");
  return /^\d{8}$/.test(limpo) ? limpo : null;
}
