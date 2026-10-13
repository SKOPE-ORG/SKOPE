# Workspace / Chrome colors (#13)

Workspace colors are HEX values. Chrome accepts nine named presets, so the UI shows the mapped preset rather than promising an exact HEX match.

| Workspace palette | Chrome preset |
| --- | --- |
| Slate | grey |
| Blue | blue |
| Teal | cyan |
| Amber | orange |
| Rose | pink |
| Violet | purple |

The new-group dialog previously initialized every group to blue. It now defaults to the Workspace preset and saves a per-link `workspace` color policy. Selecting a custom Chrome swatch switches the new group to `chrome` policy.

Existing group imports default to Keep current Chrome color. Legacy links without a policy also keep Chrome colors. Choose Follow Workspace explicitly when importing, moving or updating an existing group. A group card displays its current policy. Workspace edits and fresh Chrome queries update only following live groups, including uniquely matched groups after a new session. Color writes touch only the color property, not group membership or tabs. Failed updates show a retry action while keeping the saved Workspace settings.

## Manual Chrome checks

1. Run `npm run build`, reload SKOPE at `chrome://extensions`, and reopen the Side Panel.
2. For an existing group, expand its Workspace and open Add Tab Group. Select Follow Workspace color and click Update on that group's row. Verify the Chrome tab-strip label and SKOPE dot use the mapped preset. Keeping Chrome color must preserve its previous color.
3. Create new groups in Violet, Blue and Rose Workspaces using new test tabs. Leave Follow Workspace selected. Verify purple, blue and pink respectively. Picking a custom swatch must preserve that swatch after later Workspace edits.
4. Change a Workspace color. Following groups should update; keep-Chrome groups and unassigned/other Workspace groups should not.
5. Move a group to another Workspace. Follow Workspace uses the destination preset; Keep Chrome preserves its current color.
6. Restart Chrome with session restoration and reload/reopen SKOPE. Unchanged uniquely matching live groups retain their policies even with new numeric IDs. Absent or ambiguous groups must never be recolored.
7. If a Chrome write fails, verify the error and Retry group colors action. Workspace data remains saved and can be retried.

`npm test` includes palette, creation, keep-mode compatibility, Workspace edits, reassignment, changed session IDs, absent groups, color-only API writes and storage validation. Real Chrome color changes and a full browser restart remain manual validation; automated session fixtures are not evidence of a real browser restart.
