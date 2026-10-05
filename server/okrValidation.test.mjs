import { test } from "vitest";
import assert from "node:assert/strict";
import { accessibleSnapshot, validateProjectOkrs, validateSnapshotWrite, validateWorkspaceOkrs } from "./okrValidation.mjs";

const base = () => ({ currentUser: { id: "user", workspaceMemberships: [{ userId: "user", workspaceId: "w", role: "OWNER" }] }, workspaces: [{ id: "w", users: [{ id: "owner" }], projects: [{ id: "p", tasks: [{ id: "t" }] }] }, { id: "hidden", users: [], projects: [] }] });
const simpleRow = () => ({ id: "row", objective: "Improve activation", keyResults: "Reach 40%", actualKeyResults: "Currently 31%", projectIds: ["p"], startDate: "2026-10-01", endDate: "2026-12-31", weeklyStatuses: [{ week: "2026-10-05", status: "Yellow", note: "Needs recovery", pathToGreen: "Run experiment", planDone: false, updatedAt: "2026-10-05T12:00:00Z", author: "Owner" }] });

test("simple sheet accepts natural-language outcomes and only same-workspace projects", () => {
  const workspace = base().workspaces[0]; workspace.okrItems = [simpleRow()];
  assert.doesNotThrow(() => validateWorkspaceOkrs(workspace));
  workspace.okrItems[0].projectIds.push("outside");
  assert.throws(() => validateWorkspaceOkrs(workspace), /this workspace/);
});
test("weekly sheet rejects duplicate weeks, invalid status and reversed duration", () => {
  const workspace = base().workspaces[0]; workspace.okrItems = [simpleRow()];
  workspace.okrItems[0].weeklyStatuses.push({ ...workspace.okrItems[0].weeklyStatuses[0] });
  assert.throws(() => validateWorkspaceOkrs(workspace), /one status/);
  workspace.okrItems[0].weeklyStatuses.pop(); workspace.okrItems[0].weeklyStatuses[0].status = "Blue";
  assert.throws(() => validateWorkspaceOkrs(workspace), /Invalid weekly/);
  workspace.okrItems[0].weeklyStatuses = []; workspace.okrItems[0].endDate = "2025-01-01";
  assert.throws(() => validateWorkspaceOkrs(workspace), /Invalid OKR period/);
});
test("viewer cannot edit the new sheet and explicit deletion does not revert migration", () => {
  const before = base(); before.workspaces[0].okrItems = [simpleRow()]; before.currentUser.workspaceMemberships[0].role = "VIEWER";
  const next = structuredClone(before); next.workspaces[0].okrItems[0].actualKeyResults = "Changed";
  assert.throws(() => validateSnapshotWrite(before, next), /read-only/);
  before.currentUser.workspaceMemberships[0].role = "OWNER"; next.currentUser.workspaceMemberships[0].role = "OWNER";
  next.workspaces[0].okrItems = []; assert.doesNotThrow(() => validateSnapshotWrite(before, next));
  delete next.workspaces[0].okrItems; assert.throws(() => validateSnapshotWrite(before, next), /cannot be removed/);
});
const kr = () => ({ id: "kr", title: "Activation", ownerId: "owner", startDate: "2026-01-01", endDate: "2026-12-31", lifecycle: "Active", baseline: 25, baselineDate: "2026-01-01", target: 40, unit: "%", direction: "Increase", successCriteria: "Hold 4 weeks", guardrails: "", definition: "Activated / signups", scope: "New users", aggregation: "Weekly", cadenceDays: 7, source: "Analytics", referenceUrl: "", definitionVersion: 1, checkIns: [], taskLinks: [], plans: [], retrospectives: [], history: [] });
const withOkr = () => { const snapshot = base(); snapshot.workspaces[0].projects[0].objectives = [{ id: "o", title: "Growth", change: "Improve", why: "Retention", ownerId: "owner", startDate: "2026-01-01", endDate: "2026-12-31", lifecycle: "Active", keyResults: [kr()], history: [] }]; return snapshot; };
test("legacy snapshots work; hidden workspaces are not disclosed and are preserved on save", () => {
  const previous = base(), visible = accessibleSnapshot(previous);
  assert.equal(visible.workspaces.length, 1);
  assert.deepEqual(validateSnapshotWrite(previous, visible), previous);
});
test("membership escalation and hidden writes are denied", () => {
  const before = base(), next = structuredClone(before);
  next.currentUser.workspaceMemberships.push({ userId: "user", workspaceId: "hidden", role: "OWNER" });
  assert.throws(() => validateSnapshotWrite(before, next), /Cannot grant/);
  const changed = structuredClone(before); changed.workspaces[1].projects.push({ id: "h", tasks: [] });
  assert.throws(() => validateSnapshotWrite(before, changed), /access denied/);
});
test("viewer cannot mutate or delete a project or promote themselves", () => {
  const before = withOkr(); before.currentUser.workspaceMemberships[0].role = "VIEWER";
  const next = structuredClone(before); next.workspaces[0].projects[0].objectives[0].title = "Changed";
  assert.throws(() => validateSnapshotWrite(before, next), /read-only/);
  next.currentUser.workspaceMemberships[0].role = "OWNER";
  assert.throws(() => validateSnapshotWrite(before, next), /Cannot grant/);
});
test("only project-local tasks and workspace-local owners can be linked", () => {
  const next = withOkr(), project = next.workspaces[0].projects[0], result = project.objectives[0].keyResults[0];
  result.taskLinks.push({ taskId: "foreign", title: "Foreign", contribution: "" });
  assert.throws(() => validateProjectOkrs(project, undefined, next.workspaces[0].users), /this project/);
  result.taskLinks = []; result.ownerId = "foreign";
  assert.throws(() => validateProjectOkrs(project, undefined, next.workspaces[0].users), /this workspace/);
});
test("deleted task references persist; removing an Objective or rewriting history is rejected", () => {
  const before = withOkr(); before.workspaces[0].projects[0].objectives[0].keyResults[0].taskLinks.push({ taskId: "t", title: "Task", contribution: "Experiment" });
  const next = structuredClone(before); next.workspaces[0].projects[0].tasks = [];
  assert.doesNotThrow(() => validateSnapshotWrite(before, next));
  next.workspaces[0].projects[0].objectives = [];
  assert.throws(() => validateSnapshotWrite(before, next), /Archive Objectives/);
});
test("target changes require a recorded reason and finite measurement values", () => {
  const before = withOkr(), next = structuredClone(before);
  next.workspaces[0].projects[0].objectives[0].keyResults[0].target = 80;
  assert.throws(() => validateSnapshotWrite(before, next), /history entry/);
  const project = withOkr().workspaces[0].projects[0]; project.objectives[0].keyResults[0].target = null;
  assert.throws(() => validateProjectOkrs(project, undefined, [{ id: "owner" }]), /measurement values/);
});

const measurement = (result, overrides = {}) => ({ id: "check", createdAt: "2026-10-05T00:00:00.000Z", author: "Owner", measuredOn: "2026-10-05", periodStart: "", value: 30, status: "Red", note: "Recovery needed", evidence: "", blockers: "", nextAction: "", nextReview: "", reflection: "", planId: "", definitionVersion: result.definitionVersion, unit: result.unit, measurementDefinition: JSON.stringify({ definition: result.definition, scope: result.scope, aggregation: result.aggregation, source: result.source, unit: result.unit }), supersedes: "", correctionReason: "", ...overrides });
test("new measurements bind to the current definition and unit", () => {
  const before = withOkr(), next = structuredClone(before), result = next.workspaces[0].projects[0].objectives[0].keyResults[0];
  result.checkIns.push(measurement(result));
  assert.doesNotThrow(() => validateSnapshotWrite(before, next));
  result.checkIns[0].unit = "users";
  assert.throws(() => validateSnapshotWrite(before, next), /current measurement definition/);
});
test("check-ins are immutable and corrections preserve original units and definitions", () => {
  const before = withOkr(), original = before.workspaces[0].projects[0].objectives[0].keyResults[0];
  original.checkIns.push(measurement(original));
  const next = structuredClone(before), result = next.workspaces[0].projects[0].objectives[0].keyResults[0];
  result.checkIns[0].value = 50;
  assert.throws(() => validateSnapshotWrite(before, next), /append-only/);
  result.checkIns[0].value = 30;
  result.checkIns.push(measurement(result, { id: "correction", supersedes: "check", correctionReason: "Source corrected", value: 35 }));
  assert.doesNotThrow(() => validateSnapshotWrite(before, next));
  result.checkIns[1].measurementDefinition = "Different metric";
  assert.throws(() => validateSnapshotWrite(before, next), /original measurement definition/);
});
test("archived content cannot be changed until explicitly reopened", () => {
  const before = withOkr(); before.workspaces[0].projects[0].objectives[0].lifecycle = "Archived";
  const next = structuredClone(before); next.workspaces[0].projects[0].objectives[0].title = "Changed";
  assert.throws(() => validateSnapshotWrite(before, next), /Reopen archived Objectives/);
  const krBefore = withOkr(); krBefore.workspaces[0].projects[0].objectives[0].keyResults[0].lifecycle = "Archived";
  const krNext = structuredClone(krBefore); krNext.workspaces[0].projects[0].objectives[0].keyResults[0].title = "Changed";
  assert.throws(() => validateSnapshotWrite(krBefore, krNext), /Reopen archived Key Results/);
});
