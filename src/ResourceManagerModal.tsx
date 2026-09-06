import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Pto, User, UserId, Workspace } from "./types";

type Props = {
  readonly workspace: Workspace;
  readonly onCancel: () => void;
  readonly onConfirm: (users: readonly User[], ptos: readonly Pto[], deletedResourceIds: readonly UserId[]) => void;
};

const defaultCapacityHours = 8;
const today = (): string => new Date().toISOString().slice(0, 10);

export function ResourceManagerModal({ workspace, onCancel, onConfirm }: Props) {
  const [expandedId, setExpandedId] = useState<UserId | undefined>(workspace.users[0]?.id);
  const [draftUsers, setDraftUsers] = useState<readonly User[]>(workspace.users);
  const [draftPtos, setDraftPtos] = useState<readonly Pto[]>(workspace.ptos);
  const [deletedResourceIds, setDeletedResourceIds] = useState<readonly UserId[]>([]);
  const [resourceName, setResourceName] = useState("New Resource");
  const [resourceEmail, setResourceEmail] = useState("resource@example.com");

  useEffect(() => {
    if (expandedId !== undefined && draftUsers.some((user) => user.id === expandedId)) {
      return;
    }
    setExpandedId(draftUsers[0]?.id);
  }, [expandedId, draftUsers]);

  const addResource = () => {
    if (resourceName.trim().length === 0) {
      return;
    }
    const resource: User = { id: `u-${Date.now()}`, name: resourceName.trim(), email: resourceEmail.trim(), dailyCapacityHours: defaultCapacityHours };
    setDraftUsers((current) => [...current, resource]);
    setExpandedId(resource.id);
    setResourceName("New Resource");
    setResourceEmail("resource@example.com");
  };

  const updateResource = (id: UserId, resource: User) => setDraftUsers((current) => current.map((candidate) => (candidate.id === id ? resource : candidate)));

  const deleteResource = (id: UserId) => {
    setDraftUsers((current) => current.filter((resource) => resource.id !== id));
    setDraftPtos((current) => current.filter((pto) => pto.userId !== id));
    setDeletedResourceIds((current) => (workspace.users.some((resource) => resource.id === id) ? [...current, id] : current));
  };

  const updatePto = (index: number, pto: Pto) => setDraftPtos((current) => current.map((candidate, ptoIndex) => (ptoIndex === index ? pto : candidate)));

  const addPto = (userId: UserId) => {
    const date = today();
    setDraftPtos((current) => [...current, { userId, startDate: date, endDate: date, reason: "PTO" }]);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="resource-modal" role="dialog" aria-modal="true" aria-label="Manage resources">
        <header className="modal-header">
          <h2>Manage Resources</h2>
          <button className="icon-button" aria-label="Close resources" onClick={onCancel}><X size={18} /></button>
        </header>
        <div className="resource-add">
          <input value={resourceName} onChange={(event) => setResourceName(event.target.value)} aria-label="New resource name" placeholder="Resource name" />
          <input value={resourceEmail} onChange={(event) => setResourceEmail(event.target.value)} aria-label="New resource email" placeholder="Email" />
          <button className="text-button primary" onClick={addResource}><Plus size={16} /> Add Resource</button>
        </div>

        <div className="resource-list">
          {draftUsers.map((resource) => {
            const ptoEntries = draftPtos.map((pto, index) => ({ pto, index })).filter(({ pto }) => pto.userId === resource.id);
            const expanded = expandedId === resource.id;
            return (
              <article className="resource-item" key={resource.id}>
                <div className="resource-row">
                  <span className="person-avatar">{resource.name.charAt(0).toUpperCase()}</span>
                  <input aria-label={`${resource.name} name`} value={resource.name} onChange={(event) => updateResource(resource.id, { ...resource, name: event.target.value })} />
                  <input aria-label={`${resource.name} email`} value={resource.email} onChange={(event) => updateResource(resource.id, { ...resource, email: event.target.value })} />
                  <span className="pto-pill">PTO {ptoEntries.length}</span>
                  <button className="icon-button danger" aria-label={`Delete ${resource.name}`} onClick={() => deleteResource(resource.id)}><Trash2 size={14} /></button>
                  <button className="icon-button" aria-label={`${expanded ? "Collapse" : "Expand"} ${resource.name}`} onClick={() => setExpandedId(expanded ? undefined : resource.id)}>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
                {expanded ? (
                  <div className="pto-schedule">
                    <div className="pto-heading"><strong>PTO Schedule</strong><button className="text-button" onClick={() => addPto(resource.id)}><Plus size={14} /> Add PTO</button></div>
                    {ptoEntries.map(({ pto, index }) => (
                      <div className="pto-row" key={`${pto.userId}-${pto.startDate}-${index}`}>
                        <input type="date" value={pto.startDate} aria-label={`${resource.name} PTO start ${index + 1}`} onChange={(event) => updatePto(index, { ...pto, startDate: event.target.value })} />
                        <input type="date" value={pto.endDate} aria-label={`${resource.name} PTO end ${index + 1}`} onChange={(event) => updatePto(index, { ...pto, endDate: event.target.value })} />
                        <input value={pto.reason} aria-label={`${resource.name} PTO reason ${index + 1}`} onChange={(event) => updatePto(index, { ...pto, reason: event.target.value })} />
                        <button className="icon-button danger" aria-label={`Delete PTO ${index + 1}`} onClick={() => setDraftPtos((current) => current.filter((_pto, ptoIndex) => ptoIndex !== index))}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <footer className="modal-actions">
          <button className="text-button" onClick={onCancel}>Cancel</button>
          <button className="text-button primary" onClick={() => onConfirm(draftUsers, draftPtos, deletedResourceIds)}>Confirm</button>
        </footer>
      </section>
    </div>
  );
}
