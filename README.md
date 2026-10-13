# SKOPE

Release preparation: [RC checklist](docs/release/rc-checklist.md), [privacy policy draft](docs/release/privacy-policy-draft.md), [store listing draft](docs/release/store-listing-draft.md). Run `npm run release:package` to build and validate a minimal ZIP in `release-artifacts/`. This does not promote the version, upload, or publish.

SKOPE is an open-source Chrome extension for organizing browser tabs into workspaces. This release lets you create and manage local workspaces from Chrome's side panel.

## 일반 사용자 설치 (GitHub Releases)

이번 배포 대상은 **Chrome Extension**입니다. 독립형 SKOPE Browser는 포함하지 않습니다. 현재는 출시 준비 단계이며, 실제 Chrome QA와 승인 전에는 1.0.0 정식 릴리스를 게시하지 않습니다.

1. [GitHub Releases](https://github.com/SKOPE-ORG/SKOPE/releases)에서 게시된 릴리스의 `SKOPE-Extension-v1.0.0.zip`과 SHA-256 파일을 다운로드합니다. 게시된 릴리스가 없다면 아직 일반 배포 전입니다.
2. ZIP을 압축 해제한 뒤 폴더를 계속 보관할 위치(예: 문서 폴더의 `SKOPE-Extension`)로 옮깁니다. 폴더 바로 안에 `manifest.json`이 있어야 합니다.
3. Chrome 주소창에 `chrome://extensions`를 입력하고 **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드**를 누르고 `manifest.json`이 들어 있는 폴더를 선택합니다. ZIP 자체를 선택하지 않습니다.
5. Chrome 확장 프로그램 메뉴에서 SKOPE를 고정하고 아이콘을 눌러 Side Panel을 엽니다.

Node.js나 개발 서버는 필요하지 않습니다. GitHub ZIP 방식은 수동 설치·업데이트이며 Chrome 웹 스토어 자동 업데이트를 제공하지 않습니다. 조직에서 개발자 모드가 차단된 브라우저에서는 설치가 불가능할 수 있습니다. [Chrome 공식 설치 안내](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)를 참고하세요.

## 업데이트와 Workspace 데이터 유지

1. 기존 Chrome 프로필, 설치 폴더의 **정확한 경로**, `chrome://extensions`의 SKOPE 확장 ID를 기록합니다. 기존 설치 폴더를 백업합니다. 이 폴더 백업은 Workspace 데이터 백업이 아닙니다.
2. 새 ZIP을 다른 임시 폴더에 풀고 내용을 확인합니다. SKOPE 패널을 닫고 확장 프로그램을 일시적으로 끈 다음, **기존 설치 폴더 경로를 유지한 채** 그 안의 배포 파일만 새 파일로 교체합니다. 기존 확장 프로그램을 **제거하지 마세요**.
3. 확장 프로그램을 다시 켜고 `chrome://extensions`에서 SKOPE의 **새로고침**을 누릅니다. 처음과 다른 폴더에서 별도 설치하지 않습니다.
4. 확장 ID가 이전과 같은지, Workspace 이름·아이콘·색상·순서·접힘 설정이 유지되는지 확인합니다. 문제가 있으면 편집·삭제를 멈추고 같은 경로에 이전 배포 파일을 복원한 뒤 다시 로드합니다.

데이터는 설치 파일이 아닌 해당 Chrome 프로필의 확장 전용 `chrome.storage.local`에 저장됩니다. 제거하면 데이터가 삭제됩니다. 프로필·확장 ID가 달라진 설치나 향후 웹 스토어 설치로 데이터가 자동 이전되지는 않습니다. session 매핑은 다시 로드 시 초기화되므로 그룹 연결은 실제 그룹의 지문으로 재평가되며 일부 재배정이 필요할 수 있습니다. 실제 업데이트·재시작 보존 검사는 아직 미완료입니다. [Chrome 저장소 동작](https://developer.chrome.com/docs/extensions/reference/api/storage)을 참고하세요.

문제가 발생하면 [Issues](https://github.com/SKOPE-ORG/SKOPE/issues)에 Chrome 버전, 운영체제, 설치 버전과 재현 방법을 알려 주세요. 개인 URL·Workspace 내용이나 토큰은 공개하지 마세요.

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

Workspace deletion ungroups its linked active Chrome groups across all Chrome windows using `chrome.tabs.ungroup()`. Website tabs remain open. Saved records are removed only after every identified group is confirmed ungrouped; failures keep the Workspace available for retry. Other Workspaces and ordinary tabs are preserved. SKOPE stores data on this device and does not send it to an external server.

Workspace records have SKOPE-generated IDs and an ordered list of SKOPE tab-group reference IDs. Chrome's numeric tab-group IDs are session identifiers and are not used as permanent workspace references.

## Branding assets

The official blue Glossy Orbital artwork is stored in `public/icons/`. The 16, 32, 48, and 128px files are used by Chrome; larger PNGs and `skope-logo.png` preserve the high-resolution artwork. Future macOS app assets are kept in `desktop/icon.icns` and `desktop/icon.png`.

## Current scope

The side panel supports Workspace management and classification of live Chrome tab groups. Saved Workspace links do not create active groups: active cards require a current Chrome group with actual member tabs. Removing only some tabs keeps the remaining group; ungrouping every tab removes the active card and preserves saved Workspace links. Saving/restoring full tab-group snapshots remains a separate feature.

See [tab-group synchronization verification](docs/tab-group-sync-verification.md) for regression coverage and Chrome restart/manual checks.

New groups default to following the Workspace color. Existing imports and legacy saved links keep Chrome colors until explicitly set to Follow Workspace. See [color policies and Chrome verification](docs/workspace-group-color-verification.md).

Session-only group IDs are cached in `chrome.storage.session` for cross-window identity while the extension is loaded. They are not permanent Workspace keys. See [Workspace deletion verification](docs/workspace-deletion-verification.md).

Use a group's ··· menu to Ungroup it directly without closing website tabs. This works in Unassigned Groups and inside a Workspace; saved Workspace records remain. See [direct Ungroup verification](docs/group-ungroup-menu-verification.md).
