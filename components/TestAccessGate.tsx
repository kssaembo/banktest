import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { isDemo, sessionKey } from '../services/runtime';

function LiveTestAccess({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      if (active) { setAllowed(false); setChecking(!!next); setSession(next); }
    });
    supabase.auth.getSession().then(({ data, error: e }) => {
      if (!active || authEventReceived) return;
      setSession(data.session); setChecking(!!data.session);
      if (e) setError('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
    }).catch(() => { if (active) { setChecking(false); setError('로그인 상태를 확인하지 못했습니다.'); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let active = true;
    if (!session) { setAllowed(false); return; }
    setChecking(true);
    Promise.resolve(supabase.rpc('classbank_test_access')).then(({ data, error: e }) => {
      if (!active) return;
      setAllowed(!e && data === true); setChecking(false);
      setError(e || data !== true ? '테스트 접근 권한이 없습니다. 03번 SQL 적용과 등록 계정을 확인해 주세요.' : '');
    }).catch(() => { if (active) { setAllowed(false); setChecking(false); setError('연결을 확인하지 못했습니다. 다시 로그인해 주세요.'); } });
    return () => { active = false; };
  }, [session]);
  const signOut = async () => {
    setAllowed(false); setSession(null); setChecking(false);
    sessionStorage.removeItem(sessionKey); localStorage.removeItem(sessionKey);
    const { error: e } = await supabase.auth.signOut({ scope: 'local' });
    if (e) setError('로그아웃 처리에 실패했습니다. 페이지를 새로고침해 주세요.');
  };
  if (checking) return <main className="p-10 text-center">테스트 환경 접근 권한을 확인하고 있습니다…</main>;
  if (allowed) return <>
    <div className="bg-blue-950 text-white px-4 py-2 flex justify-between gap-4 text-sm">
      <span>새 Supabase 테스트 환경 · 가상 데이터만 사용</span>
      <button onClick={signOut} className="underline">테스트 환경 로그아웃</button>
    </div>
    {children}
  </>;
  return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <form className="w-full max-w-md rounded-2xl bg-white p-8 shadow" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) setError('로그인하지 못했습니다. Authentication에 만든 이메일·비밀번호와 확인 상태를 확인해 주세요.');
        else setPassword('');
      } catch { setError('로그인 서버에 연결하지 못했습니다.'); }
      finally { setBusy(false); }
    }}>
      <h1 className="text-2xl font-bold mb-3">클래스뱅크 테스트 환경</h1>
      <p className="text-slate-600 mb-6">새 Supabase의 Authentication에 만든 계정으로 입장하세요. 입장 후 가상 교사·학생 계정으로 기능을 확인할 수 있습니다.</p>
      <label className="block mb-4">테스트 관리자 이메일<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full border rounded p-3 mt-1" /></label>
      <label className="block mb-4">비밀번호<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="block w-full border rounded p-3 mt-1" /></label>
      {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
      <button disabled={busy} className="w-full bg-blue-600 text-white rounded p-3 disabled:opacity-50">{busy ? '로그인 중…' : '테스트 환경 입장'}</button>
      {session && <button type="button" onClick={signOut} className="mt-4 underline">현재 계정 로그아웃</button>}
    </form>
  </main>;
}

export default function TestAccessGate({ children }: { children: React.ReactNode }) {
  return isDemo ? <>{children}</> : <LiveTestAccess>{children}</LiveTestAccess>;
}
