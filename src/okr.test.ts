import { describe, expect, it } from "vitest";
import { currentMeasurement, definitionChanged, effectiveCheckIns, latestJudgment, linkedKeyResults, measurementFreshness, targetGap } from "./okr";
import type { CheckIn, KeyResult, Objective } from "./okrTypes";

const kr: KeyResult = { id: "kr", title: "Activation", ownerId: "", startDate: "2026-01-01", endDate: "2026-12-31", lifecycle: "Active", baseline: 25, baselineDate: "2026-01-01", target: 40, unit: "%", direction: "Increase", successCriteria: "Hold 4 weeks", guardrails: "Error < 1%", definition: "Activated / signups", scope: "New users", aggregation: "Weekly", cadenceDays: 7, source: "Analytics", referenceUrl: "", definitionVersion: 1, checkIns: [], taskLinks: [], plans: [], retrospectives: [], history: [] };
const check = (id: string, measuredOn: string, value: number | null, changes: Partial<CheckIn> = {}): CheckIn => ({ id, measuredOn, value, createdAt: `${measuredOn}T10:00:00Z`, author: "Owner", periodStart: "", status: "Yellow", note: "Needs recovery", evidence: "", blockers: "", nextAction: "", nextReview: "", reflection: "", planId: "", definitionVersion: 1, unit: "%", measurementDefinition: "Activation", supersedes: "", correctionReason: "", ...changes });

describe("OKR measurements stay independent of execution", () => {
  it("distinguishes missing and zero and uses measurement date for current value", () => {
    expect(currentMeasurement(kr)).toBeUndefined();
    const measured = { ...kr, checkIns: [check("new", "2026-10-05", 0), check("backfill", "2026-09-01", 30, { createdAt: "2026-10-06T00:00:00Z" })] };
    expect(currentMeasurement(measured)?.value).toBe(0);
    expect(latestJudgment(measured)?.id).toBe("backfill");
    expect(measurementFreshness(measured, "2026-10-13")).toBe("Stale · 8 days old");
    expect(measurementFreshness(measured, "2026-10-12")).toBe("Measured 2026-10-05");
  });
  it("retains corrections and excludes superseded values", () => {
    const original = check("original", "2026-10-05", 30);
    const corrected = check("corrected", "2026-10-05", 33, { supersedes: original.id, correctionReason: "Source corrected" });
    const next = { ...kr, checkIns: [original, corrected] };
    expect(effectiveCheckIns(next)).toEqual([corrected]);
    expect(next.checkIns).toHaveLength(2);
  });
  it("never reinterprets earlier definition versions", () => {
    const next = { ...kr, definitionVersion: 2, checkIns: [check("old", "2026-10-05", 30)] };
    expect(currentMeasurement(next)).toBeUndefined();
    expect(measurementFreshness(next)).toBe("Not measured");
    expect(definitionChanged(kr, { ...kr, unit: "users" })).toBe(true);
    expect(definitionChanged(kr, { ...kr, target: 45 })).toBe(false);
  });
  it("handles increase, decrease, exceed and equal baseline/target without dividing by zero", () => {
    expect(targetGap(kr)).toBeNull();
    expect(targetGap({ ...kr, checkIns: [check("a", "2026-10-05", 45)] })).toBe(0);
    expect(targetGap({ ...kr, baseline: 60, target: 40, direction: "Decrease", checkIns: [check("a", "2026-10-05", 50)] })).toBe(10);
    expect(targetGap({ ...kr, baseline: 40, target: 40, checkIns: [check("a", "2026-10-05", 40)] })).toBe(0);
  });
  it("supports many-to-many task links without deriving outcome values", () => {
    const linked = { ...kr, taskLinks: [{ taskId: "task", title: "Work", contribution: "Experiment" }] };
    const objective: Objective = { id: "o", title: "Grow", change: "Improve activation", why: "Retention", ownerId: "", startDate: "2026-01-01", endDate: "2026-12-31", lifecycle: "Active", history: [], keyResults: [linked, { ...linked, id: "kr2" }] };
    expect(linkedKeyResults([objective], "task")).toHaveLength(2);
    expect(currentMeasurement(linked)).toBeUndefined();
    expect(latestJudgment(linked)).toBeUndefined();
  });
});
