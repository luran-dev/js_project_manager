import { addDays, daysBetween, isWorkingDay } from "./schedule";
import type { ProjectState, User, UserId, Workspace } from "./types";

export type ResourceProjectLoad = { readonly projectId: string; readonly projectName: string; readonly hours: number; readonly tasks: number };
export type ResourceDailyLoad = { readonly date: string; readonly hours: number; readonly capacity: number; readonly projects: readonly string[] };
export type ResourceLoad = {
  readonly userId: UserId;
  readonly name: string;
  readonly totalHours: number;
  readonly capacityHours: number;
  readonly utilization: number;
  readonly overallocatedDays: number;
  readonly peakDailyHours: number;
  readonly projectLoads: readonly ResourceProjectLoad[];
  readonly dailyLoads: readonly ResourceDailyLoad[];
};

const taskDailyHours = (estimatedHours: number, duration: number): number => estimatedHours / Math.max(1, duration);

const workspaceRange = (projects: readonly ProjectState[]): readonly [string, string] => {
  const dates = projects.flatMap((project) => project.tasks.flatMap((task) => [task.startDate, task.endDate])).sort();
  return [dates[0] ?? "2026-06-01", dates.at(-1) ?? "2026-06-30"];
};

const projectLoad = (userId: UserId, project: ProjectState): ResourceProjectLoad => {
  const tasks = project.tasks.filter((task) => task.assigneeId === userId && task.estimatedHours > 0);
  return { projectId: project.id, projectName: project.name, hours: tasks.reduce((sum, task) => sum + task.estimatedHours, 0), tasks: tasks.length };
};

export const buildResourceLoads = (workspace: Workspace): readonly ResourceLoad[] => {
  const [startDate, endDate] = workspaceRange(workspace.projects);
  const dates = Array.from({ length: daysBetween(startDate, endDate) + 1 }, (_value, index) => addDays(startDate, index));
  return workspace.users.map((user: User) => {
    const projectLoads = workspace.projects.map((project) => projectLoad(user.id, project)).filter((load) => load.hours > 0);
    const totalHours = projectLoads.reduce((sum, load) => sum + load.hours, 0);
    const dailyLoads: readonly ResourceDailyLoad[] = dates.map((date) => {
      const capacity = workspace.projects.some((project) => isWorkingDay(date, user.id, workspace.ptos, project.defaultCountry ?? "Korea")) ? user.dailyCapacityHours : 0;
      const activeProjects = workspace.projects.filter((project) => project.tasks.some((task) => task.assigneeId === user.id && task.startDate <= date && date <= task.endDate && task.estimatedHours > 0));
      const hours = capacity === 0 ? 0 : activeProjects.flatMap((project) => project.tasks).filter((task) => task.assigneeId === user.id && task.startDate <= date && date <= task.endDate && task.estimatedHours > 0).reduce((sum, task) => sum + taskDailyHours(task.estimatedHours, task.duration), 0);
      return { date, capacity, hours, projects: activeProjects.map((project) => project.name) };
    });
    const capacityHours = dailyLoads.reduce((sum, day) => sum + day.capacity, 0);
    return { userId: user.id, name: user.name, totalHours, capacityHours, utilization: capacityHours === 0 ? 0 : Math.round((totalHours / capacityHours) * 100), overallocatedDays: dailyLoads.filter((day) => day.hours > day.capacity).length, peakDailyHours: Math.ceil(Math.max(0, ...dailyLoads.map((day) => day.hours))), projectLoads, dailyLoads };
  });
};
