// This development copy must never be pointed at the original production backend.
export const TEST_PROJECT_REF = 'hoktiaduvzoaeapymuqw';
export const TEST_SUPABASE_URL = `https://${TEST_PROJECT_REF}.supabase.co`;

export function validateTestProjectUrl(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); }
  catch { throw new Error('테스트 Supabase URL이 올바르지 않습니다.'); }
  if (parsed.origin !== TEST_SUPABASE_URL || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`운영 DB 보호: 이 개발본은 ${TEST_PROJECT_REF} 테스트 프로젝트에만 연결할 수 있습니다.`);
  }
  return TEST_SUPABASE_URL;
}
