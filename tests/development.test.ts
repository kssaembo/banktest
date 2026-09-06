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
test('mart catalog supports add, hide, update and delete without changing balances', async () => {
  const before = await balance(student);
  const item = await api.addMartItem(teacher, { name: '공책', price: 700, category: '학용품' });
  assert.equal((await api.getMartItems(teacher)).find(row => row.id === item.id)?.price, 700);
  await api.updateMartItem(item.id, { price: 800, is_active: false });
  assert.equal((await api.getMartItems(teacher)).find(row => row.id === item.id)?.is_active, false);
  await api.deleteMartItem(item.id);
  assert.equal((await api.getMartItems(teacher)).some(row => row.id === item.id), false);
  assert.equal(await balance(student), before);
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

import { sameAuthUser } from '../services/authIdentity';
import { dailyActivity } from '../services/activityStats';
test('focus and token refresh preserve identity; signout and account changes revoke it', () => {
  const session = { user: { id: 'tester-1' }, access_token: 'old' };
  assert.equal(sameAuthUser(undefined, null), false);
  assert.equal(sameAuthUser(undefined, session), false);
  assert.equal(sameAuthUser(session, { user: { id: 'tester-1' } }), true);
  assert.equal(sameAuthUser(session, { user: { id: 'tester-2' } }), false);
  assert.equal(sameAuthUser(session, null), false);
  assert.equal(sameAuthUser(null, session), false);
});
test('activity uses actual daily counts including inactive dates', () => {
  assert.deepEqual(dailyActivity([{date:'2026-09-01T00:00:00Z'},{date:'2026-09-01T01:00:00Z'},{date:'2026-09-03T00:00:00Z'}]), [
    {label:'2026-09-01',activity:2},{label:'2026-09-02',activity:0},{label:'2026-09-03',activity:1}
  ]);
  assert.deepEqual(dailyActivity([]), []);
});

import {newsMonthRange, monthlyNewsActivity, newsErrorMessage} from '../features/economy-news/newsStats';
test('monthly news includes Korea month start, excludes next month and unknown students',()=>{
 const range=newsMonthRange(0,new Date('2026-09-15T00:00:00Z'));
 assert.equal(range.start.toISOString(),'2026-08-31T15:00:00.000Z');
 assert.equal(range.end.toISOString(),'2026-09-30T15:00:00.000Z');
 const activity=monthlyNewsActivity([{userId:'a',created_at:'2026-08-31T15:00:00Z'},{userId:'a',created_at:'2026-09-01T00:00:00Z'},{userId:'b',created_at:'2026-09-30T15:00:00Z'},{userId:'other-class',created_at:'2026-09-03T00:00:00Z'}],['a','b'],range);
 assert.equal(activity.monthly.length,2);assert.equal(activity.participants.size,1);assert.deepEqual(activity.absent,['b']);
 assert.equal(newsMonthRange(-1,new Date('2026-01-15')).label,'2025년 12월');
 assert.equal(newsMonthRange(0,new Date('2024-02-15')).end.toISOString(),'2024-02-29T15:00:00.000Z');
});
test('news errors distinguish overload, invalid keys, quota and depleted credits',()=>{
 assert.match(newsErrorMessage('{"code":503,"status":"UNAVAILABLE"}'),/일시적으로/);
 assert.match(newsErrorMessage('API_KEY_INVALID'),/유효하지/);
 assert.match(newsErrorMessage('RESOURCE_EXHAUSTED'),/요청 한도/);
 assert.match(newsErrorMessage('prepayment credits are depleted'),/선불 크레딧/);
});
