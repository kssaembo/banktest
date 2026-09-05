import React, { useEffect, useState } from 'react';

const SOUND_KEY = 'classbank_sound_enabled';

function playClick() {
  if (localStorage.getItem(SOUND_KEY) === 'off') return;
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.055);
    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.075);
    osc.addEventListener('ended', () => ctx.close());
  } catch { /* Sound must never block an action. */ }
}

export default function GlobalExperience({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off');

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = value => setMessage(String(value));
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest('button,[role="button"]')) playClick();
    };
    document.addEventListener('click', onClick, true);
    return () => { window.alert = originalAlert; document.removeEventListener('click', onClick, true); };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    setSoundEnabled(next);
    if (next) setTimeout(playClick, 0);
  };

  return <>
    {children}
    <button type="button" onClick={toggleSound} aria-label={soundEnabled ? '버튼 효과음 끄기' : '버튼 효과음 켜기'} title={soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'} className="fixed right-4 bottom-20 md:bottom-4 z-[240] w-11 h-11 rounded-full bg-white/95 border border-blue-100 shadow-lg text-xl hover:bg-blue-50 active:scale-95">
      {soundEnabled ? '🔊' : '🔇'}
    </button>
    {message && <div className="fixed inset-0 z-[300] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="알림" onClick={() => setMessage(null)}>
      <div className="w-full max-w-sm rounded-[28px] bg-white p-7 text-center shadow-2xl border border-white" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">✓</div>
        <h2 className="text-xl font-black text-slate-900 mb-2">안내</h2>
        <p className="text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap">{message}</p>
        <button type="button" autoFocus onClick={() => setMessage(null)} className="mt-6 w-full rounded-2xl bg-blue-600 py-3.5 font-black text-white hover:bg-blue-700">확인</button>
      </div>
    </div>}
  </>;
}
