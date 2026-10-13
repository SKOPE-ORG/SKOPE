# SKOPE Extension v0.1.0 Beta

첫 번째 공개 베타 버전입니다.

> 게시용 초안입니다. 현재 공개 게시되지 않았으며 기본 브랜치 통합과 사용자 공개 승인을 기다립니다.

SKOPE는 Chrome 탭과 탭 그룹을 Workspace별로 관리하는 생산성 확장 프로그램입니다. 독립형 SKOPE Browser는 포함하지 않습니다.

## 포함된 기능과 검증

구현된 기능: Workspace CRUD·아이콘·색상·접힘·순서, Chrome 그룹 연결과 탭 목록, 기존 탭 활성화, 미그룹 탭의 새 그룹 생성, 색상 정책, 그룹 메뉴 Ungroup 및 Workspace 삭제 시 여러 창의 그룹 해제.

자동 검사에서 Workspace 저장·입력 검증, 그룹 이벤트 재동기화, 색상 매핑, 그룹 해제/삭제 시 다른 그룹과 열린 탭 보존, 실패 복구, 업데이트 시 저장소 유지 로직을 검증했습니다. 모의 Chrome API 테스트이며 실제 Chrome 런타임 검증 완료를 의미하지 않습니다. 실제 설치·재시작·UI 검증은 [테스트 목록](https://github.com/SKOPE-ORG/SKOPE/blob/release/v0.1.0-beta/docs/release/beta-verification.md)을 참고하세요.

## 설치 및 업데이트

1. 첨부된 `SKOPE-Extension-v0.1.0-beta.zip`을 다운로드하고 압축을 풉니다.
2. Chrome `chrome://extensions`에서 개발자 모드를 켭니다.
3. 압축해제된 확장 프로그램을 로드 → `manifest.json`이 바로 들어 있는 폴더를 선택합니다.
4. SKOPE 아이콘을 눌러 사이드 패널을 엽니다.

업데이트는 기존 확장 프로그램을 제거하지 않고 동일 설치 경로의 파일을 교체한 뒤 새로고침합니다. 프로필·확장 ID가 달라지면 기존 로컬 데이터에 접근하지 못할 수 있습니다. [상세 안내](https://github.com/SKOPE-ORG/SKOPE/blob/release/v0.1.0-beta/README.md).

## 알려진 문제와 제한

- 실제 Chrome 수동 QA는 미완료이며 베타 사용 중 오류가 발생할 수 있습니다.
- 그룹 목록은 현재 창 기준. 별도 Workspace 선택으로 창/세션을 복원하지 않습니다.
- 전체 탭 스냅샷 저장·복원 및 닫힌 탭 복원 미지원.
- 재시작/업데이트 시 그룹 내용 변경 또는 동일 지문 중복으로 연결 재배정이 필요할 수 있습니다.
- Chrome 기본 색상 매핑으로 Workspace와 정확한 색상 차이가 날 수 있습니다.
- GitHub ZIP 설치는 수동 업데이트이며 관리 브라우저에서 개발자 모드가 차단될 수 있습니다.
- 데이터는 로컬 저장이며 favicon 표시에는 원격 요청이 발생할 수 있습니다.

## 오류 제보 및 향후 방향

[GitHub Issues](https://github.com/SKOPE-ORG/SKOPE/issues)에 Chrome·OS·SKOPE 버전과 재현 순서를 남겨 주세요. 개인 URL·토큰은 공개하지 마세요.

향후 실제 Chrome QA 확대, 업데이트 데이터 보존 검증, UX 개선, 안전한 그룹 저장·복원을 검토합니다. 이는 계획이며 이번 출시 기능이 아닙니다.

릴리스 설정: Tag `v0.1.0-beta`, Pre-release 활성화. Chrome manifest는 숫자 버전 `0.1.0`과 표시 이름 `0.1.0 Beta`를 사용합니다.
