import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Trash2 } from "lucide-react";
import type { DragEvent, PointerEvent } from "react";
import { useState } from "react";
import { addDays, daysBetween } from "./schedule";
import { TASK_PROGRESS_COLORS, TASK_STATUSES, type Task, type TaskId, type TaskProgressColor, type TaskStatus, type User, type Zoom } from "./types";

const monthLabel = (date: string): string =>
  new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));
const dayLabel = (date: string): string =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));

const childCount = (tasks: readonly Task[], id: TaskId): number => tasks.filter((task) => task.parentId === id).length;

const levelOf = (task: Task, tasks: readonly Task[]): number => {
  let level = 0;
  let parentId = task.parentId;
  while (parentId !== undefined) {
    const parent = tasks.find((candidate) => candidate.id === parentId);
    parentId = parent?.parentId;
    level += 1;
  }
  return level;
};

const taskCode = (index: number): string => `T${index + 1}`; const sortedTasks = (tasks: readonly Task[]): readonly Task[] => tasks.slice().sort((left, right) => left.sortOrder - right.sortOrder);
const taskCodeById = (tasks: readonly Task[]): ReadonlyMap<TaskId, string> => new Map(sortedTasks(tasks).map((task, index) => [task.id, taskCode(index)]));
const dependencyLookup = (tasks: readonly Task[]): ReadonlyMap<string, TaskId> => {
  const lookup = new Map<string, TaskId>();
  sortedTasks(tasks).forEach((task, index) => {
    lookup.set(taskCode(index).toLowerCase(), task.id);
    lookup.set(task.id.toLowerCase(), task.id);
  });
  return lookup;
};
const parseDependencyIds = (value: string, lookup: ReadonlyMap<string, TaskId>): readonly TaskId[] =>
  Array.from(new Set(value.split(",").map((id) => lookup.get(id.trim().toLowerCase())).filter((id) => id !== undefined)));
const isMilestone = (task: Task): boolean => task.duration === 0 && task.startDate === task.endDate;
const parseStatus = (value: string): TaskStatus => TASK_STATUSES.find((status) => status === value) ?? "TO DO"; const parseProgressColor = (value: string): TaskProgressColor => TASK_PROGRESS_COLORS.find((color) => color === value) ?? "green"; const taskProgressColor = (task: Task): TaskProgressColor => task.progressColor ?? (task.progress === 0 ? "grey" : "green"); const taskWidth = (task: Task, minDate: string, scale: number): number => Math.max(isMilestone(task) ? 18 : 48, (daysBetween(task.startDate, task.endDate) + 1) * scale);
const statusClass = (status: TaskStatus): string => `status-${status.toLowerCase().replaceAll(" ", "-")}`;

const connectorPath = (startX: number, startY: number, endX: number, endY: number): string => {
  const approachX = endX - 12;
  if (startX < approachX) {
    return `M ${startX} ${startY} H ${approachX} V ${endY} H ${endX}`;
  }

  const tailX = startX + 14;
  const laneY = startY < endY ? Math.min(endY - 10, startY + 16) : Math.max(endY + 10, startY - 16);
  return `M ${startX} ${startY} H ${tailX} V ${laneY} H ${approachX} V ${endY} H ${endX}`;
};

type WbsProps = {
  readonly rows: readonly Task[];
  readonly allTasks: readonly Task[];
  readonly users: readonly User[];
  readonly collapsedIds: ReadonlySet<TaskId>;
  readonly onToggle: (id: TaskId) => void;
  readonly onTitleChange: (id: TaskId, title: string) => void;
  readonly onStatusChange: (id: TaskId, status: TaskStatus) => void;
  readonly onDateChange: (id: TaskId, startDate: string, endDate: string) => void; readonly onDurationChange: (id: TaskId, duration: number) => void;
  readonly onProgressChange: (id: TaskId, progress: number) => void; readonly onProgressColorChange: (id: TaskId, color: TaskProgressColor) => void;
  readonly onAssigneeChange: (id: TaskId, userId: string) => void;
  readonly onDependencyChange: (id: TaskId, dependencyIds: readonly TaskId[]) => void;
  readonly onTaskReorder: (sourceId: TaskId, targetId: TaskId) => void;
  readonly onMoveUp: (id: TaskId) => void;
  readonly onMoveDown: (id: TaskId) => void;
  readonly onIndent: (id: TaskId) => void;
  readonly onOutdent: (id: TaskId) => void;
  readonly onDelete: (id: TaskId) => void;
};

export function WbsTable({ rows, allTasks, users, collapsedIds, onToggle, onTitleChange, onStatusChange, onDateChange, onDurationChange, onProgressChange, onProgressColorChange, onAssigneeChange, onDependencyChange, onTaskReorder, onMoveUp, onMoveDown, onIndent, onOutdent, onDelete }: WbsProps) {
  const [dependencyText, setDependencyText] = useState<Record<TaskId, string>>({}); const [durationText, setDurationText] = useState<Record<TaskId, string>>({}); const [progressText, setProgressText] = useState<Record<TaskId, string>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<TaskId>();
  const shortIds = taskCodeById(allTasks);
  const lookup = dependencyLookup(allTasks);
  const changeDates = (id: TaskId, startDate: string, endDate: string) => {
    setDurationText((current) => {
      const { [id]: _value, ...rest } = current;
      return rest;
    });
    onDateChange(id, startDate, endDate);
  };

  const dropTask = (event: DragEvent<HTMLTableRowElement>, targetId: TaskId) => {
    event.preventDefault();
    if (draggedTaskId !== undefined && draggedTaskId !== targetId) {
      onTaskReorder(draggedTaskId, targetId);
    }
    setDraggedTaskId(undefined);
  };

  return (
    <div className="wbs-pane">
      <div className="wbs-title">Tasks</div>
      <table>
        <thead><tr><th>#</th><th>Task ID</th><th>Task Name</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Duration</th><th>Progress (%)</th><th>Assigned To</th><th>Depends On</th></tr></thead>
        <tbody>
          {rows.map((task, index) => {
            const children = childCount(allTasks, task.id);
            return (
              <tr key={task.id} className={draggedTaskId === task.id ? "dragging-row" : ""} draggable onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedTaskId(task.id);
                }} onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }} onDrop={(event) => dropTask(event, task.id)} onDragEnd={() => setDraggedTaskId(undefined)}>
                <td>{index + 1}</td>
                <td className="task-id" title={task.id}>{shortIds.get(task.id) ?? task.id}</td>
	                <td className="task-name" style={{ paddingInlineStart: `${12 + levelOf(task, allTasks) * 22}px` }}>
	                  {children > 0 ? <button className="icon-button" aria-expanded={!collapsedIds.has(task.id)} onClick={() => onToggle(task.id)}>{collapsedIds.has(task.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button> : <span className="indent-spacer" />}
	                  <input className={`task-title-input${children > 0 ? " summary-task" : ""}`} aria-label={`${task.title} task name`} value={task.title} onChange={(event) => onTitleChange(task.id, event.target.value)} />
		                  <span className="hierarchy-actions">
		                    <button className="icon-button" aria-label={`Outdent ${task.title}`} disabled={task.parentId === undefined} onClick={() => onOutdent(task.id)}><ChevronLeft size={14} /></button>
		                    <button className="icon-button" aria-label={`Indent ${task.title}`} disabled={index === 0} onClick={() => onIndent(task.id)}><ChevronRight size={14} /></button>
		                    <button className="icon-button" aria-label={`Move up ${task.title}`} disabled={index === 0} onClick={() => onMoveUp(task.id)}><ChevronUp size={14} /></button>
		                    <button className="icon-button" aria-label={`Move down ${task.title}`} disabled={index === rows.length - 1} onClick={() => onMoveDown(task.id)}><ChevronDown size={14} /></button>
		                    <button className="icon-button danger" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task.id)}><Trash2 size={14} /></button>
		                  </span>
	                </td>
                <td><select className={`status-select ${statusClass(task.status)}`} value={task.status} aria-label={`${task.title} status`} onChange={(event) => onStatusChange(task.id, parseStatus(event.target.value))}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
                <td><input className="date-input" type="date" value={task.startDate} disabled={children > 0} aria-label={`${task.title} start date`} onChange={(event) => changeDates(task.id, event.target.value, task.endDate)} /></td>
                <td><input className="date-input" type="date" value={task.endDate} min={task.startDate} disabled={children > 0} aria-label={`${task.title} end date`} onChange={(event) => changeDates(task.id, task.startDate, event.target.value)} /></td>
                <td><input className="duration-input" type="text" inputMode="numeric" pattern="[0-9]*" value={durationText[task.id] ?? String(task.duration)} disabled={children > 0} aria-label={`${task.title} duration`} onBlur={() => setDurationText((current) => ({ ...current, [task.id]: String(task.duration) }))} onChange={(event) => {
                  const value = event.target.value;
                  setDurationText((current) => ({ ...current, [task.id]: value })); if (/^\d+$/.test(value)) { onDurationChange(task.id, Number(value)); }
                }} /></td>
                <td><select className={`progress-color-select progress-${taskProgressColor(task)}`} value={taskProgressColor(task)} aria-label={`${task.title} progress color`} title={taskProgressColor(task).toUpperCase()} onChange={(event) => onProgressColorChange(task.id, parseProgressColor(event.target.value))}>{TASK_PROGRESS_COLORS.map((color) => <option key={color} value={color}>{color.toUpperCase()}</option>)}</select> <input className="progress-input" type="text" inputMode="numeric" pattern="[0-9]*" value={progressText[task.id] ?? String(task.progress)} disabled={children > 0} aria-label={`${task.title} progress percent`} onBlur={() => setProgressText((current) => ({ ...current, [task.id]: String(task.progress) }))} onChange={(event) => {
                  const value = event.target.value;
                  if (value === "" || (/^\d{1,3}$/.test(value) && Number(value) <= 100)) { setProgressText((current) => ({ ...current, [task.id]: value })); }
                  if (/^\d{1,3}$/.test(value) && Number(value) <= 100) { onProgressChange(task.id, Number(value)); }
                }} /><span className="percent-mark">%</span></td>
                <td><select className="assignee-select" value={task.assigneeId ?? ""} disabled={children > 0} aria-label={`${task.title} assignee`} onChange={(event) => onAssigneeChange(task.id, event.target.value)}><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></td>
	                <td><input className="dependency-input" aria-label={`${task.title} dependency task IDs`} value={dependencyText[task.id] ?? task.dependencyIds.map((dependencyId) => shortIds.get(dependencyId) ?? dependencyId).join(", ")} onChange={(event) => {
	                  setDependencyText((current) => ({ ...current, [task.id]: event.target.value }));
	                  onDependencyChange(task.id, parseDependencyIds(event.target.value, lookup));
	                }} placeholder="T2, T5" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
	    </div>
	  );
	}

type GanttProps = { readonly rows: readonly Task[]; readonly allTasks: readonly Task[]; readonly minDate: string; readonly timelineMarkers: readonly string[]; readonly holidayDates: readonly string[]; readonly zoom: Zoom; readonly scale: number; readonly width: number; readonly onTaskDateChange: (change: TaskDateChange) => void };

export type TaskDateChange = { readonly id: TaskId; readonly startDate: string; readonly endDate: string; readonly preserveDuration: boolean };

type DragState = { readonly id: TaskId; readonly mode: "move" | "resize"; readonly pointerX: number; readonly startDate: string; readonly endDate: string };

export function Gantt({ rows, allTasks, minDate, timelineMarkers, holidayDates, zoom, scale, width, onTaskDateChange }: GanttProps) {
  const [dragState, setDragState] = useState<DragState>();
  const rowById = new Map(rows.map((task, index) => [task.id, { task, index }]));
  const connectors = rows.flatMap((task, index) =>
    task.dependencyIds.flatMap((dependencyId) => {
      const predecessor = rowById.get(dependencyId);
      if (predecessor === undefined) {
        return [];
      }
      const predecessorLeft = daysBetween(minDate, predecessor.task.startDate) * scale;
      const startX = predecessorLeft + taskWidth(predecessor.task, minDate, scale);
      const endX = daysBetween(minDate, task.startDate) * scale;
      const startY = 83 + predecessor.index * 36;
      const endY = 83 + index * 36;
      return [{ dependencyId, taskId: task.id, path: connectorPath(startX, startY, endX, endY) }];
    }),
	  );

  const updateDrag = (pointerX: number) => {
    if (dragState === undefined) {
      return;
    }

    const dayDelta = Math.round((pointerX - dragState.pointerX) / scale);
    if (dragState.mode === "move") {
      onTaskDateChange({ id: dragState.id, startDate: addDays(dragState.startDate, dayDelta), endDate: addDays(dragState.endDate, dayDelta), preserveDuration: true });
      return;
    }

    const nextEndDate = addDays(dragState.endDate, dayDelta);
    if (nextEndDate >= dragState.startDate) {
      onTaskDateChange({ id: dragState.id, startDate: dragState.startDate, endDate: nextEndDate, preserveDuration: false });
    }
  };

  const startDrag = (event: PointerEvent<HTMLElement>, task: Task, mode: DragState["mode"]) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ id: task.id, mode, pointerX: event.clientX, startDate: task.startDate, endDate: task.endDate });
  };

  return (
    <div className="gantt-pane">
      <div className="timeline" style={{ width }}>
        <div className="timeline-title">Timeline</div>
        <div className="months">
          {timelineMarkers.map((date) => <span className={zoom === "day" ? "day-marker" : ""} key={date} style={{ left: daysBetween(minDate, date) * scale }}>{zoom === "month" ? monthLabel(date) : dayLabel(date)}</span>)}
        </div>
        {holidayDates.map((date) => <div key={date} className="holiday-band" title={date} style={{ left: daysBetween(minDate, date) * scale, width: scale }} />)}
        <div className="today-band" style={{ left: daysBetween(minDate, "2026-07-01") * scale, width: 18 * scale }} />
        <svg className="dependency-layer" width={width} height={Math.max(620, rows.length * 36 + 96)} aria-hidden="true">
          <defs><marker id="arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" /></marker></defs>
          {connectors.map((connector) => <path key={`${connector.dependencyId}-${connector.taskId}`} d={connector.path} />)}
        </svg>
        {rows.map((task, index) => {
          const left = daysBetween(minDate, task.startDate) * scale;
          const barWidth = taskWidth(task, minDate, scale);
          const top = 72 + index * 36;
          const children = childCount(allTasks, task.id);
          const draggable = children === 0;
          const milestone = isMilestone(task);
          const resizable = draggable && !milestone;
          return (
            <div key={task.id} className="gantt-row" style={{ top }}>
              {milestone ? (
                <span
                  className={`milestone ${statusClass(task.status)}`}
                  style={{ left }}
                  aria-label={`${task.title}, ${task.startDate}`}
                  onPointerDown={(event) => startDrag(event, task, "move")}
                  onPointerMove={(event) => updateDrag(event.clientX)}
                  onPointerUp={() => setDragState(undefined)}
                  onPointerCancel={() => setDragState(undefined)}
                />
              ) : (
                <span
                  className={`bar ${statusClass(task.status)}${children > 0 ? " summary" : ""}`}
                  style={{ left, width: barWidth }}
                  aria-label={`${task.title}, ${task.startDate} to ${task.endDate}, ${task.progress}%`}
                  onPointerDown={(event) => {
                    if (!draggable) {
                      return;
                    }
                    startDrag(event, task, "move");
                  }}
                  onPointerMove={(event) => updateDrag(event.clientX)}
                  onPointerUp={() => setDragState(undefined)}
                  onPointerCancel={() => setDragState(undefined)}
                >
                  {children === 0 ? task.title : ""}
                  {resizable ? (
                    <span
                      className="resize-handle"
                      aria-hidden="true"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        startDrag(event, task, "resize");
                      }}
                      onPointerMove={(event) => updateDrag(event.clientX)}
                      onPointerUp={() => setDragState(undefined)}
                      onPointerCancel={() => setDragState(undefined)}
                    />
                  ) : null}
                </span>
              )}
              <span className="bar-label" style={{ left: left + barWidth + 8 }}>{milestone ? "Milestone" : `${task.title} - ${monthLabel(task.endDate)}`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
