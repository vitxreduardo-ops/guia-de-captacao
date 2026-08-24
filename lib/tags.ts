/**
 * Tags são texto livre digitado à mão, então "referência", "Referencia" e
 * "referências" chegam como três coisas diferentes e picotam a categorização.
 * Aqui mora a chave que faz as três contarem como uma só — usada tanto na
 * gravação (pra não nascer duplicata) quanto na exibição (pra consertar o que
 * já está no banco sem migrar dado).
 */

/** Sem acento, em minúscula e sem espaço nas pontas. */
function fold(tag: string) {
  return tag
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Reduz um plural português ao singular provável, sobre a forma já sem acento.
 * Não é gramática completa — "lápis" vira "lapi" e tudo bem: isto é só chave
 * de agrupamento, nunca texto exibido, e o que importa é ser determinística.
 * O risco real seria juntar duas tags de sentidos diferentes, o que exigiria
 * um par improvável num acervo de referências.
 */
function singularize(word: string) {
  if (word.length < 4 || !word.endsWith("s")) return word;

  // imagens -> imagem, homens -> homem
  if (word.endsWith("ns")) return `${word.slice(0, -2)}m`;
  // ações e pães chegam aqui já sem til: acoes -> acao, paes -> pao
  if (word.endsWith("oes") || word.endsWith("aes")) {
    return `${word.slice(0, -3)}ao`;
  }
  // papeis -> papel, animais -> animal, lencois -> lencol, azuis -> azul
  if (/[eaou]is$/.test(word)) return `${word.slice(0, -2)}l`;
  // cores -> cor, luzes -> luz, meses -> mes
  if (/[rzs]es$/.test(word)) return word.slice(0, -2);
  // videos -> video, casas -> casa
  return word.slice(0, -1);
}

/** Chave de comparação: acento, caixa e plural deixam de diferenciar. */
export function tagKey(tag: string) {
  return singularize(fold(tag));
}

function isSingular(tag: string) {
  const folded = fold(tag);
  return singularize(folded) === folded;
}

function hasAccent(tag: string) {
  return tag.normalize("NFD").replace(/\p{Diacritic}/gu, "") !== tag;
}

/**
 * Escolhe uma grafia entre duas que significam a mesma tag. Singular ganha de
 * plural e acento ganha de sem acento — é a forma que se espera ver numa
 * etiqueta em português. O desempate alfabético mantém a escolha estável,
 * independente da ordem em que os links chegaram.
 */
export function preferredTagSpelling(a: string, b: string) {
  if (isSingular(a) !== isSingular(b)) return isSingular(a) ? a : b;
  if (hasAccent(a) !== hasAccent(b)) return hasAccent(a) ? a : b;
  return a.localeCompare(b, "pt-BR") <= 0 ? a : b;
}

/** Mapa `chave -> grafia a exibir`, montado a partir de todas as tags em uso. */
export function buildTagSpellingMap(tags: string[]) {
  const map = new Map<string, string>();
  for (const tag of tags) {
    const key = tagKey(tag);
    if (!key) continue;
    const current = map.get(key);
    map.set(key, current ? preferredTagSpelling(current, tag) : tag);
  }
  return map;
}

/**
 * Tags de um formulário prontas pra gravar: sem repetição e, quando já existe
 * tag equivalente cadastrada, reaproveitando a grafia dela.
 */
export function canonicalizeTags(tags: string[], known: string[]) {
  const spelling = buildTagSpellingMap(known);
  const result = new Map<string, string>();

  for (const tag of tags) {
    const key = tagKey(tag);
    if (!key) continue;
    // Também compara contra o que já saiu deste mesmo campo: digitar "acoes,
    // ações, Ação" de uma vez tem que sobrar "Ação", não a primeira da fila.
    const existing = result.get(key) ?? spelling.get(key);
    result.set(key, existing ? preferredTagSpelling(existing, tag) : tag);
  }

  return [...result.values()];
}
