import { describe, expect, it } from "vitest";
import { updateWeek, weekStart, workspaceOkrs } from "./okrGrid";
import type { CheckIn, KeyResult, Objective, OkrItem, WeeklyStatus } from "./okrTypes";
import type { Workspace } from "./types";

const item: OkrItem = { id: "o", objective: "Improve activation", keyResults: "Reach 40% weekly activation", actualKeyResults: "Currently 31%", startDate: "2026-10-01", endDate: "2026-12-31", projectIds: ["p"], weeklyStatuses: [] };
const week: WeeklyStatus = { week: "2026-10-05", status: "Red", note: "Needs support", pathToGreen: "Run onboarding experiment", planDone: false, updatedAt: "2026-10-05T12:00:00Z", author: "Owner" };
const workspace: Workspace = { id: "w", name: "Team", users: [], ptos: [], projects: [{ id: "p", name: "Project", tasks: [] }] };

describe("simple OKR grid", () => {
  it("normalizes weeks to Monday across year and month boundaries", () => {
    expect(weekStart("2026-10-11")).toBe("2026-10-05");
    expect(weekStart("2026-10-05")).toBe("2026-10-05");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });
  it("updates one week without overwriting another or duplicating records", () => {
    const first = updateWeek(item, week);
    const second = updateWeek(first, { ...week, week: "2026-10-12", status: "Yellow" });
    const edited = updateWeek(second, { ...week, note: "Action shipped", planDone: true });
    expect(edited.weeklyStatuses).toHaveLength(2);
    expect(edited.weeklyStatuses[0]?.status).toBe("Red");
    expect(edited.weeklyStatuses[1]?.status).toBe("Yellow");
    expect(edited.actualKeyResults).toBe(item.actualKeyResults);
    expect(edited.keyResults).toBe(item.keyResults);
  });
  it("supports old workspaces without OKRs and never recreates deleted migrated rows", () => {
    expect(workspaceOkrs(workspace)).toEqual([]);
    expect(workspaceOkrs({ ...workspace, okrItems: [item] })).toEqual([item]);
    expect(workspaceOkrs({ ...workspace, okrItems: [] })).toEqual([]);
  });
  it("converts a legacy Objective into one editable natural-language row without mutating it", () => {
    const legacy: Workspace = { ...workspace, projects: [{ ...workspace.projects[0]!, objectives: [{ id: "old", title: "Retention", change: "Keep users engaged", why: "Growth", ownerId: "", startDate: "2026-10-01", endDate: "2026-12-31", lifecycle: "Active", keyResults: [], history: [] }] }] };
    const before = JSON.stringify(legacy);
    const rows = workspaceOkrs(legacy);
    expect(rows[0]?.objective).toContain("Keep users engaged");
    expect(rows[0]?.projectIds).toEqual(["p"]);
    expect(rows[0]?.id).toBe("legacy:p:old");
    expect(rows[0]?.keyResults).toBe("Key Results not yet defined");
    expect(JSON.stringify(legacy)).toBe(before);
    expect(workspaceOkrs({ ...legacy, okrItems: [] })).toEqual([]);
  });
  it("migrates measurements, latest weekly forecasts and plans without dropping originals", () => {
    const check = (id: string, day: string, status: CheckIn["status"]): CheckIn => ({ id, createdAt: `${day}T12:00:00Z`, measuredOn: day, author: "Owner", status, value: 36, periodStart: "", note: id, evidence: "", blockers: "", nextAction: "Ship experiment", nextReview: "", reflection: "", planId: "", definitionVersion: 1, unit: "%", measurementDefinition: "Activation", supersedes: "", correctionReason: "" });
    const kr: KeyResult = { id: "kr", title: "Activation", ownerId: "", startDate: "2026-10-01", endDate: "2026-12-31", lifecycle: "Active", baseline: 25, baselineDate: "2026-10-01", target: 40, unit: "%", direction: "Increase", successCriteria: "Hold four weeks", guardrails: "", definition: "Activation", scope: "New users", aggregation: "Weekly", cadenceDays: 7, source: "Analytics", referenceUrl: "", definitionVersion: 1, checkIns: [check("early", "2026-10-05", "Red"), check("latest", "2026-10-06", "Green")], taskLinks: [], plans: [], retrospectives: [], history: [] };
    const objective: Objective = { id: "old", title: "Retention", change: "Keep users engaged", why: "Growth", ownerId: "", startDate: "2026-10-01", endDate: "2026-12-31", lifecycle: "Active", history: [], keyResults: [kr, { ...kr, id: "support", checkIns: [], plans: [{ id: "plan", problem: "Slow onboarding", cause: "", support: "", returnCriteria: "Activation recovers", nextReview: "2026-10-15", state: "Open", verification: "", actions: [{ id: "a", title: "Simplify signup", effect: "", ownerId: "", dueDate: "2026-10-15", status: "To do" }], taskLinks: [], riskIds: [], history: [] }] }] };
    const legacy: Workspace = { ...workspace, projects: [{ id: "p", name: "Project", tasks: [], objectives: [objective] }] };
    const before = JSON.stringify(legacy);
    const [converted] = workspaceOkrs(legacy);
    expect(converted?.actualKeyResults).toContain("36 %");
    expect(converted?.keyResults).toContain("Target: 40 %");
    expect(converted?.weeklyStatuses[0]?.status).toBe("Green");
    expect(converted?.weeklyStatuses[0]?.note).toContain("early");
    expect(converted?.weeklyStatuses[1]?.week).toBe("2026-10-12");
    expect(converted?.weeklyStatuses[1]?.pathToGreen).toContain("Simplify signup");
    expect(JSON.stringify(legacy)).toBe(before);
  });
});
