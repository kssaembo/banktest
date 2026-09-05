import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Role, User } from '../types';

export default function DemoAuthPage() {
  const { login } = useContext(AuthContext);
  const [students, setStudents] = useState<User[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.getUsersByRole(Role.STUDENT, 'guest_teacher').then(setStudents).catch(e => setError(e.message)); }, []);
  const enter = async (id: string) => {
    try { const user = await api.login(id); if (user) login(user); }
    catch (e) { setError(e instanceof Error ? e.message : '학급을 열 수 없습니다.'); }
  };
  return <main className="flex-1 overflow-y-auto bg-[#F2F4F7] p-6 md:p-12">
    <div className="max-w-xl mx-auto py-8">
      <p className="font-bold text-[#0066FF] mb-3">CLASS BANK · 가상 학급</p>
      <h1 className="text-3xl font-black text-gray-900 mb-4">우리 반 경제생활</h1>
      <p className="text-gray-600 mb-8 leading-relaxed">가상 학생과 화폐로 기존 기능을 살펴보세요. 변경 내용은 이 탭에만 저장되며 실제 학급에 영향을 주지 않습니다.</p>
      <button onClick={() => enter('guest_teacher')} className="w-full text-left bg-[#0066FF] text-white rounded-2xl p-6 shadow mb-8 hover:bg-blue-700">
        <span className="block text-xl font-bold">교사로 시작하기</span>
        <span className="block mt-2 opacity-90">학생 관리 · 은행 · 마트 · 학생 화면</span>
      </button>
      <h2 className="font-bold text-lg mb-4">학생으로 시작하기</h2>
      <div className="grid grid-cols-2 gap-3">{students.map(s => <button key={s.userId} onClick={() => enter(s.userId)} className="bg-white text-left p-4 rounded-xl border border-gray-200 hover:border-blue-500">
        <span className="block text-sm text-gray-500">{s.grade}학년 {s.class}반 {s.number}번</span><span className="block font-bold mt-1 text-gray-900">{s.name}</span>
      </button>)}</div>
      {error && <p role="alert" className="text-red-700 mt-4">{error}</p>}
      <p className="text-sm text-gray-500 mt-8">이 화면은 개발용 체험입니다. 실제 서비스의 로그인 및 거래 검증은 별도로 진행합니다.</p>
    </div>
  </main>;
}
