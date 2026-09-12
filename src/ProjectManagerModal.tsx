import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { PROJECT_COUNTRIES, type ProjectCountry, type ProjectState } from "./types";

type Props = {
  readonly projects: readonly ProjectState[];
  readonly activeProjectId: string;
  readonly defaultCountry: ProjectCountry;
  readonly onCancel: () => void;
  readonly onConfirm: (projects: readonly ProjectState[], activeProjectId: string) => void;
};

export function ProjectManagerModal({ projects, activeProjectId, defaultCountry, onCancel, onConfirm }: Props) {
  const [draftProjects, setDraftProjects] = useState<readonly ProjectState[]>(projects);
  const [selectedId, setSelectedId] = useState(activeProjectId);
  const [newName, setNewName] = useState("New Project");

  const addProject = () => {
    const id = `project-${Date.now()}`;
    setDraftProjects((current) => [...current, { id, name: newName.trim() || "New Project", defaultCountry, tasks: [] }]);
    setSelectedId(id);
    setNewName("New Project");
  };

  const deleteProject = (id: string) => {
    if (draftProjects.length <= 1) {
      return;
    }
    const nextProjects = draftProjects.filter((project) => project.id !== id);
    setDraftProjects(nextProjects);
    if (selectedId === id) {
      setSelectedId(nextProjects[0]?.id ?? "");
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="resource-modal entity-modal" role="dialog" aria-modal="true" aria-label="Manage projects">
        <header className="modal-header">
          <h2>Manage Projects</h2>
          <button className="icon-button" aria-label="Close projects" onClick={onCancel}><X size={18} /></button>
        </header>
        <div className="entity-add">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} aria-label="New project name" placeholder="Project name" />
          <button className="text-button primary" onClick={addProject}><Plus size={16} /> Add Project</button>
        </div>
        <div className="entity-list">
          {draftProjects.map((project) => (
            <div className="entity-row" key={project.id}>
              <input aria-label={`${project.name} project name`} value={project.name} onChange={(event) => setDraftProjects((current) => current.map((item) => (item.id === project.id ? { ...item, name: event.target.value } : item)))} />
              <select aria-label={`${project.name} default country`} value={project.defaultCountry ?? "Korea"} onChange={(event) => setDraftProjects((current) => current.map((item) => (item.id === project.id ? { ...item, defaultCountry: PROJECT_COUNTRIES.find((country) => country === event.target.value) ?? "Korea" } : item)))}>{PROJECT_COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}</select>
              <button className={selectedId === project.id ? "text-button primary" : "text-button"} onClick={() => setSelectedId(project.id)}>Select</button>
              <button className="icon-button danger" aria-label={`Delete ${project.name}`} disabled={draftProjects.length <= 1} onClick={() => deleteProject(project.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <footer className="modal-actions">
          <button className="text-button" onClick={onCancel}>Cancel</button>
          <button className="text-button primary" onClick={() => onConfirm(draftProjects, selectedId)}>Confirm</button>
        </footer>
      </section>
    </div>
  );
}
