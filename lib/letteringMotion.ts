/**
 * Física do gesto: para onde a peça ia quando o dedo soltou, e como ela
 * assenta lá.
 */

/** Amostra de posição no tempo, usada pra descobrir a velocidade do dedo. */
export type Amostra = { valor: number; t: number };

/**
 * Velocidade em unidades por segundo, medida na janela recente.
 *
 * Só o trecho final importa: usar o gesto inteiro faria uma parada no fim
 * ainda sair voando, porque a média carregaria o movimento antigo.
 */
export function velocidade(amostras: Amostra[], janelaMs = 80): number {
  if (amostras.length < 2) return 0;

  const fim = amostras[amostras.length - 1];
  const inicio =
    [...amostras].reverse().find((a) => fim.t - a.t >= janelaMs) ?? amostras[0];

  const dt = fim.t - inicio.t;
  if (dt <= 0) return 0;
  return ((fim.valor - inicio.valor) / dt) * 1000;
}

/**
 * Quanto a peça ainda andaria sozinha depois de solta.
 *
 * A taxa é mais seca que a da rolagem de listas (0,998). Numa lista o dedo
 * pede metros de conteúdo; num editor um peteleco curto tem que render um
 * empurrão curto — com a taxa da rolagem, soltar a peça com a vista afastada
 * jogava ela meio palco adiante.
 */
export function projetar(velocidadePorSegundo: number, desaceleracao = 0.99) {
  return (
    ((velocidadePorSegundo / 1000) * desaceleracao) / (1 - desaceleracao)
  );
}

export type Mola = { valor: number; velocidade: number };

/**
 * Um passo da mola até o alvo.
 *
 * `resposta` é o tempo que ela leva pra chegar, em segundos, e
 * `amortecimento` diz se ela passa do ponto: 1 assenta seco, abaixo disso
 * volta um pouco. O passo de tempo é limitado porque uma aba que ficou em
 * segundo plano volta com um salto de tempo que jogaria a peça longe.
 */
export function passoDaMola(
  estado: Mola,
  alvo: number,
  dt: number,
  resposta = 0.35,
  amortecimento = 1,
): Mola {
  const passo = Math.min(dt, 1 / 30);
  const w = (2 * Math.PI) / resposta;
  const aceleracao =
    -w * w * (estado.valor - alvo) - 2 * amortecimento * w * estado.velocidade;
  const velocidade = estado.velocidade + aceleracao * passo;
  return { valor: estado.valor + velocidade * passo, velocidade };
}

/** A mola chegou: perto do alvo e sem energia pra sair de novo. */
export function molaParada(estado: Mola, alvo: number, tolerancia = 0.5) {
  return (
    Math.abs(estado.valor - alvo) < tolerancia &&
    Math.abs(estado.velocidade) < tolerancia * 10
  );
}
