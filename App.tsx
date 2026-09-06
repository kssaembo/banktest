

import React, { useState, useMemo, useEffect, useContext } from 'react';
import AuthPage from './pages/AuthPage';
import DemoAuthPage from './pages/DemoAuthPage';
import { isDemo, sessionKey } from './services/runtime';
// Fix: Use default import for TeacherDashboard to match the standard export pattern used in other page components
import TeacherDashboard from './pages/TeacherDashboard';
import StudentPage from './pages/StudentPage';
import MartPage from './pages/MartPage';
import BankerPage from './pages/BankerPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import { User, Role } from './types';
import { AuthContext } from './contexts/AuthContext';
import { api } from './services/api';
import { HomeIcon } from './components/icons';

const AppContent: React.FC = () => {
  const { currentUser, login } = useContext(AuthContext);
  const [isTokenProcessing, setIsTokenProcessing] = useState(true);
  const [requestedView, setRequestedView] = useState<string | undefined>(undefined);
  
  // 선생님 계정일 때 현재 보고 있는 화면 모드 상태
  const teacherViewKey = `class_bank_teacher_active_view_${currentUser?.userId || 'unknown'}`;
  const [teacherActiveView, setTeacherActiveViewState] = useState<'admin' | 'banker' | 'mart' | 'student' | 'donation' | null>(() => {
      const saved = localStorage.getItem(teacherViewKey);
      return ['admin','banker','mart','student','donation'].includes(saved || '') ? saved as any : null;
  });
  const setTeacherActiveView = (next: 'admin' | 'banker' | 'mart' | 'student' | 'donation' | null) => {
      setTeacherActiveViewState(next);
      if (next) localStorage.setItem(teacherViewKey, next); else localStorage.removeItem(teacherViewKey);
  };

  useEffect(() => {
    const handleTokenLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      let token = params.get('token');
      let viewParam = params.get('view');

      // Check for token/view in hash (HashRouter support or specific hash params)
      if (window.location.hash) {
        const hashParts = window.location.hash.split('?');
        if (hashParts.length > 1) {
            const hashParams = new URLSearchParams(hashParts[1]);
            if (!token) token = hashParams.get('token');
            if (!viewParam) viewParam = hashParams.get('view');
        }
        // Handle case like #/token=xyz
        if (!token) {
             const match = window.location.hash.match(/token=([^&]*)/);
             if (match) token = match[1];
        }
         // Handle case like #/...&view=xyz
        if (!viewParam) {
             const match = window.location.hash.match(/view=([^&]*)/);
             if (match) viewParam = match[1];
        }
      }

      // Always handle viewParam if present
      if (viewParam) {
        setRequestedView(viewParam);
      }

      if (token && !currentUser) {
        try {
          const user = await api.loginWithQrToken(token);
          if (user) {
            login(user);
            
            if (viewParam) {
                setRequestedView(viewParam);
            } else {
                const defaultView = user.role === Role.STUDENT ? 'transfer' : 'home';
                setRequestedView(defaultView);
            }
          } else {
            alert('유효하지 않은 QR 코드이거나 만료된 토큰입니다.');
          }
        } catch (error) {
          console.error('QR Login failed', error);
          alert('QR 코드로 로그인 중 오류가 발생했습니다.');
        } finally {
          // Clean up URL to prevent re-login on refresh
          const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          setIsTokenProcessing(false);
        }
      } else {
          setIsTokenProcessing(false);
      }
    };
    
    // Slight delay to ensure router/window is ready
    handleTokenLogin();
  }, [login, currentUser]);

  if (isTokenProcessing) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 bg-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066FF] mb-4"></div>
              <p className="text-lg font-medium">QR 코드로 접속 중입니다...</p>
          </div>
      );
  }

  if (!currentUser) {
    return isDemo ? <DemoAuthPage /> : <AuthPage />;
  }

  // 선생님인 경우 통합 메뉴 페이지 로직
  if (currentUser.role === Role.TEACHER) {
      if (!teacherActiveView) {
          return <RoleSelectionPage onSelect={setTeacherActiveView} />;
      }

      return (
          <div className="flex flex-col h-full relative">
              <div className="flex-1 h-full overflow-hidden">
                  {teacherActiveView === 'admin' && <TeacherDashboard onBackToMenu={() => setTeacherActiveView(null)} />}
                  {teacherActiveView === 'banker' && <BankerPage onBackToMenu={() => setTeacherActiveView(null)} />}
                  {teacherActiveView === 'mart' && <MartPage onBackToMenu={() => setTeacherActiveView(null)} />}
                  {teacherActiveView === 'student' && <StudentPage initialView={requestedView} onBackToMenu={() => setTeacherActiveView(null)} />}
                  {teacherActiveView === 'donation' && <StudentPage initialView="donation" onBackToMenu={() => setTeacherActiveView(null)} />}
              </div>
          </div>
      );
  }

  switch (currentUser.role) {
    case Role.STUDENT:
      return <StudentPage initialView={requestedView} />;
    case Role.MART:
      return <MartPage />;
    case Role.BANKER:
      return <BankerPage />;
    default:
      return isDemo ? <DemoAuthPage /> : <AuthPage />;
  }
};


const App: React.FC = () => {
  const snapshotKey = `${sessionKey}_snapshot`;
  const readSnapshot = (): User | null => {
      try { const value = localStorage.getItem(snapshotKey); const parsed = value ? JSON.parse(value) : null; return parsed?.userId && parsed?.role ? parsed : null; } catch { return null; }
  };
  const [currentUser, setCurrentUser] = useState<User | null>(() => readSnapshot());
  const [restoringSession, setRestoringSession] = useState(() => !readSnapshot() && Boolean(localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey)));

  // Auto-login on mount (session-based to allow clean login when reopening browser)
  useEffect(() => {
    const storedUserId = localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey);
    if (storedUserId) {
        api.login(storedUserId).then(user => {
            if (user) {
                setCurrentUser(user);
                localStorage.setItem(sessionKey, user.userId);
                localStorage.setItem(snapshotKey, JSON.stringify(user));
            } else {
                localStorage.removeItem(sessionKey);
                localStorage.removeItem(snapshotKey);
                localStorage.removeItem('class_bank_is_guest');
                sessionStorage.removeItem(sessionKey);
                sessionStorage.removeItem('class_bank_is_guest');
            }
        }).catch(err => {
            console.error("Auto login failed", err);
            // A temporary network failure after returning to a background tab must not
            // throw the user back to the first screen. Keep the verified local snapshot.
            if (!readSnapshot()) {
                localStorage.removeItem(sessionKey);
                sessionStorage.removeItem(sessionKey);
            }
        }).finally(() => setRestoringSession(false));
    } else setRestoringSession(false);
  }, []);

  const authContextValue = useMemo(() => ({
    currentUser,
    login: (user: User) => {
        // Keep the signed-in user across background tab disposal and browser restarts.
        localStorage.setItem(sessionKey, user.userId);
        sessionStorage.setItem(sessionKey, user.userId);
        localStorage.setItem(snapshotKey, JSON.stringify(user));
        localStorage.removeItem('class_bank_is_guest');
        setCurrentUser(user);
    },
    logout: () => {
        // 현재 유저의 역할을 명확히 확인
        const role = currentUser?.role;
        const isStudent = role === Role.STUDENT;
        
        // 세션 및 로컬 스토리지 완벽히 비우기
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(snapshotKey);
        localStorage.removeItem('class_bank_is_guest');
        sessionStorage.removeItem(sessionKey);
        sessionStorage.removeItem('class_bank_is_guest');
        
        // 주소 깨짐 방지를 위해 상대 경로 기반으로 리다이렉트 주소 설정
        // 학생인 경우 mode=app 파라미터를 붙여 학생 로그인 창이 뜨도록 함
        const redirectUrl = isStudent ? "/?mode=app" : "/";
        
        // 상태 초기화
        setCurrentUser(null);
        
        // 페이지 새로고침과 함께 리다이렉트
        window.location.href = redirectUrl;
    },
  }), [currentUser]);

  return (
    <AuthContext.Provider value={authContextValue}>
      <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dbeafe_0,transparent_42%),#eef3f9] md:p-4 flex flex-col justify-center items-center">
        {isDemo && <div className="w-full md:max-w-5xl bg-amber-100 text-amber-950 px-4 py-2 text-sm flex justify-between items-center gap-3" role="status">
          <span>가상 학급 · 실제 계좌와 연결되지 않음</span>
          <button className="font-bold underline shrink-0" onClick={() => { sessionStorage.removeItem(sessionKey); setCurrentUser(null); }}>계정 선택</button>
        </div>}
        <div className="w-full h-full md:max-w-6xl md:h-[calc(100vh-2rem)] bg-white md:rounded-[28px] shadow-xl overflow-hidden flex flex-col">
          {restoringSession ? <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-600"><div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"/><p className="font-bold">이전 화면을 복원하는 중...</p></div> : <AppContent />}
        </div>
      </div>
    </AuthContext.Provider>
  );
};

export default App;

