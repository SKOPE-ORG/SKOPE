# Direct group Ungroup (#17)

Each live group has a right-side ··· menu with 그룹 해제(Ungroup), both in Unassigned Groups and inside a Workspace. The menu explains that tabs remain open. Click outside or press Escape to dismiss it; Escape returns focus to the trigger. Group operations are disabled while an Ungroup request runs.

The action reuses `ungroupChromeTabGroup`: it checks that the session group still exists, queries `chrome.tabs.query({ groupId })`, validates member IDs, ungroups only those tabs, and rechecks actual group/member removal. An already absent group is a safe no-op. Tabs moved out before the query are excluded. Chrome/API errors are displayed without an optimistic cache removal.

After verified success, the live synchronizer immediately removes only that group and invalidates older queries, even if the Chrome removal event was missed. A fresh query and normal Chrome events keep the remaining list synchronized. Direct Ungroup preserves Workspace/local links; it differs from deleting the entire Workspace, which has its own explicit cleanup policy. No tabs are closed and no permission or branding changes are introduced.

## Manual Chrome checks

1. Build/reload SKOPE at `chrome://extensions` and reopen the Side Panel.
2. Make an unassigned QA group containing two newly opened test tabs. Keep another group and one ordinary tab as controls.
3. Open its ··· menu and select 그룹 해제(Ungroup). Verify the Chrome label/color and SKOPE group card disappear while both website tabs, the other group and ordinary tab stay open.
4. Repeat with a Workspace-linked QA group. Its active card should disappear while the Workspace itself and saved classification records remain.
5. Move one test tab to another group before running the action. Verify the moved tab stays in its destination and only remaining source members are ungrouped.
6. Remove a group directly in Chrome while its SKOPE menu is open. The event/query must update the list safely; a stale action must not touch other tabs.
7. In a dedicated test environment, simulate a failed API request. Verify an error is shown and an unchanged Chrome group remains listed. Retry after recovery.

Automated regressions cover exact membership, tab preservation, no-op for absent groups, moved tabs, inconsistent query rejection, API failures, removal verification and stale-query invalidation. Browser UI/end-to-end checks above require actual Chrome interaction and are not claimed from mocked API tests.
