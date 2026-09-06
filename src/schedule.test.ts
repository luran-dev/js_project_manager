import { describe, expect, it } from "vitest";
import { addWorkingDays, cascadeTasks } from "./schedule";
import type { Pto, Task } from "./types";

describe("schedule engine", () => {
  it("skips weekends and assignee PTO when calculating end dates", () => {
    const ptos: readonly Pto[] = [{ userId: "u1", startDate: "2026-07-06", endDate: "2026-07-06", reason: "PTO" }];

    expect(addWorkingDays("2026-07-03", 2, "u1", ptos)).toBe("2026-07-07");
  });

  it("uses the selected project country's holidays", () => {
    expect(addWorkingDays("2026-07-02", 2, undefined, [], "US")).toBe("2026-07-06");
    expect(addWorkingDays("2026-07-02", 2, undefined, [], "Korea")).toBe("2026-07-03");
  });

  it("cascades finish-to-start successors after predecessor movement", () => {
    const tasks: readonly Task[] = [
      { id: "a", title: "A", startDate: "2026-07-01", endDate: "2026-07-03", duration: 3, status: "TO DO", progress: 0, estimatedHours: 8, sortOrder: 1, dependencyIds: [] },
      { id: "b", title: "B", startDate: "2026-07-02", endDate: "2026-07-02", duration: 2, status: "TO DO", progress: 0, estimatedHours: 8, sortOrder: 2, dependencyIds: ["a"] },
    ];

    expect(cascadeTasks(tasks, [])[1]?.startDate).toBe("2026-07-06");
  });

  it("keeps manually delayed successors when dependency allows it", () => {
    const tasks: readonly Task[] = [
      { id: "a", title: "A", startDate: "2026-07-01", endDate: "2026-07-03", duration: 3, status: "TO DO", progress: 0, estimatedHours: 8, sortOrder: 1, dependencyIds: [] },
      { id: "b", title: "B", startDate: "2026-07-08", endDate: "2026-07-09", duration: 2, status: "TO DO", progress: 0, estimatedHours: 8, sortOrder: 2, dependencyIds: ["a"] },
    ];

    expect(cascadeTasks(tasks, [])[1]?.startDate).toBe("2026-07-08");
  });

  it("cascades dependencies independently from visual row order", () => {
    const tasks: readonly Task[] = [
      { id: "b", title: "B", startDate: "2026-07-01", endDate: "2026-07-01", duration: 2, status: "TO DO", progress: 0, estimatedHours: 8, sortOrder: 1, dependencyIds: ["a"] },
      { id: "a", title: "A", startDate: "2026-07-01", endDate: "2026-07-03", duration: 3, status: "TO DO", progress: 0, estimatedHours: 8, sortOrder: 2, dependencyIds: [] },
    ];

    expect(cascadeTasks(tasks, [])[0]?.startDate).toBe("2026-07-06");
  });
});
