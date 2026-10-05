# ProjectVibe Design System

## 0. Research Log

- Embedded refs: user screenshot is the concrete reference; loaded operational `taste-skill` + `layout-skill` because the product is a dense planning app shell.
- Lazyweb: skipped — concrete reference supplied.
- Imagen drafts: skipped — concrete reference supplied.
- Skipped lanes: brand/library research — the screenshot and SRS define the surface.

## 1. Atmosphere & Identity

ProjectVibe is a calm, readable planning workspace. Labeled navigation, quiet neutral surfaces, and a frozen task-name column give dense schedules a clear structure. Accent color identifies actions and selection; status colors retain their meaning across themes.

### Usability refresh
- Evidence: the local review found insufficient text/hover contrast, 22px actions, missing modal focus containment, and unusable side-by-side mobile panes.
- Preserve the system font and operational character. Increase input readability, use 40px table rows, and separate navigation from editing tools.
- Mobile shows one Tasks or Timeline pane at a time. Project context starts collapsed on small screens and expands on request.

## 2. Color

| Role | Token | Light | Usage |
|------|-------|-------|-------|
| Surface/page | --surface-page | #f4f7f9 | App background |
| Surface/panel | --surface-panel | #ffffff | Toolbars and panes |
| Surface/soft | --surface-soft | #edf4f7 | Sidebar and table heads |
| Surface/selected | --surface-selected | #dff2fb | Current time band |
| Text/primary | --text-primary | #111827 | Main labels |
| Text/secondary | --text-secondary | #4b5563 | Secondary labels |
| Text/muted | --text-muted | #596879 | Readable metadata |
| Border/default | --border-default | #d8e0e6 | Grid and pane dividers |
| Accent/primary | --accent-primary | #216c68 | Task bars and active controls |
| Accent/strong | --accent-strong | #17534f | Hover and focus |
| Status/success | --status-success | #3fab5a | Progress dots |
| Status/warning | --status-warning | #d97706 | At-risk allocation |
| Status/error | --status-error | #b42332 | Errors and over-allocation |
| Status/pto | --status-pto | #d5dce1 | PTO mask |

### Theme contract
- Accent choices: Teal (#216c68), Blue (#285eb2), Violet (#6b48a8), Slate (#475569). Each has primary, hover, selected-surface, and selected-text tokens.
- Appearance: Light, Dark, or System. Save both preferences locally; follow OS changes in System mode. Theme applies to authentication, dialogs, tables, Gantt and reports.
- Dark surfaces: page #101820, panel #18232e, soft #22313f, raised #1d2b37. Text: primary #eef3f8, secondary #c0ccd8, muted #a7b5c4. Border #3b4d5e.
- Dark accents: Teal #79d4c3, Blue #91baff, Violet #c4a9f4, Slate #b9c9dc; use dark ink on filled accent controls.
- Semantic status pairs (text/background): success #17653d/#e7f4ec, warning #785400/#fff3cf, high #8a3e12/#ffeadb, error #b42332/#fdebed, info #285eb2/#eaf1ff. Dark variants use lighter text on deep tinted surfaces.
- Normal text targets at least 4.5:1 contrast, including hover labels. Focus uses a visible outline. No permanent decorative colored edge indicates selection.

## 3. Typography

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | 20px | 700 | 1.2 | 0 | Product mark |
| H2 | 16px | 700 | 1.3 | 0 | Pane title |
| Body | 14px | 400 | 1.45 | 0 | Table and timeline text |
| Body/sm | 13px | 500 | 1.35 | 0 | Controls and metrics |
| Caption | 12px | 500 | 1.3 | 0 | Dates and heatmap cells |

Primary font: system UI, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif. Mono font: "SFMono-Regular", Consolas, monospace.

Type tokens: --font-caption 12px, --font-small 13px, --font-body 14px, --font-input 14px (16px on mobile), --font-title 20px. Numeric data uses tabular figures. Input values use regular weight; labels use 500–600.

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
- Structure: `header` with Appearance action + labeled left rail + main scroll body. Only working navigation destinations are shown.
- States: rail buttons default, hover, active, focus.
- Accessibility: labeled navigation buttons, visible focus.
- Layout: fixed-sidenav-shell with bounded scroll body.

### Authentication Recovery
- Structure: the existing authentication card hosts request, six-digit verification, and new-password steps.
- States: idle, submitting, validation error, and completed confirmation.
- Accessibility: each step has a focused heading, labeled inputs, one-time-code autocomplete, and polite status announcements.
- Layout: one compact form column that remains within the mobile viewport.

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

### Planner Split Pane
- Structure: independently scrollable Tasks and Timeline panes separated by a draggable divider.
- States: 70-120% shared content zoom, pointer drag, keyboard divider adjustment.
- Accessibility: icon zoom controls have explicit labels; the divider is a focusable separator with a numeric value.
- Layout: desktop supports Split, Tasks and Timeline views; mobile hides Split and uses a full-width single pane. Task-name columns are sticky on desktop, with horizontal scrolling on mobile to keep all fields reachable. Table rows and Gantt geometry share a 40px row rhythm.

### Shared Dialog
- Native modal `dialog` owns focus containment, background inertness and Escape dismissal. Closing restores focus to the opener.
- Header and action footer stay visible while content scrolls. Close controls are at least 32px, 44px on touch layouts.
- Project, workspace, resource, risk and appearance dialogs share the primitive.

### Appearance Picker
- Labeled radio cards for accent palettes and Light/Dark/System modes, live preview, local-save status, Done action.
- Selection uses a tonal surface and check glyph; keyboard focus is visible. Storage failure leaves the chosen appearance usable for the session and explains the limitation.

### Task Actions
- A named More actions button opens the shared dialog with move, indent/outdent and delete actions, replacing five hidden inline buttons.
- Deletion requires explicit confirmation in the dialog. Empty task results explain the next action.

### Resource Heatmap
- Structure: user rows by date columns.
- States: normal, overallocated, PTO.
- Accessibility: cells expose assignment/PTO labels.
- Layout: compact matrix with fixed name column.

### Risk Register
- Structure: project-level register table, severity/status filters, expandable response details, and a focused edit dialog.
- States: low, medium, high, critical, open, occurred, and closed; linked Tasks expose compact active-risk badges.
- Accessibility: filters and actions are explicitly labeled, expandable rows announce state, and severity is always written as text rather than conveyed by color alone.
- Layout: dense table on desktop, readable cards on tablet/mobile, shared response detail section; the edit form collapses from two columns to one. Deletion asks for confirmation.

## 6. Motion & Interaction

### OKR workspace contract
- Replaces the detailed Objective/KR workflow with a workspace-level spreadsheet. One OKR is one row: natural-language Objective, Target Key Results, Actual Key Results, linked projects and start/end dates.
- The grid is the primary editing surface. Plain text cells save on blur; one short item dialog manages dates and project links; one weekly editor manages note, Green/Yellow/Red and an optional recovery plan. No metric formulas, version forms, retrospective forms, or required change reasons in the new workflow.
- A three-week window has labeled previous/current/next controls and a date picker. Weeks start on Monday; a blank cell means no report. Cell summaries show status, note and recovery-plan text without opening a detail screen.
- Table uses 220px text columns, 160px project column, 160px period column, 220px weekly columns and a 64px row-action column. Header and Objective column stay visible while scrolling; below 700px the Objective column is not sticky to give weekly editing the full viewport. Grid owns both-axis overflow within a 70dvh maximum. Native table semantics, labeled inputs and visible focus are required.
- New item dialog uses at most 680px width, one form-body scroll owner and a fixed action footer. Inputs use the existing --border-control token, status text/background pairs and 44px touch controls. Preserve old stored records as migration input; new UI exposes only the simple row model.
- Reuse board headings, text buttons, semantic status pairs, native shared dialogs and existing typography/spacing tokens. No new palette or animation.
- Empty, read-only, validation-error, Green, Yellow, Red and unset states use text plus theme tokens. Action buttons remain keyboard reachable; dialogs retain Escape and focus restoration.
- With the fifth OKR destination added, phone navigation uses equal-width icon/label columns within a bounded shell column; all destinations remain visible without horizontal page scrolling.
- OKR input outlines use --border-control (#8191a2 light, #71859a dark) to distinguish empty fields with at least 3:1 contrast. Quiet layout dividers continue to use --border-default. Phone header buttons, checkbox labels and disclosure rows have 44px minimum targets.
- Weekly status is authored independently of Actual Key Results and project progress. Completing a recovery plan does not automatically change the chosen status.

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
