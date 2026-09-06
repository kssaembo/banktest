import type { BankApi } from './api';
import { createDefaultMockState } from './demoSeed';
import { Role, FundStatus, TransactionType as T } from '../types';

// A disposable, tab-local simulation. These rules are NOT the production SQL.
const KEY = 'class_bank_development_data_v1';
const durableStorage: Storage = typeof localStorage !== 'undefined' ? localStorage : sessionStorage;
const teacher = 'guest_teacher';
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
type State = ReturnType<typeof createDefaultMockState>;
let state: State;
function fresh(): State { return createDefaultMockState(); }
function read(): State {
  try {
    const value = durableStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    if (value) {
      const parsed = JSON.parse(value);
      if (parsed.teacherUser?.userId === teacher && Array.isArray(parsed.accounts)) return parsed;
    }
  } catch { /* Corrupt demo data may safely be replaced. */ }
  return fresh();
}
state = read();
const required = <V>(value: V | undefined | null): V => {
  if (!value) throw new Error('가상 학급에서 해당 데이터를 찾을 수 없습니다.');
  return value;
};
const positive = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('금액과 수량은 0보다 큰 숫자여야 합니다.');
};
const whole = (n: number) => { positive(n); if (!Number.isSafeInteger(n)) throw new Error('수량은 정수여야 합니다.'); };
const money = (n: number) => Math.round(n * 100) / 100;
const user = (uid: string) => uid === teacher ? state.teacherUser : state.students.find(s => s.userId === uid);
const account = (uid: string) => required(state.accounts.find(a => a.userId === uid && a.account_type === (uid === teacher ? 'treasury' : 'personal')));
const treasury = () => account(teacher);
const mart = () => required(state.accounts.find(a => a.account_type === 'mart'));
const record = (acc: ReturnType<typeof account>, type: T, amount: number, description: string, extra = {}) => {
  state.transactions.push({ transactionId: id(), accountId: acc.accountId, type, amount: money(amount), date: now(), description, teacher_id: teacher, ...extra });
};
const move = (from: ReturnType<typeof account>, to: ReturnType<typeof account>, amount: number, description: string, out = T.WITHDRAWAL, into = T.DEPOSIT) => {
  positive(amount);
  if (from.id === to.id) throw new Error('같은 계좌로 이체할 수 없습니다.');
  if (from.balance < amount) throw new Error('계좌 잔액이 부족합니다.');
  from.balance = money(from.balance - amount); to.balance = money(to.balance + amount);
  record(from, out, amount, description, { senderId: from.userId, receiverId: to.userId });
  record(to, into, amount, description, { senderId: from.userId, receiverId: to.userId });
};
const debit = (uid: string, amount: number, type: T, description: string) => {
  positive(amount); const acc = account(uid);
  if (acc.balance < amount) throw new Error('계좌 잔액이 부족합니다.');
  acc.balance = money(acc.balance - amount); record(acc, type, amount, description);
};
const credit = (uid: string, amount: number, type: T, description: string) => {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('정산 금액이 올바르지 않습니다.');
  const acc = account(uid); acc.balance = money(acc.balance + amount); record(acc, type, amount, description);
};
const unsupported = (): never => { throw new Error('이 기능은 실제 인증 또는 서버 SQL 확인이 필요합니다. 가상 학급에서는 실행하지 않습니다.'); };
const savings = (uid: string) => state.studentSavings.filter(s => s.userId === uid).map(s => ({ ...s, product: required(state.savingsProducts.find(p => p.id === s.productId)) }));
const settleSaving = (uid: string, sid: string, maturity: boolean) => {
  const saving = required(state.studentSavings.find(s => s.savingId === sid && s.userId === uid));
  const product = required(state.savingsProducts.find(p => p.id === saving.productId));
  if (maturity && new Date(saving.maturityDate).getTime() > Date.now()) throw new Error('아직 만기일이 아닙니다.');
  const interest = money(saving.amount * (maturity ? product.rate : product.cancellationRate));
  if (treasury().balance < interest) throw new Error('국고의 이자 지급 잔액이 부족합니다.');
  if (interest > 0) { treasury().balance = money(treasury().balance - interest); record(treasury(), T.WITHDRAWAL, interest, '예금 이자 지급'); }
  credit(uid, saving.amount + interest, maturity ? T.SAVINGS_MATURITY : T.SAVINGS_CANCEL, `${product.name} 정산`);
  state.studentSavings = state.studentSavings.filter(s => s.savingId !== sid);
  return '예금 정산이 완료되었습니다.';
};
const paySalary = (jid: string) => {
  const job = required(state.jobs.find(j => j.id === jid));
  if (job.lastPaidDate?.slice(0, 10) === now().slice(0, 10)) throw new Error('가상 학급에서는 같은 직업의 급여를 하루 한 번 지급합니다.');
  if (!job.assigned_students.length) throw new Error('직업에 배정된 학생이 없습니다.');
  for (const student of job.assigned_students) move(treasury(), account(student.userId), job.salary + job.incentive, `${job.jobName} 급여`, T.WITHDRAWAL, T.SALARY);
  job.lastPaidDate = now(); return '급여가 지급되었습니다.';
};
const fundRows = () => state.funds.map(f => {
  const investments = state.fundInvestments.filter(i => i.fundId === f.id);
  return { ...f, totalInvestedAmount: investments.reduce((sum, i) => sum + i.units * f.unitPrice, 0), investorCount: new Set(investments.map(i => i.studentUserId)).size };
});
const stockTransactions = (uid?: string) => state.transactions.filter(t => [T.STOCK_BUY, T.STOCK_SELL].includes(t.type) && (!uid || t.accountId === account(uid).accountId));

// Compile-time coverage: every production API method must have an explicit local implementation.
type LocalApi = { [K in keyof BankApi]: (...args: Parameters<BankApi[K]>) => Awaited<ReturnType<BankApi[K]>> };
const local: LocalApi = {
  login: uid => user(uid) || null,
  signupTeacher: unsupported, loginTeacher: unsupported, requestRecoveryCode: unsupported,
  verifyRecoveryCode: unsupported, resetTeacherPassword: unsupported,
  verifyAdminPassword: unsupported, changePassword: unsupported, resetPassword: unsupported,
  deleteTeacherAccount: unsupported,
  checkTeacherExists: uid => uid === teacher,
  loginWithPassword: (code, grade, cls, number) => {
    if (code !== '2026') throw new Error('가상 학급 코드는 2026입니다.');
    return state.students.find(s => s.grade === grade && s.class === cls && s.number === number) || null;
  },
  loginWithQrToken: token => { const acc = state.accounts.find(a => a.qrToken === token); return acc ? user(acc.userId) || null : null; },
  getUsersByRole: (role, tid) => tid !== teacher ? [] : role === Role.STUDENT ? state.students : role === Role.TEACHER ? [state.teacherUser] : [],
  addStudent: (name, grade, cls, number) => {
    if (state.students.some(s => s.grade === grade && s.class === cls && s.number === number)) throw new Error('이미 등록된 학생 번호입니다.');
    const uid = id();
    state.students.push({ ...state.teacherUser, userId: uid, role: Role.STUDENT, teacher_id: teacher, name, grade, class: cls, number });
    state.accounts.push({ id: id(), accountId: `demo-${uid}`, userId: uid, balance: 0, qrToken: `demo-${id()}`, teacher_id: teacher, account_type: 'personal' });
  },
  updateStudent: (uid, name, grade, cls, number) => { Object.assign(required(user(uid)), { name, grade, class: cls, number }); },
  deleteStudents: ids => {
    state.students = state.students.filter(s => !ids.includes(s.userId));
    state.accounts = state.accounts.filter(a => !ids.includes(a.userId));
    state.studentSavings = state.studentSavings.filter(s => !ids.includes(s.userId));
    state.studentStocks = state.studentStocks.filter(s => !ids.includes(s.userId));
    state.fundInvestments = state.fundInvestments.filter(s => !ids.includes(s.studentUserId));
    state.taxPayments = state.taxPayments.filter(s => !ids.includes(s.userId));
    state.jobs.forEach(j => { j.assigned_students = j.assigned_students.filter(s => !ids.includes(s.userId)); });
    return `${ids.length}명의 가상 학생이 삭제되었습니다.`;
  },
  getStudentAccountByUserId: uid => state.accounts.find(a => a.userId === uid && a.account_type === (uid === teacher ? 'treasury' : 'personal')) || null,
  getTeacherAccount: () => treasury(), getMartAccountByTeacherId: () => mart(),
  getTransactionsByAccountId: aid => state.transactions.filter(t => t.accountId === aid).sort((a, b) => b.date.localeCompare(a.date)),
  getRecipientDetailsByAccountId: aid => { const acc = state.accounts.find(a => a.accountId === aid); return acc ? { user: required(user(acc.userId)), account: acc } : null; },
  transfer: (uid, aid, amount, memo) => { move(account(uid), required(state.accounts.find(a => a.accountId === aid)), amount, memo || '학생 송금', T.TRANSFER, T.TRANSFER); return '송금이 완료되었습니다.'; },
  studentWithdraw: (uid, amount, target) => { move(account(uid), target === 'mart' ? mart() : treasury(), amount, '출금'); return '출금이 완료되었습니다.'; },
  bankerDeposit: (uid, amount) => { move(treasury(), account(uid), amount, '은행 입금'); return '입금이 완료되었습니다.'; },
  bankerWithdraw: (uid, amount) => { move(account(uid), treasury(), amount, '은행 출금'); return '출금이 완료되었습니다.'; },
  martTransfer: (aid, amount, direction) => {
    const acc = required(state.accounts.find(a => a.accountId === aid));
    if (direction === 'FROM_STUDENT') move(acc, mart(), amount, '마트 결제', T.MART); else move(mart(), acc, amount, '마트 환불');
    return '처리되었습니다.';
  },
  getStockProducts: () => state.stockProducts.map(p => {
    const quantity = state.studentStocks.filter(s => s.stockId === p.id).reduce((sum, s) => sum + s.quantity, 0);
    return { ...p, totalQuantity: quantity, valuation: quantity * p.currentPrice };
  }),
  getStudentStocks: uid => state.studentStocks.filter(s => s.userId === uid).map(s => ({ ...s, stock: required(state.stockProducts.find(p => p.id === s.stockId)) })),
  getStockHistory: sid => state.stockHistory.filter(h => h.stockId === sid).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  buyStock: (uid, sid, qty) => {
    whole(qty); const stock = required(state.stockProducts.find(p => p.id === sid)); const cost = money(qty * stock.currentPrice);
    debit(uid, cost, T.STOCK_BUY, `${stock.name} ${qty}주 매수`);
    const holding = state.studentStocks.find(s => s.userId === uid && s.stockId === sid);
    if (holding) { holding.purchasePrice = (holding.purchasePrice * holding.quantity + cost) / (holding.quantity + qty); holding.quantity += qty; }
    else state.studentStocks.push({ userId: uid, stockId: sid, quantity: qty, purchasePrice: stock.currentPrice, teacher_id: teacher });
    return '매수가 완료되었습니다.';
  },
  sellStock: (uid, sid, qty) => {
    whole(qty); const stock = required(state.stockProducts.find(p => p.id === sid)); const holding = required(state.studentStocks.find(s => s.userId === uid && s.stockId === sid));
    if (holding.quantity < qty) throw new Error('보유 수량이 부족합니다.');
    holding.quantity -= qty; credit(uid, qty * stock.currentPrice, T.STOCK_SELL, `${stock.name} ${qty}주 매도`);
    state.studentStocks = state.studentStocks.filter(s => s.quantity > 0); return '매도가 완료되었습니다.';
  },
  addStockProduct: (name, price) => { positive(price); state.stockProducts.push({ id: id(), name, currentPrice: price, volatility: 0, stockAccountId: id(), teacher_id: teacher }); return '종목이 추가되었습니다.'; },
  updateStockPrice: (sid, price) => { positive(price); required(state.stockProducts.find(s => s.id === sid)).currentPrice = price; state.stockHistory.push({ id: id(), stockId: sid, price, createdAt: now() }); return '주가가 변경되었습니다.'; },
  updateStockVolatility: (sid, volatility) => { required(state.stockProducts.find(s => s.id === sid)).volatility = volatility; },
  deleteStockProducts: ids => { if (state.studentStocks.some(s => ids.includes(s.stockId))) throw new Error('보유 주식이 있는 종목은 가상 학급에서 삭제할 수 없습니다.'); state.stockProducts = state.stockProducts.filter(s => !ids.includes(s.id)); return '삭제되었습니다.'; },
  getStockHolders: sid => state.studentStocks.filter(s => s.stockId === sid).map(s => ({ studentName: user(s.userId)?.name || '', quantity: s.quantity })),
  getStockTradeCounts: uid => { const rows = stockTransactions(uid).filter(t => t.date.slice(0, 10) === now().slice(0, 10)); return { buy: rows.filter(t => t.type === T.STOCK_BUY).length, sell: rows.filter(t => t.type === T.STOCK_SELL).length }; },
  getSuspiciousTrading: unsupported,
  getLastStockTradeTime: uid => stockTransactions(uid).map(t => t.date).sort().at(-1) || null,
  getStockTransactions: () => stockTransactions().map(t => ({ ...t, student_name: user(required(state.accounts.find(a => a.accountId === t.accountId)).userId)?.name })),
  getSavingsProducts: () => state.savingsProducts, getStudentSavings: savings,
  joinSavings: (uid, pid, amount) => {
    const p = required(state.savingsProducts.find(p => p.id === pid));
    if (savings(uid).some(s => s.productId === pid)) throw new Error('이미 가입한 예금입니다.');
    if (amount > p.maxAmount) throw new Error('가입 한도를 초과했습니다.');
    debit(uid, amount, T.SAVINGS_JOIN, `${p.name} 가입`);
    state.studentSavings.push({ savingId: id(), userId: uid, productId: pid, amount, joinDate: now(), maturityDate: new Date(Date.now() + p.maturityDays * 86400000).toISOString(), teacher_id: teacher });
    return '예금에 가입했습니다.';
  },
  cancelSavings: (uid, sid) => settleSaving(uid, sid, false), processSavingsMaturity: (uid, sid) => settleSaving(uid, sid, true),
  addSavingsProduct: product => { whole(product.maturityDays); positive(product.maxAmount); state.savingsProducts.push({ ...product, id: id(), teacher_id: teacher }); return '예금 상품이 추가되었습니다.'; },
  deleteSavingsProducts: ids => { if (state.studentSavings.some(s => ids.includes(s.productId))) throw new Error('가입자가 있는 예금은 삭제할 수 없습니다.'); state.savingsProducts = state.savingsProducts.filter(p => !ids.includes(p.id)); return '삭제되었습니다.'; },
  getSavingsEnrollees: pid => state.studentSavings.filter(s => s.productId === pid).map(s => ({ studentName: user(s.userId)?.name || '', amount: s.amount, maturityDate: s.maturityDate })),
  getJobs: () => state.jobs,
  addJob: (name, description, salary) => { positive(salary); state.jobs.push({ id: id(), jobName: name, description, salary, incentive: 0, assigned_students: [], teacher_id: teacher }); return '직업이 추가되었습니다.'; },
  updateJob: (jid, name, description, salary) => { positive(salary); Object.assign(required(state.jobs.find(j => j.id === jid)), { jobName: name, description, salary }); },
  deleteJob: jid => { state.jobs = state.jobs.filter(j => j.id !== jid); return '삭제되었습니다.'; },
  manageJobAssignment: (jid, ids) => { required(state.jobs.find(j => j.id === jid)).assigned_students = [...new Set(ids)].map(uid => ({ userId: uid, name: required(user(uid)).name })); },
  updateJobIncentive: (jid, incentive) => { if (!Number.isFinite(incentive)) throw new Error('올바른 금액을 입력하세요.'); required(state.jobs.find(j => j.id === jid)).incentive = incentive; },
  payJobSalary: paySalary,
  payAllSalaries: () => { state.jobs.filter(j => j.assigned_students.length && j.lastPaidDate?.slice(0, 10) !== now().slice(0, 10)).forEach(j => paySalary(j.id)); return '전체 급여 지급이 완료되었습니다.'; },
  getTaxes: () => state.taxes.map(t => ({ ...t, createdAt: t.createdAt || now(), recipients: state.taxPayments.filter(p => p.taxId === t.id).map(p => ({ id: `${p.userId}_${p.taxId}`, taxId: p.taxId, studentUserId: p.userId, isPaid: p.paid, paidAt: p.paidDate })) })),
  createTax: (name, amount, dueDate, ids) => { positive(amount); const tid = id(); state.taxes.push({ id: tid, name, amount, dueDate, teacher_id: teacher, createdAt: now() }); [...new Set(ids)].forEach(uid => { required(user(uid)); state.taxPayments.push({ userId: uid, taxId: tid, paid: false }); }); return '세금이 부과되었습니다.'; },
  deleteTax: tid => { state.taxes = state.taxes.filter(t => t.id !== tid); state.taxPayments = state.taxPayments.filter(t => t.taxId !== tid); return '삭제되었습니다.'; },
  getMyUnpaidTaxes: uid => state.taxPayments.filter(p => p.userId === uid && !p.paid).map(p => { const tax = required(state.taxes.find(t => t.id === p.taxId)); return { recipientId: `${uid}_${tax.id}`, taxId: tax.id, name: tax.name, amount: tax.amount, dueDate: tax.dueDate }; }),
  payTax: (uid, tid) => { const p = required(state.taxPayments.find(p => p.userId === uid && p.taxId === tid)); if (p.paid) throw new Error('이미 납부한 세금입니다.'); const t = required(state.taxes.find(t => t.id === tid)); move(account(uid), treasury(), t.amount, t.name, T.TAX); p.paid = true; p.paidDate = now(); return '납부되었습니다.'; },
  getFunds: fundRows,
  createFund: f => {
    positive(f.unitPrice); positive(f.targetAmount);
    state.funds.push({ ...f, id: id(), teacher_id: teacher, creatorName: user(f.creatorId)?.name || '', baseReward: f.baseReward ?? f.base_reward ?? 0, incentiveReward: f.incentiveReward ?? f.incentive_reward ?? 0, status: FundStatus.RECRUITING, createdAt: now(), totalInvestedAmount: 0, investorCount: 0 });
    return '펀드가 생성되었습니다.';
  },
  deleteFund: fid => { if (state.fundInvestments.some(i => i.fundId === fid)) throw new Error('투자자가 있는 펀드는 가상 학급에서 삭제할 수 없습니다.'); state.funds = state.funds.filter(f => f.id !== fid); return '삭제되었습니다.'; },
  joinFund: (uid, fid, units) => {
    whole(units); const f = required(state.funds.find(f => f.id === fid));
    if (![FundStatus.RECRUITING, FundStatus.ONGOING].includes(f.status) || new Date(f.recruitmentDeadline).getTime() < Date.now()) throw new Error('모집이 종료된 펀드입니다.');
    debit(uid, units * f.unitPrice, T.FUND_JOIN, `${f.name} 투자`);
    state.fundInvestments.push({ id: id(), fundId: fid, studentUserId: uid, units, investedAt: now() }); return '투자가 완료되었습니다.';
  },
  settleFund: (fid, status, executionRate) => {
    const f = required(state.funds.find(f => f.id === fid));
    if ([FundStatus.SUCCESS, FundStatus.EXCEED, FundStatus.FAIL].includes(f.status)) throw new Error('이미 정산된 펀드입니다.');
    if (![FundStatus.SUCCESS, FundStatus.EXCEED, FundStatus.FAIL].includes(status)) throw new Error('정산 결과가 올바르지 않습니다.');
    // A documented local preview rule, pending verification against SQL.
    const reward = status === FundStatus.FAIL ? -f.baseReward : f.baseReward + (status === FundStatus.EXCEED ? f.incentiveReward : 0);
    const investors = state.fundInvestments.filter(i => i.fundId === fid);
    const interest = investors.reduce((sum, i) => sum + i.units * Math.max(0, reward), 0);
    if (treasury().balance < interest) throw new Error('국고 잔액이 부족합니다.');
    if (interest) { treasury().balance -= interest; record(treasury(), T.WITHDRAWAL, interest, `${f.name} 보상`); }
    investors.forEach(i => credit(i.studentUserId, i.units * Math.max(0, f.unitPrice + reward), T.FUND_PAYOUT, `${f.name} 정산`));
    f.status = status; f.executionRate = executionRate; return '가상 펀드가 정산되었습니다.';
  },
  getMyFundInvestments: uid => state.fundInvestments.filter(i => i.studentUserId === uid).map(i => ({ ...i, fund: required(fundRows().find(f => f.id === i.fundId)) })),
  getFundInvestors: fid => state.fundInvestments.filter(i => i.fundId === fid).map(i => ({ student_name: user(i.studentUserId)?.name || '', units: i.units, invested_amount: i.units * required(state.funds.find(f => f.id === fid)).unitPrice })),
  issueCurrency: (_tid, amount) => { positive(amount); credit(teacher, amount, T.DEPOSIT, '화폐 발행'); return '화폐가 발행되었습니다.'; },
  getDailyTreasuryTotals: () => state.transactions.filter(t => t.accountId === treasury().accountId && t.date.slice(0, 10) === now().slice(0, 10)).reduce((sum, t) => ({ deposits: sum.deposits + (t.type === T.DEPOSIT ? t.amount : 0), withdrawals: sum.withdrawals + (t.type === T.WITHDRAWAL ? t.amount : 0) }), { deposits: 0, withdrawals: 0 }),
  getDonations: () => state.donations,
  createDonation: (_tid, title, url, content, imageUrl) => { state.donations.push({ id: id(), title, url, content, imageUrl, current_amount: 0, status: 'ongoing', teacher_id: teacher, created_at: now() }); },
  closeDonation: did => { required(state.donations.find(d => d.id === did)).status = 'completed'; },
  donate: (uid, did, amount) => {
    const d = required(state.donations.find(d => d.id === did)); if (d.status !== 'ongoing') throw new Error('종료된 모금입니다.');
    move(account(uid), treasury(), amount, `${d.title} 기부`, T.DONATION); d.current_amount += amount;
    state.donationLogs.push({ id: id(), donation_id: did, user_id: uid, amount, user_name: required(user(uid)).name, user_number: user(uid)?.number || 0, created_at: now() });
  },
  updateDonation: (did, title, url, content, imageUrl) => { Object.assign(required(state.donations.find(d => d.id === did)), { title, url, content, imageUrl }); },
  getDonationLogs: did => state.donationLogs.filter(d => d.donation_id === did).map(d => ({ ...d, user: { name: d.user_name, number: d.user_number } })),
  deleteDonation: did => { state.donations = state.donations.filter(d => d.id !== did); state.donationLogs = state.donationLogs.filter(d => d.donation_id !== did); },
  getMartItems: tid => state.martItems.filter(item => item.teacher_id === tid).sort((a, b) => a.sort_order - b.sort_order),
  addMartItem: (tid, input) => {
    positive(input.price);
    const stamp = now();
    const item = { id: id(), teacher_id: tid, name: input.name.trim(), price: money(input.price), category: input.category.trim() || '기타', is_active: true, sort_order: state.martItems.length + 1, created_at: stamp, updated_at: stamp };
    if (!item.name) throw new Error('상품명을 입력하세요.');
    state.martItems.push(item); return item;
  },
  updateMartItem: (itemId, input) => {
    const item = required(state.martItems.find(row => row.id === itemId));
    if (input.price !== undefined) positive(input.price);
    Object.assign(item, input, { updated_at: now() }); return item;
  },
  deleteMartItem: itemId => { state.martItems = state.martItems.filter(item => item.id !== itemId); },
};

// Execute each local action atomically and detach return values from the store.
// This also rolls back bulk salary operations when one recipient fails.
export const api = Object.fromEntries(Object.entries(local).map(([name, fn]) => [name, async (...args: unknown[]) => {
  const before = structuredClone(state);
  try {
    const result = (fn as (...values: unknown[]) => unknown)(...args);
    durableStorage.setItem(KEY, JSON.stringify(state));
    return structuredClone(result);
  } catch (error) { state = before; throw error; }
}])) as BankApi;

export function resetDemo() { state = fresh(); durableStorage.setItem(KEY, JSON.stringify(state)); }
