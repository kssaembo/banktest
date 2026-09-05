# REF_ClassBank (Class Bank 개발 레퍼런스 문서)

---

# 1. SERVICE OVERVIEW

* **서비스명**: Class Bank (클래스 뱅크 / 우리 학급만의 특별한 경제활동 시스템)
* **서비스 유형**: 핀테크(Fintech) UI 기반 초·중등 학급 경제 교육 시뮬레이션 웹 애플리케이션
* **목적**: 실물 화폐 인쇄 및 수기 장부 관리의 번거로움을 해소하고, 학생들이 모바일/태블릿을 통해 실제 은행, 주식 시장, 크라우드 펀딩, 세금 및 복지, 상점 POS, 기부 시스템을 직접 체험하며 경제 관념을 체득하도록 지원.
* **교육과정 연계**: 초등 사회과(경제 생활과 바람직한 선택, 금융과 자산 관리, 시장 경제의 원리), 실과(생활 속 금융), 창의적 체험활동(진로 및 학급 자치활동).
* **대상 사용자**:
  * **초등/중등 교사 (Teacher / Admin)**: 학급 경제 총괄 운영 및 통화 정책, 복지/세무 집행자.
  * **초등/중등 학생 (Student)**: 경제 주체(소비자, 투자자, 납세자, 기부자, 근로자).
  * **특수 역할 학생 (Banker / Mart)**: 학급 직업으로 지정된 은행원 및 마트 관리자.
* **예상 사용 인원**: 학급당 15~35명 (다중 학급 및 게스트 체험 지원).
* **실제 사용 환경**:
  * 교실 내 1인 1스마트기기(태블릿, 스마트폰, 크롬북) 환경.
  * 교사 교탁 PC (전자칠판/대형 모니터 연동 대시보드).
  * 학급 은행 코너 및 학급 마트(매점) 코너 전용 태블릿/PC.
* **사용 기기**: 데스크톱 PC, 노트북, 태블릿(iPad, 갤럭시탭), 스마트폰(iOS/Android 웹 브라우저).
* **서비스의 핵심 기능**:
  1. **맞춤형 계좌 및 화폐 관리**: 교사별 고유 화폐 단위(예: 톨, 미소, 별, 냥 등) 및 교사 별칭 설정, 학급 국고(Treasury) 및 개인 계좌 자동 개설.
  2. **학생 계좌 및 금융 업무**: 학생 간 실시간 간편 송금, 입출금 내역 조회, 직업 월급 수령 및 인센티브 지급.
  3. **주식 투자 시뮬레이션**: 종목 상장, 변동성 기반 주가 차트(Recharts), 실시간 매수/매도 및 수익률 계산, 거래 수수료 부과.
  4. **예금(Savings) 상품**: 만기일 및 이율 설정, 정기 예금 가입/중도 해지/만기 자동 및 수동 정산.
  5. **프로젝트/크라우드 펀딩(Funds)**: 학생의 창의적 아이디어/프로젝트 제안, 학급 급우들의 투자 모집, 목표 달성 여부에 따른 배당금 및 제안자 보너스 정산.
  6. **세금(Tax) 부과 및 징수**: 교사의 소득세/주민세/벌금 등 항목별 일괄/개별 고지 및 학생 자진 납부(원클릭 납부).
  7. **학급 마트 POS 시스템**: 마트 담당 학생이 물품 구매 학생을 선택하고 금액을 입력하여 즉시 대금 결제 및 영수증 발행.
  8. **기부(Donation) 모금함**: 학급 모금 프로젝트 개설, 실시간 모금 게이지, 기부 참여 및 국고 연동.
  9. **교육 부가 기능**: 금융/경제 상식 카드뉴스(Economy Reading), 경제 용어 타자 연습(Economy Typing), 어린이 경제 뉴스 팝업 연동.
* **서비스의 핵심 게임/활동 규칙**:
  * 화폐 단위와 가치는 교사가 자율 결정(1통화 = 원화 환산 기준 수립 가능).
  * 직업을 가진 학생은 주기적으로 급여를 지급받으며, 세금 미납 시 연체 및 알림 발생.
  * 주식 매도 시 0.5%~수수료가 발생하여 단타보다는 가치 투자 유도.
  * 펀드 성공 시 투자자에게 원금+보상 지급 및 제안자에게 10% 운영 보너스 지급.

---

# 2. FINAL USER FLOW

## 2.1 전체 흐름 다이어그램

```
[시작 / AuthPage]
  ├── 선생님: 이메일 로그인 / 회원가입 / 비밀번호 찾기 / 게스트 체험
  └── 학생: 간편 로그인(이름/번호/학급코드) 또는 QR 코드 스캔 로그인
       │
[로그인 후 분기]
  ├── (교사 계정) ──> [RoleSelectionPage (역할 통합 허브)]
  │                    ├── 교사 관리자 모드 ──> [TeacherDashboard]
  │                    ├── 은행원 모드 ────> [BankerPage]
  │                    ├── 마트 모드 ──────> [MartPage]
  │                    └── 학생 모드 ──────> [StudentPage (학생 시점 뷰어)]
  └── (학생 계정) ──> [StudentPage] (기본: 자산/송금/주식/예금/펀드)
  └── (특수 직업) ──> [BankerPage] / [MartPage]
```

## 2.2 단계별 상세 흐름

1. **인증 및 접근 (Auth / Entry)**
   * **교사**: 이메일/비밀번호로 로그인하거나 복구코드로 비밀번호 재설정. 첫 사용자용 1클릭 '게스트 체험 모드' 지원.
   * **학생**: 교사가 배부한 개인 QR코드를 카메라로 스캔(`?token=...`)하거나, 학급 코드/학년/반/번호/이름을 입력하여 로그인.
   * **시스템**: QR 토큰 유효성 검증(`api.loginWithQrToken`) 또는 자격증명 확인 후 `AuthContext`에 세션 저장(`sessionStorage`).
   * **다음 단계 전환**: 유저의 `Role`과 이전 접속 모드에 따라 해당 대시보드로 즉시 전환.

2. **교사 역할 허브 (RoleSelectionPage)**
   * **사용자**: 교사.
   * **행동**: '교사 관리자', '은행원 모드', '마트 모드', '학생 시점 페이지' 중 하나를 선택.
   * **시스템**: 선택된 하위 페이지로 화면 렌더링 전환 (상단 뒤로가기를 통해 언제든 역할 허브로 복귀 가능).

3. **교사 관리자 대시보드 (TeacherDashboard)**
   * **사용자**: 교사.
   * **행동**:
     * 학생 관리: 학생 등록, 수정, 삭제, QR코드 명함 일괄 인쇄.
     * 금융/국고 관리: 국고 잔액 확인, 전체 입출금/송금 내역 모니터링, 직업 생성 및 월급 일괄/개별 지급.
     * 세금/복지: 세금 항목 등록, 학생별 부과, 납부 현황 확인 및 독촉 알림.
     * 펀드/기부: 학생 제출 펀드 승인 및 정산(성공/초과달성/실패), 기부 모금함 개설.
   * **시스템**: Supabase DB 및 RPC 함수와 실시간 동기화, 위험 작업 시 `ConfirmModal`로 확인 후 원자적 처리.

4. **학생 메인 화면 (StudentPage)**
   * **사용자**: 학생.
   * **행동**:
     * 자산 현황: 내 계좌 잔액, 보유 주식 평가액, 예금 잔액 종합 확인.
     * 송금: 수취인 선택 및 금액 입력 후 간편 송금.
     * 주식: 주가 변동 차트 확인 후 매수/매도 주문.
     * 예금: 정기 예금 상품 확인, 신규 가입, 중도 해지 및 만기 이자 수령.
     * 펀드: 급우들이 개설한 펀드에 투자하거나 새로운 펀드 제안서 작성.
     * 미납 세금 납부 및 기부 참여.
     * 부가 메뉴: 경제 읽기 자료 열람, 경제 타자 연습, 어린이 경제 뉴스 팝업 확인.
   * **시스템**: 트랜잭션 발생 시 계좌 잔액 실시간 차감/증가 및 거래내역(Transaction) 기록.

5. **은행원 업무 (BankerPage)**
   * **사용자**: 은행원 역할을 맡은 학생 또는 교사.
   * **행동**: 학생 선택 후 오프라인 현금 입금/출금 처리, 주식 종목 개설 및 일일 주가 변동 등록, 예금 상품 금리/기간 관리.
   * **시스템**: 원자적 계좌 업데이트 및 은행 거래 로그 생성.

6. **마트 POS 업무 (MartPage)**
   * **사용자**: 마트 담당 학생 또는 교사.
   * **행동**: 구매 학생 선택, 판매 금액 입력, '결제하기' 클릭.
   * **시스템**: 구매 학생 계좌에서 차감 후 마트 계좌(또는 국고)로 입금, 영수증 팝업 표시.

---

# 3. SCREEN STRUCTURE

* **AuthPage (로그인 및 회원가입 화면)**
  * **주요 목적**: 교사/학생 인증 및 계정 복구.
  * **주요 UI 요소**: 로고(Class Bank), 모드 탭(교사 로그인, 학생 로그인, 회원가입, 비밀번호 찾기, 복구코드 발급 안내, 게스트 체험 버튼).
  * **사용자 입력**: 이메일, 비밀번호, 학급코드, 학년/반/번호, 교사 별칭, 화폐 단위.
  * **중요 UX 결정**: 교실 환경에서 학생들이 이메일 없이도 '학급코드 + 번호 + 이름' 또는 QR 스캔만으로 접속 가능하도록 장벽 최소화.

* **RoleSelectionPage (교사 메인 허브 화면)**
  * **주요 목적**: 교사가 4가지 핵심 모드(관리자, 은행원, 마트, 학생 뷰어)로 원클릭 진입.
  * **주요 UI 요소**: 대형 컬러 카드 그리드(교사 관리자, 은행원 모드, 마트 모드, 학생 페이지), 상단 경제 교육 모달 런처(경제 읽기, 타자 연습, 경제 뉴스).

* **TeacherDashboard (교사 총괄 관리 화면)**
  * **주요 목적**: 학급 경제의 모든 데이터와 정책을 한곳에서 운영.
  * **주요 UI 요소**:
    * 상단 통계 카드: 총 통화량, 국고 잔액, 학생 수, 미납 세금 건수, 미정산 펀드 수.
    * 탭 네비게이션: `대시보드`, `학생 관리`, `계좌/거래`, `직업/월급`, `세금 관리`, `주식 관리`, `예금 관리`, `펀드 관리`, `기부함`.
    * 학생 QR코드 인쇄 모달: 학생별 QR 통장/명함 카드 그리드 및 브라우저 인쇄(`window.print()`) 최적화 레이아웃.

* **StudentPage (학생 핀테크 메인 화면)**
  * **주요 목적**: 모바일 뱅킹 앱과 유사한 인터페이스로 직관적인 자산 관리 경험 제공.
  * **주요 UI 요소**:
    * 상단 총자산 요약 카드 (현금 + 주식 평가액 + 예금).
    * 하단 탭 바 (홈/자산, 송금, 주식, 예금, 펀드).
    * 알림 배너 (미납 세금 즉시 납부 버튼).
    * 모달: 주식 매수/매도 모달, 예금 가입/해지 모달, 펀드 제안/투자 모달, 경제 읽기/타자/뉴스 모달.

* **BankerPage (은행원 업무 창구)**
  * **주요 목적**: 은행원 학생이 오프라인 거래를 디지털 장부에 입력.
  * **주요 UI 요소**: 탭(입/출금, 주식 거래소 시세 관리, 예금 상품 관리), 학생 빠른 검색 및 금액 키패드.

* **MartPage (학급 마트 POS 창구)**
  * **주요 목적**: 학급 물품 판매 시 학생 잔액 확인 및 신속한 결제 처리.
  * **주요 UI 요소**: 학생 선택 그리드, 결제 금액 입력 패드, 최근 판매 내역 리스트, 결제 완료 영수증 모달.

* **공통 모달 (Modals)**:
  * `EconomyReadingModal`: 29가지 실생활 경제 지식 및 금융 사기 예방 카드뉴스 뷰어.
  * `EconomyTypingModal`: 50개 주요 경제/금융 필수 용어 타자 연습기 (WPM, 정확도 측정).
  * `EconomyNewsModal`: 외부 어린이 경제 뉴스 서비스 임베드/연동.
  * `ConfirmModal` & `MessageModal`: 비가역적 금융 거래 및 삭제 방지용 확인 창.

---

# 4. TECH STACK

* **React 18.2.0**: SPA 기반 컴포넌트 아키텍처 및 상태 관리.
* **TypeScript (~5.8.2)**: 엔터프라이즈급 금융 데이터 타입 안정성 및 인터페이스 보장.
* **Vite (^6.2.0)**: 고속 번들링 및 최적화된 프론트엔드 빌드 환경.
* **Tailwind CSS**: 유틸리티 기반 고품질 모바일 퍼스트 반응형 스타일링.
* **@supabase/supabase-js (2.39.8)**:
  * PostgreSQL 데이터베이스 연동.
  * Row Level Security (RLS) 및 RPC(`SECURITY DEFINER`) 기반 원자적 SQL 트랜잭션.
* **recharts (2.10.3)**: 주식 시세 차트 및 자산 변동 추이 인터랙티브 데이터 시각화.
* **qrcode.react (3.1.0)**: 학생별 고유 로그인 토큰 및 송금용 QR 코드 SVG 렌더링.
* **html2canvas (^1.4.1)**: QR 통장 명함 및 영수증 캡처/다운로드 지원.
* **motion (^12.42.2)**: 탭 전환, 모달 등장, 자산 증감 시 부드러운 UI 마이크로 인터랙션.
* **LocalStorage / SessionStorage**: 오프라인 게스트 모드 저장소 및 다중 탭 로그인 세션 분리.

---

# 5. SYSTEM ARCHITECTURE

```
+-----------------------------------------------------------------------+
|                            Client (Browser)                           |
|  [AuthContext]  ──>  [Pages (Teacher / Student / Banker / Mart)]     |
|         │                                    │                        |
|         ▼                                    ▼                        |
|  [Guest Mode DB] (LocalStorage)    [API Layer (services/api.ts)]      |
+-----------------------------------------------------------------------+
                                               │
                                 HTTPS / WSS   │  (RPC & REST)
                                               ▼
+-----------------------------------------------------------------------+
|                           Supabase Backend                            |
|  [PostgreSQL Database]                                                |
|    ├── Tables: users, accounts, transactions, stocks, savings,        |
|    │           funds, taxes, jobs, donations                          |
|    └── Stored Procedures (PL/pgSQL with SECURITY DEFINER):            |
|          - transfer_money (원자적 이체)                                |
|          - buy_stock / sell_stock (주식 매매 및 잔액 갱신)            |
|          - join_savings / cancel_savings (예금 원리금 정산)            |
|          - join_fund / settle_fund (펀드 투자 및 배당)                |
|          - pay_tax (세금 납부 및 국고 입금)                           |
|          - get_teacher_public_info (보안 토큰 기반 교사 정보 조회)    |
+-----------------------------------------------------------------------+
```

* **Authoritative State 위치**:
  * **실제 운영 모드**: Supabase PostgreSQL 서버가 원장(Ledger)의 단일 진실 공급원(Single Source of Truth)으로 동작. 모든 금융 잔액 변경은 클라이언트 조작을 방지하기 위해 서버사이드 RPC 함수에서 수행.
  * **게스트 모드**: `guestDb.ts`가 브라우저 메모리 및 로컬스토리지에 격리된 모의 DB를 유지.
* **화면 간 역할 분리**:
  * 하나의 통합 코드베이스에서 유저의 Role(`Role.TEACHER`, `Role.STUDENT`, `Role.BANKER`, `Role.MART`)에 따라 권한 및 접근 가능한 View를 엄격히 분기.

---

# 6. NETWORK ARCHITECTURE

* **통신 프로토콜**: HTTPS 기반 Supabase REST API & RPC 호출.
* **방/학급 참가 방식 (Join Mechanism)**:
  * **방법 1 (QR 코드)**: `https://[Domain]/?token=[QR_TOKEN]` URL 파라미터 기반 자동 인증.
  * **방법 2 (학급 코드 간편 로그인)**: 교사가 발급한 학급 고유 코드(예: `2026`, `5-1`)와 출석번호/이름 조합.
* **토큰 및 세션 관리**:
  * 브라우저 종료 시 공용 기기 보안을 위해 `sessionStorage`를 우선 사용 (`class_bank_user_id`).
  * QR 로그인 완료 후 URL 주소창에서 토큰 파라미터를 즉시 제거(`history.replaceState`)하여 브라우저 새로고침 시 토큰 중복 처리 및 URL 노출 방지.
* **오류 복구 및 재접속**:
  * 네트워크 일시 단절 시 Supabase SDK의 지수 백오프 자동 재시도 적용.
  * 오류 발생 시 명확한 한국어 에러 메시지(PGRST 코드 매핑)를 모달로 노출.

---

# 7. STATE & DATA MODEL

## 7.1 주요 TypeScript 인터페이스

```typescript
// 유저 모델
export interface User {
  userId: string;
  name: string;
  role: Role; // 'teacher' | 'student' | 'mart' | 'stock' | 'banker'
  grade?: number;
  class?: number;
  number?: number;
  teacher_id?: string;
  teacherAlias?: string;
  currencyUnit?: string;
  classCode?: string;
}

// 계좌 모델
export interface Account {
  id: string;
  accountId: string;
  userId: string;
  balance: number;
  qrToken?: string;
  teacher_id: string;
  account_type?: 'personal' | 'treasury' | 'mart';
}

// 거래 내역 모델
export interface Transaction {
  transactionId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  senderId?: string;
  receiverId?: string;
  teacher_id: string;
}

// 펀드 모델
export interface Fund {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName?: string;
  teacher_id: string;
  unitPrice: number;
  targetAmount: number;
  baseReward: number;
  incentiveReward: number;
  recruitmentDeadline: string;
  maturityDate: string;
  status: FundStatus; // 'RECRUITING' | 'ONGOING' | 'SUCCESS' | 'EXCEED' | 'FAIL'
}
```

## 7.2 데이터 보존 정책
* **Supabase PostgreSQL**: 유저, 계좌 잔액, 모든 거래 내역, 주식/예금/펀드/세금 데이터 영구 보존.
* **SessionStorage**: 현재 로그인된 세션 ID (`class_bank_user_id`).
* **LocalStorage**: 게스트 모드 체험 데이터 (`guest_mock_db_*`).

---

# 8. GAME / SERVICE LOGIC

## 8.1 핵심 비즈니스 로직

1. **원자적 이체 (Atomic Transfer)**:
   * 송금자 계좌 잔액 검증 ($Balance \ge Amount$).
   * 송금자 계좌 차감 및 수취인 계좌 증액을 단일 SQL 트랜잭션에서 실행.
   * 송금자와 수취인 양쪽에 상응하는 `Transaction` 레코드 생성.

2. **주식 매매 및 가격 변동 메커니즘**:
   * 매수: $TotalCost = Price \times Quantity$. 계좌 잔액 차감 후 `student_stocks`에 수량 및 평단가 기록.
   * 매도: $Revenue = (Price \times Quantity) \times (1 - FeeRate)$. 원금+수익금 입금 후 보유 수량 차감.
   * 주가 갱신: 교사/은행원이 주가를 변경하면 `stock_history`에 타임스탬프와 함께 기록되어 Recharts 차트에 반영.

3. **예금(Savings) 이자 계산 로직**:
   * 만기 해지: $Payout = Principal \times (1 + Rate)$.
   * 중도 해지: $Payout = Principal \times (1 + CancellationRate)$.
   * 정산 시 국고 계좌에서 이자분을 지급하고 학생 계좌로 입금.

4. **프로젝트 펀드 정산 로직**:
   * **SUCCESS (달성)**: 1좌당 $\text{단가} + \text{기본보상}$ 지급 + 제안자에게 총 모금액의 10% 보너스 지급.
   * **EXCEED (초과달성)**: 1좌당 $\text{단가} + \text{기본보상} + \text{추가인센티브}$ 지급 + 제안자 10% 보너스.
   * **FAIL (실패)**: 1좌당 $\text{단가} - \text{위약보상}$ 차감 후 잔여 원금 반환.

5. **세금(Tax) 징수 및 국고 귀속**:
   * 교사가 세금 항목 생성 시 대상 학생들의 `tax_recipients` 레코드 생성.
   * 학생이 납부 버튼 클릭 시 학생 계좌에서 차감되어 학급 국고(Treasury) 계좌로 자동 입금.

---

# 9. UI / UX DECISIONS

* **토스(Toss) / 카카오뱅크 스타일의 모바일 퍼스트 핀테크 UI**:
  * 라운드 코너(`rounded-[24px]`, `rounded-[32px]`), 깔끔한 고대비 컬러 팔레트(`bg-[#F2F4F7]`, 토스 블루 `#0066FF`).
  * 학생들이 실제 금융 앱을 사용하는 듯한 몰입감 제공.
* **1인 1태블릿 및 교실 원거리 가시성 최적화**:
  * 전자칠판에서 전체 학급 통계를 볼 때 시인성을 확보하도록 큰 타이포그래피와 명확한 아이콘 배치.
  * 터치 조작이 편리하도록 모든 버튼의 최소 높이를 48px 이상으로 설계.
* **휴먼 에러 방지 (Fail-safe)**:
  * 송금, 주식 전량 매도, 예금 해지, 학생 삭제, 세금 일괄 부과 등 중요 작업 시 반드시 확인 모달(`ConfirmModal`)을 거치도록 설계.
  * 금액 입력 필드에 '전액', '1만', '5만' 등 퀵 버튼 제공.
* **학생 개인정보 보호 및 익명성**:
  * 학생은 이메일이나 주민번호 없이 학급 번호와 이름으로만 등록.
  * 비밀번호 분실 시 교사 관리자 화면에서 즉시 1클릭 초기화 가능.

---

# 10. ASSET & AUDIO STRUCTURE

* **아이콘 시스템**: `components/icons.tsx` 내에 최적화된 SVG 기반 자체 아이콘 세트 (TailwindLabs 및 Lucide 기반 벡터 아이콘) 탑재. 번들 크기 최소화 및 렌더링 성능 극대화.
* **폰트 구성 (`index.html`)**:
  * 메인 로고 및 헤더: 감성적인 `'Gamja Flower'` 웹폰트.
  * 본문 및 데이터: 가독성이 뛰어난 `'Noto Sans KR'` (400, 500, 700, 900 굵기).
* **오디오/효과음**: 공공 교실 환경의 특성(스피커 간섭 방지)을 고려하여 소리 재생을 배제하고, 시각적 모션 애니메이션(`motion`)과 토스트 팝업으로 사용자 피드백을 전달.
* **이미지 에셋**: Unsplash의 안전한 교육/자연 이미지 URL 및 인라인 SVG 사용.

---

# 11. PROBLEMS ENCOUNTERED

## Problem 1: 펀드 가입 시 UUID 타입 불일치 에러
* **문제 현상**: 학생이 펀드 가입 버튼을 누르면 `invalid input syntax for type uuid: "권쌤은행 060103"` 에러 발생.
* **원인**: 초기 SQL 함수에서 계좌 ID 변수 타입을 `uuid`로 정의했으나, 실제 시스템의 계좌번호는 텍스트 포맷(`"교사별칭 000000"`)으로 저장되어 타입 캐스팅 실패.
* **처음 시도한 해결 방법**: 클라이언트에서 계좌 ID를 강제로 변환하려 시도함.
* **왜 충분하지 않았는지**: 서버사이드 Stored Procedure 내부에서 검증 및 업데이트가 실패하므로 DB 함수 수정 없이는 원천 해결 불가.
* **최종 해결 방법**: Supabase SQL의 `join_fund`, `settle_fund` 함수에서 계좌 ID 파라미터 및 변수 타입을 `uuid`에서 `text`로 변경하고 `SECURITY DEFINER` 권한 부여.
* **교훈**: 계좌번호처럼 사람이 읽을 수 있는 식별자를 사용할 경우 DB 컬럼 및 SQL 함수의 데이터 타입을 일관되게 `text`/`varchar`로 설계해야 함.

## Problem 2: 공용 태블릿 환경에서 다중 학생 세션 꼬임
* **문제 현상**: 태블릿을 여러 학생이 번갈아 사용할 때 이전 학생의 계정으로 자동 로그인되거나 캐시가 남음.
* **원인**: `localStorage`에 유저 ID를 영구 저장하여 브라우저 창을 닫아도 세션이 유지됨.
* **처음 시도한 해결 방법**: 로그아웃 버튼을 크게 배치하고 학생들에게 로그아웃을 교육함.
* **왜 충분하지 않았는지**: 저학년 학생들이 로그아웃을 잊고 창만 닫는 경우가 빈번함.
* **최종 해결 방법**: 세션 저장소를 `sessionStorage` 기반으로 변경하여 탭이나 브라우저 종료 시 자동 파기되도록 수정하고, 로그아웃 시 쿼리 파라미터(`/?mode=app`)를 통해 완벽히 상태를 리셋.
* **교훈**: 교실 공용 기기용 웹 서비스는 반드시 `sessionStorage`를 기본 세션 저장소로 사용해야 함.

## Problem 3: 다중 교사 간 데이터 격리 (Multi-tenancy) 누락
* **문제 현상**: 여러 교사가 가입했을 때 타 학급 학생이나 주식 종목이 섞여 보이는 잠재적 위험.
* **원인**: 테이블 조회 쿼리에 `teacher_id` 필터링이 누락된 엔드포인트 존재.
* **최종 해결 방법**: 모든 주요 테이블(`accounts`, `transactions`, `jobs`, `stocks`, `savings`, `funds`, `taxes`, `donations`)에 `teacher_id` 컬럼을 필수 외래키로 추가하고, RLS 정책 및 API 계층에서 `eq('teacher_id', teacherId)`를 강제 적용.
* **교훈**: 학급 기반 서비스는 초기 기획 단계부터 완벽한 Multi-tenant ID 격리 구조를 수립해야 함.

---

# 12. IMPORTANT CHANGE HISTORY

## Change 1: 단일 관리자 모드에서 '4대 역할 분리 시스템'으로 확장
* **Initial**: 교사 로그인 시 오직 종합 관리자 화면만 제공됨.
* **Changed To**: 교사 로그인 시 `RoleSelectionPage`를 거쳐 [교사 관리자], [은행원 모드], [마트 POS 모드], [학생 시점 뷰어]를 자유롭게 넘나들도록 개편.
* **Reason**: 교실에서 은행원 학생이나 마트 학생 역할을 교사 기기로 대행하거나 시연해야 할 필요성 대두.
* **Final Status**: 확정 구현 완료.

## Change 2: 오프라인 게스트 체험 모드 (Zero-Config Trial) 도입
* **Initial**: 반드시 Supabase 회원가입 및 DB 연결이 되어야만 서비스 테스트 가능.
* **Changed To**: 로그인 화면에서 '게스트 체험' 버튼 클릭 시 `guestDb.ts`를 통해 가상 학급(은하쌤 학급) 데이터가 로컬에 즉시 주입되어 모든 기능 체험 가능.
* **Reason**: 가입 절차 없이 교사들이 서비스의 유용성을 10초 만에 확인하고 도입을 결정할 수 있도록 지원.
* **Final Status**: 확정 구현 완료.

## Change 3: 개인정보 처리방침 및 안내 문구 내 개인 연락처 제거
* **Initial**: 서비스 안내 및 이용약관에 개발자 개인 이메일이 포함되어 있었음.
* **Changed To**: 개인 연락처를 완전히 제거하고 운영팀 표준 안내 체계로 통일.
* **Reason**: 보안 및 배포 환경 최적화.
* **Final Status**: 확정 구현 완료.

---

# 13. REUSABLE PATTERNS

## 1. QR Code Direct Auth Pattern (QR 원클릭 자동 로그인 패턴)
* **목적**: 키보드 입력이 서툰 초등 저학년 학생들의 1초 접속 보장.
* **적용 조건**: 사용자별 고유 토큰이 사전에 안전하게 생성되어 인쇄물(통장, 이름표)로 배부될 수 있는 환경.
* **핵심 구조**: URL `?token=...` 감지 $\rightarrow$ `api.loginWithQrToken(token)` 검증 $\rightarrow$ 로그인 성공 시 `window.history.replaceState`로 URL 클린업.
* **장점**: 아이디/비밀번호 암기 불필요, 로그인 실패율 0%.

## 2. Ledger-Based Transaction Pattern (원장 기반 금융 거래 패턴)
* **목적**: 데이터 부정 정합 방지 및 완벽한 감사 로그(Audit Trail) 확보.
* **핵심 구조**: 잔액을 직접 변경하지 않고, 모든 변화(급여, 송금, 주식, 마트, 세금)를 `Transaction` 테이블에 INSERT하는 동시에 Stored Procedure를 통해 원자적(Atomic)으로 계좌 잔액을 계산/업데이트.

## 3. Dual Engine Architecture (Supabase + Local Mock DB)
* **목적**: 클라우드 DB 연동 환경과 제로 구성(Zero-configuration) 오프라인 체험 환경 동시 지원.
* **핵심 구조**: `api.ts`와 `guestDb.ts`가 동일한 TypeScript 인터페이스를 공유하며, 세션 플래그(`isGuestSession()`)에 따라 투명하게 전환.

---

# 14. SERVICE-SPECIFIC ELEMENTS

* **학급 맞춤형 화폐 단위 (`currencyUnit`)**: 표준 통화(KRW/USD)가 아닌 교사가 설정한 '톨', '냥', '골드' 등 임의의 문자열이 전 UI에 동적으로 주입되는 구조.
* **직업 월급 및 인센티브 지급기**: 학급 1인 1직업 활동과 연동되어 클릭 한 번으로 전교생 직업 계좌에 급여 입금.
* **학급 마트 POS 모드**: 바코드 스캐너 없이 학생 명단을 터치하여 즉석 결제하는 학급 맞춤형 계산대 인터페이스.

---

# 15. DO NOT REPEAT

* **브라우저 기본 `alert()` / `confirm()` 사용 금지**:
  * 이유: iframe 내부나 모바일 웹뷰에서 차단되거나 디자인 일관성을 해침. 반드시 커스텀 `ConfirmModal`, `MessageModal`을 사용할 것.
* **클라이언트 사이드 금융 계산 및 다중 REST 호출 금지**:
  * 이유: 송금 시 A 계좌 차감 후 B 계좌 증액 과정에서 네트워크가 끊기면 돈이 증발하는 치명적 오류 발생. 반드시 SQL 함수(`SECURITY DEFINER`) 단일 트랜잭션으로 처리할 것.
* **UUID 타입의 무분별한 남용 주의**:
  * 이유: 사람이 읽고 입력해야 하는 학급 코드, 계좌번호, 학생 식별 번호 등은 `text` 타입을 사용하여 타입 캐스팅 오류를 방지할 것.

---

# 16. CLASSROOM / REAL-WORLD LESSONS

* **학생 비밀번호 분실은 일상적인 사건**: 학생 비밀번호 찾기 질문을 복잡하게 만드는 대신, 교사가 대시보드에서 1클릭으로 임시 비밀번호를 발급하거나 QR코드를 재인쇄해 주는 것이 교실 운영상 훨씬 효율적임.
* **주식 시장의 투기 방지**: 학생들이 수업 시간에 주식 단타에만 몰입하는 부작용을 막기 위해 매도 수수료 부과 및 하루 주가 변동 횟수 제한 로직이 교육적으로 매우 유효함.
* **시각적 통장 명함 인쇄 기능의 필수성**: 학년 초 교사가 학생들에게 나눠줄 수 있는 명함 형태의 실물 QR 통장 인쇄(`html2canvas` + CSS Print Media) 기능이 서비스 만족도에 결정적 기여를 함.

---

# 17. GGDS CANDIDATES

### 1. Zero-Key Dual Execution (MUST)
* **등급**: MUST
* **이유**: 사용자가 외부 API 키나 DB 설정을 완료하지 않아도 즉시 전체 UI와 기능을 테스트할 수 있는 게스트/목 데이터 엔진을 반드시 내장해야 함.

### 2. Atomic Ledger Transaction Standard (MUST)
* **등급**: MUST
* **이유**: 점수, 화폐, 아이템 등 가치가 이전되는 모든 게임/교육 서비스는 클라이언트 연산 대신 원자적 단일 트랜잭션을 보장해야 함.

### 3. QR-First Seamless Onboarding (SHOULD)
* **등급**: SHOULD
* **이유**: 교육용 및 다중 사용자 환경에서 텍스트 입력 없이 카메라 스캔만으로 참여 가능한 QR 인증 체계를 표준으로 갖추어야 함.

### 4. Role-Hub Navigation Architecture (OPTIONAL)
* **등급**: OPTIONAL
* **이유**: 관리자가 플레이어, 심판, 상점 등 다중 역할을 번갈아 시연해야 하는 복합 교육 시뮬레이션에서 허브 네비게이션을 제공할 것.

---

# 18. FINAL IMPLEMENTATION STATUS

* **정상 구현됨 (Fully Implemented)**:
  * 교사/학생 계정 및 인증 (이메일, QR 토큰, 학급코드 간편 로그인).
  * 교사 4대 역할 전환 허브 (`RoleSelectionPage`).
  * 교사 관리 대시보드 (학생 관리, QR 명함 인쇄, 직업/월급, 세금 부과/징수, 통계 알림).
  * 학생 핀테크 메인 (자산 조회, 학생 간 실시간 송금, 미납 세금 납부).
  * 주식 거래소 (종목 상장, Recharts 주가 차트, 매수/매도, 수수료).
  * 예금 시스템 (정기 예금 가입, 중도 해지, 만기 이자 정산).
  * 크라우드 펀딩 (학생 펀드 제안, 투자 모집, 교사 정산 및 보너스).
  * 학급 마트 POS (학생 선택 결제, 잔액 검증, 영수증 출력).
  * 기부 모금함 (모금 개설, 실시간 게이지, 국고 연동).
  * 교육 부가 모달 (경제 카드뉴스, 경제 타자 연습기, 어린이 경제 뉴스 연동).
  * 게스트 체험 모드 (Supabase 미연결 시에도 동작하는 로컬 가상 DB 엔진).
* **제거됨 (Cleaned up)**:
  * 개인정보처리방침 및 비밀번호 찾기 화면의 개인 연락처(이메일).

---

# 19. FINAL REFERENCE SUMMARY

* **가장 중요한 기술 구조**: Supabase PostgreSQL의 `SECURITY DEFINER` RPC 기반 원자적 금융 원장 시스템 + 오프라인 로컬 Mock DB의 듀얼 아키텍처.
* **가장 중요한 UX 원칙**: 모바일 퍼스트 핀테크(토스 스타일) UI 디자인과 초등 저학년도 1초 만에 진입할 수 있는 QR 코드 기반 제로 텍스트 온보딩.
* **가장 가치 있는 재사용 패턴**: QR Code Direct Auth Pattern, Atomic Ledger Transaction Pattern, Zero-Config Guest Trial Pattern.
* **가장 중요한 실패 사례**: 클라이언트-서버 간 계좌번호 데이터 타입(UUID vs String) 불일치로 인한 RPC 트랜잭션 에러 (DB 레벨의 유연한 Text 타입 설계로 해결).
* **이 서비스를 레퍼런스로 사용하기 좋은 상황**: 학급 경제 시뮬레이션, 포인트/토큰 기반 게이미피케이션 플랫폼, 학생 자치 활동 관리 시스템, 가상 주식/크라우드펀딩 교육 앱.
* **다른 서비스에 복사하면 안 되는 고유 요소**: 학급 전용 화폐 단위(`currencyUnit`) 주입 로직 및 초등 교육과정 맞춤형 직업/세금/마트 POS 규칙.
