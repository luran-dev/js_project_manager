import type { Workspace } from "./types";

const seedTasks: Workspace["projects"][number]["tasks"] = [
  { id: "p1", title: "Project Phase 1", startDate: "2026-06-03", endDate: "2026-07-29", duration: 40, status: "IN PROGRESS", progress: 10, estimatedHours: 0, sortOrder: 1, dependencyIds: [] },
  { id: "t11", title: "Task 1.1", startDate: "2026-06-03", endDate: "2026-06-08", duration: 4, status: "DONE", progress: 30, estimatedHours: 16, assigneeId: "u1", parentId: "p1", sortOrder: 2, dependencyIds: [] },
  { id: "t12", title: "Task 1.2", startDate: "2026-06-09", endDate: "2026-06-18", duration: 8, status: "IN PROGRESS", progress: 60, estimatedHours: 40, assigneeId: "u2", parentId: "p1", sortOrder: 3, dependencyIds: ["t11"] },
  { id: "t13", title: "Task 1.3", startDate: "2026-06-19", endDate: "2026-06-24", duration: 4, status: "IN QA", progress: 60, estimatedHours: 24, assigneeId: "u1", parentId: "p1", sortOrder: 4, dependencyIds: ["t12"] },
  { id: "t14", title: "Task 1.4", startDate: "2026-06-25", endDate: "2026-07-01", duration: 5, status: "BLOCKED", progress: 82, estimatedHours: 24, assigneeId: "u2", parentId: "p1", sortOrder: 5, dependencyIds: ["t13"] },
  { id: "p2", title: "Project Phase 2", startDate: "2026-07-02", endDate: "2026-08-21", duration: 36, status: "TO DO", progress: 28, estimatedHours: 0, sortOrder: 6, dependencyIds: ["t14"] },
  { id: "t21", title: "Task 2.1", startDate: "2026-07-02", endDate: "2026-07-14", duration: 8, status: "TO DO", progress: 30, estimatedHours: 32, assigneeId: "u2", parentId: "p2", sortOrder: 7, dependencyIds: ["t14"] },
  { id: "t22", title: "Task 2.2", startDate: "2026-07-15", endDate: "2026-07-23", duration: 7, status: "DROPPED", progress: 90, estimatedHours: 48, assigneeId: "u2", parentId: "p2", sortOrder: 8, dependencyIds: ["t21"] },
  { id: "t23", title: "Task 2.3", startDate: "2026-07-24", endDate: "2026-07-31", duration: 6, status: "TO DO", progress: 60, estimatedHours: 30, assigneeId: "u1", parentId: "p2", sortOrder: 9, dependencyIds: ["t22"] },
  { id: "t24", title: "Task 2.4", startDate: "2026-08-03", endDate: "2026-08-07", duration: 5, status: "TO DO", progress: 70, estimatedHours: 20, assigneeId: "u2", parentId: "p2", sortOrder: 10, dependencyIds: ["t23"] },
  { id: "t25", title: "Task 2.5", startDate: "2026-08-10", endDate: "2026-08-14", duration: 5, status: "TO DO", progress: 10, estimatedHours: 20, assigneeId: "u3", parentId: "p2", sortOrder: 11, dependencyIds: ["t24"] },
  { id: "m1", title: "Task 1 Milestone", startDate: "2026-08-17", endDate: "2026-08-17", duration: 0, status: "TO DO", progress: 0, estimatedHours: 0, parentId: "p2", sortOrder: 12, dependencyIds: ["t25"], milestone: true },
];
const launchTasks: Workspace["projects"][number]["tasks"] = [
  { id: "lp1", title: "Launch Readiness", startDate: "2026-06-09", endDate: "2026-06-24", duration: 12, status: "IN PROGRESS", progress: 35, estimatedHours: 0, sortOrder: 1, dependencyIds: [] },
  { id: "lt1", title: "Integration Support", startDate: "2026-06-09", endDate: "2026-06-18", duration: 8, status: "IN PROGRESS", progress: 30, estimatedHours: 48, assigneeId: "u2", parentId: "lp1", sortOrder: 2, dependencyIds: [] },
  { id: "lt2", title: "Release QA", startDate: "2026-06-19", endDate: "2026-06-24", duration: 4, status: "IN QA", progress: 20, estimatedHours: 24, assigneeId: "u1", parentId: "lp1", sortOrder: 3, dependencyIds: ["lt1"] },
];

export const initialWorkspaces: readonly Workspace[] = [{
  id: "w1",
  name: "Product Delivery",
  users: [
    { id: "u1", name: "Username", email: "user@example.com", dailyCapacityHours: 8 },
    { id: "u2", name: "ProjectVibe", email: "team@projectvibe.local", dailyCapacityHours: 8 },
    { id: "u3", name: "Planner", email: "planner@projectvibe.local", dailyCapacityHours: 6 },
  ],
  ptos: [
    { userId: "u1", startDate: "2026-07-08", endDate: "2026-07-10", reason: "Summer PTO" },
    { userId: "u2", startDate: "2026-08-06", endDate: "2026-08-07", reason: "Workshop" },
  ],
  projects: [
    { id: "project-phase-1", name: "Project Phase 1", defaultCountry: "Korea", tasks: seedTasks },
    { id: "project-launch", name: "Mobile Launch", defaultCountry: "Korea", tasks: launchTasks },
  ],
}];
