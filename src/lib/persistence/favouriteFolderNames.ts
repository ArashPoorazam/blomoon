export function resolveImportedFolderName(sourceName: string, existingNames: string[]) {
  const used = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()));
  const base = sourceName.trim().replace(/\s+/g, " ");
  if (!used.has(base.toLocaleLowerCase())) return base;
  for (let suffix = 2; ; suffix += 1) {
    const ending = ` (${suffix})`;
    const candidate = `${base.slice(0, 80 - ending.length).trimEnd()}${ending}`;
    if (!used.has(candidate.toLocaleLowerCase())) return candidate;
  }
}
