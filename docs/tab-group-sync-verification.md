# Tab-group synchronization (#11)

## Diagnosis

At the initial live inspection, Chrome `tabGroups.query({})` returned two groups, and `tabs.query({})` showed one member in each. SKOPE displayed the same groups. The local document contained zero Workspaces and zero group links at that moment. These displayed groups were actual Chrome groups, not saved snapshots. Browser data can change while the user works; this observation does not prove that an earlier removal event succeeded.

The prior event path had an independent race: `onRemoved` cleared only the Workspace runtime binding, leaving the active snapshot intact until a trailing debounced refresh. A query started before a removal could complete before that refresh and republish stale groups. Repeated events could keep postponing that refresh. Restored Workspace bindings were also not retained in memory when group membership subsequently changed.

## Correction

- `onRemoved` immediately removes the group from the live cache and invalidates pending queries.
- Every relevant group/tab event invalidates earlier queries before a coalesced refresh starts. The first refresh deadline is not extended by later events in the same burst.
- Chrome query results replace the active list. A card requires both a queried group and member tabs. Stored references cannot recreate an active group.
- Reconciliation preserves a previous live Workspace binding if only some tabs leave, and discards runtime bindings for absent groups. Saved Workspace IDs, links and fingerprints are not deleted automatically.
- Reopening, returning focus, and becoming visible trigger fresh queries. Disposal unregisters listeners, cancels scheduled work, and rejects late results.
- Queries use the extension's current window rather than whichever other Chrome window was last focused.

There is no full saved group snapshot implementation yet. Existing persistent records are Workspace classification links, and remain independent of the live cache. Future saved environment snapshots must also remain independent of active Chrome state.

## Automated checks

`npm test` uses Node's test runner and the existing TypeScript compiler, without additional libraries. It covers all group/tab event registrations and cleanup, partial ungrouping, complete ungrouping, stale group metadata, deletion/query races, burst scheduling, startup with saved references but no live groups, changed session IDs, context disposal, API errors, and legacy storage compatibility.

Also run `npm run lint` and `npm run build`.

## Actual Chrome verification

1. Build and reload SKOPE at `chrome://extensions`. Open the Side Panel. Use a new QA Workspace/group and newly opened test tabs, not existing user groups.
2. Put two test tabs into a Chrome group and assign it to the QA Workspace. Verify its name/color and count of two.
3. Ungroup only one test tab. Verify the group remains with a count of one and the same Workspace classification. Chrome's colored group label should also remain because one tab is still grouped.
4. Ungroup the remaining tab, or choose the group menu's Ungroup action. Verify the Chrome group label disappears and SKOPE removes the active card without closing either tab or deleting the saved Workspace/link.
5. While changing tabs quickly, repeat the complete removal and verify an older query cannot bring the card back. Create/rename/recolor a different test group to check normal live updates.
6. Reload the extension and reopen the Side Panel. With the test group absent, its saved reference must not appear as an active card. Other Workspaces and groups should remain intact.
7. Restart Chrome with normal session restoration and reopen SKOPE. Compare the active list with Chrome's actual groups. An absent group must stay absent; unchanged uniquely matching groups may reconnect by fingerprint even when numeric group IDs change.

Cold-start/session-change behavior is covered by automated simulations. A real full-browser restart requires the manual step above, so it must not be reported as verified solely from those tests.

Use the extension page's DevTools Console for read-only comparisons:

```js
const groups = await chrome.tabGroups.query({});
const tabs = await chrome.tabs.query({});
console.table(groups.map(group => ({
  id: group.id,
  windowId: group.windowId,
  members: tabs.filter(tab => tab.groupId === group.id).length,
})));
const stored = await chrome.storage.local.get('skope.workspaceState.v1');
const saved = stored['skope.workspaceState.v1'];
console.log({
  workspaces: saved?.workspaces.length ?? 0,
  savedLinks: saved?.tabGroupLinks?.length ?? 0,
});
```

An existing group with members is still active even if some tabs were ungrouped. An absent group is not active even when its Workspace reference is saved.
