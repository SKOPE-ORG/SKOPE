# SKOPE

SKOPE is an open-source Chrome extension foundation for organizing browser tabs into workspaces.

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

The foundation requests only the permission it currently uses. Later tab, tab group, and local storage features will add their permissions in their respective changes. SKOPE does not send browsing data to an external server.

## Current scope

This initial foundation release configures the Manifest V3 extension, service worker, Vite build, and side panel entry point. Workspace and tab management are tracked separately in the [v0.1 MVP milestone](https://github.com/SKOPE-ORG/SKOPE/milestone/1).
