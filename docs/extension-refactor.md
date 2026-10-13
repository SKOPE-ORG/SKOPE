# Extension 리팩터링 기록 (#25)

공개 v0.1.0-beta 이후 다음 버전을 위한 변경입니다. 버전/태그/Release/배포 ZIP은 변경하지 않습니다.

## 구조 변화

이전 App.tsx는 1,288줄에 초기 로드·저장·Chrome 그룹 작업·동기화·UI 컴포넌트 다섯 개를 포함했습니다. 현재 App.tsx는 약 257줄의 화면 구성으로 줄이고 다음 경계를 사용합니다.

| 파일 | 역할 |
| --- | --- |
| hooks/useWorkspaceManager.ts | 저장 상태, 선택 Workspace, 다이얼로그 상태, 그룹 작업과 기존 서비스 연결 |
| components/WorkspaceRow.tsx | Workspace 목록 항목과 그룹 표시 |
| components/TabGroupCard.tsx | 실제 그룹 펼치기, 내부 탭과 작업 메뉴 |
| components/WorkspaceDialogs.tsx | Workspace 생성·수정·삭제 확인 |
| components/AddTabGroupDialog.tsx | 기존 그룹 연결과 새 그룹 폼 |
| hooks/useModalDialog.ts | 기존 native dialog 열기·정리 생명주기 |
| services/errors.ts | Error 메시지 보존과 문맥별 fallback |

새 상태관리 라이브러리, 전역 store, 범용 repository나 context는 추가하지 않았습니다. 초기 로드와 재시도의 상태 적용 코드 중복을 제거했고, 그룹 분류의 반복 Workspace 탐색은 Map 조회로 정리했습니다. Chrome 서비스와 React UI의 기존 경계를 유지합니다. 이벤트 리스너 등록/해제, 색상 정책, 그룹 해제 검증, 삭제 실패 시 데이터 보존 서비스의 동작은 유지합니다.

그룹 연결 제거 실패를 UI 콜백에서 처리하지 않던 경로는 Workspace 제어 훅에서 잡아 기존 오류 영역에 표시합니다. Chrome 그룹이나 탭을 추가로 변경하지 않습니다.

## UI 변경 전후

CSS·레이아웃·간격·공식 로고는 수정하지 않았습니다. 실제 화면 캡처나 Chrome UI 비교는 실행하지 않았습니다.

| 이전 | 이후 | 이유 |
| --- | --- | --- |
| Remove | Unassign | Workspace 연결 해제와 Chrome Ungroup의 구분 |
| Private by design | Stored on this device | 현재 저장 동작을 구체적으로 설명 |
| No tab groups in this Workspace yet. | No groups yet. Add a Chrome tab group below. | 빈 상태에서 다음 작업 안내 |
| 펼치기 버튼 aria-expanded만 제공 | aria-controls로 콘텐츠 연결 | Workspace/그룹 접근성 |

## 검증

- 변경 전: npm test 41/41, npm run lint, npm run build 통과
- 변경 후: 기존 41개와 정적 렌더링/오류 처리 5개, 총 46/46 통과. lint, tsc -b/Production Build, git diff --check 통과
- 서비스 테스트는 모의 Chrome API, 컴포넌트 테스트는 React 서버 정적 렌더링입니다. 실제 사용자 입력·클릭·키보드·effect 실행 검증을 대체하지 않습니다.
- storage key/schema/manifest 권한/worker/삭제 API는 유지했습니다. MIT LICENSE 변경 없음
- 공개 ZIP과 로컬 베타 ZIP SHA-256은 `e455c17fc12067756d955a253d9581a53e520f2a42bebd11aa6d28d230632854`로 유지

## 수동 테스트 — 미실행

별도 Chrome 테스트 프로필에 개발 dist를 로드하세요. 기존 베타 설치 폴더를 덮어쓰지 마세요.

- [ ] Workspace CRUD·선택·접힘·순서 변경, 새로고침 후 local 데이터 유지
- [ ] 기존 그룹 배정/재배정/Unassign, 실패 시 오류 표시
- [ ] 그룹 펼침·탭 클릭·색상 Follow/Keep 정책
- [ ] Unassigned/Workspace Ungroup 및 여러 창의 Workspace 삭제: 탭은 유지, 다른 그룹 불변
- [ ] 모달 Enter/Escape/Tab, 그룹 메뉴 Escape/외부 클릭과 포커스 복귀
- [ ] 좁은 Side Panel에서 Unassign 버튼·긴 이름·오류 안내의 줄바꿈
- [ ] reload/브라우저 재시작과 Chrome 이벤트 반영, 유령 그룹 없음

검증하지 않은 Chrome 재시작 분류 복원을 완전 보장한다고 소개하지 않습니다. 기존 베타 README의 개인정보·해시 및 favicon·그룹 지문 제한을 유지합니다.
