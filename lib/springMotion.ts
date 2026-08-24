/**
 * Física de movimento para gestos: projeção de momentum e amostragem de mola.
 *
 * O dnd-kit assenta o item com uma transição CSS de duração fixa, então um
 * arraste lento e um peteleco pousam igual. Aqui a velocidade de soltura vira
 * parte do movimento: ela escolhe onde o item pousa e como ele chega lá.
 *
 * Os parâmetros seguem o par que a Apple usa no lugar de massa/rigidez/
 * amortecimento: `bounce` (0 = assenta sem passar do ponto) e `response` (em
 * segundos, o quão rápido o valor alcança o alvo — não é duração: o tempo de
 * repouso sai da simulação).
 */

/**
 * Onde o gesto pararia se ninguém o segurasse. É a mesma desaceleração
 * exponencial da rolagem: um peteleco arremessa o item para longe, um arrasto
 * lento para quase onde soltou.
 */
export function projectMomentum(
  velocity: number,
  decelerationRate = 0.998
): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Simula a mola quadro a quadro e devolve os valores amostrados. Amostrar em
 * vez de resolver a equação permite entregar as posições como keyframes de uma
 * Web Animation, que é o que o dnd-kit aceita para animar a soltura.
 *
 * A velocidade inicial é a do dedo no instante em que soltou: sem ela existe
 * uma emenda visível entre arrastar e animar.
 */
export function sampleSpring({
  from,
  to,
  velocity = 0,
  bounce = 0,
  response = 0.4,
  frameRate = 60,
  maxDuration = 1.2,
}: {
  from: number;
  to: number;
  velocity?: number;
  bounce?: number;
  response?: number;
  frameRate?: number;
  maxDuration?: number;
}): { values: number[]; duration: number } {
  // bounce 0 = criticamente amortecido; quanto maior, mais passa do ponto.
  const dampingRatio = 1 - Math.min(Math.max(bounce, 0), 0.9);
  const angularFrequency = (2 * Math.PI) / response;
  const step = 1 / frameRate;

  let position = from;
  let currentVelocity = velocity;
  const values = [position];

  const restDistance = 0.5;
  const restVelocity = 5;

  for (let time = 0; time < maxDuration; time += step) {
    const displacement = position - to;
    const acceleration =
      -angularFrequency * angularFrequency * displacement -
      2 * dampingRatio * angularFrequency * currentVelocity;

    currentVelocity += acceleration * step;
    position += currentVelocity * step;
    values.push(position);

    if (
      Math.abs(position - to) < restDistance &&
      Math.abs(currentVelocity) < restVelocity
    ) {
      break;
    }
  }

  // Termina exatamente no alvo: a simulação para perto, não em cima.
  values[values.length - 1] = to;

  return { values, duration: (values.length - 1) * step };
}

/**
 * Resistência progressiva ao passar de um limite: quanto mais longe, menos o
 * elemento acompanha o dedo. Parar duro lê como travado; resistir lê como
 * "responde, mas acabou aqui".
 */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55
): number {
  if (dimension === 0) return 0;
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}
