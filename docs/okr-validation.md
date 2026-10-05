# Simple OKR grid validation

Scope: the seven-point replacement request documented in [okr-policies.md](okr-policies.md), superseding the earlier detailed OKR implementation.

## Automated checks

- `pnpm test`: 39 tests across 9 files pass, including existing project scheduling, resource, execution, repository and authentication tests.
- `pnpm build`: TypeScript and production Vite build pass.
- `git diff --check`: clean.
- New grid tests cover Monday boundaries, replacing one week's update without changing others, independent Target/Actual values, authoritative empty rows, and nonmutating legacy conversion including current measurements, weekly forecasts and plans without check-ins.
- Server tests cover workspace-local project links, unique weekly records, valid dates/status, row deletion, migration-field preservation and Viewer denial. Existing snapshot access checks remain covered.

## Real browser checks

Isolated Chrome profile and `/tmp/projectvibe-okr-grid-qa.sqlite`; the user's application database was not changed.

1. Created a Korean natural-language Objective with multiline Target, separate Actual, start/end dates and two existing project links.
2. Edited Actual directly in the grid; leaving the cell saved it without changing Target.
3. Entered Yellow with a weekly note and Path-to-Green plan, Green in the following week, and Red in the third week. Completing the Yellow plan retained Yellow and the other weeks.
4. Verified Red without a plan displays an actionable reminder.
5. Navigated three-week windows and returned to the current week.
6. Opened a linked project and returned through its linked-OKR shortcut with the project filter applied.
7. Reloaded and verified SQLite persistence of all fields and weekly records.
8. Confirmed deletion of a temporary OKR leaves projects intact.
9. Used a Viewer fixture to inspect read-only text and weekly details; the actual authenticated snapshot API rejected its edit with HTTP 403.

Repeatable local script: `/tmp/projectvibe-okr-grid-qa.mjs`. Evidence manifest: `/tmp/projectvibe-okr-grid-evidence/manifest.json`.

## Visual coverage

84 captures: grid start/end, new item start/end, edit/delete confirmation, weekly Yellow start/end, Green, Red, empty filter, linked project, empty workspace, Viewer grid and Viewer weekly details. Each uses 390px mobile/touch, 1440px desktop and 1920px desktop in light/dark appearance.

Capture checks verify PNG signatures, expected dimensions, no horizontal document overflow and visible dialog action footers. The wide spreadsheet itself intentionally scrolls horizontally. Fixes include visible mobile empty-state guidance, Korean word wrapping, explicit initial Objective focus, and releasing the first header's horizontal sticky position on mobile.

Final independent integrity and visual reviews both returned PASS without blocking findings against the simplified request. Local reports: `.omo/evidence/simple-okr-final-integrity-gate-review.md` and `.omo/evidence/simple-okr-visual-b-gate-review.md`. The temporary QA server and browser sessions were closed after verification.

Existing legacy records are preserved in storage; the simple UI displays converted fields rather than the former detailed audit/measurement forms. Weekly entries are editable, not append-only history.
