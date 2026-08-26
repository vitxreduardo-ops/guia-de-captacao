/**
 * Divisão de colunas dos compromissos que se sobrepõem, como no Google.
 *
 * Sem isso, dois compromissos no mesmo horário ficam um por cima do outro e
 * o de baixo some. Agrupa por interseção e distribui cada grupo em faixas.
 *
 * Trabalha com o mínimo que a conta precisa (início e fim em minutos), então
 * serve tanto ao evento vindo do Google quanto a um caso de teste.
 */
export interface LaidOutEvent {
  startMinutes: number;
  endMinutes: number;
}

export function layoutDay<T extends LaidOutEvent>(
  events: T[]
): { event: T; column: number; columns: number }[] {
  const sorted = [...events].sort(
    (a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes
  );
  const positioned: { event: T; column: number; columns: number }[] = [];

  let cluster: T[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    // Cada evento entra na primeira faixa livre naquele instante.
    const laneEnds: number[] = [];
    const assigned = cluster.map((event) => {
      let lane = laneEnds.findIndex((end) => end <= event.startMinutes);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = event.endMinutes;
      return { event, column: lane };
    });
    const columns = laneEnds.length;
    for (const item of assigned) positioned.push({ ...item, columns });
    cluster = [];
    clusterEnd = -1;
  };

  for (const event of sorted) {
    if (cluster.length > 0 && event.startMinutes >= clusterEnd) flush();
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.endMinutes);
  }
  flush();

  return positioned;
}
