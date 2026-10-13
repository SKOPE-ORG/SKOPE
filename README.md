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
npm run lint
npm run build
```

## Extension permissions

- `sidePanel`: open SKOPE in Chrome's side panel when its toolbar action is clicked.
- `storage`: save workspace names, icons, colors, order, and collapsed state in `chrome.storage.local`.

Workspace deletion only removes the workspace record from SKOPE; it does not close Chrome tabs or delete Chrome tab groups. SKOPE stores workspace data on this device and does not send it to an external server.

Workspace records have SKOPE-generated IDs and an ordered list of SKOPE tab-group reference IDs. Chrome's numeric tab-group IDs are session identifiers and are not used as permanent workspace references.

## Current scope

The side panel supports workspace creation, editing (name, icon, and color), ordering, collapse/expand, and deletion. Workspace data persists locally in Chrome Storage. Connecting workspaces to live Chrome tab groups and saving/restoring tab groups remain tracked separately in the [v0.1 MVP milestone](https://github.com/SKOPE-ORG/SKOPE/milestone/1).
