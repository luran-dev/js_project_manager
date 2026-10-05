export type TaskId = string;
export type UserId = string;
export type RiskId = string;

export type Zoom = "day" | "week" | "month";
export const PROJECT_COUNTRIES = ["Korea", "India", "China", "US"] as const;
export type ProjectCountry = typeof PROJECT_COUNTRIES[number];
export const TASK_STATUSES = ["TO DO", "IN PROGRESS", "IN QA", "DONE", "BLOCKED", "DROPPED"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const TASK_PROGRESS_COLORS = ["grey", "yellow", "red", "green", "blue"] as const;
export type TaskProgressColor = typeof TASK_PROGRESS_COLORS[number];
export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
export type WorkspaceRole = typeof WORKSPACE_ROLES[number];
export const RISK_CATEGORIES = ["SCHEDULE", "RESOURCE", "TECHNICAL", "QUALITY", "COST", "EXTERNAL"] as const;
export type RiskCategory = typeof RISK_CATEGORIES[number];
export const RISK_STATUSES = ["OPEN", "MITIGATING", "MONITORING", "OCCURRED", "ACCEPTED", "CLOSED"] as const;
export type RiskStatus = typeof RISK_STATUSES[number];
export const RISK_STRATEGIES = ["AVOID", "MITIGATE", "TRANSFER", "ACCEPT"] as const;
export type RiskStrategy = typeof RISK_STRATEGIES[number];

export type RiskHistoryEntry = {
  readonly id: string;
  readonly createdAt: string;
  readonly note: string;
  readonly score: number;
};

export type ProjectRisk = {
  readonly id: RiskId;
  readonly title: string;
  readonly description: string;
  readonly category: RiskCategory;
  readonly probability: number;
  readonly impact: number;
  readonly status: RiskStatus;
  readonly strategy: RiskStrategy;
  readonly ownerId?: UserId;
  readonly taskIds: readonly TaskId[];
  readonly identifiedDate: string;
  readonly dueDate: string;
  readonly mitigationPlan: string;
  readonly contingencyPlan: string;
  readonly history: readonly RiskHistoryEntry[];
};

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

export type ResourceCapacity = {
  readonly userId: UserId;
  readonly date: string;
  readonly md: number;
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
  readonly actualStartDate?: string;
  readonly actualEndDate?: string;
  readonly actualDuration?: number;
  readonly actualStatus?: TaskStatus;
  readonly actualProgress?: number;
  readonly actualProgressColor?: TaskProgressColor;
  readonly actualEstimatedHours?: number;
  readonly actualAssigneeId?: UserId | null;
  readonly parentId?: TaskId;
  readonly sortOrder: number;
  readonly dependencyIds: readonly TaskId[];
  readonly milestone?: boolean;
};

export type ProjectState = {
  readonly objectives?: readonly import("./okrTypes").Objective[];
  readonly id: string;
  readonly name: string;
  readonly defaultCountry?: ProjectCountry;
  readonly plannerLocked?: boolean;
  readonly risks?: readonly ProjectRisk[];
  readonly tasks: readonly Task[];
};

export type Workspace = {
  readonly okrItems?: readonly import("./okrTypes").OkrItem[];
  readonly id: string;
  readonly name: string;
  readonly users: readonly User[];
  readonly ptos: readonly Pto[];
  readonly resourceCapacities?: readonly ResourceCapacity[];
  readonly projects: readonly ProjectState[];
};
