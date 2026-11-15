import type { RealEstateContract } from '../types';

const safe = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character] || character));

export const downloadText = (name: string, contents: string, type = 'text/csv;charset=utf-8') => {
  const blob = new Blob(['\uFEFF', contents], { type });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
};

export const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const readCsvFile = async (file: File): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = '';
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // 한셀은 CSV를 CP949로 다시 저장하는 경우가 많습니다. WHATWG의 euc-kr 디코더는 CP949도 처리합니다.
    text = new TextDecoder('euc-kr').decode(bytes);
  }
  return text.replace(/^\uFEFF/, '');
};

const detectDelimiter = (text: string) => {
  const firstRecord = text.split(/\r?\n/).find(line => line.trim()) || '';
  const candidates = [',', '\t', ';'];
  let quoted = false;
  const counts = Object.fromEntries(candidates.map(candidate => [candidate, 0])) as Record<string, number>;
  for (let index = 0; index < firstRecord.length; index += 1) {
    const character = firstRecord[index];
    if (character === '"' && quoted && firstRecord[index + 1] === '"') index += 1;
    else if (character === '"') quoted = !quoted;
    else if (!quoted && candidates.includes(character)) counts[character] += 1;
  }
  return candidates.sort((left, right) => counts[right] - counts[left])[0];
};

export const parseCsv = (text: string): string[][] => {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
    } else cell += character;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
};

export const printRealEstateContract = (contract: RealEstateContract, currencyUnit = '권') => {
  const labels = { sale: '매매', jeonse: '전세', monthly_rent: '월세' } as const;
  const roles = { owner: '소유자', tenant: '임차인', buyer: '매수인', seller: '매도인' } as const;
  const statuses = { active: '계약중', ended: '종료', cancelled: '취소' } as const;
  const oppositeRole = contract.studentRole === 'buyer' ? 'seller' : contract.studentRole === 'seller' ? 'buyer' : contract.studentRole === 'tenant' ? 'owner' : 'tenant';
  // noopener 옵션을 window.open에 직접 넣으면 일부 브라우저가 창 객체를 null로 돌려주므로, 연 뒤 opener를 끊습니다.
  const popup = window.open('about:blank', '_blank', 'width=900,height=1000');
  if (!popup) throw new Error('계약서를 열 수 없습니다. 팝업 허용 상태를 확인해 주세요.');
  try { popup.opener = null; } catch { /* 브라우저별 보안 제한은 무시합니다. */ }
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>부동산 계약서</title>
  <style>body{font-family:Arial,"Noto Sans KR",sans-serif;color:#172033;padding:40px}h1{text-align:center;margin-bottom:30px}.meta{display:grid;grid-template-columns:1fr 1fr;border:2px solid #22395d}.meta div{padding:14px;border:1px solid #b8c4d5}.label{display:block;color:#60708a;font-size:12px;margin-bottom:5px}.terms{margin-top:22px;border:1px solid #b8c4d5;padding:18px;min-height:120px}.sign{margin-top:60px;text-align:right}@media print{button{display:none}}</style>
  </head><body><h1>Class Bank 부동산 계약서</h1><div class="meta">
  <div><span class="label">계약 종류</span>${safe(labels[contract.contractType])}</div>
  <div><span class="label">계약 상태</span>${safe(statuses[contract.status])}</div>
  <div><span class="label">학생 1</span>${safe(contract.studentName)} (${safe(roles[contract.studentRole])})</div>
  <div><span class="label">학생 2</span>${contract.counterpartyName ? `${safe(contract.counterpartyName)} (${safe(roles[oppositeRole])})` : '없음'}</div>
  <div><span class="label">부동산명</span>${safe(contract.propertyName)}</div>
  <div><span class="label">소재지</span>${safe(contract.address)}</div>
  <div><span class="label">거래 금액</span>${safe(contract.transactionAmount.toLocaleString())}${safe(currencyUnit)}</div>
  <div><span class="label">보증금 / 월세</span>${safe(contract.deposit.toLocaleString())}${safe(currencyUnit)} / ${safe(contract.monthlyRent.toLocaleString())}${safe(currencyUnit)}</div>
  <div><span class="label">계약일</span>${safe(contract.contractDate)}</div>
  <div><span class="label">계약 기간</span>${safe(contract.startDate || '-')} ~ ${safe(contract.endDate || '-')}</div></div>
  <div class="terms"><span class="label">특약사항</span>${safe(contract.specialTerms || '없음')}</div>
  <div class="sign">위 계약 내용을 확인합니다.<br><br>${safe(contract.studentName)} (서명)${contract.counterpartyName ? `&nbsp;&nbsp;&nbsp;&nbsp;${safe(contract.counterpartyName)} (서명)` : ''}</div>
  <button onclick="window.print()">PDF로 저장 / 인쇄</button></body></html>`);
  popup.document.close();
  popup.focus();
};
