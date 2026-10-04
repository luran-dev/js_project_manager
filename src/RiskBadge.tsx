import { ShieldAlert } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { activeTaskRisks, riskLevel, riskScore } from "./risk";
import type { ProjectRisk, TaskId, User } from "./types";

type Props = {
  readonly risks: readonly ProjectRisk[];
  readonly taskId: TaskId;
  readonly users: readonly User[];
  readonly onOpenRisk: (riskId: string) => void;
};

export function RiskBadge({ risks, taskId, users, onOpenRisk }: Props) {
  const active = activeTaskRisks(risks, taskId).slice().sort((left, right) => riskScore(right) - riskScore(left));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [position, setPosition] = useState<{ readonly left: number; readonly top: number }>();
  if (active.length === 0) return null;
  const highest = active.reduce((score, risk) => Math.max(score, riskScore(risk)), 0);
  const level = riskLevel(highest);

  const cancelClose = () => {
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
  };
  const open = () => {
    cancelClose();
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (bounds === undefined) return;
    const height = Math.min(300, 44 + active.length * 74);
    const top = bounds.bottom + height + 12 <= window.innerHeight ? bounds.bottom + 6 : Math.max(8, bounds.top - height - 6);
    setPosition({ left: Math.max(8, Math.min(bounds.left, window.innerWidth - 304)), top });
  };
  const close = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setPosition(undefined), 120);
  };
  const openRisk = (riskId: string) => {
    setPosition(undefined);
    onOpenRisk(riskId);
  };
  const activate = () => {
    if (active.length === 1) {
      openRisk(active[0]?.id ?? "");
      return;
    }
    if (position !== undefined) {
      setPosition(undefined);
      return;
    }
    open();
    window.requestAnimationFrame(() => popoverRef.current?.querySelector("button")?.focus());
  };

  const popover = position === undefined ? null : createPortal(
    <div ref={popoverRef} className="risk-popover" role="dialog" aria-label="Task risk summary" style={{ left: position.left, top: position.top }} onMouseEnter={cancelClose} onMouseLeave={close} onFocus={cancelClose} onBlur={close} onKeyDown={(event) => { if (event.key === "Escape") { setPosition(undefined); buttonRef.current?.focus(); } }}>
      <div className="risk-popover-head"><strong>Active risks</strong><span>{active.length}</span></div>
      {active.map((risk) => {
        const itemLevel = riskLevel(riskScore(risk));
        return <button className="risk-popover-item" key={risk.id} onClick={() => openRisk(risk.id)}><span className={`risk-level risk-${itemLevel.toLowerCase()}`}>{itemLevel} · {riskScore(risk)}</span><strong>{risk.title}</strong><small>{risk.status} · {users.find((user) => user.id === risk.ownerId)?.name ?? "Unassigned"} · {risk.dueDate}</small></button>;
      })}
    </div>,
    document.body,
  );

  return <span className="task-risk-anchor" onMouseEnter={open} onMouseLeave={close}><button ref={buttonRef} type="button" className={`task-risk-badge risk-${level.toLowerCase()}`} aria-label={`${active.length} active risks, highest ${level}`} aria-haspopup="dialog" aria-expanded={position !== undefined} onFocus={open} onBlur={close} onKeyDown={(event) => { if (event.key === "Escape") setPosition(undefined); }} onClick={activate}><ShieldAlert size={13} />{active.length}</button>{popover}</span>;
}
