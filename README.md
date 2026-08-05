# 강원도 가족 여행 프리미엄 웹앱 (Family Trip Planner)

가족 여행을 위해 설계된 모바일 중심의 프리미엄 여행 일정표 및 경비 장부 웹앱입니다.
별도의 회원가입 없이 전체 접근 암호(PIN)를 통해 일정을 공유하고, 관리자 비밀번호를 통해 일정을 관리할 수 있습니다.

## 주요 기능
*   **타임라인 일정표:** PDF 원본 기반 3일간의 일정을 모던한 카드 뷰로 제공합니다. 각 카드에는 카카오맵/네이버지도 바로가기가 연결되어 있습니다.
*   **경비 관리:** 실시간으로 총 사용 금액을 확인하고, 항목을 추가/삭제할 수 있습니다.
*   **다크모드 지원:** 기기 설정에 맞춰 자동으로 다크모드가 적용됩니다.
*   **모바일 퍼스트:** iPhone SE 등 작은 화면부터 최신 Pro Max 기기까지 부드럽게 동작합니다.

## 시스템 비밀번호
- **접속 암호 (초기 화면):** `1111`
- **관리자 암호:** `1111`

## Firebase 연동 가이드

기본적으로 Firebase 설정이 비어 있으면 웹앱의 내장 LocalStorage를 사용해 오프라인으로 작동합니다. 여러 사람 기기간 동기화를 위해서는 Firebase 설정이 필수입니다.

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 에 접속합니다.
2. `프로젝트 추가` 버튼을 눌러 새 프로젝트를 생성합니다. (예: `family-trip-2026`)

### 2. 웹 앱 추가 및 firebaseConfig 획득
1. 프로젝트 생성 후 화면 중앙의 `</>` (웹) 아이콘을 클릭합니다.
2. 앱 이름을 입력하고 등록합니다. (Firebase Hosting은 필요하다면 체크합니다.)
3. 발급된 `firebaseConfig` 객체 값을 복사합니다.
4. 소스 코드의 `script.js` 파일 최상단 `firebaseConfig` 변수를 해당 값으로 덮어씁니다.

### 3. Firestore 활성화
1. 좌측 메뉴에서 **Build > Firestore Database** 로 이동합니다.
2. **데이터베이스 만들기**를 클릭합니다.
3. 위치를 선택(Seoul 또는 Tokyo 권장)하고, **테스트 모드**로 시작합니다.
4. *주의:* 테스트 모드는 30일 후 접속이 차단되므로, 나중에 '규칙(Rules)' 탭에서 아래와 같이 보안 규칙을 수정해주세요.
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true; // 실제 운영시는 더 강화해야 합니다.
        }
      }
    }
    ```

### 4. Firebase Storage 활성화 (사진첩 기능 확장 시)
1. 좌측 메뉴에서 **Build > Storage** 로 이동합니다.
2. **시작하기**를 누르고 동일하게 테스트 모드로 생성합니다.

---

## 무료 배포 가이드

HTML, CSS, JS만으로 이루어진 정적 웹앱이므로 아래의 3가지 서비스 중 편한 곳에서 1분만에 무료로 배포할 수 있습니다.

### 방법 1. GitHub Pages (가장 권장)
1. GitHub 계정을 만들고 새 Repository(저장소)를 생성합니다.
2. 프로젝트의 모든 파일(`index.html`, `styles.css`, `script.js`, `data.js`)을 업로드합니다.
3. 저장소의 **Settings > Pages** 로 이동합니다.
4. Source를 `Deploy from a branch`로 두고 Branch를 `main`(또는 `master`)으로 선택 후 Save를 누릅니다.
5. 몇 분 후 제공되는 링크를 가족 단톡방에 공유합니다!

### 방법 2. Netlify 배포
1. [Netlify](https://www.netlify.com/) 에 가입 후 로그인합니다.
2. "Add new site" > "Deploy manually"를 선택합니다.
3. 이 프로젝트 폴더 자체를 드래그 앤 드롭으로 업로드합니다.
4. 즉시 주소가 생성되며, 배포된 링크를 공유합니다.

### 방법 3. Cloudflare Pages
1. [Cloudflare Pages](https://pages.cloudflare.com/) 에 가입합니다.
2. "Create a project" > "Direct Upload"를 선택합니다.
3. 프로젝트 폴더를 업로드하여 배포합니다. (가장 로딩 속도가 빠릅니다.)
