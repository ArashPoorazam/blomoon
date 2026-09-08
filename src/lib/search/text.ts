/** Shared text mechanics; field selection and ranking remain with each domain. */
export function normalizeSearchText(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/ي|ى/g, "ی").replace(/ك/g, "ک")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function searchTerms(value: string) {
  return [...new Set(normalizeSearchText(value).split(" ").filter(Boolean))];
}

export function matchesSearchText(text: string, query: string) {
  const normalized = normalizeSearchText(text);
  const words = normalized.split(" ");
  return searchTerms(query).every((term) => normalized.includes(term)
    || (term.length >= 4 && words.some((word) => editDistance(term, word) <= (term.length >= 6 ? 2 : 1))));
}

/** Bounded strings only; adjacent transpositions count as one typo. */
export function editDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i++) rows[i][0] = i;
  for (let j = 0; j <= right.length; j++) rows[0][j] = j;
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + Number(left[i - 1] !== right[j - 1]));
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[left.length][right.length];
}
