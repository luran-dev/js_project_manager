import { describe, expect, it } from "vitest";
import { actualTask, executionDelta } from "./execution";
import type { Task } from "./types";

const task: Task = {
  id: "t1",
  title: "Baseline task",
  startDate: "2026-07-01",
  endDate: "2026-07-03",
  duration: 3,
  status: "TO DO",
  progress: 0,
  estimatedHours: 24,
  assigneeId: "u1",
  sortOrder: 1,
  dependencyIds: [],
};

describe("execution tracking", () => {
  it("builds actual rows from baseline tasks when execution fields change", () => {
    const actual = actualTask({ ...task, actualEndDate: "2026-07-06", actualEstimatedHours: 40, actualProgress: 50 });

    expect(actual.endDate).toBe("2026-07-06");
    expect(actual.estimatedHours).toBe(40);
    expect(actual.progress).toBe(50);
    expect(actual.startDate).toBe(task.startDate);
  });

  it("reports delay days and MD variance against the baseline", () => {
    expect(executionDelta({ ...task, actualEndDate: "2026-07-08", actualEstimatedHours: 40 })).toEqual({ delayDays: 5, mdDelta: 2 });
  });

  it("keeps an explicitly unassigned actual row from falling back to the baseline assignee", () => {
    expect(actualTask({ ...task, actualAssigneeId: null }).assigneeId).toBeUndefined();
  });
});
