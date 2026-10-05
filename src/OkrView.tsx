import { useState } from "react";
import { ChevronLeft, ChevronRight, CircleCheck, ListTodo, Pencil, Plus, Target } from "lucide-react";
import { OkrItemEditor, OkrWeekEditor } from "./OkrGridEditors";
import { today } from "./okr";
import { shiftDate, statusLabel, updateWeek, weekLabel, weekStart, workspaceOkrs } from "./okrGrid";
import type { OkrItem, WeeklyStatus } from "./okrTypes";
import type { Workspace } from "./types";

function TextCell({ value, label, required = false, readOnly, onSave }: { readonly value: string; readonly label: string; readonly required?: boolean; readonly readOnly: boolean; readonly onSave: (text: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);
  return <><textarea aria-label={label} value={draft} readOnly={readOnly} rows={4} aria-invalid={error} placeholder={readOnly ? "—" : "Click to write…"} onChange={(event) => { setDraft(event.target.value); setError(false); }} onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); setDraft(value); setError(false); }
  }} onBlur={() => {
    if (required && !draft.trim()) { setError(true); setDraft(value); return; }
    if (draft.trim() !== value) onSave(draft.trim());
  }} />{error && <small role="alert">This cell cannot be empty.</small>}</>;
}

function WeekCell({ entry, readOnly, onClick, label }: { readonly entry: WeeklyStatus | undefined; readonly readOnly: boolean; readonly onClick: () => void; readonly label: string }) {
  const risk = entry?.status === "Yellow" || entry?.status === "Red";
  return <button className="okr-week-cell" onClick={onClick} aria-label={label}>
    <span className={`okr-status okr-status-${entry?.status.toLowerCase() ?? "pending"}`}>{entry ? statusLabel(entry.status) : "No update"}</span>
    <span className="okr-cell-note">{entry?.note || (readOnly ? "No weekly note" : "Add a weekly update")}</span>
    {entry?.pathToGreen ? <span className={`okr-cell-plan${entry.planDone ? " is-complete" : ""}`}><strong>{entry.planDone ? <CircleCheck size={16} aria-hidden="true" /> : <ListTodo size={16} aria-hidden="true" />}{entry.planDone ? "Plan completed" : "Path to Green"}</strong><span>{entry.pathToGreen}</span></span> : risk ? <span className="okr-missing-plan">Add a Path to Green plan</span> : null}
  </button>;
}

type Props = { readonly workspace: Workspace; readonly author: string; readonly canEdit: boolean; readonly initialProjectId: string; readonly onChange: (updater: (workspace: Workspace) => Workspace) => void; readonly onOpenProject: (id: string) => void };

export function OkrView({ workspace, author, canEdit, initialProjectId, onChange, onOpenProject }: Props) {
  const [projectFilter, setProjectFilter] = useState(initialProjectId);
  const [firstWeek, setFirstWeek] = useState(weekStart(today()));
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null | undefined>();
  const [weekEditing, setWeekEditing] = useState<{ readonly id: string; readonly week: string }>();
  const items = workspaceOkrs(workspace);
  const weeks = [firstWeek, shiftDate(firstWeek, 7), shiftDate(firstWeek, 14)];
  const filtered = items.filter((item) => (!projectFilter || item.projectIds.includes(projectFilter)) && `${item.objective} ${item.keyResults} ${item.actualKeyResults}`.toLowerCase().includes(query.trim().toLowerCase()));
  const editItem = items.find((item) => item.id === editing);
  const weeklyItem = items.find((item) => item.id === weekEditing?.id);
  const changeItems = (update: (current: readonly OkrItem[]) => readonly OkrItem[]) => {
    if (canEdit) onChange((current) => ({ ...current, okrItems: update(workspaceOkrs(current)) }));
  };
  const patchItem = (id: string, patch: Partial<Pick<OkrItem, "objective" | "keyResults" | "actualKeyResults">>) => changeItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const saveItem = (next: OkrItem) => {
    changeItems((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? { ...next, weeklyStatuses: item.weeklyStatuses } : item) : [...current, next]);
    setEditing(undefined);
    setQuery("");
    if (projectFilter && !next.projectIds.includes(projectFilter)) setProjectFilter("");
  };
  return <section className="board okr-board" aria-label="OKR management">
    <div className="board-heading"><div><span className="eyebrow">{workspace.name}</span><h1><Target size={21} /> OKR</h1><p>Targets, actual results and weekly updates in one sheet.</p></div><button className="text-button primary" disabled={!canEdit} onClick={() => setEditing(null)}><Plus size={16} /> Add OKR</button></div>
    <div className="okr-grid-toolbar"><label className="okr-search-label">Search<input type="search" aria-label="Search OKRs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an Objective or KR…" /></label><label>Projects<select aria-label="Filter OKR projects" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="">All projects</option>{workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <div className="okr-week-navigation"><span>Weekly status</span><div><button className="icon-button" aria-label="Previous three weeks" onClick={() => setFirstWeek(shiftDate(firstWeek, -21))}><ChevronLeft size={18} /></button><input aria-label="First visible week" type="date" value={firstWeek} onChange={(event) => { if (event.target.value) setFirstWeek(weekStart(event.target.value)); }} /><button className="icon-button" aria-label="Next three weeks" onClick={() => setFirstWeek(shiftDate(firstWeek, 21))}><ChevronRight size={18} /></button><button className="text-button" onClick={() => setFirstWeek(weekStart(today()))}>This week</button></div></div>
    </div>
    <div className="okr-grid-caption"><span>{filtered.length} OKR{filtered.length === 1 ? "" : "s"}</span><span>{canEdit ? "Edit text cells directly · Changes save when you leave a cell · Click a week to update" : "Viewer access · Read-only"}</span><span>Weeks start Monday</span></div>
    {filtered.length === 0 && <p className="okr-empty" role="status">{items.length ? "No matching OKRs. Change the search or project filter." : "Add your first OKR to start tracking targets and weekly progress."}</p>}
    <div className="okr-grid-scroll" role="region" aria-label="OKR sheet, scroll horizontally for weekly status" tabIndex={0}><table className="okr-grid"><caption className="okr-sr-only">Objectives, Target and Actual Key Results, linked projects, duration and weekly status</caption>
      <colgroup><col className="okr-col-text" /><col className="okr-col-text" /><col className="okr-col-text" /><col className="okr-col-projects" /><col className="okr-col-duration" />{weeks.map((week) => <col className="okr-col-week" key={week} />)}<col className="okr-col-actions" /></colgroup>
      <thead><tr><th scope="col">Objective</th><th scope="col">Key Results <small>Target</small></th><th scope="col">Actual Key Results</th><th scope="col">Linked projects</th><th scope="col">Duration</th>{weeks.map((week) => <th scope="col" key={week} className={week === weekStart(today()) ? "okr-current-week" : ""}>Weekly status<small>{weekLabel(week)}{week === weekStart(today()) ? " · This week" : ""}</small></th>)}<th scope="col"><span className="okr-sr-only">Actions</span></th></tr></thead>
      <tbody>{filtered.map((item) => <tr key={item.id}>
        <td><TextCell key={item.objective} value={item.objective} label={`Objective: ${item.objective}`} required readOnly={!canEdit} onSave={(text) => patchItem(item.id, { objective: text })} /></td>
        <td><TextCell key={item.keyResults} value={item.keyResults} label={`Target Key Results: ${item.objective}`} required readOnly={!canEdit} onSave={(text) => patchItem(item.id, { keyResults: text })} /></td>
        <td><TextCell key={item.actualKeyResults} value={item.actualKeyResults} label={`Actual Key Results: ${item.objective}`} readOnly={!canEdit} onSave={(text) => patchItem(item.id, { actualKeyResults: text })} /></td>
        <td><div className="okr-project-links">{item.projectIds.map((id) => { const project = workspace.projects.find((candidate) => candidate.id === id); return project ? <button key={id} className="okr-project-link" onClick={() => onOpenProject(id)}>{project.name} ↗</button> : <span key={id}>Deleted project</span>; })}{!item.projectIds.length && <span className="okr-muted">Not linked</span>}<button className="okr-edit-link" disabled={!canEdit} onClick={() => setEditing(item.id)}>Edit links</button></div></td>
        <td><button className="okr-duration-cell" disabled={!canEdit} aria-label={`Edit duration: ${item.objective}`} onClick={() => setEditing(item.id)}><span>{item.startDate}</span><span className="okr-muted">to {item.endDate}</span></button></td>
        {weeks.map((week) => <td key={week}><WeekCell entry={item.weeklyStatuses.find((entry) => entry.week === week)} readOnly={!canEdit} label={`Weekly status ${week}: ${item.objective}`} onClick={() => setWeekEditing({ id: item.id, week })} /></td>)}
        <td><button className="icon-button" aria-label={`Edit OKR: ${item.objective}`} title="Edit OKR" disabled={!canEdit} onClick={() => setEditing(item.id)}><Pencil size={16} /></button></td>
      </tr>)}</tbody>
    </table></div>
    {editing !== undefined && <OkrItemEditor key={editing ?? "new"} item={editItem} projects={workspace.projects} defaultProjectId={projectFilter} onClose={() => setEditing(undefined)} onSave={saveItem} onDelete={(id) => { changeItems((current) => current.filter((item) => item.id !== id)); setEditing(undefined); }} />}
    {weeklyItem && weekEditing && <OkrWeekEditor item={weeklyItem} week={weekEditing.week} author={author} readOnly={!canEdit} onClose={() => setWeekEditing(undefined)} onSave={(entry) => { changeItems((current) => current.map((item) => item.id === weeklyItem.id ? updateWeek(item, entry) : item)); setWeekEditing(undefined); }} />}
  </section>;
}
