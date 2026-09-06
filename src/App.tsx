import { BarChart3, ChevronDown, ClipboardList, Folder, LogOut, Settings, UserRound, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { initialWorkspaces } from "./data";
import { ProjectManagerModal } from "./ProjectManagerModal";
import { ProjectPlanner } from "./ProjectPlanner";
import { ResourceAnalyticsView } from "./ResourceAnalyticsView";
import { ResourceManagerModal } from "./ResourceManagerModal";
import { WorkspaceManagerModal } from "./WorkspaceManagerModal";
import { addWorkingDays } from "./schedule";
import type { ProjectState, Pto, Task, User, UserId, Workspace } from "./types";

const shortDate = (date: string): string => date.slice(5).replace("-", "/");
const firstProject = (workspace: Workspace): ProjectState => workspace.projects[0] ?? { id: "empty", name: "Untitled Project", tasks: [] };
const clearAssignee = (task: Task): Task => {
  const { assigneeId: _assigneeId, ...rest } = task;
  return rest;
};
const hasChildren = (tasks: readonly Task[], id: string): boolean => tasks.some((task) => task.parentId === id);
type AppView = "planner" | "reports";

export function App() {
  const [workspaces, setWorkspaces] = useState<readonly Workspace[]>(initialWorkspaces);
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaces[0]?.id ?? "");
  const [projectId, setProjectId] = useState(initialWorkspaces[0]?.projects[0]?.id ?? "");
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showResourceManager, setShowResourceManager] = useState(false);
  const [view, setView] = useState<AppView>("planner");
  const workspace = useMemo(() => workspaces.find((item) => item.id === workspaceId) ?? workspaces[0], [workspaceId, workspaces]);

  if (workspace === undefined) {
    return null;
  }

  const project = workspace.projects.find((item) => item.id === projectId) ?? firstProject(workspace);
  const dates = project.tasks.flatMap((task) => [task.startDate, task.endDate]).sort();
  const windowStart = dates[0] ?? "2026-06-01";
  const windowEnd = dates.at(-1) ?? "2026-08-31";
  const updateWorkspace = (updater: (workspace: Workspace) => Workspace) => setWorkspaces((current) => current.map((item) => (item.id === workspace.id ? updater(item) : item)));
  const updateProject = (projectUpdater: (project: ProjectState) => ProjectState) => updateWorkspace((current) => ({ ...current, projects: current.projects.map((item) => (item.id === project.id ? projectUpdater(item) : item)) }));
  const setProjectTasks = (updater: (tasks: readonly Task[]) => readonly Task[]) => updateProject((current) => ({ ...current, tasks: updater(current.tasks) }));

  const selectWorkspace = (id: string) => {
    const nextWorkspace = workspaces.find((item) => item.id === id);
    setWorkspaceId(id);
    setProjectId(nextWorkspace?.projects[0]?.id ?? "");
  };

  const saveResources = (users: readonly User[], ptos: readonly Pto[], deletedResourceIds: readonly UserId[]) => updateWorkspace((current) => ({
    ...current,
    users,
    ptos,
    projects: current.projects.map((item) => ({ ...item, tasks: item.tasks.map((task) => (deletedResourceIds.includes(task.assigneeId ?? "") ? clearAssignee(task) : task)) })),
  }));

  const saveWorkspaces = (nextWorkspaces: readonly Workspace[], activeId: string) => {
    const nextWorkspace = nextWorkspaces.find((item) => item.id === activeId) ?? nextWorkspaces[0];
    setWorkspaces(nextWorkspaces);
    setWorkspaceId(nextWorkspace?.id ?? "");
    setProjectId(nextWorkspace?.projects[0]?.id ?? "");
  };

  const saveProjects = (projects: readonly ProjectState[], activeId: string) => {
    const nextProject = projects.find((item) => item.id === activeId) ?? projects[0];
    updateWorkspace((current) => ({ ...current, projects: projects.map((projectDraft) => {
      const previousCountry = current.projects.find((item) => item.id === projectDraft.id)?.defaultCountry ?? "Korea";
      const nextCountry = projectDraft.defaultCountry ?? "Korea";
      return previousCountry === nextCountry ? projectDraft : { ...projectDraft, tasks: projectDraft.tasks.map((task) => (hasChildren(projectDraft.tasks, task.id) || task.duration === 0 ? task : { ...task, endDate: addWorkingDays(task.startDate, task.duration, task.assigneeId, current.ptos, nextCountry) })) };
    }) }));
    setProjectId(nextProject?.id ?? "");
  };

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand" aria-label="ProjectVibe home"><span className="brand-mark"><BarChart3 size={18} /></span><strong>ProjectVibe</strong></div><div className="profile"><span className="avatar"><UserRound size={18} /></span> Username <ChevronDown size={14} /></div></header>
      <nav className="side-rail" aria-label="Primary navigation"><button className={view === "planner" ? "rail-button active" : "rail-button"} aria-label="Projects" onClick={() => setView("planner")}><Folder size={20} /></button><button className="rail-button" aria-label="Tasks"><ClipboardList size={20} /></button><button className={view === "reports" ? "rail-button active" : "rail-button"} aria-label="Reports" onClick={() => setView("reports")}><BarChart3 size={20} /></button><button className="rail-button" aria-label="Settings"><Settings size={20} /></button><button className="rail-button bottom" aria-label="Sign out"><LogOut size={20} /></button></nav>

      <main className="workspace">
        <section className="context-bar" aria-label="Workspace and project context">
          <div className="context-field"><span>Workspace</span><div className="select-action"><select aria-label="Workspace selector" value={workspace.id} onChange={(event) => selectWorkspace(event.target.value)}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="context-icon-button" title="Manage workspaces" aria-label="Manage workspaces" onClick={() => setShowWorkspaceManager(true)}><Settings size={15} /></button></div></div>
          <div className="context-field"><span>Project</span><div className="select-action"><select aria-label="Project selector" value={project.id} onChange={(event) => setProjectId(event.target.value)}>{workspace.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="context-icon-button" title="Manage projects" aria-label="Manage projects" onClick={() => setShowProjectManager(true)}><Settings size={15} /></button></div></div>
          <button className="text-button resource-action" title="Manage workspace resources and PTO" aria-label="Manage workspace resources and PTO" onClick={() => setShowResourceManager(true)}><UsersRound size={16} /> Resources</button>
          <div className="context-metric"><span>Country</span><strong>{project.defaultCountry ?? "Korea"}</strong></div>
          <div className="context-metric"><span>Resources</span><strong>{workspace.users.length}</strong></div>
          <div className="context-metric"><span>Window</span><strong>{shortDate(windowStart)} - {shortDate(windowEnd)}</strong></div>
        </section>

        {showWorkspaceManager ? <WorkspaceManagerModal workspaces={workspaces} activeWorkspaceId={workspace.id} onCancel={() => setShowWorkspaceManager(false)} onConfirm={(nextWorkspaces, activeId) => {
          saveWorkspaces(nextWorkspaces, activeId);
          setShowWorkspaceManager(false);
        }} /> : null}
        {showProjectManager ? <ProjectManagerModal projects={workspace.projects} activeProjectId={project.id} onCancel={() => setShowProjectManager(false)} onConfirm={(projects, activeId) => {
          saveProjects(projects, activeId);
          setShowProjectManager(false);
        }} /> : null}
        {showResourceManager ? <ResourceManagerModal workspace={workspace} onCancel={() => setShowResourceManager(false)} onConfirm={(users, ptos, deletedResourceIds) => {
          saveResources(users, ptos, deletedResourceIds);
          setShowResourceManager(false);
        }} /> : null}
        {view === "reports" ? <ResourceAnalyticsView workspace={workspace} /> : <ProjectPlanner project={project} workspace={workspace} onTasksChange={setProjectTasks} />}
      </main>
    </div>
  );
}
