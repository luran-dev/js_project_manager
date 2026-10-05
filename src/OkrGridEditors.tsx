import { useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Modal } from "./Modal";
import { today } from "./okr";
import { statusLabel, weekLabel } from "./okrGrid";
import { OKR_STATUSES, type OkrItem, type OkrStatus, type WeeklyStatus } from "./okrTypes";
import type { ProjectState } from "./types";

function Editor({ title, children, onClose, onSubmit, footer, readOnly = false }: { readonly title: string; readonly children: ReactNode; readonly onClose: () => void; readonly onSubmit: (data: FormData) => string | void; readonly footer?: ReactNode; readonly readOnly?: boolean }) {
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;
    setError(onSubmit(new FormData(event.currentTarget)) ?? "");
  };
  return <Modal title={title} className="okr-grid-dialog" onClose={onClose}><form onSubmit={submit}>
    <header className="modal-header"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close editor" onClick={onClose}><X size={20} /></button></header>
    <div className="okr-editor-body">{children}{error && <p className="auth-error" role="alert">{error}</p>}</div>
    <footer className="modal-actions">{footer}<button className="text-button" type="button" onClick={onClose}>{readOnly ? "Close" : "Cancel"}</button>{!readOnly && <button className="text-button primary" type="submit">Save</button>}</footer>
  </form></Modal>;
}
const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

export function OkrItemEditor({ item, projects, defaultProjectId, onClose, onSave, onDelete }: { readonly item: OkrItem | undefined; readonly projects: readonly ProjectState[]; readonly defaultProjectId: string; readonly onClose: () => void; readonly onSave: (item: OkrItem) => void; readonly onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  return <Editor title={item ? "Edit OKR" : "Add OKR"} onClose={onClose} onSubmit={(data) => {
    const objective = value(data, "objective"), keyResults = value(data, "keyResults"), startDate = value(data, "startDate"), endDate = value(data, "endDate");
    if (!objective || !keyResults) return "Enter an Objective and Target Key Results.";
    if (!startDate || !endDate || endDate < startDate) return "End date must be on or after start date.";
    const selectedIds = new Set(data.getAll("projectIds"));
    onSave({ id: item?.id ?? crypto.randomUUID(), objective, keyResults, actualKeyResults: value(data, "actualKeyResults"), startDate, endDate,
      projectIds: projects.filter((project) => selectedIds.has(project.id)).map((project) => project.id), weeklyStatuses: item?.weeklyStatuses ?? [] });
  }} footer={item && <button className="text-button danger" type="button" onClick={() => deleting ? onDelete(item.id) : setDeleting(true)}>{deleting ? "Confirm delete" : "Delete OKR"}</button>}>
    <label>Objective<textarea name="objective" defaultValue={item?.objective ?? ""} rows={2} required data-autofocus placeholder="What do we want to achieve?" /></label>
    <label>Key Results (Target)<textarea name="keyResults" defaultValue={item?.keyResults ?? ""} rows={3} required placeholder="Describe the results you are aiming for." /></label>
    <label>Actual Key Results<textarea name="actualKeyResults" defaultValue={item?.actualKeyResults ?? ""} rows={3} placeholder="Record the results achieved so far." /></label>
    <div className="okr-date-fields"><label>Start date<input type="date" name="startDate" defaultValue={item?.startDate ?? today()} required /></label><label>End date<input type="date" name="endDate" defaultValue={item?.endDate ?? today()} required /></label></div>
    <fieldset><legend>Linked projects</legend>{projects.length ? projects.map((project) => <label className="okr-project-option" key={project.id}><input type="checkbox" name="projectIds" value={project.id} defaultChecked={item?.projectIds.includes(project.id) ?? project.id === defaultProjectId} />{project.name}</label>) : <p>No projects in this workspace yet. You can link them later.</p>}</fieldset>
    {deleting && <p role="alert" className="auth-error">Deleting this OKR removes its weekly updates. Linked projects are kept. Click Confirm delete to continue.</p>}
  </Editor>;
}

export function OkrWeekEditor({ item, week, author, readOnly, onClose, onSave }: { readonly item: OkrItem; readonly week: string; readonly author: string; readonly readOnly: boolean; readonly onClose: () => void; readonly onSave: (entry: WeeklyStatus) => void }) {
  const existing = item.weeklyStatuses.find((entry) => entry.week === week);
  const [status, setStatus] = useState<OkrStatus>(existing?.status ?? "Pending");
  const [keepPlan, setKeepPlan] = useState(Boolean(existing?.pathToGreen));
  const showPlan = status === "Yellow" || status === "Red" || keepPlan;
  return <Editor title={`Weekly status · ${weekLabel(week)}`} readOnly={readOnly} onClose={onClose} onSubmit={(data) => onSave({
    week, status, note: value(data, "note"), pathToGreen: value(data, "pathToGreen"), planDone: data.get("planDone") === "on", author, updatedAt: new Date().toISOString(),
  })}>
    <p className="okr-editor-objective">{item.objective}</p>
    <label>Status<select name="status" value={status} disabled={readOnly} className={`okr-week-select okr-status-${status.toLowerCase()}`} onChange={(event) => {
      if (status === "Yellow" || status === "Red") setKeepPlan(true);
      setStatus(OKR_STATUSES.find((candidate) => candidate === event.target.value) ?? "Pending");
    }}>{OKR_STATUSES.map((candidate) => <option key={candidate} value={candidate}>{statusLabel(candidate)}</option>)}</select></label>
    <label>Weekly update<textarea name="note" rows={5} readOnly={readOnly} defaultValue={existing?.note ?? ""} placeholder="What changed this week? What needs attention?" autoFocus /></label>
    {showPlan && <fieldset className="okr-recovery-fields"><legend>Path to Green</legend><label>Recovery plan<textarea name="pathToGreen" rows={4} readOnly={readOnly} defaultValue={existing?.pathToGreen ?? ""} placeholder="What will bring this OKR back to Green? Include actions, owners and dates as needed." /></label><label className="okr-project-option"><input type="checkbox" name="planDone" disabled={readOnly} defaultChecked={existing?.planDone ?? false} />Plan completed</label><small>Completing the plan keeps your chosen status. Previous weeks remain unchanged.</small></fieldset>}
    {existing && <small>Last updated {new Date(existing.updatedAt).toLocaleString()} · {existing.author}</small>}
  </Editor>;
}
