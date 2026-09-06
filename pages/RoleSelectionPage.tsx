import {KeyboardArtwork} from '../components/RoleMenuArtwork';

import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { MainAdminIcon, MainBankIcon, MainMartIcon, StudentIcon, LogoutIcon, NewspaperIcon, HeartIcon } from '../components/icons';
import { EconomyReadingModal } from '../components/EconomyReadingModal';
import { EconomyTypingModal } from '../components/EconomyTypingModal';
import { EconomyNewsModal } from '../components/EconomyNewsModal';

interface RoleSelectionPageProps {
  onSelect: (view: 'admin' | 'banker' | 'mart' | 'student') => void;
}

const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({ onSelect }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showTypingModal, setShowTypingModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);

  const roles = [
    { 
      id: 'admin', 
      title: '교사 관리자', 
      desc: '학급 경제 시스템 전체 세팅, 학생 및 직업/세금 관리', 
      icon: MainAdminIcon, 
      color: 'bg-[#0066FF]',
      image: '/design/role-teacher.png',
      target: 'admin' as const
    },
    { 
      id: 'banker', 
      title: '은행원 모드', 
      desc: '입출금 처리, 주식 상장/가격 관리 및 예금 상품 관리', 
      icon: MainBankIcon, 
      color: 'bg-[#5856D6]',
      image: '/design/role-banker.png',
      target: 'banker' as const
    },
    { 
      id: 'mart', 
      title: '마트 모드', 
      desc: '마트 POS기기를 통한 결제 관리 및 마트 수익금 송금', 
      icon: MainMartIcon, 
      color: 'bg-[#34C759]',
      image: '/design/role-mart.png',
      target: 'mart' as const
    },
    { 
      id: 'student', 
      title: '학생 페이지', 
      desc: '학생의 시점에서 자산 확인, 송금 및 투자 시스템 확인', 
      icon: StudentIcon, 
      color: 'bg-[#FF9500]/50',
      image: '/design/hero-wallet.png',
      target: 'student' as const
    },
  ];

  return (
    <div className="role-selection flex flex-col bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_36%),linear-gradient(145deg,#f8fbff,#eef4ff)] p-6">
      <div className="max-w-4xl mx-auto w-full flex-grow flex flex-col justify-center py-12">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
              안녕하세요, <br className="md:hidden" />
              <span className="text-[#0066FF]">{currentUser?.teacherAlias || currentUser?.name}</span> 선생님
            </h1>
            <p className="text-gray-500 font-bold text-sm tracking-tight">오늘은 어떤 업무를 수행하시겠습니까?</p>
          </div>
          <button 
            onClick={logout} 
            className="group flex items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-white hover:border-red-100 hover:bg-red-50 transition-all active:scale-95"
          >
            <span className="text-xs font-bold text-gray-400 group-hover:text-red-500">로그아웃</span>
            <LogoutIcon className="w-5 h-5 text-gray-300 group-hover:text-red-500" />
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelect(role.target)}
              className="group relative bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:scale-[1.03] hover:border-[#0066FF]/20 transition-all flex items-center text-left"
            >
              <div className="mr-6 flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-50 to-white shadow-inner"><img src={role.image} alt="" className="h-24 w-24 object-contain transition-transform group-hover:scale-110" /></div>
              
              <div className="flex-1 pr-4">
                <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-[#0066FF] transition-colors">{role.title}</h3>
                <p className="text-sm text-gray-400 font-bold leading-snug tracking-tight">{role.desc}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#0066FF] transition-colors shrink-0">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* 경제 뉴스 및 경제 상식 알기, 경제 자판 연습 버튼 추가 */}
        <div className="mt-8 flex flex-col md:flex-row justify-center gap-4 flex-wrap">
          <button
            data-sfx="news-open" onClick={() => setShowNewsModal(true)}
            className="group flex items-center gap-3 px-8 py-5 bg-white rounded-[30px] shadow-[0_8px_25px_rgba(0,0,0,0.03)] border border-white hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] hover:scale-[1.02] hover:border-indigo-100 transition-all active:scale-95 w-full md:w-auto md:min-w-[280px] justify-center"
          >
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <img src="/design/news-ai.png" alt="" className="w-12 h-12 object-contain"/>
            </div>
            <span className="text-lg font-black text-gray-800 group-hover:text-indigo-600 transition-colors">경제 뉴스 바로가기</span>
          </button>

          <button
            data-sfx="news-open" onClick={() => setShowReadingModal(true)}
            className="group flex items-center gap-3 px-8 py-5 bg-white rounded-[30px] shadow-[0_8px_25px_rgba(0,0,0,0.03)] border border-white hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] hover:scale-[1.02] hover:border-indigo-100 transition-all active:scale-95 w-full md:w-auto md:min-w-[280px] justify-center text-left"
          >
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <img src="/design/asset-savings.png" alt="" className="w-12 h-12 object-contain"/>
            </div>
            <span className="text-lg font-black text-gray-800 group-hover:text-indigo-600 transition-colors">경제 상식 알기</span>
          </button>

          <button
            data-sfx="news-open" onClick={() => setShowTypingModal(true)}
            className="group flex items-center gap-3 px-8 py-5 bg-white rounded-[30px] shadow-[0_8px_25px_rgba(0,0,0,0.03)] border border-white hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] hover:scale-[1.02] hover:border-amber-100 transition-all active:scale-95 w-full md:w-auto md:min-w-[280px] justify-center text-left"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <span className="main-keyboard-art"><KeyboardArtwork/></span>
            </div>
            <span className="text-lg font-black text-gray-800 group-hover:text-amber-600 transition-colors">경제 자판 연습</span>
          </button>
        </div>

        {/* 경제 뉴스 모달 */}
        <EconomyNewsModal isOpen={showNewsModal} onClose={() => setShowNewsModal(false)} />

        {/* 경제 상식 알기 모달 */}
        <EconomyReadingModal isOpen={showReadingModal} onClose={() => setShowReadingModal(false)} />
        
        {/* 경제 자판 연습 모달 */}
        <EconomyTypingModal userId={currentUser?.role==='student'?currentUser.userId:undefined} isOpen={showTypingModal} onClose={() => setShowTypingModal(false)} />
        

      </div>
    </div>
  );
};

export default RoleSelectionPage;
