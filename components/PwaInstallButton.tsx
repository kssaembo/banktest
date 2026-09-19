import React, { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true;
  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia('(max-width: 767px)').matches;
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (installed || isStandalone || (!promptEvent && !isMobile)) return null;

  const handleInstall = async () => {
    if (!promptEvent) {
      setShowInstallHelp(true);
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="fixed bottom-24 right-3 z-[239] rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 text-sm font-black text-blue-700 shadow-lg backdrop-blur transition hover:bg-blue-50 active:scale-95 md:bottom-16 md:right-4"
        aria-label="클래스뱅크 앱 설치"
      >
        앱 설치
      </button>

      {showInstallHelp && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-help-title"
          onClick={() => setShowInstallHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-blue-100 bg-white p-6 text-slate-800 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-blue-600">CLASS BANK</p>
                <h2 id="pwa-install-help-title" className="mt-1 text-xl font-black">
                  홈 화면에 앱 추가하기
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 active:scale-95"
                aria-label="설치 안내 닫기"
              >
                ×
              </button>
            </div>

            <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-4 text-sm font-bold leading-6 text-slate-700">
              {isIos
                ? 'Safari 아래쪽의 공유 버튼을 누른 뒤, ‘홈 화면에 추가’를 선택해 주세요.'
                : '브라우저 오른쪽 위의 메뉴(⋮)를 누른 뒤, ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요.'}
            </p>

            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-md transition hover:bg-blue-700 active:scale-[0.98]"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
