import { STORAGE_KEY, validatePapers, type Paper } from "./tracker.ts";

export const RECOVERY_KEY = "paper-trail:before-import:v1";
export type ConflictChoice = "local" | "incoming";
export function migrationPackage(papers: Paper[]) {
  return {
    version: 2,
    application: "paper-trail",
    exportedAt: new Date().toISOString(),
    papers: validatePapers(papers),
  };
}
function fingerprint(p: Paper) {
  // Same-day event order is meaningful and must be preserved.
  return JSON.stringify({
    ...p,
    updatedAt: "",
    history: p.history.slice().sort((a, b) => a.date.localeCompare(b.date)),
  });
}
export function planMigration(local: Paper[], incoming: Paper[]) {
  const current = validatePapers(local),
    imported = validatePapers(incoming);
  const byId = new Map(current.map((p) => [p.id, p]));
  const added: Paper[] = [],
    duplicates: Paper[] = [],
    conflicts: { local: Paper; incoming: Paper }[] = [];
  for (const p of imported) {
    const old = byId.get(p.id);
    if (!old) added.push(p);
    else if (fingerprint(old) === fingerprint(p)) duplicates.push(p);
    else conflicts.push({ local: old, incoming: p });
  }
  return { added, duplicates, conflicts };
}
export function mergeMigration(
  local: Paper[],
  incoming: Paper[],
  choices: Record<string, ConflictChoice> = {},
) {
  const plan = planMigration(local, incoming);
  const replacements = new Map(
    plan.conflicts
      .filter((c) => choices[c.local.id] === "incoming")
      .map((c) => [c.local.id, c.incoming]),
  );
  return validatePapers([...local.map((p) => replacements.get(p.id) || p), ...plan.added]);
}
export function commitMigration(
  storage: Pick<Storage, "getItem" | "setItem">,
  current: Paper[],
  next: Paper[],
) {
  const validated = validatePapers(next);
  // Fail before touching the main data if the recovery point cannot be saved.
  storage.setItem(RECOVERY_KEY, JSON.stringify(migrationPackage(current)));
  storage.setItem(STORAGE_KEY, JSON.stringify(validated));
  return validated;
}
