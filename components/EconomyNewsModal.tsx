import React, { useEffect } from 'react';
import { XIcon, NewspaperIcon } from './icons';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { User } from '../types';
import EconomyNewsPanel from '../features/economy-news/EconomyNewsPanel';

interface EconomyNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  onBalanceChanged?: () => void;
}

export const EconomyNewsModal: React.FC<EconomyNewsModalProps> = ({ isOpen, onClose, user, onBalanceChanged }) => {
  const { currentUser } = useContext(AuthContext);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[150] p-2 md:p-6 animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[28px] md:rounded-[36px] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white" 
        onClick={e => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600">
              <NewspaperIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base md:text-lg">어린이 경제뉴스</h3>
              <p className="text-xs font-bold text-gray-400">실시간 경제 소식 & 맞춤 뉴스</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-all"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 w-full h-full bg-white relative">
          {(user || currentUser) ? <EconomyNewsPanel user={(user || currentUser)!} onBalanceChanged={onBalanceChanged} /> : <div className="p-8 text-gray-700">로그인 정보를 확인할 수 없습니다.</div>}
        </div>
      </div>
    </div>
  );
};
