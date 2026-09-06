import { isPtoDay } from "./schedule";
import type { Pto, Task, User } from "./types";

const shortDate = (date: string): string => date.slice(5).replace("-", "/");

export function ResourceHeatmap({ tasks, users, ptos, dates }: { readonly tasks: readonly Task[]; readonly users: readonly User[]; readonly ptos: readonly Pto[]; readonly dates: readonly string[] }) {
  return (
    <div className="resource-pane">
      <div className="resource-grid" style={{ gridTemplateColumns: `140px repeat(${dates.length}, 54px)` }}>
        <div className="resource-head">Resource</div>
        {dates.map((date) => <div className="resource-head" key={date}>{shortDate(date)}</div>)}
        {users.flatMap((user) => [
          <div className="resource-name" key={user.id}>{user.name}<span>{user.dailyCapacityHours}h cap</span></div>,
          ...dates.map((date) => {
            const hours = tasks.filter((task) => task.assigneeId === user.id && task.startDate <= date && date <= task.endDate).reduce((sum, task) => sum + Math.ceil(task.estimatedHours / Math.max(1, task.duration)), 0);
            const pto = isPtoDay(date, user.id, ptos);
            const className = pto ? "heat pto" : hours > user.dailyCapacityHours ? "heat over" : "heat";
            return <div className={className} key={`${user.id}-${date}`} aria-label={`${user.name} ${date}: ${pto ? "PTO" : `${hours} hours`}`}>{pto ? "PTO" : hours}</div>;
          }),
        ])}
      </div>
    </div>
  );
}
