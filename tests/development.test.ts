import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}, configurable: true });
let requests = 0;
globalThis.fetch = async () => { requests++; throw new Error('Network must never be used by this test'); };
const { api, resetDemo } = await import('../services/demoApi');
const student = 'guest_student_1';
const teacher = 'guest_teacher';
beforeEach(() => { resetDemo(); requests = 0; });
const balance = async (uid: string) => (await api.getStudentAccountByUserId(uid))!.balance;

test('default mode blocks direct Supabase access even when live-looking keys exist', async () => {
  const { isDemo } = await import('../services/runtime');
  const { supabase } = await import('../services/supabaseClient');
  const { api: router } = await import('../services/api');
  assert.equal(isDemo, true);
  assert.throws(() => supabase.from('users'), /연결할 수 없습니다/);
  assert.equal((await router.login(teacher))?.role, 'teacher');
  await router.bankerDeposit(student, 100);
  assert.equal(requests, 0);
});
test('live connection guard accepts only the user-confirmed new project', async () => {
  const { TEST_SUPABASE_URL, validateTestProjectUrl } = await import('../services/testProject');
  assert.equal(validateTestProjectUrl(TEST_SUPABASE_URL), TEST_SUPABASE_URL);
  assert.equal(validateTestProjectUrl(TEST_SUPABASE_URL + '/'), TEST_SUPABASE_URL);
  for (const value of [
    'https://original-production.supabase.co',
    TEST_SUPABASE_URL + '.example.com',
    TEST_SUPABASE_URL.replace('https:', 'http:'),
    TEST_SUPABASE_URL + '/rest/v1',
    TEST_SUPABASE_URL + '?redirect=other',
    TEST_SUPABASE_URL.replace('https://', 'https://user:password@'),
  ]) assert.throws(() => validateTestProjectUrl(value));
});
test('transfer debits and credits once, and returned objects cannot mutate state', async () => {
  const recipient = (await api.getStudentAccountByUserId('guest_student_2'))!;
  const a = await balance(student), b = recipient.balance;
  await api.transfer(student, recipient.accountId, 120);
  assert.equal(await balance(student), a - 120);
  assert.equal(await balance('guest_student_2'), b + 120);
  recipient.balance = -1;
  assert.equal(await balance('guest_student_2'), b + 120);
});
test('negative, NaN, insufficient-funds and self transfers leave balances unchanged', async () => {
  const before = await balance(student);
  const target = (await api.getStudentAccountByUserId('guest_student_2'))!.accountId;
  for (const amount of [-1, NaN, Infinity, before + 1]) await assert.rejects(api.transfer(student, target, amount));
  await assert.rejects(api.transfer(student, (await api.getStudentAccountByUserId(student))!.accountId, 1));
  assert.equal(await balance(student), before);
});
test('bank and mart operations conserve combined balances', async () => {
  const initial = await balance(student) + (await api.getTeacherAccount())!.balance + (await api.getMartAccountByTeacherId(teacher))!.balance;
  await api.bankerDeposit(student, 100);
  await api.bankerWithdraw(student, 30);
  const aid = (await api.getStudentAccountByUserId(student))!.accountId;
  await api.martTransfer(aid, 50, 'FROM_STUDENT');
  await api.martTransfer(aid, 20, 'TO_STUDENT');
  const final = await balance(student) + (await api.getTeacherAccount())!.balance + (await api.getMartAccountByTeacherId(teacher))!.balance;
  assert.equal(initial, final);
});
test('bulk salary failure rolls back earlier recipients', async () => {
  await api.updateJob('job_2', '마트', 'test', 1000000);
  const before = await balance(student), treasury = (await api.getTeacherAccount())!.balance;
  await assert.rejects(api.payAllSalaries(teacher), /잔액/);
  assert.equal(await balance(student), before);
  assert.equal((await api.getTeacherAccount())!.balance, treasury);
  assert.equal((await api.getJobs(teacher))[0].lastPaidDate, undefined);
});
test('job assignment and once-per-day demo salaries work', async () => {
  await api.manageJobAssignment('job_3', [student]);
  const before = await balance(student);
  await api.payJobSalary('job_3');
  assert.equal(await balance(student), before + 2900);
  await assert.rejects(api.payJobSalary('job_3'), /하루 한 번/);
});
test('savings use current fields, reject duplicate enrollment and early maturity', async () => {
  const before = await balance(student);
  await api.joinSavings(student, 'savings_2', 1000);
  const saving = (await api.getStudentSavings(student)).find(s => s.productId === 'savings_2')!;
  assert.ok(saving.savingId && Number.isFinite(Date.parse(saving.maturityDate)));
  await assert.rejects(api.joinSavings(student, 'savings_2', 100));
  await assert.rejects(api.processSavingsMaturity(student, saving.savingId), /만기/);
  await api.cancelSavings(student, saving.savingId);
  assert.equal(await balance(student), before + 50);
  await assert.rejects(api.cancelSavings(student, saving.savingId));
});
test('taxes affect only selected recipients and cannot be paid twice', async () => {
  await api.createTax('테스트세', 100, new Date().toISOString(), [student], teacher);
  const tax = (await api.getTaxes(teacher)).find(t => t.name === '테스트세')!;
  assert.deepEqual(tax.recipients.map(r => r.studentUserId), [student]);
  const before = await balance(student);
  await api.payTax(student, tax.id);
  await assert.rejects(api.payTax(student, tax.id), /이미/);
  assert.equal(await balance(student), before - 100);
});
test('stock trades change holdings and reject invalid quantities', async () => {
  const before = await balance(student);
  await api.buyStock(student, 'stock_1', 2);
  await api.sellStock(student, 'stock_1', 2);
  assert.equal(await balance(student), before);
  await assert.rejects(api.buyStock(student, 'stock_1', 0.5));
  await assert.rejects(api.sellStock(student, 'stock_1', 99999));
});
test('fund units are multiplied by price and settlement cannot repeat', async () => {
  const before = await balance(student);
  await api.joinFund(student, 'fund_1', 2);
  assert.equal(await balance(student), before - 200);
  await api.settleFund('fund_1', 'SUCCESS' as any);
  const after = await balance(student);
  await assert.rejects(api.settleFund('fund_1', 'SUCCESS' as any), /이미/);
  assert.equal(await balance(student), after);
});
test('donation totals and participants update; closed campaigns reject payment', async () => {
  const initial = (await api.getDonations(teacher))[0].current_amount;
  await api.donate(student, 'donation_1', 50);
  assert.equal((await api.getDonations(teacher))[0].current_amount, initial + 50);
  assert.equal((await api.getDonationLogs('donation_1')).at(-1).user.name, '김민준');
  await api.closeDonation('donation_1');
  await assert.rejects(api.donate(student, 'donation_1', 50), /종료/);
});
test('real authentication and SQL-only analysis are explicitly unavailable locally', async () => {
  await assert.rejects(api.signupTeacher('id', 'password', 'name', 'unit'), /실제 인증/);
  await assert.rejects(api.getSuspiciousTrading(teacher, '', ''), /서버 SQL/);
  assert.equal(requests, 0);
});
