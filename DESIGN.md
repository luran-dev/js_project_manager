# ProjectVibe Design System

## 0. Research Log

- Embedded refs: user screenshot is the concrete reference; loaded operational `taste-skill` + `layout-skill` because the product is a dense planning app shell.
- Lazyweb: skipped — concrete reference supplied.
- Imagen drafts: skipped — concrete reference supplied.
- Skipped lanes: brand/library research — the screenshot and SRS define the surface.

## 1. Atmosphere & Identity

ProjectVibe feels like a calm scheduling cockpit: dense, legible, and spreadsheet-adjacent without becoming gray sludge. The signature is a frozen WBS grid paired with a lightly lit timeline band, so planning status and schedule consequence are visible in one glance.

## 2. Color

| Role | Token | Light | Usage |
|------|-------|-------|-------|
| Surface/page | --surface-page | #f4f7f9 | App background |
| Surface/panel | --surface-panel | #ffffff | Toolbars and panes |
| Surface/soft | --surface-soft | #edf4f7 | Sidebar and table heads |
| Surface/selected | --surface-selected | #dff2fb | Current time band |
| Text/primary | --text-primary | #111827 | Main labels |
| Text/secondary | --text-secondary | #4b5563 | Secondary labels |
| Text/muted | --text-muted | #7b8794 | Muted metadata |
| Border/default | --border-default | #d8e0e6 | Grid and pane dividers |
| Accent/primary | --accent-primary | #2d7890 | Task bars and active controls |
| Accent/strong | --accent-strong | #1f5e73 | Hover and focus |
| Status/success | --status-success | #3fab5a | Progress dots |
| Status/warning | --status-warning | #d97706 | At-risk allocation |
| Status/error | --status-error | #cc3d3d | Over-allocation |
| Status/pto | --status-pto | #d5dce1 | PTO mask |

## 3. Typography

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | 20px | 700 | 1.2 | 0 | Product mark |
| H2 | 16px | 700 | 1.3 | 0 | Pane title |
| Body | 14px | 400 | 1.45 | 0 | Table and timeline text |
| Body/sm | 13px | 500 | 1.35 | 0 | Controls and metrics |
| Caption | 12px | 500 | 1.3 | 0 | Dates and heatmap cells |

Primary font: system UI, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif. Mono font: "SFMono-Regular", Consolas, monospace.

## 4. Spacing & Layout

Base unit: 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Icon gaps |
| --space-2 | 8px | Dense cell padding |
| --space-3 | 12px | Toolbar groups |
| --space-4 | 16px | Shell padding |
| --space-5 | 20px | Header padding |
| --space-6 | 24px | Wide panel padding |

The app is a fixed-sidenav shell with a fixed top bar. The workspace body is the scroll owner. The planner uses a two-column split pane: WBS table left, Gantt timeline right, with horizontal overflow inside each pane as needed.

## 5. Components

### App Shell
- Structure: `header` + fixed left rail + main scroll body.
- States: rail buttons default, hover, active, focus.
- Accessibility: labeled navigation buttons, visible focus.
- Layout: fixed-sidenav-shell with bounded scroll body.

### Toolbar Controls
- Structure: search input, filter button, segmented zoom control.
- States: default, hover, active, focus.
- Accessibility: labels for search and zoom choices.
- Layout: wrapping cluster.

### WBS Grid
- Structure: semantic table with row hierarchy, expand/collapse buttons, progress dots.
- States: selected, hover, expanded, collapsed.
- Accessibility: buttons announce expand state; table headers scoped.
- Layout: independent horizontal scroll region.

### Gantt Timeline
- Structure: date header grid, summary rails, task bars, dependency connectors, milestone diamonds.
- States: task hover, current zoom selected.
- Accessibility: each bar has an aria label containing task, dates, and progress.
- Layout: timeline canvas inside horizontal scroll.

### Resource Heatmap
- Structure: user rows by date columns.
- States: normal, overallocated, PTO.
- Accessibility: cells expose assignment/PTO labels.
- Layout: compact matrix with fixed name column.

## 6. Motion & Interaction

Micro interactions use 120ms ease-out for hover and active feedback. Schedule changes are immediate with no decorative animation. Reduced motion receives the same layout without transitions.

## 7. Depth & Surface

Strategy: mixed. Primary separation uses borders; the main board uses one soft shadow to lift it from the page.

## 8. Accessibility Constraints & Accepted Debt

WCAG target: 2.2 AA, visible focus on every interactive control, keyboard-reachable controls, body text at least 13px because this is a dense enterprise grid.

Accepted debt:

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| Drag-and-drop bar editing | Gantt timeline | Prototype ships click controls and deterministic scheduling first | Add pointer drag after persistence/API layer is chosen |
| SQLite/Prisma persistence | Whole app | Empty repo, first artifact is local interactive UI | Add when prototype flow is approved |
