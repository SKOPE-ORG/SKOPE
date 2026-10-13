# GitHub 배포 후보 검증

Issue #21, PR #20의 RC 기반. 기존 기능 PR과 RC PR은 아직 통합되지 않았습니다. 게시된 GitHub Release는 조회 시 없었습니다.

프로덕션 기능과 디자인 변경 없음. Manifest V3의 기존 4개 권한(sidePanel/storage/tabGroups/tabs)은 실제 패널 열기, local/session 저장, 그룹 조회·이벤트·색상, 탭 정보 읽기·활성화·그룹화/해제에 사용합니다. host permissions·content scripts·추가 권한 없음.

## 데이터 유지 점검

저장 키 `skope.workspaceState.v1` 및 schemaVersion 1 유지. 설치/업데이트 worker는 Side Panel 설정만 수행하며 저장소 초기화/삭제/마이그레이션을 하지 않습니다. 모의 update 이벤트에서 기존 비어 있지 않은 Workspace 문서 보존을 검사합니다. 실제 같은 설치 경로의 ZIP 교체·reload 및 Chrome 재시작 보존은 미검증입니다. 새 프로필이나 다른 확장 ID로의 자동 데이터 이전은 지원하지 않습니다.

## 배포 파일 점검

ZIP은 dist에서 실행에 필요한 파일만 허용 목록으로 복사합니다. manifest/index.html/패널 JS·CSS/background JS/공식 아이콘 4개와 패널 로고 총 10개입니다. dist에 Vite가 복사한 미사용 개발용 SVG, 고해상도 보관 PNG, desktop Browser 자산은 배포 대상이 아니므로 제외합니다. node_modules·Git·소스맵·환경파일·테스트·개인 Workspace 저장소 파일을 포함하지 않습니다.

텍스트 payload의 알려진 토큰 패턴·개인키·로컬 사용자 경로·소스맵 지시문을 검사하며 일치 시 내용은 출력하지 않고 실패합니다. 이는 모든 비밀값을 탐지한다는 보장이 아닙니다. 현재 생성 ZIP의 허용 파일 구성과 payload 검사에서 의심 항목이 발견되지 않았습니다. 사용자 데이터는 빌드 입력으로 읽지 않습니다.

`npm test`, `npm run lint`, `npm run release:github`(tsc -b 및 Production Build 포함), `git diff --check`를 실행합니다. 최신 결과와 ZIP hash는 파일 옆 `.sha256`와 `.metadata.json`을 함께 확인합니다. sourceCommit은 생성 당시 HEAD이며 최종 게시 커밋에서 다시 생성해야 합니다.

후보 파일명 `SKOPE-Extension-v1.0.0.zip`과 실제 manifest 0.1.0의 차이는 의도적으로 명시합니다. 최종 제출용 버전 일치와 실제 QA가 완료되지 않아 지금 게시하면 안 됩니다. [릴리스 초안](github-release-draft.md)과 [RC 체크리스트](rc-checklist.md)를 사용합니다.
