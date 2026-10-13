# GitHub 브랜딩 파일

SKOPE 공식 파란 글로시 오비탈 로고를 그대로 사용합니다. 새 로고 생성, 재해석, 색 변경이나 자르기를 하지 않았습니다.

| 용도 | 파일 | 크기 |
| --- | --- | --- |
| README 상단 | `public/icons/skope-logo.png` | 원본 1024×1024, README 표시 144×144 |
| 조직 프로필 업로드 | `docs/branding/skope-organization-profile.png` | 512×512 PNG |

조직 프로필 파일은 기존 `public/icons/icon-512.png`와 바이트 단위로 동일합니다. 둥근 프로필 표시를 위한 새 그림이나 변형은 없습니다. 고해상도 원본, Extension 아이콘과 macOS 보관 자산은 그대로 유지합니다.

## 조직 관리자 별도 작업

**조직 프로필 사진은 변경하지 않았습니다.** 저장소 파일 추가만으로 GitHub 조직 사진이 바뀌지 않습니다. SKOPE-ORG 조직 소유자(관리자)가 조직 Settings의 프로필 사진 업로드 기능에서 위 PNG를 선택해야 합니다. 저장소 관리자 권한과 조직 소유자 권한은 다릅니다. [GitHub 공식 안내](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile#changing-your-organizations-profile-picture)를 참고하세요.

## Social Preview

이번 변경은 README와 설치 안내에 집중하며 별도 1280×640 Social Preview를 생성하거나 GitHub 설정에 적용하지 않았습니다. 향후 제작 시 기존 로고를 그대로 배치하고 독립형 Browser 기능을 소개하지 않아야 합니다.

## 확인 범위

공식 PNG를 직접 열어 디자인을 확인했고 파일 동일성·치수 및 README 상대 경로를 검사했습니다. 공개 v0.1.0-beta ZIP과 Release는 변경하지 않았습니다. Windows/macOS 설치 UI 절차를 이번 작업에서 직접 실행하지 않았으며 기존 Chrome 수동 QA 미완료 표시를 유지합니다.

열린 리팩터링 PR #26도 README를 수정하므로 병합 시 이 설치 안내와 그 PR의 기여 안내를 함께 보존해야 합니다. 브랜딩 PR에 리팩터링 코드나 미병합 CONTRIBUTING 링크를 포함하지 않았습니다.
