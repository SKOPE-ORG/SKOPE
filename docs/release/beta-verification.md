# v0.1.0 Beta 검증과 게시 절차

Issue #23. 기존 PR #22에 의존하는 브랜치 `release/v0.1.0-beta`이며 main에 아직 통합되지 않았습니다. 기존 데이터 스키마, 로고, 권한 및 프로덕션 기능을 변경하지 않았습니다. 1.0.0 후보 대신 0.1.0 베타 ZIP 이름/버전 표시를 정정했습니다.

## 실제 Chrome 테스트 — 미실행

자동 실행 결과: npm install 완료(감사 취약점 0건), npm test 41/41 통과, npm run lint 통과, npm run release:github 내부 tsc -b 및 Vite Production Build 통과(28 modules), ZIP 10개 파일/루트 manifest/아이콘/민감정보 패턴 검사 통과, git diff --check 통과. 별도 typecheck 스크립트는 없으며 build가 타입 검사를 포함합니다. install은 fsevents 설치 스크립트 승인 미등록 경고를 출력했으며 추가 승인은 하지 않았습니다. 발견된 기능 회귀 오류 없음. 기존 v1.0.0 후보 파일명 불일치는 이번 베타 패키지로 정정했습니다.

별도 테스트 프로필에서 ZIP을 풀어 설치하고 Chrome 버전·OS·확장 ID·ZIP hash·관찰 결과를 기록하세요. 기존 개인 탭이나 Workspace를 삭제하지 마세요.

- [ ] Side Panel과 Service Worker 정상 실행, 공식 로고 및 좁은 너비의 UI 확인
- [ ] Workspace 생성·수정·삭제, 모든 아이콘/색상, 공백 입력 차단, 접힘·순서 유지
- [ ] 기존 그룹 배정·재배정, Workspace별 펼친 목록과 Unassigned 표시 확인
- [ ] 그룹 내부 탭 클릭 시 기존 탭 활성화, 선택한 미그룹 탭만 새 그룹 생성
- [ ] Follow Workspace와 Keep Chrome 색상 정책 확인
- [ ] Unassigned와 Workspace 메뉴에서 그룹 해제 후 그룹 제거 및 웹사이트 탭 유지
- [ ] 두 창의 연결 그룹이 있는 Workspace 삭제: 모든 대상만 해제, 모든 탭 유지, 다른 Workspace 불변
- [ ] Chrome 그룹 생성·수정·부분 이동·전체 해제 이벤트 반영, 유령 그룹 없음
- [ ] API 실패 시 오류 표시, 실패 그룹 임의 제거 없음, Workspace 유지 및 재시도
- [ ] 같은 프로필/설치 경로에서 업데이트: 확장 ID와 local 문서 유지
- [ ] Chrome 완전 종료/재시작 후 Workspace 유지, 실제 그룹만 표시, 분류 복원 한계 확인
- [ ] favicon 외 불필요한 외부 전송 없음 확인

## 배포 구성/개인정보 검토

Manifest V3, module worker, Side Panel index.html, 공식 16/32/48/128 아이콘을 검사합니다. sidePanel/storage/tabGroups/tabs 4개 권한은 실제 기능에 필요하며 host permissions/content scripts/원격 실행 코드 설정을 추가하지 않습니다. 자동 패키저는 JS·CSS·HTML·manifest·사용 아이콘 10개만 포함하고 PNG 치수·루트 manifest·파일 목록·민감정보 패턴을 검사합니다. 개인 데이터 저장소를 빌드 입력으로 읽지 않습니다. 알려진 패턴 검사는 모든 비밀값 탐지 보장이 아닙니다.

개발자 서버 전송·분석 SDK는 없으며 favicon 원격 이미지 요청 가능성이 있습니다. local 키 `skope.workspaceState.v1`과 schema 1 유지, 업데이트 worker는 저장소 초기화 없음. session 매핑은 reload/업데이트 시 초기화될 수 있으며 실제 업데이트 E2E는 미검증입니다.

## Draft 및 공개 승인

현재 문서가 Release Draft의 원본입니다. main에 기능이 아직 없으므로 GitHub 원격 Draft/tag를 생성하지 않습니다. 승인 후 의존 PR을 순서대로 통합하고 최종 main에서 검사와 ZIP을 다시 생성합니다. 그 커밋 SHA를 metadata와 비교하세요. 이후 Tag v0.1.0-beta, Title SKOPE Extension v0.1.0 Beta, Pre-release 활성화, draft=true로 ZIP 및 해시를 첨부합니다. 공개 게시 직전에 사용자 확인을 받아야 합니다. 지금은 Merge/Tag/Release 게시하지 않습니다.
