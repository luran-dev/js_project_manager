import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { executionDelta } from "./execution";
import { TASK_PROGRESS_COLORS, TASK_STATUSES, type Task, type TaskId, type TaskProgressColor, type TaskStatus, type User } from "./types";

const childCount = (tasks: readonly Task[], id: TaskId): number => tasks.filter((task) => task.parentId === id).length;
const levelOf = (task: Task, tasks: readonly Task[]): number => {
  let level = 0;
  let parentId = task.parentId;
  while (parentId !== undefined) {
    const parent = tasks.find((candidate) => candidate.id === parentId);
    if (parent === undefined) { break; }
    level += 1;
    parentId = parent.parentId;
  }
  return level;
};
const parseStatus = (value: string): TaskStatus => TASK_STATUSES.find((status) => status === value) ?? "TO DO";
const parseProgressColor = (value: string): TaskProgressColor => TASK_PROGRESS_COLORS.find((color) => color === value) ?? "green";
const taskProgressColor = (task: Task): TaskProgressColor => task.progressColor ?? (task.progress === 0 ? "grey" : "green");

type Props = {
  readonly rows: readonly Task[];
  readonly actualRows: readonly Task[];
  readonly allTasks: readonly Task[];
  readonly users: readonly User[];
  readonly collapsedIds: ReadonlySet<TaskId>;
  readonly showBaseline: boolean;
  readonly onToggle: (id: TaskId) => void;
  readonly onActualDateChange: (id: TaskId, startDate: string, endDate: string) => void;
  readonly onActualDurationChange: (id: TaskId, duration: number) => void;
  readonly onActualStatusChange: (id: TaskId, status: TaskStatus) => void;
  readonly onActualProgressChange: (id: TaskId, progress: number) => void;
  readonly onActualProgressColorChange: (id: TaskId, color: TaskProgressColor) => void;
  readonly onActualAssigneeChange: (id: TaskId, userId: string) => void;
  readonly onActualEstimatedHoursChange: (id: TaskId, hours: number) => void;
};

export function ExecutionTable({ rows, actualRows, allTasks, users, collapsedIds, showBaseline, onToggle, onActualDateChange, onActualDurationChange, onActualStatusChange, onActualProgressChange, onActualProgressColorChange, onActualAssigneeChange, onActualEstimatedHoursChange }: Props) {
  const [durationText, setDurationText] = useState<Record<TaskId, string>>({});
  const [progressText, setProgressText] = useState<Record<TaskId, string>>({});
  const [hoursText, setHoursText] = useState<Record<TaskId, string>>({});
  const actualById = new Map(actualRows.map((task) => [task.id, task]));

  return (
    <div className="wbs-pane execution-table">
      <div className="wbs-title">Execution</div>
      <table>
        <thead><tr><th>#</th><th>Task</th><th>Row</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Duration</th><th>Progress</th><th>Assigned To</th><th>MD</th><th>Variance</th></tr></thead>
        <tbody>
          {rows.flatMap((baseline, index) => {
            const actual = actualById.get(baseline.id) ?? baseline;
            const children = childCount(allTasks, baseline.id);
            const editable = children === 0;
            const delta = executionDelta({ ...baseline, actualEndDate: actual.endDate, actualEstimatedHours: actual.estimatedHours });
            const taskCell = (
              <td className="task-name" style={{ paddingInlineStart: `${12 + levelOf(baseline, allTasks) * 22}px` }}>
                  {children > 0 ? <button className="icon-button" aria-expanded={!collapsedIds.has(baseline.id)} onClick={() => onToggle(baseline.id)}>{collapsedIds.has(baseline.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button> : <span className="indent-spacer" />}
                  <span className={children > 0 ? "summary-task" : ""}>{baseline.title}</span>
                </td>
            );
            return [
              ...(showBaseline ? [<tr key={`${baseline.id}-planned`} className="planned-row">
                <td>{index + 1}</td>
                {taskCell}
                <td><span className="row-kind planned">Planned</span></td>
                <td>{baseline.status}</td>
                <td>{baseline.startDate}</td>
                <td>{baseline.endDate}</td>
                <td>{baseline.duration}</td>
                <td>{baseline.progress}%</td>
                <td>{users.find((user) => user.id === baseline.assigneeId)?.name ?? "Unassigned"}</td>
                <td>{Math.round(baseline.estimatedHours / 8)}</td>
                <td>Baseline</td>
              </tr>] : []),
              <tr key={`${baseline.id}-actual`} className="actual-row">
                <td>{showBaseline ? "" : index + 1}</td>
                {showBaseline ? <td /> : taskCell}
                <td><span className="row-kind actual">Actual</span></td>
                <td><select className="status-select" value={actual.status} aria-label={`${baseline.title} actual status`} onChange={(event) => onActualStatusChange(baseline.id, parseStatus(event.target.value))}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
                <td><input className="date-input" type="date" value={actual.startDate} disabled={!editable} aria-label={`${baseline.title} actual start date`} onChange={(event) => onActualDateChange(baseline.id, event.target.value, actual.endDate)} /></td>
                <td><input className="date-input" type="date" value={actual.endDate} min={actual.startDate} disabled={!editable} aria-label={`${baseline.title} actual end date`} onChange={(event) => onActualDateChange(baseline.id, actual.startDate, event.target.value)} /></td>
                <td><input className="duration-input" type="text" inputMode="numeric" pattern="[0-9]*" value={durationText[baseline.id] ?? String(actual.duration)} disabled={!editable} aria-label={`${baseline.title} actual duration`} onBlur={() => setDurationText((current) => ({ ...current, [baseline.id]: String(actual.duration) }))} onChange={(event) => {
                  const value = event.target.value;
                  setDurationText((current) => ({ ...current, [baseline.id]: value }));
                  if (/^\d+$/.test(value)) { onActualDurationChange(baseline.id, Number(value)); }
                }} /></td>
                <td><select className={`progress-color-select progress-${taskProgressColor(actual)}`} value={taskProgressColor(actual)} aria-label={`${baseline.title} actual progress color`} title={taskProgressColor(actual).toUpperCase()} onChange={(event) => onActualProgressColorChange(baseline.id, parseProgressColor(event.target.value))}>{TASK_PROGRESS_COLORS.map((color) => <option key={color} value={color}>{color.toUpperCase()}</option>)}</select> <input className="progress-input" type="text" inputMode="numeric" pattern="[0-9]*" value={progressText[baseline.id] ?? String(actual.progress)} disabled={!editable} aria-label={`${baseline.title} actual progress percent`} onBlur={() => setProgressText((current) => ({ ...current, [baseline.id]: String(actual.progress) }))} onChange={(event) => {
                  const value = event.target.value;
                  if (value === "" || (/^\d{1,3}$/.test(value) && Number(value) <= 100)) { setProgressText((current) => ({ ...current, [baseline.id]: value })); }
                  if (/^\d{1,3}$/.test(value) && Number(value) <= 100) { onActualProgressChange(baseline.id, Number(value)); }
                }} /><span className="percent-mark">%</span></td>
                <td><select className="assignee-select" value={actual.assigneeId ?? ""} disabled={!editable} aria-label={`${baseline.title} actual assignee`} onChange={(event) => onActualAssigneeChange(baseline.id, event.target.value)}><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></td>
                <td><input className="duration-input" type="text" inputMode="numeric" pattern="[0-9]*" value={hoursText[baseline.id] ?? String(Math.round(actual.estimatedHours / 8))} disabled={!editable} aria-label={`${baseline.title} actual MD`} onBlur={() => setHoursText((current) => ({ ...current, [baseline.id]: String(Math.round(actual.estimatedHours / 8)) }))} onChange={(event) => {
                  const value = event.target.value;
                  setHoursText((current) => ({ ...current, [baseline.id]: value }));
                  if (/^\d+$/.test(value)) { onActualEstimatedHoursChange(baseline.id, Number(value) * 8); }
                }} /></td>
                <td className={delta.delayDays > 0 || delta.mdDelta > 0 ? "variance bad" : "variance"}>{delta.delayDays}d / {delta.mdDelta}MD</td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
