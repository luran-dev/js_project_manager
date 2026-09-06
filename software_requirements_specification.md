# Software Requirements Specification (SRS): Web-based MS Project Clone (SQLite Stack)

## 1. 프로젝트 개요 (Project Overview)
본 프로젝트는 MS Project의 핵심 기능인 WBS 계층 관리, 간트 차트 시각화, 작업 의존성 자동 연동을 웹 환경에서 제공하고, **다중 워크스페이스 구조 및 리소스(인력 투입 현황 & PTO) 관리 기능**을 갖춘 웹 기반 프로젝트 관리(PPM) 도구 개발을 목표로 합니다.
별도의 외부 DB 서버 설치 없이 로컬 `.db` 파일 기반의 **SQLite**를 사용하여 빠르고 간편하게 구동 및 배포할 수 있도록 구성합니다.

---

## 2. 추천 기술 스택 (Recommended Tech Stack)

### Core Framework & Language
- **Framework:** Next.js (App Router, React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, shadcn/ui, Lucide Icons

### Database & ORM (Embedded SQLite Architecture)
- **Database:** SQLite (`file:./dev.db`)
- **ORM:** Prisma ORM
- **State Management:** Zustand (전역 상태 및 실시간 UI 동기화)

### Visualization & UI Components
- **Gantt Chart & Timeline:** `@gantt-task-react` (또는 `frappe-gantt` / `vis-timeline`)
- **Data Table:** `@tanstack/react-table` (shadcn/ui Table 기반 WBS 구현)
- **Date Utilities:** `date-fns` (영업일, PTO 연동, KST/UTC 시차 오차 방지 및 Cascade 연산용)

---

## 3. 타임존 및 날짜 처리 지침 (Date & Timezone Policy)

- **SQLite 데이터 타입 제약:** SQLite는 순수 `DATE` 타입을 지원하지 않으므로 Prisma의 `DateTime` (ISO-8601 UTC 문자열) 형태로 저장합니다.
- **날짜 오차(KST/UTC) 방지 원칙:**
  - 시/분/초 단위 계산은 배제하고 **'일자(YYYY-MM-DD)'** 단위로만 관리합니다.
  - DB 저장 시 항상 **`YYYY-MM-DDT00:00:00.000Z` (UTC 00:00:00)** 기준으로 정규화합니다.
  - 클라이언트와 서버 통신 시 `date-fns` 기반의 날짜 파싱 유틸리티(`formatDate`, `toUTCDate`)를 사용하여 화면 출력 시 날짜가 하루 앞당겨지거나 밀리는 버그를 차단합니다.

---

## 4. 데이터베이스 스키마 (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 1. Workspace
model Workspace {
  id        String    @id @default(uuid())
  name      String
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  projects  Project[]
  users     User[]

  @@map("workspaces")
}

// 2. Project
model Project {
  id          String    @id @default(uuid())
  workspaceId String    @map("workspace_id")
  title       String
  description String?
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  tasks       Task[]

  @@map("projects")
}

// 3. User / Resource
model User {
  id                 String    @id @default(uuid())
  workspaceId        String    @map("workspace_id")
  name               String
  email              String    @unique
  avatarUrl          String?   @map("avatar_url")
  dailyCapacityHours Int       @default(8) @map("daily_capacity_hours")
  createdAt          DateTime  @default(now()) @map("created_at")

  workspace          Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  ptos               Pto[]
  assignedTasks      Task[]    @relation("TaskAssignee")

  @@map("users")
}

// 4. PTO (Paid Time Off)
model Pto {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  startDate DateTime @map("start_date")
  endDate   DateTime @map("end_date")
  reason    String?
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("ptos")
}

// 5. Task (WBS 및 간트 작업 단위)
model Task {
  id             String   @id @default(uuid())
  projectId      String   @map("project_id")
  title          String
  startDate      DateTime @map("start_date")
  endDate        DateTime @map("end_date")
  duration       Int      @default(1)
  progress       Int      @default(0)
  estimatedHours Int      @default(0) @map("estimated_hours")
  sortOrder      Int      @default(0) @map("sort_order")

  assigneeId     String?  @map("assignee_id")
  assignee       User?    @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  parentId       String?  @map("parent_id")
  parent         Task?    @relation("TaskHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children       Task[]   @relation("TaskHierarchy")

  predecessors   TaskDependency[] @relation("SuccessorRelation")
  successors     TaskDependency[] @relation("PredecessorRelation")

  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("tasks")
}

// 6. Task Dependency (N:M 선후 관계)
model TaskDependency {
  id            String   @id @default(uuid())
  predecessorId String   @map("predecessor_id")
  successorId   String   @map("successor_id")
  type          String   @default("FS") // "FS", "SS", "FF", "SF"

  predecessor   Task     @relation("PredecessorRelation", fields: [predecessorId], references: [id], onDelete: Cascade)
  successor     Task     @relation("SuccessorRelation", fields: [successorId], references: [id], onDelete: Cascade)

  @@unique([predecessorId, successorId])
  @@map("task_dependencies")
}
```

---

## 5. 상세 기능 요구사항 (Detailed Requirements)

### 5.1. 계층 및 프로젝트 구조 (Workspace & Project)
- [ ] **Workspace 관리:**
  - 사용자별 다중 Workspace 생성, 전환 및 삭제
  - Workspace 간 데이터 완전 격리
- [ ] **Project 관리:**
  - 좌측 사이드바에서 현재 Workspace 내 프로젝트 목록 제공
  - 프로젝트 생성/선택 시 해당 프로젝트의 WBS 및 간트 차트 로딩

### 5.2. WBS (Work Breakdown Structure) & 태스크 관리
- [ ] **계층 구조 지원:** Parent-Child 간 인덴트(Indent) / 아웃덴트(Outdent) 조작
- [ ] **태스크 CRUD:** 작업 추가, 수정, 삭제 및 드래그 앤 드롭 순서 변경
- [ ] **상위 작업 자동 요약:** 하위(Child) 작업들의 시작일/종료일/평균 진행률을 상위(Parent) 작업에 자동 반영

### 5.3. 스마트 일정 산출 및 의존성 (Cascade Engine with PTO)
- [ ] **비작업일(Non-Working Days) 처리 연산 Engine:**
  - 주말(토, 일)을 비작업일로 자동 건너뜀
  - 작업 담당자(`assigneeId`)의 **PTO(휴가) 기간을 비작업일로 인지**하여 작업 종료일(`endDate`) 자동 연장
- [ ] **의존성 연쇄 업데이트 (Cascade Update):**
  - 작업 간 **Finish-to-Start (FS)** 의존성 관계 설정
  - 선행 작업(Predecessor)의 종료일이 변경되면, 담당자의 PTO 및 주말을 고려하여 후속 작업(Successor)의 시작일/종료일 순연 계산

### 5.4. 간트 차트 (Gantt Chart View)
- [ ] 좌측 WBS 테이블 + 우측 Timeline Gantt 차트의 Split Screen 뷰
- [ ] Timeline Zoom 기능 (Day / Week / Month)
- [ ] Gantt Bar 드래그 앤 드롭을 통한 일정 및 기간 변경 (변경 시 WBS 및 DB 즉시 반영)
- [ ] 작업 간 의존성 화살표 연결 시각화

### 5.5. 리소스 및 PTO 관리 뷰 (Resource Allocation View)
- [ ] **PTO 등록 뷰:** 담당자별 휴가 기간(시작일~종료일 및 사유) 등록/수정 모달 및 관리 페이지
- [ ] **리소스 투입 현황 매트릭스 (Heatmap):**
  - X축: 날짜 / Y축: 담당자
  - 일별 할당된 총 작업 시간(Hours) 자동 합산 및 표시
  - **초과 할당(Over-allocation) 감지:** 하루 표준 근로시간(기본 8시간) 초과 시 셀을 빨간색으로 경고 표시
  - **PTO 영역 마스킹:** 담당자의 PTO 날짜는 그리드에 회색('PTO')으로 마스킹 및 해당 일자 작업 할당 제한 안내

---

## 6. 개발 로드맵 및 가이드 (Execution Steps)

1. **Step 1: 환경 변수 및 DB 초기화**
   - `.env`에 `DATABASE_URL="file:./dev.db"` 추가
   - Prisma 마이그레이션 실행 (`npx prisma db push`)
2. **Step 2: Workspace & Project 라우팅 구성**
   - 사이드바 네비게이션 및 계층 데이터 조회 API/Server Actions 구성
3. **Step 3: WBS + Gantt Chart 통합 컴포넌트 개발**
   - Zustand 스토어 기반 데이터 동기화 및 Table + Gantt 배치
4. **Step 4: PTO 및 Cascade 일정 계산 유틸리티 구축**
   - `date-fns` 기반 날짜 정규화, 주말/PTO 제외 Working Day 연산 알고리즘 및 유닛 테스트 작성
5. **Step 5: Resource Heatmap 뷰 구현**
   - `/resources` 페이지 제작 및 초과 투입 감지 시각화