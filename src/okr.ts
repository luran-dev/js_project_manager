import type { AuditEntry, CheckIn, KeyResult, Objective } from "./okrTypes";

export const today = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const audit = (author: string, reason: string, before: unknown, after: unknown): AuditEntry => ({
  id: crypto.randomUUID(), at: new Date().toISOString(), author, reason,
  before: JSON.stringify(before, null, 2), after: JSON.stringify(after, null, 2),
});
export const effectiveCheckIns = (kr: KeyResult): readonly CheckIn[] => {
  const superseded = new Set(kr.checkIns.map((item) => item.supersedes).filter(Boolean));
  return kr.checkIns.filter((item) => !superseded.has(item.id)).slice().sort((a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.createdAt.localeCompare(b.createdAt));
};
export const currentMeasurement = (kr: KeyResult): CheckIn | undefined => effectiveCheckIns(kr).filter((item) => item.value !== null && item.definitionVersion === kr.definitionVersion).at(-1);
export const latestJudgment = (kr: KeyResult): CheckIn | undefined => effectiveCheckIns(kr).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
export const measurementFreshness = (kr: KeyResult, date = today()): string => {
  const current = currentMeasurement(kr);
  if (!current) return "Not measured";
  const age = (Date.parse(date) - Date.parse(current.measuredOn)) / 86_400_000;
  return age > kr.cadenceDays ? `Stale · ${age} days old` : `Measured ${current.measuredOn}`;
};
export const targetGap = (kr: KeyResult): number | null => {
  const value = currentMeasurement(kr)?.value;
  return value === undefined || value === null ? null : Math.max(0, kr.direction === "Increase" ? kr.target - value : value - kr.target);
};
export const linkedKeyResults = (objectives: readonly Objective[], taskId: string) => objectives.flatMap((objective) => objective.keyResults.filter((kr) => kr.taskLinks.some((link) => link.taskId === taskId) || kr.plans.some((plan) => plan.taskLinks.some((link) => link.taskId === taskId))).map((kr) => ({ objective, kr })));
export const definitionChanged = (before: KeyResult, after: KeyResult): boolean =>
  (["definition", "scope", "aggregation", "source", "unit", "direction"] as const).some((key) => before[key] !== after[key]);
