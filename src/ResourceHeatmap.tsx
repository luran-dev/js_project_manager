import type { ReactNode } from "react";
import type { ResourcePerspective } from "./resourceAnalytics";
import { isPtoDay } from "./schedule";
import type { Pto, Task, User } from "./types";

const shortDate = (date: string): string => date.slice(5).replace("-", "/");

export function ResourceHeatmap({ title, perspective, actions, tasks, users, ptos, dates }: { readonly title: string; readonly perspective: ResourcePerspective; readonly actions?: ReactNode; readonly tasks: readonly Task[]; readonly users: readonly User[]; readonly ptos: readonly Pto[]; readonly dates: readonly string[] }) {
  return (
    <div className="resource-pane">
      <div className="resource-title"><span>{title}</span>{actions}</div>
      <div className="resource-grid" style={{ gridTemplateColumns: `139px repeat(${dates.length}, 54.3px)` }}>
        <div className="resource-head">Resource</div>
        {dates.map((date) => <div className="resource-head" key={date}>{shortDate(date)}</div>)}
        {users.flatMap((user) => [
          <div className="resource-name" key={user.id}>{user.name}<span>{user.dailyCapacityHours}h cap</span></div>,
          ...dates.map((date) => {
            const hours = tasks.filter((task) => task.assigneeId === user.id && task.startDate <= date && date <= task.endDate && task.estimatedHours > 0).reduce((sum, task) => sum + (perspective === "planner" ? user.dailyCapacityHours : Math.ceil(task.estimatedHours / Math.max(1, task.duration))), 0);
            const pto = isPtoDay(date, user.id, ptos);
            const className = pto ? "heat pto" : hours > user.dailyCapacityHours ? "heat over" : "heat";
            const md = hours / user.dailyCapacityHours;
            return <div className={className} key={`${user.id}-${date}`} aria-label={`${user.name} ${date}: ${pto ? "PTO" : `${md.toFixed(1)} MD`}`}>{pto ? "PTO" : `${md.toFixed(1)} MD`}</div>;
          }),
        ])}
      </div>
    </div>
  );
}
