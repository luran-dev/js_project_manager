# Simple OKR grid

The user's replacement request supersedes the original detailed OKR workflow in `requirements.md`.

| Requirement | Behavior |
|---|---|
| Register OKRs and link projects | One workspace-level OKR row can link multiple existing projects in that workspace. Project names open the planner; the planner links back to its OKRs. |
| Natural-language Objective and Key Results | Editable text cells; the author defines measurable targets. No formula, baseline, version or reason form. |
| Separate Actual Key Results | Independent text cell, never inferred from project completion or weekly status. |
| Duration | Required start/end dates; end cannot precede start. |
| Spreadsheet and weekly updates | Native table with text editing on blur, project filter and search. Three visible weeks, previous/next controls and arbitrary date navigation. Weeks begin Monday. |
| Green / Yellow / Red | Author-selected status per item/week, with an optional weekly note. Unset is represented internally as Pending. |
| Path to Green | Yellow/Red editors expose a natural-language recovery plan and completion checkbox. Missing plans are visible, without blocking status entry. |

## Editing and persistence

- Objective and Target are required. Actual, project links, weekly note and recovery plan may be entered later.
- Weekly editing replaces that week's entry; other weeks are untouched. This is an editable weekly sheet, not an append-only audit log.
- Recovery plan completion does not change status. Switching the same week to Green retains its plan text; plans are not copied automatically between weeks.
- Delete requires a second confirmation click and removes the row and its weekly records, preserving projects.
- Owner/Admin/Member may edit; Viewer may inspect text and open weekly details read-only. Existing server-side membership checks remain authoritative.
- Existing authenticated snapshot API and SQLite storage are reused; queued saves preserve edit order and failures use the existing save-error banner.

## Existing data

- Workspaces without `okrItems` display a deterministic conversion of legacy project Objectives. Each Objective becomes one row linked to its project, with combined Target text, current measurements as Actual text, and check-ins grouped by week.
- Within a week, the latest forecast per legacy KR is used; the most severe forecast across those KRs is displayed. Existing notes and recovery text are carried into weekly entries. Plans without check-ins appear in their next-review week. An Objective without KRs receives the explicit placeholder “Key Results not yet defined”.
- Conversion is persisted on the first grid edit. Original legacy records remain stored, unmodified, for historical preservation; legacy-only fields are not exposed by the new UI.
- Once `okrItems` exists, it is authoritative, including an empty array. Deleted rows do not reappear from legacy data.
- Deleting a linked project leaves an identifiable “Deleted project” reference until links are edited. It does not delete the workspace-level OKR.
