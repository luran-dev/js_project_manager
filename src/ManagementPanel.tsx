import { Plus } from "lucide-react";
import { useState } from "react";
import type { ProjectState, Workspace } from "./types";

type Props = {
  readonly workspace: Workspace;
  readonly project: ProjectState;
  readonly onWorkspaceNameChange: (name: string) => void;
  readonly onProjectNameChange: (projectId: string, name: string) => void;
  readonly onAddProject: (name: string) => void;
};

export function ManagementPanel({ workspace, project, onWorkspaceNameChange, onProjectNameChange, onAddProject }: Props) {
  const [projectName, setProjectName] = useState("New Project");

  return (
    <section className="management-panel" aria-label="Workspace management">
      <div className="management-grid">
        <div className="management-card">
          <h2>Workspace</h2>
          <label>Name<input aria-label="Workspace name" value={workspace.name} onChange={(event) => onWorkspaceNameChange(event.target.value)} /></label>
          <h2>Projects</h2>
          {workspace.projects.map((item) => <label key={item.id}>{item.id === project.id ? "Current" : "Project"}<input aria-label={`${item.name} project name`} value={item.name} onChange={(event) => onProjectNameChange(item.id, event.target.value)} /></label>)}
          <div className="inline-form"><input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="New project name" /><button className="text-button" onClick={() => onAddProject(projectName)}><Plus size={14} /> Add Project</button></div>
        </div>
      </div>
    </section>
  );
}
