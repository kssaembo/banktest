
# Class Bank — 별도 개발본

최신 `class-bank.zip`의 화면·이미지·데이터 호출 계약을 보존한 개발 프로젝트입니다.
기존 운영 사이트는 https://economy-rho.vercel.app/ 이며, 이 폴더는 운영 저장소에 연결되어 있지 않습니다.

현재 개발본은 사용자 확인을 받은 **`hoktiaduvzoaeapymuqw` 테스트 Supabase에만 연결할 수 있습니다.**
다른 프로젝트 URL은 클라이언트 생성 전에 거부합니다. 원본 운영 URL로 다시 연결하는 기능은 허용하지 않았습니다.
기존 경제뉴스 iframe도 가상/테스트 DB 모드 모두에서 차단합니다.
DB 설치 파일은 상위 폴더의 `database-test`에 있습니다. 01번은 구조, 02번은 가상 데이터,
03번은 Authentication에 만든 관리자 1명의 접근을 설정합니다. `database-test/03-README.md`를 따르세요.
Supabase 모드에서는 테스트 관리자 입장 후 기존 교사·학생 로그인 화면이 표시됩니다.
03번 SQL의 권한은 가상 DB 전체를 시험하는 관리자 권한이며 운영 학생별 권한 체계가 아닙니다.
원격 Supabase 연결 및 브라우저 기능 검증은 아직 완료되지 않았습니다.

학생 QR이 Vercel의 보호된 미리보기 주소를 가리키지 않도록 새 Vercel 프로젝트에
`VITE_PUBLIC_APP_URL=https://banktest-taupe.vercel.app`을 설정합니다. 경제뉴스는 앱 안에 통합되어
직접 기사 등록·열람·의견 등록이 가능합니다. AI 추천·요약은 `supabase/functions` 배포와
Supabase 서버 비밀값 설정 후 활성화됩니다. Gemini나 Naver 비밀키를 Vite 환경변수에 넣으면 안 됩니다.

## 시작하기

Node.js 22 이상에서 다음을 실행합니다.

```sh
npm ci
npm run dev
```

기본값은 **가상 학급**입니다. 환경변수나 Supabase 계정 없이 교사 또는 학생을 선택할 수 있습니다.
변경한 가상 데이터는 탭의 `sessionStorage`에 저장됩니다. 탭을 닫으면 일반적으로 사라집니다.
브라우저 세션 복원으로 남아 있을 수 있으므로 초기화하려면 해당 사이트의 세션 저장소를 비우세요.
실제 운영 데이터가 아니며 다중 사용자 공유·실제 인증을 제공하지 않습니다.

## 데이터 모드

| 설정 | 동작 |
|---|---|
| `VITE_DATA_MODE` 미설정 또는 `demo` | 가상 데이터 사용. Supabase 직접 접근도 차단 |
| `VITE_DATA_MODE=supabase` | 지정된 새 테스트 Supabase만 허용. 현재 DB 접근 권한은 별도 준비 중 |

개발본을 별도 Vercel 프로젝트에 올릴 때는 **`VITE_DATA_MODE=demo`만 설정하고 Supabase 키를 넣지 않습니다.**
`Production`이라는 Vercel 환경 이름이 반드시 현재 학생들이 쓰는 사이트를 의미하지는 않습니다.
새 프로젝트 자체의 Production도 처음에는 가상 학급으로 배포합니다.

실제 DB 연결을 검증하는 후속 단계에서만 `.env.local` 또는 별도 Vercel 프로젝트에 아래를 설정합니다.

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://hoktiaduvzoaeapymuqw.supabase.co
VITE_SUPABASE_ANON_KEY=새_테스트_프로젝트의_anon_키
```

Vite 환경변수는 빌드 시 반영되므로 수정 후 재빌드해야 합니다.
서비스 역할 키(`service_role`), DB 비밀번호를 `VITE_` 변수에 넣지 마세요.
같은 Supabase를 연결한 미리보기에서의 송금·삭제·급여 지급은 실제 운영 데이터 변경입니다.
동일 백엔드로의 기능 시험 전에 테스트 전용 학급의 격리와 서버 권한 정책을 확인해야 합니다.
가장 안전한 쓰기 시험은 별도 Supabase 프로젝트에 구조와 가상 데이터를 준비하는 방식입니다.

## 원본과의 차이

- 원본 `services/api.ts`는 `services/supabaseApi.ts`로 바이트 단위 보존했습니다.
- 새 `services/api.ts`는 빌드 설정에 따라 원본 API 또는 가상 API를 선택합니다.
- 키가 빠지거나 모드가 미설정된 개발본은 운영 DB에 자동 연결하지 않습니다.
- 가상 학급 진입 화면·가상 데이터 처리·구분 안내를 추가했습니다.
- 모든 개발본 모드에서 기존 경제뉴스 iframe을 로드하지 않습니다.
- 기존 Tailwind CDN 실행 대신 동일한 계열의 Tailwind 3 CSS를 빌드합니다.
- 기존 한국어 화면과 자산을 보존하고 HTML 언어를 한국어로 지정했습니다.
- Vercel 설정 및 GitHub 검증 워크플로를 추가했습니다. 자동 배포 설정은 없습니다.

원본 `REF_ClassBank.md`는 제작 당시 참고 문서입니다. 현 상태에 대한 기준은 이 README입니다.

## 가상 모드의 검증 한계

가상 모드는 화면과 기본 동작을 확인하기 위한 시뮬레이션입니다. 운영 SQL의 대체 구현이 아닙니다.
회원가입·비밀번호 복구/변경/확인·계정 탈퇴·이상 거래 분석은 서버 확인이 필요하다는 오류를 표시합니다.
외부 뉴스 연동도 별도 확인 대상입니다.
주식 수수료, 거래 제한, 펀드 제안자 보너스 등 세부 운영 규칙은 SQL 없이 동일성을 보장할 수 없습니다.
가상 주식은 매수가/매도가 그대로 정산하며 수수료를 적용하지 않습니다.
가상 급여는 같은 직업에 하루 한 번 지급합니다.
가상 예금은 `rate`/`cancellationRate`를 백분율로 적용합니다.
가상 펀드는 좌당 원금에 기본/추가 보상을 적용하고 실패 시 기본 보상만큼 차감합니다. 제안자 보너스는 미적용입니다.

운영 모드는 원본 함수 호출을 유지하므로 위 시뮬레이션 규칙을 운영 DB에 적용하지 않습니다.
기존 인증·권한·계좌 선택 문제 역시 이번 작업에서 수정하거나 검증한 것으로 간주하면 안 됩니다.

## 확인 명령

```sh
npm run lint
npm test
npm run build
```

자동 테스트는 가상 데이터에서만 실행하며 네트워크 호출 시 실패합니다.
실제 DB 접속·브라우저 상호작용 검증은 아직 수행하지 않았습니다.

## 별도 저장소와 Vercel 배포

1. 기존 저장소와 다른 새 GitHub 저장소를 준비합니다. 비공개 저장소를 권장합니다.
2. 이 폴더의 소스만 업로드합니다. `node_modules`, `dist`, `.npm-cache`, `.test-build`, `.env.local`은 제외합니다.
3. Vercel에서 **새 프로젝트**를 생성하여 새 저장소에 연결합니다.
4. Root Directory는 이 README와 `package.json`이 있는 위치로 지정합니다.
5. Framework는 Vite, Build Command는 `npm run build`, Output Directory는 `dist`입니다.
6. `VITE_DATA_MODE=demo`로 배포합니다. 기존 서비스 도메인을 이 프로젝트로 옮기지 않습니다.
7. 새 주소에서 화면을 확인한 뒤 DB 연결 검증을 별도 진행합니다.

현재 운영 브랜치는 기존 Vercel 프로젝트의 Settings → Environments → Production → Branch Tracking에서 확인합니다.
기존 프로젝트의 저장소·브랜치·도메인·환경변수를 변경할 필요가 없습니다.

## Supabase 자료 제공

SQL Editor의 과거 실행 이력 전체를 보내실 필요가 없습니다.
`docs/inspect-schema.sql`을 새 쿼리에 붙여 넣어 실행하고 결과를 JSON/CSV 파일로 내보내면 현재 public 스키마 정의를 검토할 수 있습니다.
이 쿼리는 시스템 카탈로그에 대한 SELECT만 수행하며 학생 명단·잔액·거래 데이터는 조회하지 않습니다.
함수 본문에 하드코딩한 비밀값이 있다면 공유 전에 가려야 합니다.
public 외의 앱 스키마, 예약 작업, Edge Functions, Storage 정책을 사용하면 별도로 알려주세요.
조회 결과는 복구 가능한 백업이 아닙니다. 운영 변경 전에는 데이터와 구조의 실제 백업 및 복구 방법이 별도로 필요합니다.

## 운영 전환 조건

- 원본/수정본에서 같은 테스트 시나리오 결과 비교
- DB 함수·RLS·권한 및 학급 격리 검토
- 로그인·QR·계좌·거래 내역·급여·세금·주식·예금·펀드·기부 확인
- 기존 QR 토큰과 URL 형식 유지 확인
- Vercel 이전 배포로 되돌리는 절차와 DB 복구 계획 확인
- 운영 전환은 별도 최종 단계로 진행. 이 프로젝트에는 운영 배포 자동화가 없음

프런트엔드 배포를 되돌려도 이미 변경한 DB 데이터나 SQL은 자동 복구되지 않습니다.
