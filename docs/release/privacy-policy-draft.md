# SKOPE 개인정보 처리방침 초안

상태: 제출 전 운영 주체, 연락처, 시행일 및 공개 URL 확정 필요. 현재 코드 기준이며 법률 검토 완료를 의미하지 않습니다.

SKOPE는 Chrome 탭 그룹을 사용자가 만든 Workspace로 분류하는 로컬 확장 프로그램입니다. 계정, 자체 서버, 광고, 분석 SDK 또는 외부 데이터 전송 API를 사용하지 않습니다.

## 처리하는 정보와 목적

- 현재 Chrome 창의 탭 제목, URL, favicon URL, 탭·창·그룹 식별자, 그룹 이름과 색상을 읽어 그룹 목록과 내부 탭을 표시합니다. 탭을 선택하면 기존 탭을 활성화합니다.
- Workspace 삭제 작업은 다른 창에 연결된 그룹을 찾기 위해 모든 Chrome 창의 탭과 그룹을 조회합니다. 그룹화만 해제하며 웹사이트 탭을 닫지 않습니다.
- Workspace 이름, 아이콘, 색상, 순서, 접힘 상태, UUID, 생성·수정 시각과 그룹 연결 UUID·색상 정책·SHA-256 지문을 `chrome.storage.local`에 저장합니다. 지문은 정렬한 URL 또는 제목 대체값으로 계산하며 원본 URL·탭 제목의 목록은 영구 저장하지 않습니다. 해시는 익명화 보장이 아니며 추측 가능한 URL에 대한 비교가 가능할 수 있습니다.
- 임시 Chrome 그룹 ID와 연결 UUID·갱신 시각은 `chrome.storage.session`에 저장합니다. Chrome ID를 영구 식별자로 사용하지 않습니다.

## 네트워크와 제3자

SKOPE 개발자에게 위 정보를 전송하거나 판매하지 않습니다. 다만 탭 목록의 favicon은 Chrome이 제공한 URL을 이미지로 표시합니다. 해당 URL이 원격 주소인 경우 브라우저가 해당 사이트에 이미지 요청을 보내며 IP 등 일반 네트워크 정보가 전달될 수 있습니다. 따라서 확장 프로그램이 완전히 오프라인이라고 설명하지 않습니다. 기존 웹사이트의 개인정보 처리는 각 사이트의 정책을 따릅니다.

## 보관과 삭제

로컬 Workspace 데이터는 브라우저 재시작 후에도 보관합니다. Workspace 삭제에 성공하면 해당 Workspace와 연결 기록을 삭제합니다. 직접 그룹 해제는 저장된 Workspace 연결 기록을 삭제하지 않습니다. 확장 프로그램 제거 시 Chrome이 확장 프로그램 저장소를 삭제합니다. 세션 저장소는 브라우저 재시작 또는 확장 프로그램 다시 로드 등으로 초기화됩니다. SKOPE는 동기화 저장소나 서버 백업을 제공하지 않습니다.

## 권한과 제한적 이용

`sidePanel`, `storage`, `tabGroups`, `tabs` 권한은 Workspace 및 탭 그룹 관리 기능에만 사용합니다. 페이지 본문, 쿠키, 비밀번호를 읽는 기능이나 콘텐츠 스크립트는 없습니다. Google API에서 받은 정보의 이용은 Chrome Web Store User Data Policy 및 Limited Use 요구사항을 준수합니다.

문의: **출시 담당자가 공개 연락처를 확정해야 합니다.** 기능이나 처리 흐름 변경 시 이 정책을 업데이트합니다.

참고: [Chrome 웹 스토어 사용자 데이터 정책](https://developer.chrome.com/docs/webstore/program-policies/policies), [개인정보 공개 항목](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/).
