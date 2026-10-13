<p align="center">
  <img src="public/icons/skope-logo.png" alt="SKOPE 공식 오비탈 로고" width="144" height="144" />
</p>

# SKOPE Extension

SKOPE는 Chrome 탭과 탭 그룹을 Workspace별로 관리하는 생산성 확장 프로그램입니다. 공식 오비탈 로고와 미니멀한 사이드 패널에서 작업 환경을 정리합니다. 이번 배포는 Chrome Extension만 포함하며 독립형 SKOPE Browser는 포함하지 않습니다.

**공개 베타: v0.1.0-beta** GitHub 태그는 `v0.1.0-beta`, Chrome 내부 버전은 `0.1.0`, 표시 버전은 `0.1.0 Beta`입니다. [Chrome 버전 형식](https://developer.chrome.com/docs/extensions/reference/manifest/version)에 맞춘 설정입니다.

## 다운로드

**[SKOPE Extension v0.1.0 Beta ZIP 다운로드](https://github.com/SKOPE-ORG/SKOPE/releases/download/v0.1.0-beta/SKOPE-Extension-v0.1.0-beta.zip)**

[릴리스 설명](https://github.com/SKOPE-ORG/SKOPE/releases/tag/v0.1.0-beta) · [SHA-256 체크섬](https://github.com/SKOPE-ORG/SKOPE/releases/download/v0.1.0-beta/SKOPE-Extension-v0.1.0-beta.zip.sha256) · [설치 방법](#설치-방법)

다운로드할 파일은 **SKOPE-Extension-v0.1.0-beta.zip**입니다. GitHub가 자동으로 제공하는 `Source code (zip)`은 설치용 빌드가 아닙니다. Chrome 웹 스토어 버전이 아닌 수동 설치 베타입니다.

## 주요 기능

다음은 구현된 기능입니다. 자동 테스트는 모의 Chrome API 기반이며 모든 기능의 실제 Chrome 검증을 완료했다는 뜻은 아닙니다.

- Workspace 생성·편집·삭제, 아이콘·색상 설정, 순서 이동 및 접기·펼치기
- 현재 창의 Chrome 탭 그룹을 Workspace에 연결·재배정하고 내부 탭 목록 표시
- 탭 선택으로 기존 Chrome 탭 활성화, 선택한 미그룹 탭으로 새 그룹 생성
- Workspace 색상 따라가기 또는 기존 Chrome 그룹 색상 유지
- Unassigned Groups와 Workspace 그룹의 ··· 메뉴에서 그룹 해제
- Workspace 삭제 시 여러 창의 연결 그룹 해제, 열린 웹사이트 탭 보존
- Workspace 설정과 그룹 연결 정보를 기기 내 저장

## 설치 방법

Node.js나 개발 서버가 필요하지 않습니다. 아래 순서대로 ZIP을 풀어 Chrome에 등록하세요.

### 1. ZIP 다운로드와 압축 해제

위의 **ZIP 다운로드** 링크를 누릅니다. 다운로드가 끝나면 파일 이름을 확인하세요.

| 운영체제 | 압축 해제 방법 |
| --- | --- |
| Windows | 다운로드 폴더에서 ZIP을 오른쪽 클릭 → **모두 압축 풀기** → 저장 위치 선택 → **압축 풀기**. ZIP 안을 열어 보기만 한 상태에서는 설치하지 마세요. |
| macOS | Finder의 다운로드 폴더에서 ZIP을 더블 클릭합니다. 옆에 생성된 폴더가 압축 해제된 파일입니다. |

압축을 푼 폴더를 계속 보관할 위치(예: 문서 폴더의 `SKOPE-Extension`)로 옮깁니다. 설치 후 이 폴더를 이동하거나 삭제하지 마세요.

### 2. Chrome 개발자 모드 켜기

1. **Google Chrome**을 엽니다.
2. 웹 검색창이 아닌, 창 위쪽 **주소창**에 `chrome://extensions`를 입력하고 Enter를 누릅니다.
3. 확장 프로그램 관리 화면 **오른쪽 위의 개발자 모드 스위치**를 켭니다.
4. 화면 위쪽에 **압축해제된 확장 프로그램을 로드** 버튼이 나타나는지 확인합니다. 영문 Chrome에서는 `Developer mode`, `Load unpacked`로 표시됩니다.

개발자 모드는 ZIP 확장 프로그램을 직접 등록하기 위한 설정입니다. 회사·학교에서 관리하는 Chrome은 이 설정이 제한될 수 있으며 제한을 우회하지 마세요.

### 3. 폴더 선택과 설치

1. **압축해제된 확장 프로그램을 로드**를 클릭합니다.
2. 압축을 푼 폴더를 선택합니다. **그 폴더 바로 안에 `manifest.json`이 있어야 합니다.** ZIP 파일이나 `assets`, `icons` 하위 폴더를 선택하지 않습니다.
3. 관리 화면에 **SKOPE — Workspace Manager**가 추가됐는지 확인합니다.

폴더 구조는 다음과 같습니다. 폴더 이름은 달라도 됩니다.

```text
SKOPE-Extension/       ← 이 폴더 선택
├── manifest.json
├── index.html
├── assets/
└── icons/
```

### 4. SKOPE 고정과 사이드 패널 실행

1. Chrome 오른쪽 위의 **퍼즐 모양 확장 프로그램 버튼**을 누릅니다.
2. 목록에서 SKOPE 옆의 **핀 버튼**을 눌러 고정합니다.
3. 도구 모음에 표시된 **파란 오비탈 SKOPE 아이콘**을 클릭합니다.
4. 사이드 패널에서 Workspace를 만들고 현재 Chrome 그룹을 연결합니다.

GitHub ZIP 방식은 자동 업데이트를 제공하지 않습니다. Chrome의 개발자 모드 확장 경고가 표시될 수 있습니다. 자세한 등록·고정 절차는 [Chrome 공식 안내](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)를 참고하세요.

## 업데이트 방법

1. 기존 Chrome 프로필, 설치 폴더의 정확한 경로와 `chrome://extensions`에 표시된 SKOPE 확장 ID를 기록합니다. 기존 배포 파일은 별도 백업합니다. 폴더 백업은 Workspace 데이터 백업이 아닙니다.
2. 새 ZIP을 임시 폴더에 압축 해제합니다. SKOPE 패널을 닫고 확장 프로그램을 일시적으로 끕니다.
3. **기존 설치 폴더 경로를 유지하면서** 그 안의 배포 파일을 새 버전으로 교체합니다. 기존 확장 프로그램을 제거하지 마세요. 다른 위치에서 새 확장 프로그램으로 설치하지 마세요.
4. 확장 프로그램을 다시 켜고 Chrome 확장 프로그램 관리 페이지에서 SKOPE의 **새로고침**을 누릅니다.
5. 확장 ID가 동일한지, Workspace 이름·아이콘·색상·순서·접힘 상태가 유지되는지 확인합니다. 문제가 있다면 편집·삭제를 멈추고 같은 경로에 이전 배포 파일을 복원하여 다시 로드합니다.

Workspace는 해당 Chrome 프로필의 확장 전용 `chrome.storage.local`에 저장됩니다. 제거하면 데이터가 삭제되며 다른 프로필·확장 ID에서는 기존 데이터에 접근하지 못할 수 있습니다. 향후 웹 스토어 설치로 자동 이전하는 기능도 없습니다. 임시 그룹 ID 매핑은 reload·업데이트·재시작 시 초기화되고 실제 그룹의 지문으로 다시 연결하므로 일부 그룹은 재배정이 필요할 수 있습니다. [Chrome 저장소 안내](https://developer.chrome.com/docs/extensions/reference/api/storage).

업데이트 worker가 저장소를 초기화하지 않는 자동 검사는 통과했습니다. **실제 Chrome ZIP 교체 및 재시작 데이터 유지 검사는 아직 미완료**입니다.

## 설치 오류 FAQ

**“manifest.json을 읽을 수 없습니다”라고 나옵니다.**
ZIP이 아닌 압축 해제된 폴더를 선택했는지 확인하세요. 선택한 폴더를 열었을 때 `manifest.json`이 바로 보여야 합니다. `Source code (zip)`을 받았다면 위 설치용 ZIP을 다시 다운로드하세요. 확장자가 숨겨진 Windows에서는 파일이 `manifest`로 표시될 수도 있습니다.

**개발자 모드 또는 로드 버튼이 보이지 않습니다.**
Google Chrome의 `chrome://extensions` 화면인지 확인하고 오른쪽 위 개발자 모드를 켜세요. 회사·학교 관리 정책으로 차단됐다면 관리자에게 문의하세요.

**SKOPE 아이콘이 보이지 않거나 패널이 열리지 않습니다.**
퍼즐 메뉴에서 SKOPE를 고정하세요. 확장 프로그램 관리 페이지에서 SKOPE가 켜져 있는지 확인하고 새로고침한 뒤 아이콘을 다시 누릅니다. 오류가 표시되면 메시지를 기록해 Issue로 제보하세요. 재설치를 위해 기존 확장 프로그램을 제거하면 Workspace 데이터가 삭제될 수 있습니다.

**탭 그룹이 보이지 않습니다.**
SKOPE는 현재 창의 실제 Chrome 탭 그룹을 표시합니다. 일반 탭은 그룹이 아닙니다. Chrome 탭을 오른쪽 클릭해 그룹을 만든 뒤 패널을 확인하세요. Workspace 안의 `+ Add Tab Group`으로 기존 그룹을 연결할 수 있습니다. 오류가 있다면 패널의 재시도를 사용하세요.

**업데이트 후 Workspace가 없어 보입니다.**
원래 Chrome 프로필과 동일한 확장 ID인지 확인하세요. 설치 폴더를 바꾸거나 별도 설치하면 기존 local 데이터에 접근하지 못할 수 있습니다. 즉시 추가 편집·삭제를 멈추고 이전 배포 파일을 같은 경로에서 복원하세요. 확장 프로그램 제거 및 프로필 변경으로 삭제된 데이터의 자동 복구는 지원하지 않습니다.

**localhost에서 저장이나 Chrome API가 작동하지 않습니다.**
localhost는 개발용 UI 미리보기입니다. 일반 사용자는 개발 서버를 실행할 필요 없이 설치용 ZIP을 Chrome에 등록해야 합니다.

## 알려진 제한 및 검증 상태

- 실제 Chrome 설치·CRUD·그룹 색상·해제·다중 창 삭제·재시작 검증은 [베타 테스트 목록](docs/release/beta-verification.md)에 남겨 두었습니다.
- 그룹 목록은 현재 Chrome 창 기준입니다. 별도의 Workspace 전환으로 Chrome 창을 복원하는 기능은 없으며 Workspace별 목록을 펼쳐 사용합니다.
- 저장한 Workspace 연결은 전체 탭 백업이 아닙니다. 닫힌 탭·그룹의 저장과 복원 기능은 아직 제공하지 않습니다.
- 재시작 후 그룹 내용이 달라졌거나 동일 지문이 중복되면 분류를 다시 지정해야 할 수 있습니다.
- Workspace 색상은 Chrome API가 지원하는 기본 색상으로 매핑되므로 완전히 같은 색상은 아닐 수 있습니다.

## 개인정보와 권한

계정, SKOPE 서버, 광고·분석 SDK 없이 동작합니다. Workspace 이름·아이콘·색상·순서·접힘 설정, UUID와 그룹 연결·URL/제목으로 계산한 SHA-256 지문을 로컬에 저장합니다. 원본 탭 URL 목록을 영구 저장하지 않지만 해시가 익명화를 보장하지는 않습니다. favicon은 Chrome이 제공한 URL을 이미지로 불러오므로 원격 사이트에 일반 이미지 요청이 발생할 수 있습니다.

| 권한 | 사용 목적 |
| --- | --- |
| sidePanel | 도구 모음 클릭으로 패널 열기 |
| storage | Workspace와 그룹 연결 local 저장, 임시 식별 매핑 session 저장 |
| tabGroups | 그룹 조회·변경 이벤트·이름/색상 설정 |
| tabs | 탭 제목·URL·favicon 읽기, 활성화, 선택 탭 그룹화와 해제 |

페이지 본문·쿠키를 읽는 콘텐츠 스크립트나 host permissions는 없습니다. [개인정보 처리방침 초안](docs/release/privacy-policy-draft.md)에 현재 처리 흐름을 기록했습니다.

## 오류 제보

[GitHub Issues](https://github.com/SKOPE-ORG/SKOPE/issues)에 Chrome 버전, 운영체제, SKOPE 버전, 재현 순서와 오류 메시지를 알려 주세요. 개인 URL·Workspace 내용·API 키·토큰은 공개하지 마세요.

## 개발 및 배포 준비

Node.js 22.12+와 npm이 필요합니다.

```sh
npm install
npm run dev
npm test
npm run lint
npm run build
```

`npm run dev`는 UI 미리보기이며 localhost에서 Chrome 확장 API를 사용할 수 없습니다. 개발자는 `dist`를 Chrome에 로드하세요. 개발 중에는 공개 베타 ZIP을 덮어쓰지 마세요. 다음 릴리스의 패키징은 버전과 파일명을 확정한 후 별도로 진행합니다. [릴리스 노트](docs/release/beta-release-notes.md)를 참고하세요.

공식 로고는 `public/icons/`, 향후 macOS 보관 자산은 `desktop/`에 있습니다. 보관용 고해상도 이미지와 독립형 Browser 자산은 배포 ZIP에 포함하지 않습니다. 이전 1.0.0 준비 문서는 과거 후보 기록이며 이번 베타 배포 지침은 이 README와 베타 문서를 따릅니다.

## 라이선스와 GitHub 브랜딩

[MIT License](LICENSE)를 따릅니다. 조직 프로필에 적용할 공식 이미지와 관리자 작업은 [브랜딩 안내](docs/branding/README.md)에 정리했습니다.
