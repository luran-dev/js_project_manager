import { BarChart3, ChevronDown, Folder, LogOut, Palette, Settings, ShieldAlert, UserRound, UsersRound } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ProjectManagerModal } from "./ProjectManagerModal";
import { ProjectPlanner } from "./ProjectPlanner";
import { PasswordResetFlow } from "./PasswordResetFlow";
import { ResourceAnalyticsView } from "./ResourceAnalyticsView";
import { ResourceManagerModal } from "./ResourceManagerModal";
import { RiskRegister } from "./RiskRegister";
import { WorkspaceManagerModal } from "./WorkspaceManagerModal";
import { AppearanceDialog } from "./AppearanceDialog";
import { useTheme } from "./theme";
import { projectVibeRepository, type AppSnapshot } from "./repository";
import { addWorkingDays } from "./schedule";
import type { ProjectState, Pto, Task, User, UserId, Workspace } from "./types";

const shortDate = (date: string): string => date.slice(5).replace("-", "/");
const firstProject = (workspace: Workspace): ProjectState => workspace.projects[0] ?? { id: "empty", name: "Untitled Project", tasks: [] };
const clearAssignee = (task: Task): Task => {
  const { assigneeId: _assigneeId, ...rest } = task;
  return rest;
};
const hasChildren = (tasks: readonly Task[], id: string): boolean => tasks.some((task) => task.parentId === id);
type AppView = "planner" | "reports" | "risks";
type AuthStatus = "loading" | "signedOut" | "signedIn";

export function App() {
  const { preference, changeTheme, storageAvailable } = useTheme();
  const [showAppearance, setShowAppearance] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");
  const [signupName, setSignupName] = useState("");
  const [loginEmail, setLoginEmail] = useState("user@example.com");
  const [loginPassword, setLoginPassword] = useState("password");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showResourceManager, setShowResourceManager] = useState(false);
  const [view, setView] = useState<AppView>("planner");
  const [focusedRiskId, setFocusedRiskId] = useState<string>();
  const workspaces = snapshot?.workspaces ?? [];
  const currentUserWorkspaceIds = useMemo(() => snapshot?.currentUser.workspaceMemberships.map((membership) => membership.workspaceId) ?? [], [snapshot]);
  const userWorkspaces = useMemo(() => workspaces.filter((item) => currentUserWorkspaceIds.includes(item.id)), [currentUserWorkspaceIds, workspaces]);
  const workspace = useMemo(() => userWorkspaces.find((item) => item.id === workspaceId) ?? userWorkspaces[0], [workspaceId, userWorkspaces]);

  const applySnapshot = (nextSnapshot: AppSnapshot) => {
    const nextWorkspaceId = nextSnapshot.currentUser.workspaceMemberships[0]?.workspaceId ?? nextSnapshot.workspaces[0]?.id ?? "";
    const nextWorkspace = nextSnapshot.workspaces.find((item) => item.id === nextWorkspaceId) ?? nextSnapshot.workspaces[0];
    setSnapshot(nextSnapshot);
    setWorkspaceId(nextWorkspace?.id ?? "");
    setProjectId(nextWorkspace?.projects[0]?.id ?? "");
  };

  useEffect(() => {
    let active = true;
    void projectVibeRepository.loadSnapshot().then((nextSnapshot) => {
      if (!active) {
        return;
      }
      applySnapshot(nextSnapshot);
      setAuthStatus("signedIn");
    }).catch(() => {
      if (active) {
        setAuthStatus("signedOut");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    try {
      const nextSnapshot = authMode === "login"
        ? await projectVibeRepository.login(loginEmail, loginPassword)
        : await projectVibeRepository.register(signupName, loginEmail, loginPassword);
      applySnapshot(nextSnapshot);
      setAuthStatus("signedIn");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    }
  };

  const signOut = async () => {
    await projectVibeRepository.logout();
    setSnapshot(null);
    setWorkspaceId("");
    setProjectId("");
    setAuthStatus("signedOut");
  };

  const appearanceButton = <button className="text-button appearance-trigger" title="Customize colors and display mode" onClick={() => setShowAppearance(true)}><Palette size={17} /><span>Appearance</span></button>;
  const appearanceDialog = showAppearance ? <AppearanceDialog preference={preference} onChange={changeTheme} storageAvailable={storageAvailable} onClose={() => setShowAppearance(false)} /> : null;

  if (authStatus === "loading") {
    return <div className="auth-shell"><div className="auth-card"><strong>ProjectVibe</strong><p>Loading workspace...</p></div></div>;
  }

  if (snapshot === null) {
    return (
      <div className="auth-shell">
        <div className="auth-appearance">{appearanceButton}</div>
        {appearanceDialog}
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="brand auth-brand" aria-label="ProjectVibe home"><span className="brand-mark"><BarChart3 size={18} /></span><strong>ProjectVibe</strong></div>
          {authMode === "reset" ? <PasswordResetFlow onCancel={() => setAuthMode("login")} onComplete={() => { setAuthMode("login"); setAuthMessage("Password updated. Sign in with your new password."); }} /> : <>
            <h1 id="auth-title">{authMode === "login" ? "Sign in" : "Create account"}</h1>
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button className={authMode === "login" ? "selected" : ""} type="button" onClick={() => { setAuthMode("login"); setAuthError(""); }}>Sign in</button>
              <button className={authMode === "register" ? "selected" : ""} type="button" onClick={() => { setAuthMode("register"); setAuthError(""); }}>Create account</button>
            </div>
            <form className="auth-form" onSubmit={submitLogin}>
              {authMode === "register" ? <label>Name<input value={signupName} onChange={(event) => setSignupName(event.target.value)} autoComplete="name" /></label> : null}
              <label>Email<input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" autoComplete="email" /></label>
              <label>Password<input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} minLength={authMode === "register" ? 8 : undefined} type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label>
              {authError ? <p className="auth-error" role="alert">{authError}</p> : null}
              {authMessage ? <p className="auth-message" aria-live="polite">{authMessage}</p> : null}
              <button className="text-button primary" type="submit">{authMode === "login" ? "Sign in" : "Create account"}</button>
            </form>
            {authMode === "login" ? <button className="auth-link" type="button" onClick={() => { setAuthError(""); setAuthMessage(""); setAuthMode("reset"); }}>Forgot password?</button> : null}
          </>}
        </section>
      </div>
    );
  }
  const { currentUser } = snapshot;

  if (workspace === undefined) {
    return null;
  }

  const project = workspace.projects.find((item) => item.id === projectId) ?? firstProject(workspace);
  const dates = project.tasks.flatMap((task) => [task.startDate, task.endDate]).sort();
  const windowStart = dates[0] ?? "2026-06-01";
  const windowEnd = dates.at(-1) ?? "2026-08-31";
  const saveSnapshot = (updater: (snapshot: AppSnapshot) => AppSnapshot) => setSnapshot((current) => {
    if (current === null) {
      return current;
    }
    const nextSnapshot = updater(current);
    setSaveError("");
    void projectVibeRepository.saveSnapshot(nextSnapshot).catch((error) => setSaveError(error instanceof Error ? error.message : "Save failed"));
    return nextSnapshot;
  });
  const updateWorkspace = (updater: (workspace: Workspace) => Workspace) => saveSnapshot((current) => ({ ...current, workspaces: current.workspaces.map((item) => (item.id === workspace.id ? updater(item) : item)) }));
  const updateProject = (projectUpdater: (project: ProjectState) => ProjectState) => updateWorkspace((current) => ({ ...current, projects: current.projects.map((item) => (item.id === project.id ? projectUpdater(item) : item)) }));
  const setProjectTasks = (updater: (tasks: readonly Task[]) => readonly Task[]) => updateProject((current) => {
    const tasks = updater(current.tasks);
    const taskIds = new Set(tasks.map((task) => task.id));
    return { ...current, tasks, ...(current.risks === undefined ? {} : { risks: current.risks.map((risk) => ({ ...risk, taskIds: risk.taskIds.filter((id) => taskIds.has(id)) })) }) };
  });

  const selectWorkspace = (id: string) => {
    const nextWorkspace = userWorkspaces.find((item) => item.id === id);
    setWorkspaceId(id);
    setProjectId(nextWorkspace?.projects[0]?.id ?? "");
  };

  const saveResources = (users: readonly User[], ptos: readonly Pto[], deletedResourceIds: readonly UserId[]) => updateWorkspace((current) => ({
    ...current,
    users,
    ptos,
    ...(current.resourceCapacities === undefined ? {} : { resourceCapacities: current.resourceCapacities.filter((capacity) => !deletedResourceIds.includes(capacity.userId)) }),
    projects: current.projects.map((item) => ({ ...item, tasks: item.tasks.map((task) => (deletedResourceIds.includes(task.assigneeId ?? "") ? clearAssignee(task) : task)) })),
  }));

  const saveWorkspaces = (nextWorkspaces: readonly Workspace[], activeId: string) => {
    const nextWorkspace = nextWorkspaces.find((item) => item.id === activeId) ?? nextWorkspaces[0];
    const previousUserWorkspaceIds = currentUserWorkspaceIds;
    saveSnapshot((current) => ({
      currentUser: {
        ...current.currentUser,
        workspaceMemberships: nextWorkspaces.map((item) => current.currentUser.workspaceMemberships.find((membership) => membership.workspaceId === item.id) ?? { userId: current.currentUser.id, workspaceId: item.id, role: "OWNER" }),
      },
      workspaces: [...current.workspaces.filter((item) => !previousUserWorkspaceIds.includes(item.id)), ...nextWorkspaces],
    }));
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
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <header className="topbar"><div className="brand" aria-label="ProjectVibe"><span className="brand-mark"><BarChart3 size={18} /></span><strong>ProjectVibe</strong></div><div className="topbar-actions">{appearanceButton}<div className="profile"><span className="avatar"><UserRound size={18} /></span><span>{currentUser.name}</span></div></div></header>
      <nav className="side-rail" aria-label="Primary navigation"><button className={view === "planner" ? "rail-button active" : "rail-button"} aria-label="Projects" aria-current={view === "planner" ? "page" : undefined} onClick={() => setView("planner")}><Folder size={20} /><span>Projects</span></button><button className={view === "risks" ? "rail-button active" : "rail-button"} aria-label="Risks" aria-current={view === "risks" ? "page" : undefined} onClick={() => { setFocusedRiskId(undefined); setView("risks"); }}><ShieldAlert size={20} /><span>Risks</span></button><button className={view === "reports" ? "rail-button active" : "rail-button"} aria-label="Reports" aria-current={view === "reports" ? "page" : undefined} onClick={() => setView("reports")}><BarChart3 size={20} /><span>Reports</span></button><button className="rail-button bottom" aria-label="Sign out" onClick={signOut}><LogOut size={20} /><span>Sign out</span></button></nav>
      {appearanceDialog}

      <main className="workspace" id="workspace" tabIndex={-1}>
        <section className={`context-bar${contextExpanded ? " expanded" : ""}`} aria-label="Workspace and project context">
          <button className="context-toggle" aria-expanded={contextExpanded} onClick={() => setContextExpanded((current) => !current)}><span><small>{workspace.name}</small><strong>{project.name}</strong></span><ChevronDown size={18} /></button>
          <div className="context-field"><span>Workspace</span><div className="select-action"><select aria-label="Workspace selector" value={workspace.id} onChange={(event) => selectWorkspace(event.target.value)}>{userWorkspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="context-icon-button" title="Manage workspaces" aria-label="Manage workspaces" onClick={() => setShowWorkspaceManager(true)}><Settings size={15} /></button></div></div>
          <div className="context-field"><span>Project</span><div className="select-action"><select aria-label="Project selector" value={project.id} onChange={(event) => setProjectId(event.target.value)}>{workspace.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="context-icon-button" title="Manage projects" aria-label="Manage projects" onClick={() => setShowProjectManager(true)}><Settings size={15} /></button></div></div>
          <button className="text-button resource-action" title="Manage workspace resources and PTO" aria-label="Manage workspace resources and PTO" onClick={() => setShowResourceManager(true)}><UsersRound size={16} /> Team & PTO</button>
          <div className="context-metric"><span>Country</span><strong>{project.defaultCountry ?? "Korea"}</strong></div>
          <div className="context-metric"><span>Resources</span><strong>{workspace.users.length}</strong></div>
          <div className="context-metric"><span>Window</span><strong>{shortDate(windowStart)} - {shortDate(windowEnd)}</strong></div>
        </section>
        {saveError ? <div className="save-error" role="alert">{saveError}</div> : null}

        {showWorkspaceManager ? <WorkspaceManagerModal workspaces={userWorkspaces} activeWorkspaceId={workspace.id} defaultCountry={currentUser.defaultCountry} onCancel={() => setShowWorkspaceManager(false)} onConfirm={(nextWorkspaces, activeId) => {
          saveWorkspaces(nextWorkspaces, activeId);
          setShowWorkspaceManager(false);
        }} /> : null}
        {showProjectManager ? <ProjectManagerModal projects={workspace.projects} activeProjectId={project.id} defaultCountry={currentUser.defaultCountry} onCancel={() => setShowProjectManager(false)} onConfirm={(projects, activeId) => {
          saveProjects(projects, activeId);
          setShowProjectManager(false);
        }} /> : null}
        {showResourceManager ? <ResourceManagerModal workspace={workspace} onCancel={() => setShowResourceManager(false)} onConfirm={(users, ptos, deletedResourceIds) => {
          saveResources(users, ptos, deletedResourceIds);
          setShowResourceManager(false);
        }} /> : null}
        {view === "reports" ? <ResourceAnalyticsView workspace={workspace} /> : view === "risks" ? <RiskRegister projectName={project.name} risks={project.risks ?? []} tasks={project.tasks} users={workspace.users} focusedRiskId={focusedRiskId} onChange={(risks) => updateProject((current) => ({ ...current, risks }))} /> : <ProjectPlanner project={project} workspace={workspace} onWorkspaceChange={updateWorkspace} onProjectChange={updateProject} onTasksChange={setProjectTasks} onOpenRisk={(riskId) => { setFocusedRiskId(riskId); setView("risks"); }} />}
      </main>
    </div>
  );
}
