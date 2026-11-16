// Tópicos do grupo TATU | HUB. A ordem e os nomes viram os tópicos criados
// pelo /configurar; a chave é o que fica no banco.
export const HUB_TOPICS = [
  { key: "comando", name: "00 — Central de Comando" },
  { key: "referencias", name: "01 — Referências" },
  { key: "ordens", name: "02 — Ordens de Serviço" },
  { key: "agenda", name: "03 — Agenda" },
  { key: "relatorios", name: "04 — Relatórios" },
  { key: "clientes", name: "05 — Clientes" },
  { key: "notificacoes", name: "06 — Notificações" },
] as const;

export type HubTopic = (typeof HUB_TOPICS)[number]["key"];
