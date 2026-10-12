# Workspace deletion policy (#15)

The confirmed policy changes Workspace deletion: all linked active Chrome groups are ungrouped, website tabs stay open, and the Workspace/links are removed from local storage only after successful verification. The confirmation dialog says: 연결된 탭 그룹의 그룹화가 해제되며, 열린 탭은 유지됩니다.

The delete action freshly reads saved records, all Chrome windows' groups/tabs, and session-only connections. It identifies target links by SKOPE UUID. Numeric Chrome IDs are cached only in `chrome.storage.session`, which Chrome clears on restart or extension reload; local Workspace records retain stable UUIDs and fingerprints. A new session can reconnect uniquely matching live fingerprints. Ambiguous groups require explicit reconnection rather than guessing.

Each group operation rechecks saved ownership and current members, calls only `chrome.tabs.ungroup()`, and verifies that Chrome no longer reports the group or member tabs. It never calls `tabs.remove()`. After all operations succeed, it reloads local data to preserve other Workspace changes, verifies target connections have not changed, clears target session cache entries, then removes the Workspace and its links. Already absent saved references require no Chrome mutations.

If some groups fail, successfully ungrouped tabs remain open and the entire Workspace/local link document is retained. Retry handles remaining live groups. If local storage fails after ungrouping, the Workspace remains until a successful retry. If connections change during processing, cleanup is refused. No automatic rollback/regrouping occurs because that would mutate tabs again.

## Validation

Automated tests cover multiple windows, all tabs preserved, other Workspace groups unchanged, partial failure/retry, Chrome query errors, local/session storage errors, a group remaining after the API call, identical fingerprints, session mapping of changed group contents, changed ownership, and saved-only references. Run `npm test`, `npm run lint`, and `npm run build`.

## Manual Chrome test

1. Build/reload SKOPE and reopen its Side Panel. Use newly created QA tabs/groups.
2. Create a QA Workspace and connect a group with two tabs. Connect a second group from another Chrome window to the same Workspace. Keep a different Workspace's group and some ordinary tabs as controls.
3. Delete the QA Workspace. Confirm the modal explicitly explains ungrouping with tabs retained. Verify both windows lose the target group labels/colors, all website tabs remain, and controls are unchanged.
4. Verify the QA groups do not appear in Unassigned Groups and the Workspace is absent. Reopen/reload SKOPE and verify the saved records remain removed.
5. Test failed ungroup/storage operations in a dedicated test environment. The modal must show an error and retain the Workspace; retry must finish without closing tabs or touching other groups.
6. Restart Chrome normally and verify only actual remaining groups are displayed. No stored reference alone may create an active card.

Actual live API/storage state was inspected during diagnosis, but user Chrome activity prevented a stable full end-to-end deletion/color/restart test in this run. Those runtime checks remain manual; passing simulated API tests is not proof of a browser restart.
