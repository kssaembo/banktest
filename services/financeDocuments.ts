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

export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
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
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
  if (!popup) throw new Error('계약서를 열 수 없습니다. 팝업 허용 상태를 확인해 주세요.');
  popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>부동산 계약서</title>
  <style>body{font-family:Arial,"Noto Sans KR",sans-serif;color:#172033;padding:40px}h1{text-align:center;margin-bottom:30px}.meta{display:grid;grid-template-columns:1fr 1fr;border:2px solid #22395d}.meta div{padding:14px;border:1px solid #b8c4d5}.label{display:block;color:#60708a;font-size:12px;margin-bottom:5px}.terms{margin-top:22px;border:1px solid #b8c4d5;padding:18px;min-height:120px}.sign{margin-top:60px;text-align:right}@media print{button{display:none}}</style>
  </head><body><h1>Class Bank 부동산 계약서</h1><div class="meta">
  <div><span class="label">계약 종류</span>${safe(labels[contract.contractType])}</div>
  <div><span class="label">계약 상태</span>${safe(contract.status)}</div>
  <div><span class="label">학생</span>${safe(contract.studentName)}</div>
  <div><span class="label">학생 역할</span>${safe(contract.studentRole)}</div>
  <div><span class="label">부동산명</span>${safe(contract.propertyName)}</div>
  <div><span class="label">소재지</span>${safe(contract.address)}</div>
  <div><span class="label">거래 금액</span>${safe(contract.transactionAmount.toLocaleString())}${safe(currencyUnit)}</div>
  <div><span class="label">보증금 / 월세</span>${safe(contract.deposit.toLocaleString())}${safe(currencyUnit)} / ${safe(contract.monthlyRent.toLocaleString())}${safe(currencyUnit)}</div>
  <div><span class="label">계약일</span>${safe(contract.contractDate)}</div>
  <div><span class="label">계약 기간</span>${safe(contract.startDate || '-')} ~ ${safe(contract.endDate || '-')}</div></div>
  <div class="terms"><span class="label">특약사항</span>${safe(contract.specialTerms || '없음')}</div>
  <div class="sign">위 계약 내용을 확인합니다.<br><br>학생: ${safe(contract.studentName)} (서명)</div>
  <button onclick="window.print()">PDF로 저장 / 인쇄</button></body></html>`);
  popup.document.close();
};
