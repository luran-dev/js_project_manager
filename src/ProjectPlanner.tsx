import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Gantt, WbsTable } from "./components";
import type { TaskDateChange } from "./components";
import { ResourceHeatmap } from "./ResourceHeatmap";
import { addDays, addWorkingDays, cascadeTasks, daysBetween, isHoliday, visibleTasks, workingDaysBetween } from "./schedule";
import type { ProjectState, Task, TaskId, TaskProgressColor, TaskStatus, Workspace, Zoom } from "./types";

const zoomScale: Record<Zoom, number> = { day: 56, week: 12, month: 7 };
const zoomLabels: Record<Zoom, string> = { day: "Day", week: "Week", month: "Month" };
const filterLabels = { taskName: "Task Name", status: "Status", assignee: "Assigned To" } as const;
type FilterField = keyof typeof filterLabels;
const parseFilterField = (value: string): FilterField => (value === "status" || value === "assignee" ? value : "taskName");
const dateRange = (startDate: string, count: number): readonly string[] => Array.from({ length: count }, (_value, index) => addDays(startDate, index));
const isMonday = (date: string): boolean => new Date(`${date}T00:00:00.000Z`).getUTCDay() === 1;
const descendantIds = (tasks: readonly Task[], id: TaskId): readonly TaskId[] => tasks.filter((task) => task.parentId === id).flatMap((task) => [task.id, ...descendantIds(tasks, task.id)]);

const taskWithParent = (task: Task, parentId: TaskId | undefined): Task => {
  if (parentId === undefined) {
    const { parentId: _parentId, ...rest } = task;
    return rest;
  }
  return { ...task, parentId };
};

const taskWithAssignee = (task: Task, assigneeId: string): Task => {
  if (assigneeId === "") {
    const { assigneeId: _assigneeId, ...rest } = task;
    return rest;
  }
  return { ...task, assigneeId };
};

export function ProjectPlanner({ project, workspace, onTasksChange }: { readonly project: ProjectState; readonly workspace: Workspace; readonly onTasksChange: (updater: (tasks: readonly Task[]) => readonly Task[]) => void }) {
  const [query, setQuery] = useState("");
  const [filterField, setFilterField] = useState<FilterField>("taskName");
  const [zoom, setZoom] = useState<Zoom>("month");
  const [tab, setTab] = useState<"planner" | "resources">("planner");
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<TaskId>>(new Set());
  const country = project.defaultCountry ?? "Korea";
  const tasks = project.tasks;
  const scheduledTasks = useMemo(() => cascadeTasks(tasks, workspace.ptos, country), [country, tasks, workspace.ptos]);
  const assigneeById = new Map(workspace.users.map((user) => [user.id, user.name]));
  const normalizedQuery = query.trim().toLowerCase();
  const rows = visibleTasks(scheduledTasks, collapsedIds).filter((task) => {
    const value = filterField === "status" ? task.status : filterField === "assignee" ? assigneeById.get(task.assigneeId ?? "") ?? "Unassigned" : task.title;
    return value.toLowerCase().includes(normalizedQuery);
  });
  const minDate = scheduledTasks.map((task) => task.startDate).sort()[0] ?? "2026-06-01";
  const maxDate = scheduledTasks.map((task) => task.endDate).sort().at(-1) ?? "2026-08-31";
  const totalDays = daysBetween(minDate, maxDate) + 10;
  const scale = zoomScale[zoom];
  const timelineDates = dateRange(minDate, totalDays);
  const timelineMarkers = zoom === "day" ? timelineDates : timelineDates.filter((date) => zoom === "week" ? isMonday(date) : date.endsWith("-01") || date === minDate);
  const holidayDates = timelineDates.filter((date) => isHoliday(date, country));

  const setTaskDates = (change: TaskDateChange) => onTasksChange((current) => {
    const target = current.find((task) => task.id === change.id);
    if (target === undefined) { return current; }
    const directChildren = current.filter((task) => task.parentId === change.id);
    const moveIds = new Set<TaskId>(descendantIds(current, change.id));
    const dayDelta = daysBetween(target.startDate, change.startDate);
    const endDate = change.endDate < change.startDate ? change.startDate : change.endDate;
    return current.map((task) => {
      if (change.preserveDuration && directChildren.length > 0 && moveIds.has(task.id)) { return { ...task, startDate: addDays(task.startDate, dayDelta), endDate: addDays(task.endDate, dayDelta) }; }
      if (task.id !== change.id || directChildren.length > 0) { return task; }
      return { ...task, startDate: change.startDate, endDate, duration: change.preserveDuration ? task.duration : Math.max(1, workingDaysBetween(change.startDate, endDate, task.assigneeId, workspace.ptos, country)) };
    });
  });

  const setTaskDuration = (id: TaskId, duration: number) => onTasksChange((current) => current.map((task) => {
    if (task.id !== id || current.some((candidate) => candidate.parentId === id) || !Number.isInteger(duration) || duration < 0) { return task; }
    return { ...task, duration, endDate: duration === 0 ? task.startDate : addWorkingDays(task.startDate, duration, task.assigneeId, workspace.ptos, country) };
  }));
  const setTaskStatus = (id: TaskId, status: TaskStatus) => onTasksChange((current) => current.map((task) => (task.id === id ? { ...task, status } : task)));
  const setTaskTitle = (id: TaskId, title: string) => onTasksChange((current) => current.map((task) => (task.id === id ? { ...task, title } : task)));
  const setTaskProgress = (id: TaskId, progress: number) => onTasksChange((current) => current.map((task) => (task.id === id && !current.some((candidate) => candidate.parentId === id) ? { ...task, progress } : task)));
  const setTaskProgressColor = (id: TaskId, progressColor: TaskProgressColor) => onTasksChange((current) => current.map((task) => (task.id === id ? { ...task, progressColor } : task)));
  const setTaskAssignee = (id: TaskId, userId: string) => onTasksChange((current) => current.map((task) => (task.id === id ? taskWithAssignee(task, userId) : task)));
  const setDependencyIds = (id: TaskId, dependencyIds: readonly TaskId[]) => onTasksChange((current) => {
    const validIds = new Set(current.map((task) => task.id));
    return current.map((task) => (task.id === id ? { ...task, dependencyIds: dependencyIds.filter((dependencyId) => dependencyId !== id && validIds.has(dependencyId)) } : task));
  });

  const reorderTasks = (sourceId: TaskId, targetId: TaskId) => onTasksChange((current) => {
    const moveIds = new Set<TaskId>([sourceId, ...descendantIds(current, sourceId)]);
    if (moveIds.has(targetId)) { return current; }
    const sorted = current.slice().sort((left, right) => left.sortOrder - right.sortOrder);
    const moving = sorted.filter((task) => moveIds.has(task.id));
    const staying = sorted.filter((task) => !moveIds.has(task.id));
    const targetIndex = staying.findIndex((task) => task.id === targetId);
    if (targetIndex < 0) { return current; }
    return [...staying.slice(0, targetIndex), ...moving, ...staying.slice(targetIndex)].map((task, index) => ({ ...task, sortOrder: index + 1 }));
  });

  const moveTask = (id: TaskId, direction: "up" | "down") => onTasksChange((current) => {
    const moveIds = new Set<TaskId>([id, ...descendantIds(current, id)]);
    const sorted = current.slice().sort((left, right) => left.sortOrder - right.sortOrder);
    const moving = sorted.filter((task) => moveIds.has(task.id));
    const staying = sorted.filter((task) => !moveIds.has(task.id));
    const blockStart = sorted.findIndex((task) => moveIds.has(task.id));
    let blockEnd = blockStart;
    for (let index = blockStart; index < sorted.length && moveIds.has(sorted[index]?.id ?? ""); index += 1) { blockEnd = index; }
    const target = direction === "up" ? sorted[blockStart - 1] : sorted[blockEnd + 1];
    const targetIds = target === undefined ? new Set<TaskId>() : new Set<TaskId>([target.id, ...descendantIds(current, target.id)]);
    const targetIndex = direction === "up" ? staying.findIndex((task) => task.id === target?.id) : staying.reduce((lastIndex, task, index) => (targetIds.has(task.id) ? index + 1 : lastIndex), -1);
    if (targetIndex < 0) { return current; }
    const insertIndex = direction === "up" ? targetIndex : targetIndex;
    return [...staying.slice(0, insertIndex), ...moving, ...staying.slice(insertIndex)].map((task, index) => ({ ...task, sortOrder: index + 1 }));
  });

  const indentTask = (id: TaskId) => onTasksChange((current) => {
    const sorted = current.slice().sort((left, right) => left.sortOrder - right.sortOrder);
    const previous = sorted[sorted.findIndex((task) => task.id === id) - 1];
    return previous === undefined || descendantIds(current, id).includes(previous.id) ? current : current.map((task) => (task.id === id ? taskWithParent(task, previous.id) : task));
  });

  const outdentTask = (id: TaskId) => onTasksChange((current) => {
    const source = current.find((task) => task.id === id);
    const parent = source?.parentId === undefined ? undefined : current.find((task) => task.id === source.parentId);
    if (source === undefined || parent === undefined) { return current; }
    const moveIds = new Set<TaskId>([id, ...descendantIds(current, id)]);
    const parentBlockIds = new Set<TaskId>([parent.id, ...descendantIds(current, parent.id).filter((taskId) => !moveIds.has(taskId))]);
    const sorted = current.slice().sort((left, right) => left.sortOrder - right.sortOrder);
    const moving = sorted.filter((task) => moveIds.has(task.id)).map((task) => (task.id === id ? taskWithParent(task, parent.parentId) : task));
    const staying = sorted.filter((task) => !moveIds.has(task.id));
    const insertIndex = staying.reduce((lastIndex, task, index) => (parentBlockIds.has(task.id) ? index + 1 : lastIndex), 0);
    return [...staying.slice(0, insertIndex), ...moving, ...staying.slice(insertIndex)].map((task, index) => ({ ...task, sortOrder: index + 1 }));
  });

  const deleteTask = (id: TaskId) => onTasksChange((current) => current.some((task) => task.parentId === id) ? (window.alert("하위 태스크가 있는 항목은 먼저 하위 태스크를 이동한 뒤 삭제하세요."), current) : current.filter((task) => task.id !== id).map((task, index) => ({ ...task, sortOrder: index + 1, dependencyIds: task.dependencyIds.filter((dependencyId) => dependencyId !== id) })));
  const addChild = () => {
    const lastOrder = tasks.length === 0 ? 0 : Math.max(...tasks.map((task) => task.sortOrder));
    const predecessor = scheduledTasks.find((task) => task.id === "m1");
    const startDate = predecessor === undefined ? maxDate : addDays(predecessor.endDate, 1);
    onTasksChange((current) => {
      const base: Task = { id: `new-${Date.now()}`, title: "New task", startDate, endDate: addWorkingDays(startDate, 3, workspace.users[0]?.id, workspace.ptos, country), duration: 3, progress: 0, status: "TO DO", estimatedHours: 16, sortOrder: lastOrder + 1, dependencyIds: predecessor === undefined ? [] : ["m1"] };
      const assigned = workspace.users[0] === undefined ? base : { ...base, assigneeId: workspace.users[0].id };
      return [...current, current.some((task) => task.id === "p2") ? { ...assigned, parentId: "p2" } : assigned];
    });
  };

  const toggle = (id: TaskId) => setCollapsedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    return next;
  });

  return (
    <section className="board">
      <div className="toolbar">
        <div className="searchbox"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search tasks" placeholder={`Search ${filterLabels[filterField]}...`} /></div>
        <select className="filter-select" aria-label="Search field" value={filterField} onChange={(event) => setFilterField(parseFilterField(event.target.value))}>{Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="text-button primary" onClick={addChild}><Plus size={15} /> Task</button>
        <div className="tabs" role="tablist" aria-label="View"><button className={tab === "planner" ? "selected" : ""} onClick={() => setTab("planner")}>Planner</button><button className={tab === "resources" ? "selected" : ""} onClick={() => setTab("resources")}>Resources</button></div>
        <div className="zoom" aria-label="Timeline zoom"><span>Zoom:</span>{(["day", "week", "month"] satisfies readonly Zoom[]).map((value) => <button key={value} className={zoom === value ? "selected" : ""} onClick={() => setZoom(value)}>{zoomLabels[value]}</button>)}</div>
      </div>
      {tab === "planner" ? (
        <div className="split"><WbsTable rows={rows} allTasks={scheduledTasks} users={workspace.users} onToggle={toggle} onTitleChange={setTaskTitle} onStatusChange={setTaskStatus} onDateChange={(id, startDate, endDate) => setTaskDates({ id, startDate, endDate, preserveDuration: false })} onDurationChange={setTaskDuration} onProgressChange={setTaskProgress} onProgressColorChange={setTaskProgressColor} onAssigneeChange={setTaskAssignee} onDependencyChange={setDependencyIds} onTaskReorder={reorderTasks} onMoveUp={(id) => moveTask(id, "up")} onMoveDown={(id) => moveTask(id, "down")} onIndent={indentTask} onOutdent={outdentTask} onDelete={deleteTask} collapsedIds={collapsedIds} /><Gantt rows={rows} allTasks={scheduledTasks} minDate={minDate} timelineMarkers={timelineMarkers} holidayDates={holidayDates} zoom={zoom} scale={scale} width={Math.max(720, totalDays * scale)} onTaskDateChange={setTaskDates} /></div>
      ) : (
        <ResourceHeatmap tasks={scheduledTasks} users={workspace.users} ptos={workspace.ptos} dates={dateRange("2026-07-01", 45)} />
      )}
    </section>
  );
}
