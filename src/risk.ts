import type { ProjectRisk, Task, TaskId } from "./types";

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskLevel = typeof RISK_LEVELS[number];

export const riskScore = (risk: Pick<ProjectRisk, "probability" | "impact">): number => risk.probability * risk.impact;

export const riskLevel = (score: number): RiskLevel => {
  if (score >= 17) return "CRITICAL";
  if (score >= 10) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
};

export const activeTaskRisks = (risks: readonly ProjectRisk[], taskId: TaskId): readonly ProjectRisk[] =>
  risks.filter((risk) => risk.status !== "CLOSED" && risk.taskIds.includes(taskId));

export const taskDisplayPath = (tasks: readonly Task[], taskId: TaskId): string => {
  const sorted = tasks.slice().sort((left, right) => left.sortOrder - right.sortOrder);
  const task = sorted.find((item) => item.id === taskId);
  if (task === undefined) return taskId;
  const titles = [task.title];
  const visited = new Set<TaskId>([task.id]);
  let parentId = task.parentId;
  while (parentId !== undefined && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = sorted.find((item) => item.id === parentId);
    if (parent === undefined) break;
    titles.unshift(parent.title);
    parentId = parent.parentId;
  }
  return `T${sorted.findIndex((item) => item.id === task.id) + 1} · ${titles.join(" > ")}`;
};
