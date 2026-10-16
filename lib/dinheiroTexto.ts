// Frases da tela Dinheiro. Sem "server-only": usadas em servidor e cliente.
import { formatBRL } from "@/lib/billingTypes";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const toDate = (iso: string) =>
  new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

function diasAte(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((toDate(iso).getTime() - hoje.getTime()) / 86_400_000);
}

export function diaPorExtenso(iso: string): string {
  return `${Number(iso.slice(8, 10))} de ${MESES[Number(iso.slice(5, 7)) - 1]}`;
}

/** "hoje", "amanhã", "ter 13", "há 5 dias". */
export function quando(iso: string): string {
  const d = diasAte(iso);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  if (d < 0) return `há ${-d} dias`;
  return `${SEMANA[toDate(iso).getDay()]} ${Number(iso.slice(8, 10))}`;
}

/** "venceu há 5 dias", "vence hoje", "vence dia 25 de outubro". */
export function frasePrazo(dueDate: string | null): string {
  if (!dueDate) return "sem dia combinado";
  const d = diasAte(dueDate);
  if (d === 0) return "vence hoje";
  if (d < 0) return `venceu há ${-d} ${d === -1 ? "dia" : "dias"}`;
  return `vence dia ${diaPorExtenso(dueDate)}`;
}

export function linkWhatsApp(
  who: { name: string; contactName: string | null; phone: string | null },
  mesNome: string,
  cents: number,
  pix?: { label: string; chave: string } | null
): string | null {
  const digits = (who.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const numero = digits.length <= 11 ? `55${digits}` : digits;
  const primeiro = (who.contactName ?? who.name).split(" ")[0];
  const cobranca = `Oi, ${primeiro}! Tudo bem? Passando pra lembrar do pagamento de ${mesNome}: ${formatBRL(
    cents
  )}.`;
  // A chave vai numa linha só dela, pra copiar com um toque.
  const chave = pix ? `\n\nChave Pix (${pix.label}):\n${pix.chave}` : "";
  const texto = `${cobranca}${chave}\n\nQualquer dúvida é só chamar!`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
