# SKOPE

SKOPE is an open-source Chrome extension for organizing browser tabs into workspaces. This release lets you create and manage local workspaces from Chrome's side panel.

## Requirements

- Node.js 22.12+ (required by Vite 8)
- npm
- Google Chrome with Side Panel support

## Development

```sh
npm install
npm run dev
```

The Vite development page is only a UI preview. Chrome extension APIs are unavailable on localhost, so load a production build to use SKOPE in Chrome.

## Build and install in Chrome

```sh
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the generated `dist` directory.
4. Click the SKOPE extension icon to open its side panel.

To reload after rebuilding, click the reload icon for SKOPE on `chrome://extensions`.

## Checks

```sh
npm test
npm run lint
npm run build
```

## Extension permissions

- `sidePanel`: open SKOPE in Chrome's side panel when its toolbar action is clicked.
- `storage`: save workspace names, icons, colors, order, and collapsed state in `chrome.storage.local`.
- `tabGroups`: query live group metadata and update a newly created group's name/color.
- `tabs`: read tab titles/URLs/favicons, activate tabs, and group selected ungrouped tabs.

Workspace deletion only removes the workspace record from SKOPE; it does not close Chrome tabs or delete Chrome tab groups. SKOPE stores workspace data on this device and does not send it to an external server.

Workspace records have SKOPE-generated IDs and an ordered list of SKOPE tab-group reference IDs. Chrome's numeric tab-group IDs are session identifiers and are not used as permanent workspace references.

## Branding assets

The official blue Glossy Orbital artwork is stored in `public/icons/`. The 16, 32, 48, and 128px files are used by Chrome; larger PNGs and `skope-logo.png` preserve the high-resolution artwork. Future macOS app assets are kept in `desktop/icon.icns` and `desktop/icon.png`.

## Current scope

The side panel supports Workspace management and classification of live Chrome tab groups. Saved Workspace links do not create active groups: active cards require a current Chrome group with actual member tabs. Removing only some tabs keeps the remaining group; ungrouping every tab removes the active card and preserves saved Workspace links. Saving/restoring full tab-group snapshots remains a separate feature.

See [tab-group synchronization verification](docs/tab-group-sync-verification.md) for regression coverage and Chrome restart/manual checks.

New groups default to following the Workspace color. Existing imports and legacy saved links keep Chrome colors until explicitly set to Follow Workspace. See [color policies and Chrome verification](docs/workspace-group-color-verification.md).
