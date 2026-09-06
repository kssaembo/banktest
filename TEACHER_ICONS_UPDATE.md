# 교사·은행원 메뉴 아이콘 적용

제공된 teacher-tab-icons.zip의 원본 PNG 9개를 public/design/teacher-tabs에 포함했습니다.

| 파일 | 적용 메뉴 |
|---|---|
| teacher-dashboard.png | 교사 대시보드 |
| teacher-students.png | 학생 관리 |
| teacher-jobs.png | 직업 관리 |
| teacher-tax.png | 세금 관리 |
| teacher-funds.png | 펀드 관리 |
| teacher-donations.png | 기부 관리 |
| teacher-stocks.png | 교사 주식 관리 / 은행원 주식거래소 |
| teacher-savings.png | 은행원 예금 관리 |
| teacher-exchange.png | 은행원 입·출금 |

동일한 파랑·노랑 입체 스타일이며 현재 메뉴용 추가 이미지는 필요 없습니다. 교사·은행원 데스크톱과 모바일 메뉴에 적용했습니다. 학생 페이지와 작은 기능 버튼의 아이콘은 변경하지 않았습니다.
새 이미지를 다른 모양으로 재생성하거나 원본을 편집하지 않았으며 메뉴에는 동일한 contain 방식으로 표시합니다. 글자와 중복해서 읽히지 않도록 이미지는 장식용으로 처리했습니다.

타입 검사·배포 빌드 통과. 로컬 가상 환경에서 교사·은행원 메뉴 이미지가 모두 정상 로드되는 것을 확인했습니다. 기존 큰 번들 경고는 유지됩니다.
테스트 GitHub에 전체 ZIP 내용을 반영해 Vercel만 재배포하면 됩니다. SQL·Edge Function 수정은 필요 없습니다. 운영 DB 변경이나 외부 배포는 수행하지 않았습니다.
