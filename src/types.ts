export type TaskId = string;
export type UserId = string;

export type Zoom = "day" | "week" | "month";
export const PROJECT_COUNTRIES = ["Korea", "India", "China", "US"] as const;
export type ProjectCountry = typeof PROJECT_COUNTRIES[number];
export const TASK_STATUSES = ["TO DO", "IN PROGRESS", "IN QA", "DONE", "BLOCKED", "DROPPED"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const TASK_PROGRESS_COLORS = ["grey", "yellow", "red", "green", "blue"] as const;
export type TaskProgressColor = typeof TASK_PROGRESS_COLORS[number];
export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
export type WorkspaceRole = typeof WORKSPACE_ROLES[number];

export type User = {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  readonly dailyCapacityHours: number;
};

export type CurrentUser = {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  readonly defaultCountry: ProjectCountry;
  readonly workspaceMemberships: readonly WorkspaceMembership[];
};

export type WorkspaceMembership = {
  readonly userId: UserId;
  readonly workspaceId: string;
  readonly role: WorkspaceRole;
};

export type Pto = {
  readonly userId: UserId;
  readonly startDate: string;
  readonly endDate: string;
  readonly reason: string;
};

export type Task = {
  readonly id: TaskId;
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly duration: number;
  readonly status: TaskStatus;
  readonly progress: number;
  readonly progressColor?: TaskProgressColor;
  readonly estimatedHours: number;
  readonly assigneeId?: UserId;
  readonly parentId?: TaskId;
  readonly sortOrder: number;
  readonly dependencyIds: readonly TaskId[];
  readonly milestone?: boolean;
};

export type ProjectState = {
  readonly id: string;
  readonly name: string;
  readonly defaultCountry?: ProjectCountry;
  readonly tasks: readonly Task[];
};

export type Workspace = {
  readonly id: string;
  readonly name: string;
  readonly users: readonly User[];
  readonly ptos: readonly Pto[];
  readonly projects: readonly ProjectState[];
};
