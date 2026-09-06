export function newsMonthRange(offset: number, now = new Date()) {
  const korea = new Date(now.getTime() + 9 * 3600000);
  const year = korea.getUTCFullYear(), month = korea.getUTCMonth() + offset;
  const start = new Date(Date.UTC(year, month, 1) - 9 * 3600000);
  const end = new Date(Date.UTC(year, month + 1, 1) - 9 * 3600000);
  const label = new Date(start.getTime() + 9 * 3600000);
  return { start, end, label: `${label.getUTCFullYear()}년 ${label.getUTCMonth() + 1}월` };
}
export function monthlyNewsActivity<T extends { userId: string | null; created_at: string }>(comments: T[], studentIds: string[], range: {start: Date; end: Date}) {
  const roster = new Set(studentIds);
  const monthly = comments.filter(c => c.userId && roster.has(c.userId) && Date.parse(c.created_at) >= range.start.getTime() && Date.parse(c.created_at) < range.end.getTime()).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
  const participants = new Set(monthly.map(c=>c.userId!));
  return {monthly, participants, absent: studentIds.filter(id=>!participants.has(id))};
}
export function newsErrorMessage(raw: string) {
  if (/UNAVAILABLE|high demand|\b503\b/.test(raw)) return 'AI 모델 서버의 요청이 일시적으로 몰리고 있습니다. 잠시 후 다시 시도해주세요. API 키를 다시 입력할 필요는 없습니다.';
  if (/API_KEY_INVALID|API key not valid/.test(raw)) return 'Gemini API 키가 유효하지 않습니다. Supabase Secrets의 GEMINI_API_KEY를 확인해주세요.';
  if (raw.includes('prepayment credits are depleted')) return 'Gemini 선불 크레딧이 소진되었습니다. Google AI Studio 결제 설정을 확인해주세요.';
  if (/RESOURCE_EXHAUSTED|\b429\b/.test(raw)) return 'Gemini 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 프로젝트 사용 한도를 확인해주세요.';
  return raw;
}
