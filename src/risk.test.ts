import { describe, expect, it } from "vitest";
import { activeTaskRisks, riskLevel, riskScore, taskDisplayPath } from "./risk";
import type { ProjectRisk, Task } from "./types";

const risk = (id: string, status: ProjectRisk["status"]): ProjectRisk => ({
  id,
  title: id,
  description: "",
  category: "SCHEDULE",
  probability: 4,
  impact: 3,
  status,
  strategy: "MITIGATE",
  taskIds: ["t1"],
  identifiedDate: "2026-09-23",
  dueDate: "2026-09-30",
  mitigationPlan: "",
  contingencyPlan: "",
  history: [],
});

describe("risk management", () => {
  it("scores risks and excludes closed risks from task indicators", () => {
    expect(riskScore(risk("r1", "OPEN"))).toBe(12);
    expect([4, 5, 10, 17].map(riskLevel)).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
    expect(activeTaskRisks([risk("r1", "OPEN"), risk("r2", "CLOSED")], "t1").map((item) => item.id)).toEqual(["r1"]);
  });

  it("shows a linked task with its complete WBS hierarchy", () => {
    const tasks: readonly Task[] = [
      { id: "main", title: "Main", startDate: "2026-09-01", endDate: "2026-09-03", duration: 3, status: "TO DO", progress: 0, estimatedHours: 0, sortOrder: 1, dependencyIds: [] },
      { id: "sub1", title: "Sub 1", startDate: "2026-09-01", endDate: "2026-09-02", duration: 2, status: "TO DO", progress: 0, estimatedHours: 8, parentId: "main", sortOrder: 2, dependencyIds: [] },
      { id: "sub2", title: "Sub 2", startDate: "2026-09-02", endDate: "2026-09-02", duration: 1, status: "TO DO", progress: 0, estimatedHours: 8, parentId: "sub1", sortOrder: 3, dependencyIds: [] },
    ];

    expect(taskDisplayPath(tasks, "sub2")).toBe("T3 · Main > Sub 1 > Sub 2");
  });
});
