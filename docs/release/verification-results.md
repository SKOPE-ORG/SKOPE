# RC 자동 검사 결과

2026-10-13, Issue #19. 실제 Chrome QA는 미실행이며 [체크리스트](rc-checklist.md)에 모두 미완료로 표시했습니다.

| 검사 | 결과 |
| --- | --- |
| npm test | 40/40 통과. 모의 API: CRUD 저장·아이콘/색상·순서/접힘·입력 거부, 그룹 조회/이벤트, 해제·다중 창 삭제의 탭 보존, 실패 복구, 색상 정책, 새 세션 분류 |
| npm run lint | 통과 |
| npm run build (release:package 내부 실행) | tsc -b 및 Vite 통과, 28 modules |
| git diff --check | 통과 |
| ZIP 검사 | 10개 파일, 루트 manifest, 지정 권한 4개, PNG 16/32/48/128 치수 확인 |
| 브랜드 | 기존 skope-logo.png 직접 열어 파란 오비탈 디자인 확인. 아이콘/manifest/원본 자산 변경 없음 |
| 정적 개인정보 흐름 | fetch/XMLHttpRequest/sendBeacon/WebSocket/storage.sync/tabs.remove 호출 없음. 원격 favicon 이미지 로드 가능성 확인 |

패키지: `release-artifacts/skope-0.1.0-rc-1791852871679.zip`

SHA-256: `9d88e1e4535b8edb7a112ea499d7058ccd0a610f20368ff4303878a9337c7a8a`

manifest 0.1.0 및 npm package 0.0.0은 기존 값을 유지했습니다. 1.0.0은 미확정입니다. ZIP은 로컬 산출물로 Git에 커밋하지 않습니다. 재생성 시 이름·해시를 다시 기록하세요. 스토어 제출 가능 형식의 RC 패키지이며 제출 승인이나 런타임 검증 완료를 의미하지 않습니다.

검토한 변경은 테스트·문서·패키징에 한정됩니다. 프로덕션 Workspace 데이터, Chrome 탭, 로고와 권한을 변경하지 않았습니다. 사용자의 기존 미추적 파일은 그대로 남겼습니다.
