# ProjectVibe

ProjectVibe는 프로젝트 계획과 실행 일정을 분리해 관리하는 웹 기반 Gantt 프로젝트 관리 도구입니다. Planner에서 기준 일정을 작성하고, Execution에서 실제 일정과 투입량을 기록해 계획 대비 차이를 확인할 수 있습니다.

## 주요 기능

- Workspace와 Project 관리
- 계층형 Task 작성, 순서 변경, 들여쓰기 및 의존성 설정
- Planner 잠금 및 잠금 해제
- Planned baseline과 Actual execution 비교
- Gantt 날짜 이동, 확대/축소 및 Tasks/Timeline 영역 크기 조절
- Planner/Execution 관점의 Resource allocation 및 workload 분석
- 사용자 가입, 로그인, 로그아웃 및 이메일 비밀번호 재설정
- SQLite 기반 로컬 데이터 저장

## 설치 요구사항

- Node.js 22 이상
- pnpm
- SQLite 3 CLI (`sqlite3` 명령)

macOS에서 필요한 도구가 없다면 다음과 같이 설치할 수 있습니다.

```bash
brew install node pnpm sqlite3
```

## 설치 및 실행

저장소를 받은 뒤 의존성을 설치합니다.

```bash
git clone https://github.com/luran-dev/js_project_manager.git
cd js_project_manager
pnpm install
```

개발 서버를 실행합니다.

```bash
pnpm dev
```

브라우저에서 `http://localhost:5174`에 접속합니다. 서버는 기본적으로 `0.0.0.0:5174`에서 실행되므로 같은 네트워크의 다른 기기에서도 `http://<서버-IP>:5174`로 접속할 수 있습니다.

초기 데이터베이스를 처음 생성했을 때 사용할 수 있는 기본 계정은 다음과 같습니다.

```text
Email: user@example.com
Password: password
```

새 사용자는 로그인 화면의 **Create account**에서 별도 계정을 만들 수 있습니다. 애플리케이션 데이터는 기본적으로 `.data/projectvibe.sqlite`에 저장됩니다.

## 비밀번호 재설정 설정

이메일 비밀번호 재설정을 사용하려면 [Resend](https://resend.com/) API 키와 발신 도메인이 필요합니다. 예제 파일을 복사한 뒤 값을 설정합니다.

```bash
cp .env.example .env
```

```dotenv
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL="ProjectVibe <no-reply@example.com>"
```

`RESEND_FROM_EMAIL`에는 Resend에서 인증한 도메인의 발신 주소를 입력해야 합니다. 설정 후 로그인 화면의 **Forgot password?**에서 이메일로 받은 6자리 코드를 이용해 비밀번호를 변경할 수 있습니다.

## 서버 관리 스크립트

터미널을 닫아도 서버를 유지하려면 다음 명령을 사용합니다.

```bash
pnpm serverctl start
pnpm serverctl status
pnpm serverctl stop
```

포트와 바인딩 주소도 지정할 수 있습니다.

```bash
pnpm serverctl start --port 5180 --host 127.0.0.1
pnpm serverctl stop --port 5180
```

로그는 `.data/servers/projectvibe-<port>.log`에 기록됩니다.

## 사용 방법

### 1. Workspace와 Project 선택

상단의 **Workspace**와 **Project** 선택 상자에서 작업 대상을 선택합니다. 각 선택 상자 옆의 설정 버튼으로 Workspace와 Project를 추가하거나 수정할 수 있습니다. **Resources** 버튼에서는 인력의 일일 가용 시간과 PTO를 관리합니다.

### 2. Planner에서 기준 일정 작성

1. **Planner** 탭에서 **Task** 버튼으로 작업을 추가합니다.
2. Task 이름, 상태, 시작일, 종료일, 기간, 진행률, 담당자와 MD를 입력합니다.
3. 행 이동과 들여쓰기/내어쓰기로 WBS 계층을 구성하고 선행 Task를 지정합니다.
4. 일정이 확정되면 **Unlocked** 버튼을 눌러 **Locked** 상태로 전환합니다. 잠긴 Planner에서는 편집할 수 없습니다.

Tasks와 Timeline 사이의 세로 구분선을 드래그해 영역 너비를 조절할 수 있습니다. 상단의 돋보기 버튼은 전체 패널 배율을, Day/Week/Month 버튼은 Timeline 시간 단위를 변경합니다.

### 3. Execution에서 실제 일정 추적

**Execution** 탭은 Planner 값을 Planned baseline으로 사용하고 Actual 행을 별도로 제공합니다. Actual의 일정, 상태, 진행률, 담당자와 MD를 수정하면 Variance에서 지연 일수와 MD 차이를 확인할 수 있습니다.

**Show baseline**을 끄면 Planned 행과 baseline bar가 숨겨져 Actual 일정에 집중할 수 있습니다.

### 4. Resource 할당 확인

Project 화면의 **Resources** 탭에서 날짜별 인력 할당을 확인합니다.

- Planner: 배정된 작업 하나를 근무일당 `1.0 MD`로 표시
- Execution: Actual 투입시간을 기준으로 MD 표시
- 같은 날짜에 여러 작업이 겹치면 과할당 상태로 표시
- PTO 날짜는 별도로 표시

왼쪽 탐색 메뉴의 차트 아이콘을 선택하면 전체 Workspace의 **Resource Workload** 통계를 볼 수 있습니다. Planner/Execution 전환을 통해 할당량, 가동률, 과할당 날짜, 프로젝트별 MD와 일별 heatmap을 비교할 수 있습니다.

## 개발 명령

```bash
pnpm test       # Vitest 테스트 실행
pnpm build      # TypeScript 검사 및 프로덕션 번들 생성
pnpm preview    # 빌드 결과 미리보기
pnpm api        # API 서버만 8787 포트에서 실행
```

`pnpm preview`는 정적 빌드 확인용입니다. 로그인과 저장 API를 포함한 전체 기능 확인에는 `pnpm dev`를 사용하세요.
