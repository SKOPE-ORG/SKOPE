# 기여 안내

기능 제안이나 버그는 먼저 [Issues](https://github.com/SKOPE-ORG/SKOPE/issues)에서 기존 논의를 확인하세요. 작은 수정은 문제와 재현 방법을 PR에 직접 설명해도 됩니다.

## 개발

Node.js 22.12 이상에서 `npm install` 후 `npm run dev`로 UI를 미리 봅니다. Chrome API는 localhost에서 제공되지 않으므로 `npm run build` 후 `dist`를 별도 Chrome 테스트 프로필에 로드하세요.

브랜치에서 필요한 부분만 수정하고 의미 있는 단위로 커밋하세요. PR에는 변경 이유, 검사 결과와 실제 Chrome 미검증 범위를 적습니다.

```sh
npm test
npm run lint
npm run build
```

자동 테스트는 Chrome API 모의 검사와 컴포넌트 정적 렌더링 검사입니다. 클릭·키보드·Chrome 재시작 검증을 대신하지 않습니다.

## 코드 위치

- `src/App.tsx`: 패널 화면 구성
- `src/components/`: Workspace 목록·그룹 카드·다이얼로그
- `src/hooks/useWorkspaceManager.ts`: Workspace 상태 및 사용자 작업·동기화 연결
- `src/hooks/useChromeTabGroups.ts`: Chrome 이벤트 동기화의 React 생명주기
- `src/services/`: Chrome 호출, 저장·분류·삭제·색상 정책
- `src/types/`: 저장 및 런타임 데이터 타입
- `src/background/`: Side Panel 실행 설정

## 데이터와 배포

Storage 키와 스키마 변경은 별도 마이그레이션 계획 없이 하지 않습니다. 그룹 해제는 탭을 닫지 않아야 하며 다른 Workspace 그룹을 바꾸지 않아야 합니다. 개인 탭 대신 테스트 프로필에서 확인하세요. 중요한 API 제약과 데이터 보존 이유는 주석에 남기되 코드 설명만 반복하는 주석은 피합니다.

공개된 Release·태그·ZIP을 개발 빌드로 교체하지 않습니다. 릴리스 버전과 산출물 변경은 별도 승인 과정으로 진행합니다. 민감한 URL·토큰·사용자 저장 데이터를 Issue, 테스트 fixture 또는 스크린샷에 넣지 마세요.

기여 코드는 프로젝트의 MIT License를 따릅니다.
