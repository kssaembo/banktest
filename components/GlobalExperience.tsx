import {RewardAnimation} from './LearningRewards';
import React, { useEffect, useState } from 'react';
import PwaInstallButton from './PwaInstallButton';

import {SOUND_KEY,playSound,playButtonSound,stopSounds} from '../services/sounds';

export default function GlobalExperience({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off');

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = value => {setMessage(String(value)); if(/오류|실패|입력|불가|부족|최대|확인해/.test(String(value)))playSound('error-soft');};
    const onClick = (event: MouseEvent) => {
      const button=(event.target instanceof Element ? event.target : null)?.closest('button,[role="button"],a[href],input[type="submit"]') as HTMLButtonElement|null;
      if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return;
      const cue=button.dataset.sfx;if(cue==='custom')return;if(cue==='news-open'){playSound('news-open');return;}
      const text=[button.textContent,button.getAttribute('aria-label'),button.title].filter(Boolean).join(' ');
      playButtonSound(button.closest('nav,aside')||/메뉴|관리자|마트모드|학생 페이지|가이드/.test(text)?'navigation':/닫기|취소|뒤로|로그아웃/.test(text)?'dismiss':/송금|결제|가입|납부|발행|등록|저장|확인|투자|매수|매도|시작|다음|완료/.test(text)?'action':'default');
    };
    window.addEventListener('click', onClick, true);
    return () => { window.alert = originalAlert; window.removeEventListener('click', onClick, true); };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    setSoundEnabled(next);
    if(next)setTimeout(()=>playButtonSound(),0);else stopSounds();
  };

  return <>
    {children}<RewardAnimation/>
    <PwaInstallButton />
    <button type="button" onClick={toggleSound} aria-label={soundEnabled ? '버튼 효과음 끄기' : '버튼 효과음 켜기'} title={soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'} className="fixed right-3 bottom-3 md:right-4 md:bottom-4 z-[240] w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/95 border border-blue-100 shadow-lg text-lg md:text-xl hover:bg-blue-50 active:scale-95">
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
