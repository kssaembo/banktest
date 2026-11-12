import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { api } from '../services/api';
import { csvCell, downloadText, parseCsv, printRealEstateContract } from '../services/financeDocuments';
import { LoanContract, LoanContractInput, RealEstateContract, RealEstateContractInput, Role, User } from '../types';
import { FeatureGuide } from './FeatureGuide';

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
const card = 'rounded-2xl border border-blue-100 bg-white p-4 shadow-sm';
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400';

export const FinanceTabArtwork = ({ kind }: { kind: 'loan' | 'estate' }) => (
  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl" aria-hidden="true">{kind === 'loan' ? '🤝' : '🏠'}</span>
);

const Notice = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
    <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
      <p className="whitespace-pre-line font-bold text-slate-800">{message}</p>
      <button onClick={onClose} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-black text-white">확인</button>
    </div>
  </div>
);

const LoanForm = ({ students, initial, onCancel, onSave }: { students: User[]; initial?: LoanContract; onCancel: () => void; onSave: (input: LoanContractInput) => Promise<void> }) => {
  const [value, setValue] = useState<LoanContractInput>({
    studentUserId: initial?.studentUserId || students[0]?.userId || '', principal: initial?.principal || 100,
    interestRate: initial?.interestRate || 5, installmentCount: initial?.installmentCount || 4,
    installmentIntervalDays: initial?.installmentIntervalDays || 7, startDate: initial?.startDate?.slice(0, 10) || today(),
    specialTerms: initial?.specialTerms || ''
  });
  const [saving, setSaving] = useState(false);
  const totalInterest = Math.round(value.principal * value.interestRate) / 100;
  const total = Math.round((value.principal + totalInterest) * 10) / 10;
  const installment = value.installmentCount ? Math.round(total / value.installmentCount * 10) / 10 : 0;
  const setNumber = (key: keyof LoanContractInput, raw: string) => setValue(previous => ({ ...previous, [key]: Number(raw) }));
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
    <form onSubmit={async event => { event.preventDefault(); setSaving(true); try { await onSave(value); } finally { setSaving(false); } }} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-black text-slate-900">{initial ? '대출 계약 수정' : '새 대출 계약'}</h3><button type="button" onClick={onCancel} className="rounded-full bg-slate-100 px-3 py-1 font-bold">×</button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">학생<select required disabled={Boolean(initial)} value={value.studentUserId} onChange={event => setValue(v => ({ ...v, studentUserId: event.target.value }))} className={field}>{students.map(student => <option key={student.userId} value={student.userId}>{student.number}번 {student.name}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700">대출금액{initial?.status === 'active' && <small className="ml-1 text-amber-600">(지급 후 변경 불가)</small>}<input required disabled={initial?.status === 'active'} min="0.1" step="0.1" type="number" value={value.principal} onChange={e => setNumber('principal', e.target.value)} className={field}/></label>
        <label className="text-sm font-bold text-slate-700">총 이율(%)<input required min="0" step="0.1" type="number" value={value.interestRate} onChange={e => setNumber('interestRate', e.target.value)} className={field}/></label>
        <label className="text-sm font-bold text-slate-700">상환 횟수<input required min="1" max="60" type="number" value={value.installmentCount} onChange={e => setNumber('installmentCount', e.target.value)} className={field}/></label>
        <label className="text-sm font-bold text-slate-700">회차 간격(일)<input required min="1" max="365" type="number" value={value.installmentIntervalDays} onChange={e => setNumber('installmentIntervalDays', e.target.value)} className={field}/></label>
        <label className="text-sm font-bold text-slate-700">첫 납부 예정일<input required type="date" value={value.startDate} onChange={e => setValue(v => ({ ...v, startDate: e.target.value }))} className={field}/></label>
      </div>
      <label className="mt-4 block text-sm font-bold text-slate-700">특약사항<textarea value={value.specialTerms} onChange={e => setValue(v => ({ ...v, specialTerms: e.target.value }))} className={`${field} min-h-24`}/></label>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-blue-50 p-4 text-center"><div><small>총이자</small><strong className="block">{money(totalInterest)}</strong></div><div><small>총상환액</small><strong className="block">{money(total)}</strong></div><div><small>회차당 약</small><strong className="block">{money(installment)}</strong></div></div>
      <div className="mt-6 flex gap-3"><button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold">취소</button><button disabled={saving} className="flex-1 rounded-xl bg-blue-600 py-3 font-black text-white disabled:opacity-50">{saving ? '저장 중...' : '계약 저장'}</button></div>
    </form>
  </div>;
};

export const LoanManagement: React.FC = () => {
  const { currentUser } = useContext(AuthContext); const unit = currentUser?.currencyUnit || '권';
  const [students, setStudents] = useState<User[]>([]); const [loans, setLoans] = useState<LoanContract[]>([]);
  const [editing, setEditing] = useState<LoanContract | 'new' | null>(null); const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => { if (!currentUser) return; const [studentRows, loanRows] = await Promise.all([api.getUsersByRole(Role.STUDENT, currentUser.userId), api.getLoanContracts(currentUser.userId)]); setStudents(studentRows); setLoans(loanRows); }, [currentUser]);
  useEffect(() => { refresh().catch(error => setNotice(error.message)); }, [refresh]);
  const act = async (callback: () => Promise<string>) => { try { setNotice(await callback()); await refresh(); } catch (error: any) { setNotice(error.message || '처리하지 못했습니다.'); } };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><h2 className="text-2xl font-black">대출 관리</h2><FeatureGuide title="대출 관리 사용 안내" label="대출 관리 사용 안내" items={[{title:'계약을 만들어요',description:'금액·이율·회차를 입력하면 상환 고지서가 미리 만들어집니다.'},{title:'지급을 확인해요',description:'대출금 지급 버튼을 누른 계약만 학생에게 상환 고지서가 표시됩니다.'}]}/></div><button onClick={() => setEditing('new')} className="rounded-xl bg-blue-600 px-4 py-2.5 font-black text-white">+ 대출 계약</button></div>
    <div className="grid gap-3 lg:grid-cols-2">{loans.map(loan => <article key={loan.id} className={card}>
      <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">{loan.status === 'draft' ? '지급 전' : loan.status === 'active' ? '상환 중' : loan.status === 'repaid' ? '상환 완료' : '조기상환 대기'}</span><h3 className="mt-2 text-lg font-black">{loan.studentName} 학생 대출</h3></div><strong className="text-xl text-blue-700">{money(loan.principal)}{unit}</strong></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-xl bg-slate-50 p-2">총상환<strong className="block">{money(loan.totalRepayment)}</strong></div><div className="rounded-xl bg-slate-50 p-2">납부<strong className="block">{money(loan.paidAmount)}</strong></div><div className="rounded-xl bg-slate-50 p-2">남은 금액<strong className="block">{money(loan.remainingAmount)}</strong></div></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, loan.totalRepayment ? loan.paidAmount / loan.totalRepayment * 100 : 0)}%` }}/></div>
      <p className="mt-3 text-xs text-slate-500">총 이율 {loan.interestRate}% · {loan.installmentCount}회 · 첫 납부 {loan.startDate}</p>
      <div className="mt-4 flex flex-wrap gap-2">{loan.status === 'draft' && <><button onClick={() => setEditing(loan)} className="rounded-lg border px-3 py-2 text-sm font-bold">수정</button><button onClick={() => act(() => api.disburseLoan(currentUser!.userId, loan.id))} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white">대출금 지급</button></>}{loan.status === 'active' && <><button onClick={() => setEditing(loan)} className="rounded-lg border px-3 py-2 text-sm font-bold">향후 회차 수정</button><button onClick={() => act(() => api.requestEarlyLoanRepayment(currentUser!.userId, loan.id))} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-black text-amber-800">조기상환 고지</button></>}</div>
    </article>)}</div>
    {!loans.length && <div className={`${card} py-16 text-center text-slate-400`}>등록된 대출 계약이 없습니다.</div>}
    {editing && <LoanForm students={students} initial={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSave={async input => { if (!currentUser) return; if (editing === 'new') await api.createLoanContract(currentUser.userId, input); else await api.updateLoanContract(currentUser.userId, editing.id, input); setEditing(null); setNotice('대출 계약을 저장했습니다.'); await refresh(); }}/>}
    {notice && <Notice message={notice} onClose={() => setNotice('')}/>}
  </div>;
};

const emptyEstate = (studentId = ''): RealEstateContractInput => ({ studentUserId: studentId, contractType: 'sale', propertyName: '', address: '', studentRole: 'owner', transactionAmount: 0, deposit: 0, monthlyRent: 0, contractDate: today(), startDate: today(), endDate: '', specialTerms: '', status: 'active' });

export const RealEstateManagement: React.FC = () => {
  const { currentUser } = useContext(AuthContext); const unit = currentUser?.currencyUnit || '권'; const fileRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<User[]>([]); const [rows, setRows] = useState<RealEstateContract[]>([]); const [selected, setSelected] = useState<User | null>(null);
  const [editing, setEditing] = useState<RealEstateContract | 'new' | null>(null); const [form, setForm] = useState<RealEstateContractInput>(emptyEstate()); const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => { if (!currentUser) return; const [studentRows, contracts] = await Promise.all([api.getUsersByRole(Role.STUDENT, currentUser.userId), api.getRealEstateContracts(currentUser.userId)]); setStudents(studentRows); setRows(contracts); }, [currentUser]);
  useEffect(() => { refresh().catch(error => setNotice(error.message)); }, [refresh]);
  const openForm = (contract?: RealEstateContract) => { setEditing(contract || 'new'); setForm(contract ? { studentUserId: contract.studentUserId, contractType: contract.contractType, propertyName: contract.propertyName, address: contract.address, studentRole: contract.studentRole, transactionAmount: contract.transactionAmount, deposit: contract.deposit, monthlyRent: contract.monthlyRent, contractDate: contract.contractDate, startDate: contract.startDate, endDate: contract.endDate, specialTerms: contract.specialTerms, status: contract.status } : emptyEstate(selected?.userId || students[0]?.userId)); };
  const save = async () => { if (!currentUser) return; try { await api.saveRealEstateContract(currentUser.userId, form, editing === 'new' ? undefined : editing?.id); setEditing(null); setNotice('부동산 계약을 저장했습니다.'); await refresh(); } catch (error: any) { setNotice(error.message); } };
  const downloadTemplate = () => downloadText('classbank-real-estate-template.csv', ['studentUserId,contractType,propertyName,address,studentRole,transactionAmount,deposit,monthlyRent,contractDate,startDate,endDate,specialTerms,status', `${students[0]?.userId || ''},sale,교실마을 1호,교실 A구역,owner,1000,0,0,${today()},${today()},,특약 없음,active`].join('\n'));
  const upload = async (file: File) => {
    if (!currentUser) return;
    try {
      const parsed = parseCsv(await file.text()); const headers = parsed.shift() || [];
      const requiredHeaders = ['studentUserId','contractType','propertyName','address','studentRole','contractDate'];
      if (!requiredHeaders.every(header => headers.includes(header))) throw new Error('CSV 필수 열이 없습니다. 먼저 양식을 내려받아 작성해 주세요.');
      const inputs = parsed.map((values, rowIndex): RealEstateContractInput => {
        const data = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
        if (!students.some(student => student.userId === data.studentUserId)) throw new Error(`${rowIndex + 2}행의 학생을 찾을 수 없습니다.`);
        if (!['sale','jeonse','monthly_rent'].includes(data.contractType)) throw new Error(`${rowIndex + 2}행의 계약 종류가 올바르지 않습니다.`);
        if (!['owner','tenant','buyer','seller'].includes(data.studentRole || 'owner')) throw new Error(`${rowIndex + 2}행의 학생 역할이 올바르지 않습니다.`);
        if (!data.propertyName.trim() || !data.address.trim() || !data.contractDate) throw new Error(`${rowIndex + 2}행의 필수 내용을 확인해 주세요.`);
        const amounts = [Number(data.transactionAmount||0), Number(data.deposit||0), Number(data.monthlyRent||0)];
        if (amounts.some(amount => !Number.isFinite(amount) || amount < 0)) throw new Error(`${rowIndex + 2}행의 금액을 확인해 주세요.`);
        return { studentUserId:data.studentUserId, contractType:data.contractType as any, propertyName:data.propertyName, address:data.address, studentRole:(data.studentRole || 'owner') as any, transactionAmount:amounts[0], deposit:amounts[1], monthlyRent:amounts[2], contractDate:data.contractDate, startDate:data.startDate||undefined, endDate:data.endDate||undefined, specialTerms:data.specialTerms||'', status:(data.status||'active') as any };
      });
      for (const input of inputs) await api.saveRealEstateContract(currentUser.userId, input);
      setNotice(`${inputs.length}건의 계약을 등록했습니다.`); await refresh();
    } catch (error:any) { setNotice(error.message || 'CSV를 처리하지 못했습니다.'); }
    finally { if (fileRef.current) fileRef.current.value=''; }
  };
  const visible = selected ? rows.filter(row => row.studentUserId === selected.userId) : [];
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><h2 className="text-2xl font-black">부동산 관리</h2><FeatureGuide title="부동산 관리 사용 안내" label="부동산 관리 사용 안내" items={[{title:'학생을 선택해요',description:'학생별로 여러 매매·전세·월세 계약을 관리할 수 있습니다.'},{title:'계약서를 저장해요',description:'인쇄 화면에서 PDF로 저장할 수 있고 CSV 일괄 등록도 지원합니다.'}]}/></div><div className="flex flex-wrap gap-2"><button onClick={downloadTemplate} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">CSV 양식</button><button onClick={() => fileRef.current?.click()} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">CSV 업로드</button><input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={event => event.target.files?.[0] && upload(event.target.files[0])}/><button onClick={() => openForm()} className="rounded-xl bg-blue-600 px-4 py-2 font-black text-white">+ 계약 등록</button></div></div>
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{students.map(student => <button key={student.userId} onClick={() => setSelected(student)} className={`rounded-2xl border p-4 text-center transition ${selected?.userId===student.userId?'border-blue-500 bg-blue-50 shadow-md':'border-blue-100 bg-white hover:-translate-y-0.5'}`}><img src="/design/student-page/student-avatar-neutral.webp" alt="" className="mx-auto h-14 w-14 rounded-full"/><strong className="mt-2 block">{student.name}</strong><small className="text-slate-400">{rows.filter(row=>row.studentUserId===student.userId).length}건</small></button>)}</div>
    {selected && <div className={card}><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-black">{selected.name} 학생 계약</h3><button onClick={() => openForm()} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">+ 추가</button></div><div className="grid gap-3 md:grid-cols-2">{visible.map(contract => <article key={contract.id} className="rounded-2xl border p-4"><span className="text-xs font-black text-blue-600">{contract.contractType==='sale'?'매매':contract.contractType==='jeonse'?'전세':'월세'}</span><h4 className="mt-1 font-black">{contract.propertyName}</h4><p className="mt-1 text-sm text-slate-500">{contract.address}</p><div className="mt-3 flex gap-2"><button onClick={()=>openForm(contract)} className="rounded-lg border px-3 py-2 text-xs font-bold">수정</button><button onClick={()=>{try{printRealEstateContract(contract,unit);}catch(error:any){setNotice(error.message);}}} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white">계약서 PDF</button></div></article>)}</div>{!visible.length&&<p className="py-8 text-center text-slate-400">등록된 계약이 없습니다.</p>}</div>}
    {!selected && <div className={`${card} py-14 text-center text-slate-400`}>학생을 선택하면 계약 목록이 나타납니다.</div>}
    {editing && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6"><div className="mb-4 flex justify-between"><h3 className="text-xl font-black">부동산 계약</h3><button onClick={()=>setEditing(null)} className="rounded-full bg-slate-100 px-3">×</button></div><div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-bold">학생<select value={form.studentUserId} onChange={e=>setForm(v=>({...v,studentUserId:e.target.value}))} className={field}>{students.map(s=><option key={s.userId} value={s.userId}>{s.name}</option>)}</select></label>
      <label className="text-sm font-bold">계약 종류<select value={form.contractType} onChange={e=>setForm(v=>({...v,contractType:e.target.value as any}))} className={field}><option value="sale">매매</option><option value="jeonse">전세</option><option value="monthly_rent">월세</option></select></label>
      <label className="text-sm font-bold">부동산명<input value={form.propertyName} onChange={e=>setForm(v=>({...v,propertyName:e.target.value}))} className={field}/></label><label className="text-sm font-bold">주소<input value={form.address} onChange={e=>setForm(v=>({...v,address:e.target.value}))} className={field}/></label>
      <label className="text-sm font-bold">학생 역할<select value={form.studentRole} onChange={e=>setForm(v=>({...v,studentRole:e.target.value as any}))} className={field}><option value="owner">소유자</option><option value="tenant">임차인</option><option value="buyer">매수인</option><option value="seller">매도인</option></select></label><label className="text-sm font-bold">거래 금액<input type="number" value={form.transactionAmount} onChange={e=>setForm(v=>({...v,transactionAmount:Number(e.target.value)}))} className={field}/></label>
      <label className="text-sm font-bold">보증금<input type="number" value={form.deposit} onChange={e=>setForm(v=>({...v,deposit:Number(e.target.value)}))} className={field}/></label><label className="text-sm font-bold">월세<input type="number" value={form.monthlyRent} onChange={e=>setForm(v=>({...v,monthlyRent:Number(e.target.value)}))} className={field}/></label>
      <label className="text-sm font-bold">계약일<input type="date" value={form.contractDate} onChange={e=>setForm(v=>({...v,contractDate:e.target.value}))} className={field}/></label><label className="text-sm font-bold">종료일<input type="date" value={form.endDate||''} onChange={e=>setForm(v=>({...v,endDate:e.target.value}))} className={field}/></label>
    </div><label className="mt-3 block text-sm font-bold">특약사항<textarea value={form.specialTerms} onChange={e=>setForm(v=>({...v,specialTerms:e.target.value}))} className={`${field} min-h-24`}/></label><button onClick={save} className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-black text-white">계약 저장</button></div></div>}
    {notice&&<Notice message={notice} onClose={()=>setNotice('')}/>}
  </div>;
};

export const StudentRealEstateView: React.FC<{ user: User }> = ({ user }) => {
  const [rows,setRows]=useState<RealEstateContract[]>([]);const [error,setError]=useState('');const unit=user.currencyUnit||'권';
  useEffect(()=>{api.getStudentRealEstateContracts(user.userId).then(setRows).catch(e=>setError(e.message));},[user.userId]);
  return <div className="space-y-4"><div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white"><h2 className="text-2xl font-black">나의 부동산</h2><p className="mt-1 text-sm text-blue-50">내 이름으로 등록된 계약을 확인할 수 있어요. 학생은 계약을 수정할 수 없습니다.</p></div>{rows.map(contract=><article key={contract.id} className={card}><span className="text-xs font-black text-blue-600">{contract.contractType==='sale'?'매매':contract.contractType==='jeonse'?'전세':'월세'}</span><h3 className="mt-1 text-lg font-black">{contract.propertyName}</h3><p className="text-sm text-slate-500">{contract.address}</p><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-slate-50 p-3">보증금 <strong className="block">{money(contract.deposit)}{unit}</strong></div><div className="rounded-xl bg-slate-50 p-3">월세 <strong className="block">{money(contract.monthlyRent)}{unit}</strong></div></div><button onClick={()=>{try{printRealEstateContract(contract,unit);}catch(e:any){setError(e.message);}}} className="mt-4 rounded-xl bg-slate-800 px-4 py-2.5 font-black text-white">계약서 보기 / PDF</button></article>)}{!rows.length&&!error&&<div className={`${card} py-16 text-center text-slate-400`}>등록된 부동산 계약이 없습니다.</div>}{error&&<Notice message={error} onClose={()=>setError('')}/>}</div>;
};
