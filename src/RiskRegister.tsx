import { ChevronDown, ChevronRight, Pencil, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { RISK_LEVELS, riskLevel, riskScore, taskDisplayPath, type RiskLevel } from "./risk";
import { RISK_CATEGORIES, RISK_STATUSES, RISK_STRATEGIES, type ProjectRisk, type RiskCategory, type RiskStatus, type RiskStrategy, type Task, type User } from "./types";

const today = (): string => new Date().toISOString().slice(0, 10);
const parseCategory = (value: string): RiskCategory => RISK_CATEGORIES.find((item) => item === value) ?? "SCHEDULE";
const parseStatus = (value: string): RiskStatus => RISK_STATUSES.find((item) => item === value) ?? "OPEN";
const parseStrategy = (value: string): RiskStrategy => RISK_STRATEGIES.find((item) => item === value) ?? "MITIGATE";
const parseLevel = (value: string): RiskLevel | "ALL" => RISK_LEVELS.find((item) => item === value) ?? "ALL";
const scoreValue = (value: FormDataEntryValue | null): number => Math.min(5, Math.max(1, Number(value) || 1));

type RiskEditorProps = {
  readonly risk?: ProjectRisk;
  readonly tasks: readonly Task[];
  readonly users: readonly User[];
  readonly onCancel: () => void;
  readonly onSave: (risk: ProjectRisk) => void;
};

function RiskEditor({ risk, tasks, users, onCancel, onSave }: RiskEditorProps) {
  const [taskIds, setTaskIds] = useState<readonly string[]>(risk?.taskIds ?? []);
  const [taskQuery, setTaskQuery] = useState("");
  const taskOptions = tasks.filter((task) => taskDisplayPath(tasks, task.id).toLowerCase().includes(taskQuery.trim().toLowerCase()));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const probability = scoreValue(form.get("probability"));
    const impact = scoreValue(form.get("impact"));
    const note = String(form.get("reviewNote") ?? "").trim();
    const createdAt = new Date().toISOString();
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const ownerId = String(form.get("ownerId") ?? "");
    const next: ProjectRisk = {
      id: risk?.id ?? `risk-${Date.now()}`,
      title,
      description: String(form.get("description") ?? "").trim(),
      category: parseCategory(String(form.get("category") ?? "")),
      probability,
      impact,
      status: parseStatus(String(form.get("status") ?? "")),
      strategy: parseStrategy(String(form.get("strategy") ?? "")),
      ...(ownerId ? { ownerId } : {}),
      taskIds,
      identifiedDate: String(form.get("identifiedDate") ?? today()),
      dueDate: String(form.get("dueDate") ?? today()),
      mitigationPlan: String(form.get("mitigationPlan") ?? "").trim(),
      contingencyPlan: String(form.get("contingencyPlan") ?? "").trim(),
      history: [...(risk?.history ?? []), { id: `history-${Date.now()}`, createdAt, note: note || (risk === undefined ? "Risk created" : "Risk assessment updated"), score: probability * impact }],
    };
    onSave(next);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="resource-modal risk-modal" role="dialog" aria-modal="true" aria-labelledby="risk-editor-title">
        <header className="modal-header"><h2 id="risk-editor-title">{risk === undefined ? "Register Risk" : "Update Risk"}</h2><button className="icon-button" aria-label="Close risk editor" onClick={onCancel}><X size={18} /></button></header>
        <form onSubmit={submit}>
          <div className="risk-form-grid">
            <label className="span-2">Title<input name="title" defaultValue={risk?.title ?? ""} required /></label>
            <label className="span-2">Description<textarea name="description" defaultValue={risk?.description ?? ""} rows={3} /></label>
            <label>Category<select name="category" defaultValue={risk?.category ?? "SCHEDULE"}>{RISK_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Status<select name="status" defaultValue={risk?.status ?? "OPEN"}>{RISK_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Probability (1-5)<input name="probability" type="number" min="1" max="5" defaultValue={risk?.probability ?? 3} required /></label>
            <label>Impact (1-5)<input name="impact" type="number" min="1" max="5" defaultValue={risk?.impact ?? 3} required /></label>
            <label>Owner<select name="ownerId" defaultValue={risk?.ownerId ?? ""}><option value="">Unassigned</option>{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label>
            <label>Response strategy<select name="strategy" defaultValue={risk?.strategy ?? "MITIGATE"}>{RISK_STRATEGIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Identified date<input name="identifiedDate" type="date" defaultValue={risk?.identifiedDate ?? today()} required /></label>
            <label>Target date<input name="dueDate" type="date" defaultValue={risk?.dueDate ?? today()} required /></label>
            <fieldset className="span-2 risk-task-picker"><legend>Linked tasks</legend><input className="risk-task-search" type="search" aria-label="Search linked tasks" placeholder="Search task path..." value={taskQuery} onChange={(event) => setTaskQuery(event.target.value)} /><div className="risk-task-options">{taskOptions.length === 0 ? <span className="risk-task-empty">No matching tasks</span> : taskOptions.map((task) => <label key={task.id}><input type="checkbox" checked={taskIds.includes(task.id)} onChange={(event) => setTaskIds((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} /><span>{taskDisplayPath(tasks, task.id)}</span></label>)}</div></fieldset>
            <label className="span-2">Mitigation plan<textarea name="mitigationPlan" defaultValue={risk?.mitigationPlan ?? ""} rows={3} /></label>
            <label className="span-2">Contingency plan<textarea name="contingencyPlan" defaultValue={risk?.contingencyPlan ?? ""} rows={3} /></label>
            <label className="span-2">Review note<input name="reviewNote" placeholder="What changed in this review?" /></label>
          </div>
          <footer className="modal-actions"><button className="text-button" type="button" onClick={onCancel}>Cancel</button><button className="text-button primary" type="submit">Save Risk</button></footer>
        </form>
      </section>
    </div>
  );
}

type Props = {
  readonly projectName: string;
  readonly risks: readonly ProjectRisk[];
  readonly tasks: readonly Task[];
  readonly users: readonly User[];
  readonly focusedRiskId: string | undefined;
  readonly onChange: (risks: readonly ProjectRisk[]) => void;
};

function RiskDetails({ risk, tasks, users }: { readonly risk: ProjectRisk; readonly tasks: readonly Task[]; readonly users: readonly User[] }) {
  const linkedTasks = tasks.filter((task) => risk.taskIds.includes(task.id));
  const owner = users.find((user) => user.id === risk.ownerId)?.name ?? "Unassigned";
  return <div className="risk-detail">
    <section className="risk-detail-card"><h3>Risk profile</h3><dl><div><dt>Category</dt><dd>{risk.category}</dd></div><div><dt>Status</dt><dd>{risk.status}</dd></div><div><dt>Probability</dt><dd>{risk.probability} / 5</dd></div><div><dt>Impact</dt><dd>{risk.impact} / 5</dd></div><div><dt>Score</dt><dd><strong>{riskScore(risk)}</strong></dd></div><div><dt>Strategy</dt><dd>{risk.strategy}</dd></div><div><dt>Owner</dt><dd>{owner}</dd></div><div><dt>Target date</dt><dd>{risk.dueDate}</dd></div></dl></section>
    <section className="risk-detail-card"><h3>Context</h3><div className="risk-detail-field"><strong>Description</strong><p>{risk.description || "No description"}</p></div><div className="risk-detail-field"><strong>Linked tasks</strong><ul className="linked-task-paths">{linkedTasks.length === 0 ? <li>None</li> : linkedTasks.map((task) => <li key={task.id}>{taskDisplayPath(tasks, task.id)}</li>)}</ul></div></section>
    <section className="risk-detail-card"><h3>Response plan</h3><div className="risk-detail-field"><strong>Mitigation</strong><p>{risk.mitigationPlan || "No mitigation plan"}</p></div><div className="risk-detail-field"><strong>Contingency</strong><p>{risk.contingencyPlan || "No contingency plan"}</p></div></section>
    <section className="risk-detail-card risk-detail-history"><h3>Review history</h3><ol>{risk.history.slice().reverse().map((entry) => <li key={entry.id}><strong>{entry.note}</strong><span>{entry.createdAt.slice(0, 10)} · Score {entry.score}</span></li>)}</ol></section>
  </div>;
}

export function RiskRegister({ projectName, risks, tasks, users, focusedRiskId, onChange }: Props) {
  const [status, setStatus] = useState<RiskStatus | "ALL">("ALL");
  const [level, setLevel] = useState<RiskLevel | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | undefined>(focusedRiskId);
  const [editing, setEditing] = useState<ProjectRisk | "new">();
  const filtered = useMemo(() => risks.filter((risk) => (status === "ALL" || risk.status === status) && (level === "ALL" || riskLevel(riskScore(risk)) === level) && `${risk.title} ${risk.description}`.toLowerCase().includes(query.trim().toLowerCase())).sort((left, right) => riskScore(right) - riskScore(left)), [level, query, risks, status]);
  const open = risks.filter((risk) => risk.status !== "CLOSED");
  const high = open.filter((risk) => riskScore(risk) >= 10);

  useEffect(() => {
    if (focusedRiskId === undefined || !risks.some((risk) => risk.id === focusedRiskId)) return;
    setStatus("ALL");
    setLevel("ALL");
    setQuery("");
    setExpandedId(focusedRiskId);
    const frame = window.requestAnimationFrame(() => document.getElementById(`risk-row-${focusedRiskId}`)?.scrollIntoView({ block: "center" }));
    return () => window.cancelAnimationFrame(frame);
  }, [focusedRiskId, risks]);

  const save = (next: ProjectRisk) => {
    onChange(risks.some((risk) => risk.id === next.id) ? risks.map((risk) => risk.id === next.id ? next : risk) : [...risks, next]);
    setEditing(undefined);
  };

  return (
    <section className="board risk-board" aria-label="Project risk register">
      <div className="risk-head">
        <div><h2><ShieldAlert size={19} /> Risk Register</h2><p>{projectName} project risks and response plans</p></div>
        <div className="risk-kpis"><span><strong>{open.length}</strong> Active</span><span><strong>{high.length}</strong> High / Critical</span><span><strong>{risks.filter((risk) => risk.status === "OCCURRED").length}</strong> Occurred</span></div>
        <button className="text-button primary" onClick={() => setEditing("new")}><Plus size={16} /> Register Risk</button>
      </div>
      <div className="risk-filters">
        <input type="search" aria-label="Search risks" placeholder="Search risks..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filter risk status" value={status} onChange={(event) => setStatus(event.target.value === "ALL" ? "ALL" : parseStatus(event.target.value))}><option value="ALL">All statuses</option>{RISK_STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter risk level" value={level} onChange={(event) => setLevel(parseLevel(event.target.value))}><option value="ALL">All levels</option>{RISK_LEVELS.map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <div className="risk-table-wrap">
        <table className="risk-table">
          <thead><tr><th aria-label="Expand" /><th>Risk</th><th>Level</th><th>Score</th><th>Status</th><th>Owner</th><th>Target</th><th>Tasks</th><th aria-label="Actions" /></tr></thead>
          <tbody>{filtered.length === 0 ? <tr><td colSpan={9} className="risk-empty">No risks match the current filters.</td></tr> : filtered.flatMap((risk) => {
            const expanded = expandedId === risk.id;
            const currentLevel = riskLevel(riskScore(risk));
            const linkedTasks = tasks.filter((task) => risk.taskIds.includes(task.id));
            return [<tr key={risk.id} id={`risk-row-${risk.id}`} className={focusedRiskId === risk.id ? "focused-risk-row" : ""}>
              <td><button className="icon-button" aria-label={`${expanded ? "Collapse" : "Expand"} ${risk.title}`} aria-expanded={expanded} onClick={() => setExpandedId(expanded ? undefined : risk.id)}>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button></td>
              <td><strong>{risk.title}</strong><small>{risk.category}</small></td>
              <td><span className={`risk-level risk-${currentLevel.toLowerCase()}`}>{currentLevel}</span></td><td className="risk-score">{riskScore(risk)}</td><td>{risk.status}</td><td>{users.find((user) => user.id === risk.ownerId)?.name ?? "Unassigned"}</td><td>{risk.dueDate}</td><td>{linkedTasks.length}</td>
              <td className="risk-actions"><button className="icon-button" aria-label={`Edit ${risk.title}`} onClick={() => setEditing(risk)}><Pencil size={14} /></button><button className="icon-button danger" aria-label={`Delete ${risk.title}`} onClick={() => onChange(risks.filter((item) => item.id !== risk.id))}><Trash2 size={14} /></button></td>
            </tr>, ...(expanded ? [<tr key={`${risk.id}-detail`} className="risk-detail-row"><td colSpan={9}><RiskDetails risk={risk} tasks={tasks} users={users} /></td></tr>] : [])];
          })}</tbody>
        </table>
      </div>
      {editing === undefined ? null : editing === "new" ? <RiskEditor tasks={tasks} users={users} onCancel={() => setEditing(undefined)} onSave={save} /> : <RiskEditor risk={editing} tasks={tasks} users={users} onCancel={() => setEditing(undefined)} onSave={save} />}
    </section>
  );
}
