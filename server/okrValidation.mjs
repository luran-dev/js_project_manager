import { HttpError } from "./passwordReset.mjs";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = (message, status = 400) => { throw new HttpError(status, message); };
const array = (value, name) => { if (!Array.isArray(value)) fail(`${name} must be an array`); return value; };
const unique = (items, name) => {
  const ids = items.map((item) => item?.id);
  if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) fail(`${name} IDs must be unique`);
};
const strings = (value, fields) => { for (const field of fields) if (typeof value[field] !== "string") fail(`Invalid OKR ${field}`); };
const date = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const period = (item) => { if (!date(item.startDate) || !date(item.endDate) || item.startDate > item.endDate) fail("Invalid OKR period"); };
const preserve = (before = [], after, name) => {
  array(after, name); unique(after, name);
  for (const item of before) if (!after.some((next) => next.id === item.id && same(next, item))) fail(`${name} is append-only`);
};
const history = (before, after) => {
  preserve(before ?? [], after, "Change history");
  for (const item of after) { strings(item, ["at", "author", "reason", "before", "after"]); if (!item.reason.trim()) fail("Change reason is required"); }
};
const owner = (id, users, previous = "") => { if (id && id !== previous && !users.some((user) => user.id === id)) fail("Owner must belong to this workspace"); };
const links = (next, previous, tasks) => {
  array(next, "Task links");
  if (new Set(next.map((link) => link.taskId)).size !== next.length) fail("Duplicate task links");
  for (const link of next) {
    strings(link, ["taskId", "title", "contribution"]);
    if (!tasks.some((task) => task.id === link.taskId) && !previous?.some((old) => same(old, link))) fail("Task link must belong to this project");
  }
};
const lifecycle = (item) => { if (!["Draft", "Active", "Closed", "Archived"].includes(item.lifecycle)) fail("Invalid OKR lifecycle"); };
const requireChangeHistory = (before, after, excluded = []) => {
  if (!before) return;
  const content = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== "history" && !excluded.includes(key)));
  if (!same(content(before), content(after)) && after.history.length <= before.history.length) fail("Changes require a new history entry and reason");
};

export function validateProjectOkrs(project, previous, users) {
  const objectives = array(project.objectives ?? [], "Objectives"); unique(objectives, "Objective");
  const allKrIds = objectives.flatMap((item) => array(item.keyResults, "Key Results")).map((kr) => kr.id);
  if (new Set(allKrIds).size !== allKrIds.length) fail("Key Result IDs must be unique within the project");
  for (const old of previous?.objectives ?? []) if (!objectives.some((item) => item.id === old.id)) fail("Archive Objectives instead of deleting them");
  for (const objective of objectives) {
    const oldObjective = previous?.objectives?.find((item) => item.id === objective.id);
    if (oldObjective?.lifecycle === "Archived" && objective.lifecycle === "Archived" && !same(oldObjective, objective)) fail("Reopen archived Objectives before editing");
    strings(objective, ["title", "change", "why", "ownerId"]); period(objective); lifecycle(objective);
    if (!objective.title.trim() || !objective.change.trim() || !objective.why.trim()) fail("Objective title, change and purpose are required");
    owner(objective.ownerId, users, oldObjective?.ownerId); history(oldObjective?.history, objective.history);
    requireChangeHistory(oldObjective, objective, ["keyResults"]);
    for (const old of oldObjective?.keyResults ?? []) if (!objective.keyResults.some((item) => item.id === old.id)) fail("Archive Key Results instead of deleting them");
    for (const kr of objective.keyResults) {
      const old = oldObjective?.keyResults.find((item) => item.id === kr.id);
      if (old?.lifecycle === "Archived" && kr.lifecycle === "Archived" && !same(old, kr)) fail("Reopen archived Key Results before editing");
      strings(kr, ["title", "ownerId", "unit", "successCriteria", "guardrails", "definition", "scope", "aggregation", "source", "referenceUrl"]);
      if (![kr.title, kr.unit, kr.successCriteria, kr.definition, kr.scope, kr.aggregation, kr.source].every((value) => value.trim())) fail("Key Result measurement and success definitions are required");
      period(kr); lifecycle(kr); owner(kr.ownerId, users, old?.ownerId); history(old?.history, kr.history);
      requireChangeHistory(old, kr, ["checkIns", "plans", "retrospectives"]);
      if (!Number.isFinite(kr.baseline) || !Number.isFinite(kr.target) || !Number.isInteger(kr.cadenceDays) || kr.cadenceDays < 1 || !date(kr.baselineDate)) fail("Invalid measurement values or cadence");
      if (!["Increase", "Decrease"].includes(kr.direction) || (kr.direction === "Increase" ? kr.target < kr.baseline : kr.target > kr.baseline)) fail("Target does not match improvement direction");
      const changed = old && ["definition", "scope", "aggregation", "source", "unit", "direction"].some((field) => old[field] !== kr[field]);
      if (kr.definitionVersion !== (old ? old.definitionVersion + (changed ? 1 : 0) : 1)) fail("Invalid measurement definition version");
      links(kr.taskLinks, old?.taskLinks, project.tasks);
      preserve(old?.checkIns, kr.checkIns, "Check-ins");
      array(kr.plans, "Recovery plans");
      const superseded = new Set();
      for (const check of kr.checkIns) {
        strings(check, ["createdAt", "author", "measuredOn", "periodStart", "note", "evidence", "blockers", "nextAction", "nextReview", "reflection", "planId", "unit", "measurementDefinition", "supersedes", "correctionReason"]);
        if (!check.note.trim() || !date(check.measuredOn) || (check.periodStart && (!date(check.periodStart) || check.periodStart > check.measuredOn)) || (check.value !== null && !Number.isFinite(check.value)) || !["Pending", "Green", "Yellow", "Red"].includes(check.status)) fail("Invalid check-in measurement or judgment");
        if (!Number.isInteger(check.definitionVersion) || check.definitionVersion < 1 || check.definitionVersion > kr.definitionVersion) fail("Invalid check-in definition version");
        if (!old?.checkIns.some((item) => item.id === check.id) && !check.supersedes) {
          const expectedDefinition = JSON.stringify({ definition: kr.definition, scope: kr.scope, aggregation: kr.aggregation, source: kr.source, unit: kr.unit });
          if (check.definitionVersion !== kr.definitionVersion || check.unit !== kr.unit || check.measurementDefinition !== expectedDefinition) fail("Check-in must use the current measurement definition");
        }
        if (check.supersedes) {
          const original = old?.checkIns.find((item) => item.id === check.supersedes);
          if (!original || original.id === check.id || original.createdAt > check.createdAt || !check.correctionReason.trim() || original.definitionVersion !== check.definitionVersion || superseded.has(check.supersedes)) fail("Invalid check-in correction");
          if (check.unit !== original.unit || check.measurementDefinition !== original.measurementDefinition) fail("Corrections must preserve the original measurement definition");
          superseded.add(check.supersedes);
        }
        if (check.planId && !kr.plans.some((plan) => plan.id === check.planId)) fail("Check-in plan must belong to this Key Result");
      }
      array(kr.plans, "Recovery plans"); unique(kr.plans, "Recovery plan");
      for (const plan of old?.plans ?? []) if (!kr.plans.some((item) => item.id === plan.id)) fail("Close recovery plans instead of deleting them");
      for (const plan of kr.plans) {
        const oldPlan = old?.plans.find((item) => item.id === plan.id);
        strings(plan, ["problem", "cause", "support", "returnCriteria", "nextReview", "verification"]);
        if (![plan.problem, plan.cause, plan.returnCriteria].every((value) => value.trim()) || !date(plan.nextReview) || !["Open", "Closed"].includes(plan.state) || (plan.state === "Closed" && !plan.verification.trim())) fail("Recovery plan and verification fields are required");
        history(oldPlan?.history, plan.history); links(plan.taskLinks, oldPlan?.taskLinks, project.tasks);
        requireChangeHistory(oldPlan, plan);
        array(plan.actions, "Recovery actions"); unique(plan.actions, "Recovery action");
        if (!plan.actions.length) fail("A recovery action is required");
        for (const action of plan.actions) {
          strings(action, ["title", "effect", "ownerId", "dueDate", "status"]);
          if (!action.title.trim() || !action.effect.trim() || !action.ownerId || !date(action.dueDate) || !["To do", "In progress", "Done"].includes(action.status)) fail("Invalid recovery action");
          owner(action.ownerId, users, oldPlan?.actions.find((item) => item.id === action.id)?.ownerId);
        }
        for (const id of array(plan.riskIds, "Risk links")) if (!project.risks?.some((risk) => risk.id === id) && !oldPlan?.riskIds.includes(id)) fail("Risk link must belong to this project");
      }
      preserve(old?.retrospectives, kr.retrospectives, "Retrospectives");
      for (const item of kr.retrospectives) { strings(item, ["at", "author", "evidence", "executionEffect", "lessons", "carryForward"]); if (!["Met", "Not met", "Inconclusive"].includes(item.result)) fail("Invalid success assessment"); }
    }
  }
}

export const accessibleSnapshot = (snapshot) => ({ ...snapshot, workspaces: snapshot.workspaces.filter((workspace) => snapshot.currentUser.workspaceMemberships.some((member) => member.userId === snapshot.currentUser.id && member.workspaceId === workspace.id)) });

export function validateWorkspaceOkrs(workspace, previous) {
  if (workspace.okrItems === undefined) {
    if (previous?.okrItems !== undefined) fail("OKR sheet cannot be removed; delete its rows explicitly");
    return;
  }
  const items = array(workspace.okrItems, "OKR items"); unique(items, "OKR item");
  const projectIds = new Set(workspace.projects.map((project) => project.id));
  for (const item of items) {
    strings(item, ["objective", "keyResults", "actualKeyResults"]); period(item);
    if (!item.objective.trim() || !item.keyResults.trim()) fail("Objective and Target Key Results are required");
    const links = array(item.projectIds, "Project links");
    if (new Set(links).size !== links.length) fail("Duplicate project links");
    const old = previous?.okrItems?.find((candidate) => candidate.id === item.id);
    for (const id of links) {
      if (typeof id !== "string" || (!projectIds.has(id) && !old?.projectIds.includes(id))) fail("Linked project must belong to this workspace");
    }
    const weeks = array(item.weeklyStatuses, "Weekly status");
    if (new Set(weeks.map((entry) => entry.week)).size !== weeks.length) fail("Only one status is allowed per week");
    for (const entry of weeks) {
      strings(entry, ["week", "status", "note", "pathToGreen", "updatedAt", "author"]);
      if (!date(entry.week) || new Date(`${entry.week}T00:00:00Z`).getUTCDay() !== 1) fail("Weekly status must use a Monday date");
      if (!["Pending", "Green", "Yellow", "Red"].includes(entry.status) || typeof entry.planDone !== "boolean" || !Number.isFinite(Date.parse(entry.updatedAt))) fail("Invalid weekly status");
    }
  }
}

export function validateSnapshotWrite(previous, next) {
  if (next?.currentUser?.id !== previous.currentUser.id) fail("Cannot change snapshot identity", 403);
  const workspaces = array(next.workspaces, "Workspaces"); unique(workspaces, "Workspace");
  const memberships = array(next.currentUser.workspaceMemberships, "Memberships");
  for (const membership of memberships) {
    const old = previous.currentUser.workspaceMemberships.find((item) => item.workspaceId === membership.workspaceId);
    if (membership.userId !== previous.currentUser.id || (old ? membership.role !== old.role : previous.workspaces.some((item) => item.id === membership.workspaceId) || membership.role !== "OWNER")) fail("Cannot grant workspace access", 403);
  }
  for (const workspace of workspaces) {
    const old = previous.workspaces.find((item) => item.id === workspace.id);
    const member = previous.currentUser.workspaceMemberships.find((item) => item.workspaceId === workspace.id && item.userId === previous.currentUser.id);
    if (old && !member) { if (!same(old, workspace)) fail("Workspace access denied", 403); continue; }
    if (member?.role === "VIEWER" && !same(old, workspace)) fail("Viewer workspaces are read-only", 403);
    if (!old && !memberships.some((item) => item.workspaceId === workspace.id && item.role === "OWNER")) fail("Workspace access denied", 403);
    array(workspace.projects, "Projects"); unique(workspace.projects, "Project");
    validateWorkspaceOkrs(workspace, old);
    for (const project of workspace.projects) validateProjectOkrs(project, old?.projects.find((item) => item.id === project.id), workspace.users);
  }
  for (const workspace of previous.workspaces) {
    const member = previous.currentUser.workspaceMemberships.find((item) => item.workspaceId === workspace.id);
    if (member?.role === "VIEWER" && !workspaces.some((item) => item.id === workspace.id)) fail("Viewer workspaces cannot be deleted", 403);
  }
  return { ...next, workspaces: [...workspaces, ...previous.workspaces.filter((workspace) => !previous.currentUser.workspaceMemberships.some((member) => member.workspaceId === workspace.id) && !workspaces.some((item) => item.id === workspace.id))] };
}
