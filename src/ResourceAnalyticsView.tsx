import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { buildResourceLoads } from "./resourceAnalytics";
import type { UserId, Workspace } from "./types";

const percent = (value: number): string => `${Math.round(value)}%`;
const shortDate = (date: string): string => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));
const loadRatio = (hours: number, capacity: number): number => capacity === 0 ? 0 : hours / capacity;
const md = (hours: number, dailyCapacityHours: number): string => `${(hours / Math.max(1, dailyCapacityHours)).toFixed(1)} MD`;

export function ResourceAnalyticsView({ workspace }: { readonly workspace: Workspace }) {
  const [selectedUserId, setSelectedUserId] = useState<UserId>();
  const loads = buildResourceLoads(workspace);
  const totalHours = loads.reduce((sum, load) => sum + load.totalHours, 0);
  const overallocated = loads.filter((load) => load.overallocatedDays > 0);
  const dates = loads[0]?.dailyLoads.map((load) => load.date) ?? [];
  const selectedLoad = loads.find((load) => load.userId === selectedUserId) ?? loads[0];
  const selectedUser = workspace.users.find((user) => user.id === selectedLoad?.userId);
  const hotspots = loads.flatMap((load) => load.dailyLoads.filter((day) => day.hours > day.capacity).map((day) => ({ label: `${shortDate(day.date)} ${load.name} ${loadRatio(day.hours, day.capacity).toFixed(1)} PD`, ratio: loadRatio(day.hours, day.capacity) }))).sort((left, right) => right.ratio - left.ratio).slice(0, 4);

  return (
    <section className="board analytics-board" aria-label="Resource workload and capacity">
      <div className="analytics-head">
        <div><h2>Resource Workload</h2><p>{workspace.name} workspace allocation across {workspace.projects.length} project(s)</p></div>
        <div className="analytics-kpis"><span><strong>{totalHours}</strong> Assigned hours</span><span><strong>{overallocated.length}</strong> Overloaded resources</span><span><strong>{workspace.users.length}</strong> Resources</span></div>
      </div>
      <div className="analytics-grid">
        <div className="analytics-panel">
          <h3><BarChart3 size={16} /> Allocation / Capacity</h3>
          <div className="load-list">
            {loads.map((load) => (
              <div className="load-row" key={load.userId}>
                <div className="load-title"><button className={selectedLoad?.userId === load.userId ? "resource-link selected" : "resource-link"} onClick={() => setSelectedUserId(load.userId)}>{load.name}</button><span>{load.totalHours}h / {load.capacityHours}h</span></div>
                <div className="load-bar" aria-label={`${load.name} utilization ${load.utilization}%`}><span className={load.utilization > 100 ? "over" : ""} style={{ inlineSize: `${Math.min(100, load.utilization)}%` }} /></div>
                <div className="load-meta"><span>{md(load.totalHours, workspace.users.find((user) => user.id === load.userId)?.dailyCapacityHours ?? 8)} assigned</span><span>{percent(load.utilization)} utilized</span><span>{load.overallocatedDays} overallocated days</span><span>Peak {load.peakDailyHours}h/day</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="analytics-panel">
          <h3>Overload Hotspots</h3>
          <div className="hotspot-list">{hotspots.length === 0 ? <span>No overallocated dates</span> : hotspots.map((hotspot) => <span key={hotspot.label}>{hotspot.label}</span>)}</div>
        </div>
        <div className="analytics-panel wide">
          <h3>Assigned MD by Resource</h3>
          {selectedLoad === undefined || selectedUser === undefined ? <div className="hotspot-list"><span>No resource assignment</span></div> : (
            <div className="md-breakdown">
              <div className="md-summary"><strong>{selectedLoad.name}</strong><span>{md(selectedLoad.totalHours, selectedUser.dailyCapacityHours)} total assigned</span></div>
              {selectedLoad.projectLoads.length === 0 ? <span className="empty-md">No assigned project</span> : selectedLoad.projectLoads.map((projectLoad) => <div className="md-row" key={projectLoad.projectId}><span>{projectLoad.projectName}</span><strong>{md(projectLoad.hours, selectedUser.dailyCapacityHours)}</strong><em>{projectLoad.hours}h / {projectLoad.tasks} tasks</em></div>)}
            </div>
          )}
        </div>
        <div className="analytics-panel wide">
          <h3>Daily Workload Heatmap</h3>
          <div className="workload-legend"><span><i className="normal" /> Normal (&le;1.0 PD)</span><span><i className="over" /> Overallocated (&gt;1.0 PD)</span><span><i className="off" /> PTO / Weekend</span></div>
          <div className="workload-grid" style={{ gridTemplateColumns: `160px repeat(${dates.length}, 80px)` }}>
            <div className="workload-head">Resources</div>
            {dates.map((date) => <div className="workload-head date" key={date}>{shortDate(date)}</div>)}
            {loads.flatMap((load) => [
              <div className="workload-name" key={load.userId}>{load.name}</div>,
              ...load.dailyLoads.map((day) => {
                const ratio = loadRatio(day.hours, day.capacity);
                const off = day.capacity === 0;
                return <div className={off ? "workload-cell off" : day.hours === 0 ? "workload-cell idle" : ratio > 1 ? "workload-cell over" : "workload-cell normal"} key={`${load.userId}-${day.date}`} title={`${load.name} ${shortDate(day.date)} ${day.projects.join(", ") || "No assignment"}`} aria-label={`${load.name} ${day.date}: ${off ? "PTO or weekend" : `${ratio.toFixed(1)} PD`}`}>{off || day.hours === 0 ? "" : ratio.toFixed(1)}</div>;
              }),
            ])}
          </div>
        </div>
        <div className="analytics-panel wide">
          <h3>Project Staffing</h3>
          <div className="project-load-grid">
            {workspace.projects.map((project) => (
              <div className="project-load-card" key={project.id}>
                <strong>{project.name}</strong>
                {loads.map((load) => {
                  const projectLoad = load.projectLoads.find((item) => item.projectId === project.id);
                  return projectLoad === undefined ? null : <span key={load.userId}>{load.name}: {projectLoad.hours}h / {projectLoad.tasks} tasks</span>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
