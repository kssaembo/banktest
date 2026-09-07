// This migration build is locked to the restored ClassBank project.
export const TEST_PROJECT_REF = 'xjgvhmlxrqsuwtidooyp';
export const TEST_SUPABASE_URL = `https://${TEST_PROJECT_REF}.supabase.co`;

export function validateTestProjectUrl(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); }
  catch { throw new Error('테스트 Supabase URL이 올바르지 않습니다.'); }
  if (parsed.origin !== TEST_SUPABASE_URL || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`DB 보호: 이 빌드는 ${TEST_PROJECT_REF} 프로젝트에만 연결할 수 있습니다.`);
  }
  return TEST_SUPABASE_URL;
}
