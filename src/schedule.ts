import type { ProjectCountry, Pto, Task, TaskId, UserId } from "./types";

const dayMs = 86_400_000;
const holidays: Record<ProjectCountry, readonly string[]> = {
  Korea: ["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-02", "2026-05-05", "2026-05-25", "2026-06-03", "2026-06-06", "2026-07-17", "2026-08-17", "2026-09-24", "2026-09-25", "2026-09-26", "2026-10-05", "2026-10-09", "2026-12-25"],
  India: ["2026-01-26", "2026-03-21", "2026-03-31", "2026-04-03", "2026-05-01", "2026-05-27", "2026-06-26", "2026-08-15", "2026-08-26", "2026-10-02", "2026-10-20", "2026-11-08", "2026-12-25"],
  China: ["2026-01-01", "2026-01-02", "2026-01-03", "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23", "2026-04-04", "2026-04-05", "2026-04-06", "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05", "2026-06-19", "2026-06-20", "2026-06-21", "2026-09-25", "2026-09-26", "2026-09-27", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"],
  US: ["2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-10-12", "2026-11-11", "2026-11-26", "2026-12-25"],
};

export const toDate = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

export const toIsoDay = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (date: string, days: number): string => {
  const next = toDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return toIsoDay(next);
};

export const daysBetween = (startDate: string, endDate: string): number =>
  Math.round((toDate(endDate).getTime() - toDate(startDate).getTime()) / dayMs);

const isWeekend = (date: string): boolean => {
  const day = toDate(date).getUTCDay();
  return day === 0 || day === 6;
};

export const isHoliday = (date: string, country: ProjectCountry = "Korea"): boolean => holidays[country].includes(date);

export const isPtoDay = (date: string, userId: UserId | undefined, ptos: readonly Pto[]): boolean =>
  userId !== undefined && ptos.some((pto) => pto.userId === userId && pto.startDate <= date && date <= pto.endDate);

export const isWorkingDay = (date: string, userId: UserId | undefined, ptos: readonly Pto[], country: ProjectCountry = "Korea"): boolean =>
  !isWeekend(date) && !isHoliday(date, country) && !isPtoDay(date, userId, ptos);

export const nextWorkingDay = (date: string, userId: UserId | undefined, ptos: readonly Pto[], country: ProjectCountry = "Korea"): string => {
  let cursor = date;
  while (!isWorkingDay(cursor, userId, ptos, country)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
};

export const addWorkingDays = (
  startDate: string,
  duration: number,
  userId: UserId | undefined,
  ptos: readonly Pto[],
  country: ProjectCountry = "Korea",
): string => {
  if (duration <= 1) {
    return nextWorkingDay(startDate, userId, ptos, country);
  }

  let cursor = nextWorkingDay(startDate, userId, ptos, country);
  let remaining = duration - 1;
  while (remaining > 0) {
    cursor = addDays(cursor, 1);
    if (isWorkingDay(cursor, userId, ptos, country)) {
      remaining -= 1;
    }
  }
  return cursor;
};

export const workingDaysBetween = (startDate: string, endDate: string, userId: UserId | undefined, ptos: readonly Pto[], country: ProjectCountry = "Korea"): number => {
  let count = 0;
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (isWorkingDay(cursor, userId, ptos, country)) { count += 1; }
  }
  return count;
};

export const cascadeTasks = (tasks: readonly Task[], ptos: readonly Pto[], country: ProjectCountry = "Korea"): readonly Task[] => {
  const byId = new Map<TaskId, Task>(tasks.map((task) => [task.id, task]));
  const result = new Map<TaskId, Task>(tasks.map((task) => [task.id, task]));

  for (let pass = 0; pass < tasks.length; pass += 1) {
    for (const task of tasks) {
      const latestDependencyEnd = task.dependencyIds
        .map((id) => result.get(id) ?? byId.get(id))
        .filter((dependency): dependency is Task => dependency !== undefined)
        .map((dependency) => dependency.endDate)
        .sort()
        .at(-1);

      if (latestDependencyEnd === undefined || task.duration === 0) {
        result.set(task.id, task);
        continue;
      }

      const earliestStartDate = nextWorkingDay(addDays(latestDependencyEnd, 1), task.assigneeId, ptos, country);
      const startDate = nextWorkingDay(task.startDate > earliestStartDate ? task.startDate : earliestStartDate, task.assigneeId, ptos, country);
      const endDate = addWorkingDays(startDate, task.duration, task.assigneeId, ptos, country);
      result.set(task.id, { ...task, startDate, endDate });
    }
  }

  return summarizeParents(tasks.map((task) => result.get(task.id) ?? task));
};

const summarizeParents = (tasks: readonly Task[]): readonly Task[] =>
  tasks.map((task) => {
    const children = tasks.filter((candidate) => candidate.parentId === task.id);
    if (children.length === 0) {
      return task;
    }

    const progress = Math.round(children.reduce((sum, child) => sum + child.progress, 0) / children.length);
    const startDate = children.map((child) => child.startDate).sort()[0] ?? task.startDate;
    const endDate = children.map((child) => child.endDate).sort().at(-1) ?? task.endDate;
    return { ...task, startDate, endDate, progress, duration: Math.max(1, daysBetween(startDate, endDate)) };
  });

export const visibleTasks = (tasks: readonly Task[], collapsedIds: ReadonlySet<TaskId>): readonly Task[] =>
  tasks
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((task) => {
      if (task.parentId === undefined) {
        return true;
      }
      return !collapsedIds.has(task.parentId);
    });
