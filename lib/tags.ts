/**
 * Tags são texto livre digitado à mão, então "referência", "referencia" e
 * "Referência" chegam como três coisas diferentes e picotam a categorização.
 * Aqui mora a chave que faz as três contarem como uma só — usada tanto na
 * gravação (pra não nascer duplicata) quanto na exibição (pra consertar o que
 * já está no banco sem migrar dado).
 */

/** Chave de comparação: sem acento e em minúscula. */
export function tagKey(tag: string) {
  return tag
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function hasAccent(tag: string) {
  return tag.normalize("NFD").replace(/\p{Diacritic}/gu, "") !== tag;
}

/**
 * Escolhe uma grafia entre duas que significam a mesma tag. Acento ganha —
 * em português é a forma certa — e o desempate alfabético mantém a escolha
 * estável, independente da ordem em que os links chegaram.
 */
export function preferredTagSpelling(a: string, b: string) {
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
    if (!key || result.has(key)) continue;
    const existing = spelling.get(key);
    result.set(key, existing ? preferredTagSpelling(existing, tag) : tag);
  }

  return [...result.values()];
}
