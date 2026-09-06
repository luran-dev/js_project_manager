import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { ProjectState, Workspace } from "./types";

type Props = {
  readonly workspaces: readonly Workspace[];
  readonly activeWorkspaceId: string;
  readonly onCancel: () => void;
  readonly onConfirm: (workspaces: readonly Workspace[], activeWorkspaceId: string) => void;
};

const newProject = (): ProjectState => ({ id: `project-${Date.now()}`, name: "New Project", defaultCountry: "Korea", tasks: [] });

export function WorkspaceManagerModal({ workspaces, activeWorkspaceId, onCancel, onConfirm }: Props) {
  const [draftWorkspaces, setDraftWorkspaces] = useState<readonly Workspace[]>(workspaces);
  const [selectedId, setSelectedId] = useState(activeWorkspaceId);
  const [newName, setNewName] = useState("New Workspace");

  const addWorkspace = () => {
    const id = `w-${Date.now()}`;
    setDraftWorkspaces((current) => [...current, { id, name: newName.trim() || "New Workspace", users: [], ptos: [], projects: [newProject()] }]);
    setSelectedId(id);
    setNewName("New Workspace");
  };

  const deleteWorkspace = (id: string) => {
    if (draftWorkspaces.length <= 1) {
      return;
    }
    const nextWorkspaces = draftWorkspaces.filter((workspace) => workspace.id !== id);
    setDraftWorkspaces(nextWorkspaces);
    if (selectedId === id) {
      setSelectedId(nextWorkspaces[0]?.id ?? "");
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="resource-modal entity-modal" role="dialog" aria-modal="true" aria-label="Manage workspaces">
        <header className="modal-header">
          <h2>Manage Workspaces</h2>
          <button className="icon-button" aria-label="Close workspaces" onClick={onCancel}><X size={18} /></button>
        </header>
        <div className="entity-add">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} aria-label="New workspace name" placeholder="Workspace name" />
          <button className="text-button primary" onClick={addWorkspace}><Plus size={16} /> Add Workspace</button>
        </div>
        <div className="entity-list">
          {draftWorkspaces.map((workspace) => (
            <div className="entity-row" key={workspace.id}>
              <input aria-label={`${workspace.name} workspace name`} value={workspace.name} onChange={(event) => setDraftWorkspaces((current) => current.map((item) => (item.id === workspace.id ? { ...item, name: event.target.value } : item)))} />
              <button className={selectedId === workspace.id ? "text-button primary" : "text-button"} onClick={() => setSelectedId(workspace.id)}>Select</button>
              <button className="icon-button danger" aria-label={`Delete ${workspace.name}`} disabled={draftWorkspaces.length <= 1} onClick={() => deleteWorkspace(workspace.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <footer className="modal-actions">
          <button className="text-button" onClick={onCancel}>Cancel</button>
          <button className="text-button primary" onClick={() => onConfirm(draftWorkspaces, selectedId)}>Confirm</button>
        </footer>
      </section>
    </div>
  );
}
