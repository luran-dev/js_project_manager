import { daysBetween } from "./schedule";
import type { Task } from "./types";

export type ExecutionDelta = {
  readonly delayDays: number;
  readonly mdDelta: number;
};

export const actualTask = (task: Task): Task => {
  const { assigneeId: _assigneeId, ...unassignedTask } = task;
  const actual: Task = {
    ...(task.actualAssigneeId === null ? unassignedTask : task),
    startDate: task.actualStartDate ?? task.startDate,
    endDate: task.actualEndDate ?? task.endDate,
    duration: task.actualDuration ?? task.duration,
    status: task.actualStatus ?? task.status,
    progress: task.actualProgress ?? task.progress,
    estimatedHours: task.actualEstimatedHours ?? task.estimatedHours,
  };

  return {
    ...actual,
    ...(task.actualProgressColor === undefined ? {} : { progressColor: task.actualProgressColor }),
    ...(task.actualAssigneeId === undefined || task.actualAssigneeId === null ? {} : { assigneeId: task.actualAssigneeId }),
  };
};

export const executionDelta = (task: Task): ExecutionDelta => ({
  delayDays: daysBetween(task.endDate, task.actualEndDate ?? task.endDate),
  mdDelta: Math.round(((task.actualEstimatedHours ?? task.estimatedHours) - task.estimatedHours) / 8),
});
