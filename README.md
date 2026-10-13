# SKOPE Extension

SKOPE는 Chrome 탭과 탭 그룹을 Workspace별로 관리하는 생산성 확장 프로그램입니다. 이번 배포는 Chrome Extension만 포함하며 독립형 SKOPE Browser는 포함하지 않습니다.

**공개 베타: [v0.1.0-beta](https://github.com/SKOPE-ORG/SKOPE/releases/tag/v0.1.0-beta).** 이 브랜치의 리팩터링은 다음 버전 준비 작업이며 공개 베타 ZIP에는 포함되지 않습니다. GitHub 태그는 `v0.1.0-beta`, Chrome 내부 버전은 `0.1.0`, 표시 버전은 `0.1.0 Beta`입니다. [Chrome 버전 형식](https://developer.chrome.com/docs/extensions/reference/manifest/version)에 맞춘 설정입니다.

## 주요 기능

구현된 기능을 아래에 정리했습니다. 모의 Chrome API 검사와 실제 Chrome 검증 상태는 구분합니다.

- Workspace 생성·편집·삭제, 아이콘·색상 설정, 순서 이동 및 접기·펼치기
- 현재 창의 Chrome 탭 그룹을 Workspace에 연결·재배정하고 내부 탭 목록 표시
- 탭 선택으로 기존 Chrome 탭 활성화, 선택한 미그룹 탭으로 새 그룹 생성
- Workspace 색상 따라가기 또는 기존 Chrome 그룹 색상 유지
- Unassigned Groups와 Workspace 그룹의 ··· 메뉴에서 그룹 해제
- Workspace 삭제 시 여러 창의 연결 그룹 해제, 열린 웹사이트 탭 보존
- Workspace 설정과 그룹 연결 정보를 기기 내 저장

## 설치 방법

Node.js나 개발 서버가 필요하지 않습니다. Google Chrome의 개발자 모드를 사용합니다.

1. [GitHub Releases](https://github.com/SKOPE-ORG/SKOPE/releases)에서 최신 ZIP `SKOPE-Extension-v0.1.0-beta.zip`을 다운로드합니다.
2. ZIP을 압축 해제하고 폴더를 계속 보관할 위치(예: 문서 폴더의 `SKOPE-Extension`)로 옮깁니다.
3. Chrome 주소창에 `chrome://extensions`를 입력합니다.
4. 오른쪽 위 **개발자 모드**를 켭니다.
5. **압축해제된 확장 프로그램을 로드**를 선택합니다.
6. 압축을 푼 폴더를 선택합니다. 선택한 폴더 바로 안에 `manifest.json`이 있어야 합니다. ZIP 자체를 선택하지 않습니다.
7. Chrome 확장 프로그램 메뉴에서 SKOPE를 고정한 후 아이콘을 눌러 사이드 패널을 엽니다.

설치 폴더를 이동하거나 지우면 확장 프로그램이 작동하지 않을 수 있습니다. 회사·학교 관리 브라우저에서 개발자 모드가 제한되면 설치할 수 없습니다. GitHub ZIP 배포는 Chrome 웹 스토어의 자동 설치·업데이트 방식이 아닙니다.

## 업데이트 방법

1. 기존 Chrome 프로필, 설치 폴더의 정확한 경로와 `chrome://extensions`에 표시된 SKOPE 확장 ID를 기록합니다. 기존 배포 파일은 별도 백업합니다. 폴더 백업은 Workspace 데이터 백업이 아닙니다.
2. 새 ZIP을 임시 폴더에 압축 해제합니다. SKOPE 패널을 닫고 확장 프로그램을 일시적으로 끕니다.
3. **기존 설치 폴더 경로를 유지하면서** 그 안의 배포 파일을 새 버전으로 교체합니다. 기존 확장 프로그램을 제거하지 마세요. 다른 위치에서 새 확장 프로그램으로 설치하지 마세요.
4. 확장 프로그램을 다시 켜고 Chrome 확장 프로그램 관리 페이지에서 SKOPE의 **새로고침**을 누릅니다.
5. 확장 ID가 동일한지, Workspace 이름·아이콘·색상·순서·접힘 상태가 유지되는지 확인합니다. 문제가 있다면 편집·삭제를 멈추고 같은 경로에 이전 배포 파일을 복원하여 다시 로드합니다.

Workspace는 해당 Chrome 프로필의 확장 전용 `chrome.storage.local`에 저장됩니다. 제거하면 데이터가 삭제되며 다른 프로필·확장 ID에서는 기존 데이터에 접근하지 못할 수 있습니다. 향후 웹 스토어 설치로 자동 이전하는 기능도 없습니다. 임시 그룹 ID 매핑은 reload·업데이트·재시작 시 초기화되고 실제 그룹의 지문으로 다시 연결하므로 일부 그룹은 재배정이 필요할 수 있습니다. [Chrome 저장소 안내](https://developer.chrome.com/docs/extensions/reference/api/storage).

업데이트 worker가 저장소를 초기화하지 않는 자동 검사는 통과했습니다. **실제 Chrome ZIP 교체 및 재시작 데이터 유지 검사는 아직 미완료**입니다.

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

`npm run dev`는 UI 미리보기이며 localhost에서 Chrome 확장 API를 사용할 수 없습니다. 개발자는 `dist`를 Chrome에 로드하세요. 다음 버전 개발 중에는 공개 베타 ZIP을 덮어쓰지 마세요. 버전을 확정한 뒤 패키징 스크립트의 버전과 파일명을 맞춰 생성합니다. [릴리스 노트](docs/release/beta-release-notes.md)를 참고하세요.

공식 로고는 `public/icons/`, 향후 macOS 보관 자산은 `desktop/`에 있습니다. 보관용 고해상도 이미지와 독립형 Browser 자산은 배포 ZIP에 포함하지 않습니다. 이전 1.0.0 준비 문서는 과거 후보 기록이며 이번 베타 배포 지침은 이 README와 베타 문서를 따릅니다.

## 기여와 라이선스

작은 버그 수정과 문서 개선을 환영합니다. [기여 안내](CONTRIBUTING.md)에 개발 흐름과 데이터 보존 원칙을 정리했습니다. 이 프로젝트는 [MIT License](LICENSE)를 따릅니다.
