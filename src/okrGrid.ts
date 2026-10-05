import type { OkrItem, OkrStatus, WeeklyStatus } from "./okrTypes";
import type { Workspace } from "./types";
import { currentMeasurement, effectiveCheckIns } from "./okr";

export const shiftDate = (date: string, days: number): string => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
export const weekStart = (date: string): string => shiftDate(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
export const weekLabel = (date: string): string => `${date.slice(5)} – ${shiftDate(date, 6).slice(5)}`;
export const statusLabel = (status: OkrStatus): string => status === "Pending" ? "Not set" : status;
export const updateWeek = (item: OkrItem, weekly: WeeklyStatus): OkrItem => ({
  ...item, weeklyStatuses: [...item.weeklyStatuses.filter((entry) => entry.week !== weekly.week), weekly].sort((a, b) => a.week.localeCompare(b.week)),
});

// Conversion is deterministic and only persisted when the user first edits the grid.
export function workspaceOkrs(workspace: Workspace): readonly OkrItem[] {
  if (workspace.okrItems !== undefined) return workspace.okrItems;
  return workspace.projects.flatMap((project) => (project.objectives ?? []).map((objective): OkrItem => {
    const weeks = new Map<string, WeeklyStatus>();
    const forecasts = new Map<string, Map<string, OkrStatus>>();
    const entries = objective.keyResults.flatMap((kr) => effectiveCheckIns(kr).map((check) => ({ kr, check })))
      .sort((a, b) => a.check.createdAt.localeCompare(b.check.createdAt));
    for (const { kr, check } of entries) {
      const week = weekStart(check.measuredOn);
      const previous = weeks.get(week);
      const plans = kr.plans.filter((plan) => plan.state === "Open" || plan.id === check.planId);
      const planText = plans.map((plan) => `${plan.problem}: ${plan.actions.map((action) => action.title).join("; ")}\n${plan.returnCriteria}`).join("\n");
      const ranks = { Pending: 0, Green: 1, Yellow: 2, Red: 3 } as const;
      const latest = forecasts.get(week) ?? new Map<string, OkrStatus>();
      latest.set(kr.id, check.status);
      forecasts.set(week, latest);
      const status = [...latest.values()].reduce<OkrStatus>((worst, current) => ranks[current] > ranks[worst] ? current : worst, "Pending");
      weeks.set(week, { week, status,
        note: [previous?.note, `${kr.title}: ${check.note}`, check.nextAction].filter(Boolean).join("\n"),
        pathToGreen: [previous?.pathToGreen, planText].filter(Boolean).join("\n"), planDone: false, updatedAt: check.createdAt, author: check.author });
    }
    for (const kr of objective.keyResults) {
      if (effectiveCheckIns(kr).length) continue;
      for (const plan of kr.plans) {
        const week = weekStart(plan.nextReview || objective.startDate);
        const previous = weeks.get(week);
        weeks.set(week, { week, status: previous?.status ?? "Pending", note: previous?.note ?? "",
          pathToGreen: [previous?.pathToGreen, `${kr.title}: ${plan.problem}`, ...plan.actions.map((action) => action.title), plan.returnCriteria].filter(Boolean).join("\n"),
          planDone: false, updatedAt: previous?.updatedAt ?? `${week}T00:00:00Z`, author: previous?.author ?? "Imported" });
      }
    }
    return { id: `legacy:${project.id}:${objective.id}`, objective: [objective.title, objective.change].filter(Boolean).join("\n"),
      keyResults: objective.keyResults.map((kr) => `${kr.title}\nTarget: ${kr.target} ${kr.unit}${kr.successCriteria ? `\n${kr.successCriteria}` : ""}`).join("\n\n") || "Key Results not yet defined",
      actualKeyResults: objective.keyResults.map((kr) => { const check = currentMeasurement(kr); return check ? `${kr.title}: ${check.value} ${check.unit} (${check.measuredOn})` : ""; }).filter(Boolean).join("\n"),
      projectIds: [project.id], startDate: objective.startDate, endDate: objective.endDate, weeklyStatuses: [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)) };
  }));
}
