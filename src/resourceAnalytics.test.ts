import { describe, expect, it } from "vitest";
import { buildResourceLoads } from "./resourceAnalytics";
import type { Workspace } from "./types";

describe("resource analytics", () => {
  it("aggregates a resource across workspace projects and flags overallocated days", () => {
    const workspace: Workspace = {
      id: "w1",
      name: "Team",
      users: [{ id: "u1", name: "Ada", email: "ada@example.com", dailyCapacityHours: 8 }],
      ptos: [],
      projects: [
        { id: "p1", name: "Alpha", defaultCountry: "Korea", tasks: [{ id: "t1", title: "API", startDate: "2026-06-01", endDate: "2026-06-01", duration: 1, status: "IN PROGRESS", progress: 50, estimatedHours: 8, assigneeId: "u1", sortOrder: 1, dependencyIds: [] }] },
        { id: "p2", name: "Beta", defaultCountry: "Korea", tasks: [{ id: "t2", title: "UI", startDate: "2026-06-01", endDate: "2026-06-01", duration: 1, status: "TO DO", progress: 0, estimatedHours: 8, assigneeId: "u1", sortOrder: 1, dependencyIds: [] }] },
      ],
    };

    const [load] = buildResourceLoads(workspace);

    expect(load?.totalHours).toBe(16);
    expect(load?.projectLoads.map((project) => project.projectName)).toEqual(["Alpha", "Beta"]);
    expect(load?.overallocatedDays).toBe(1);
    expect(load?.dailyLoads[0]).toMatchObject({ date: "2026-06-01", hours: 16, capacity: 8, projects: ["Alpha", "Beta"] });
  });
});
