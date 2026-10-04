import { resourceCapacityMd } from "./resourceCapacity";
import { isPtoDay } from "./schedule";
import type { Pto, ResourceCapacity, User, UserId } from "./types";

const shortDate = (date: string): string => date.slice(5).replace("-", "/");

export function ResourceHeatmap({ users, ptos, capacities, dates, onCapacityChange }: { readonly users: readonly User[]; readonly ptos: readonly Pto[]; readonly capacities: readonly ResourceCapacity[] | undefined; readonly dates: readonly string[]; readonly onCapacityChange: (userId: UserId, date: string, md: number) => void }) {
  return (
    <div className="resource-pane">
      <div className="resource-title"><span>Daily capacity</span></div>
      <div className="resource-grid" style={{ gridTemplateColumns: `150px repeat(${dates.length}, 88px)` }}>
        <div className="resource-head">Resource</div>
        {dates.map((date) => <div className="resource-head" key={date}>{shortDate(date)}</div>)}
        {users.flatMap((user) => [
          <div className="resource-name" key={user.id}>{user.name}<span>{user.dailyCapacityHours}h cap</span></div>,
          ...dates.map((date) => {
            const pto = isPtoDay(date, user.id, ptos);
            const md = resourceCapacityMd(capacities, user.id, date);
            return <div className={pto ? "heat pto" : "heat capacity-cell"} key={`${user.id}-${date}`}>{pto ? "PTO" : <label><input aria-label={`${user.name} ${date} capacity`} type="number" min="0" max="1" step="0.1" value={md.toFixed(1)} onChange={(event) => onCapacityChange(user.id, date, Math.min(1, Math.max(0, Number(event.target.value))))} /><span>MD</span></label>}</div>;
          }),
        ])}
      </div>
    </div>
  );
}
