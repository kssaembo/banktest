/* ... existing sql comments ... */
import { api } from '../services/api';
import React, { useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { FeatureGuide, OverviewCards } from '../components/FeatureGuide';
import { ChartModal, DonutCard, SegmentedBar, TrendChart } from '../components/VisualAnalytics';

const downloadFile = (name: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
import { User, Role, Account, Transaction, Job, AssignedStudent, TransactionType, TaxItemWithRecipients, Fund, FundStatus, Donation } from '../types';
import { LogoutIcon, QrCodeIcon, UserAddIcon, XIcon, CheckIcon, ErrorIcon, BackIcon, NewDashboardIcon, NewBriefcaseIcon, NewManageAccountsIcon, ManageIcon, NewTaxIcon, NewFundIcon, NewStudentIcon, PencilIcon, ArrowDownIcon, ArrowUpIcon, PlusIcon, BellIcon, TransferIcon, HeartIcon, NewStockIcon } from '../components/icons';
import { QRCodeSVG } from 'qrcode.react';

// --- Helpers ---
const getQrBaseUrl = () => {
    const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
    return (configuredUrl || window.location.origin).replace(/\/$/, '');
};

const getDDay = (targetDateStr: string) => {
    const target = new Date(targetDateStr);
    target.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = target.getTime() - today.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const creditTypes = new Set(['Deposit','Salary','StockSell','SavingsMaturity','FundPayout','FundSettle']);
const signedTransaction = (transaction: any) => creditTypes.has(transaction.type) ? Math.abs(Number(transaction.amount || 0)) : -Math.abs(Number(transaction.amount || 0));
const makeBalanceTrend = (transactions: any[], currentBalance: number) => {
    const newest=[...transactions].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
    let balance=currentBalance;
    const points=[{label:'현재',value:Math.round(balance)}];
    newest.forEach(transaction=>{ balance-=signedTransaction(transaction); points.push({label:new Date(transaction.date).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}),value:Math.round(balance)}); });
    return points.reverse().slice(-12);
};

interface AlarmItem {
    id: string;
    type: 'danger' | 'warning' | 'info';
    category: string;
    message: string;
    date: Date;
}

// --- Common Components ---

const ConfirmModal: React.FC<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    isDangerous?: boolean;
}> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "확인", isDangerous = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{title}</h3>
                <p className="text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300">취소</button>
                    <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-white rounded-lg font-medium ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2B548F] hover:bg-[#234576]'}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MessageModal: React.FC<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
    onClose: () => void;
}> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center">
                {type === 'success' ? <img src="/design/success-coin.png" alt="" className="mb-2 h-20 w-20 object-contain" /> : <ErrorIcon className="w-12 h-12 text-red-500 mb-4" />}
                <h3 className={`text-xl font-bold mb-2 ${type === 'success' ? 'text-gray-900' : 'text-red-600'}`}>
                    {type === 'success' ? '성공' : '오류'}
                </h3>
                <p className="text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>
                <button onClick={onClose} className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300">
                    확인
                </button>
            </div>
        </div>
    );
};

// --- Modals ---

const AddStudentModal: React.FC<{ onClose: () => void, onComplete: () => void }> = ({ onClose, onComplete }) => {
    const { currentUser } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('');
    const [classNum, setClassNum] = useState('');
    const [number, setNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !grade || !classNum || !number || !currentUser) return;
        setLoading(true);
        try {
            await api.addStudent(name, parseInt(grade), parseInt(classNum), parseInt(number), currentUser.userId);
            onComplete();
            onClose();
        } catch (e: any) {
            console.error(e);
            alert(e.message || '학생 추가 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4">학생 추가</h3>
                <div className="space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름" className="w-full p-3 border rounded-lg" />
                    <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={grade} onChange={e => setGrade(e.target.value)} placeholder="학년" className="w-full p-3 border rounded-lg" />
                        <input type="number" value={classNum} onChange={e => setClassNum(e.target.value)} placeholder="반" className="w-full p-3 border rounded-lg" />
                        <input type="number" value={number} onChange={e => setNumber(e.target.value)} placeholder="번호" className="w-full p-3 border rounded-lg" />
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-[#2B548F] text-white font-bold rounded-lg disabled:bg-gray-300">
                        {loading ? '추가 중...' : '추가하기'}
                    </button>
                    <button onClick={onClose} className="w-full py-2 text-gray-500 font-medium">닫기</button>
                </div>
            </div>
        </div>
    );
};

const EditStudentModal: React.FC<{ student: User, onClose: () => void, onComplete: () => void }> = ({ student, onClose, onComplete }) => {
    const [name, setName] = useState(student.name);
    const [grade, setGrade] = useState(student.grade?.toString() || '');
    const [classNum, setClassNum] = useState(student.class?.toString() || '');
    const [number, setNumber] = useState(student.number?.toString() || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !grade || !classNum || !number) return;
        setLoading(true);
        try {
            await api.updateStudent(student.userId, name, parseInt(grade), parseInt(classNum), parseInt(number));
            onComplete();
            onClose();
        } catch (e: any) {
            console.error(e);
            alert(e.message || '학생 정보 수정 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4">학생 정보 수정</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 ml-1">이름</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름" className="w-full p-3 border rounded-lg" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 ml-1">학년</label>
                            <input type="number" value={grade} onChange={e => setGrade(e.target.value)} placeholder="학년" className="w-full p-3 border rounded-lg" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 ml-1">반</label>
                            <input type="number" value={classNum} onChange={e => setClassNum(e.target.value)} placeholder="반" className="w-full p-3 border rounded-lg" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 ml-1">번호</label>
                            <input type="number" value={number} onChange={e => setNumber(e.target.value)} placeholder="번호" className="w-full p-3 border rounded-lg" />
                        </div>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-[#2B548F] text-white font-bold rounded-lg disabled:bg-gray-300">
                        {loading ? '수정 중...' : '수정하기'}
                    </button>
                    <button onClick={onClose} className="w-full py-2 text-gray-500 font-medium">닫기</button>
                </div>
            </div>
        </div>
    );
};

const QrPrintModal: React.FC<{ students: (User & { account: Account | null })[], onClose: () => void }> = ({ students, onClose }) => {
    const baseUrl = getQrBaseUrl();

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
            return;
        }

        const qrCardsHtml = students.map(s => {
            const qrElement = document.getElementById(`qr-code-${s.userId}`);
            const qrSvg = qrElement ? qrElement.innerHTML : '';
            return `
                <div class="qr-card">
                    <div class="student-info">${s.grade}-${s.class} ${s.number} ${s.name}</div>
                    <div class="qr-svg-container">${qrSvg}</div>
                    <div class="qr-footer">QR 코드를 스캔하면 계좌로 바로 접속됩니다.<br/><span style="color:#666; font-size:9px;">※ 모바일에서 QR코드 인식 시 Chrome 브라우저로 접속 할 수 있도록 해주세요.</span></div>
                </div>
            `;
        }).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR 코드 출력</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 15mm; font-family: sans-serif; background: white; }
                    .qr-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 10mm;
                    }
                    .qr-card {
                        border: 1px solid #eee;
                        border-radius: 12px;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    .student-info { font-size: 16px; font-weight: bold; margin-bottom: 12px; color: #333; }
                    .qr-svg-container { background: white; padding: 5px; border: 1px solid #f0f0f0; border-radius: 8px; }
                    .qr-svg-container svg { width: 140px; height: 140px; display: block; }
                    .qr-footer { font-size: 10px; color: #999; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="qr-grid">
                    ${qrCardsHtml}
                </div>
                <script>
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-gray-800">QR 코드 출력 미리보기</h3>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">인쇄하기</button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300">닫기</button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-8 bg-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {students.map(s => (
                            <div key={s.userId} className="bg-white p-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center text-center shadow-sm">
                                <p className="font-black text-lg mb-2 text-gray-800">{s.grade}-{s.class} {s.number} {s.name}</p>
                                <div id={`qr-code-${s.userId}`} className="p-2 bg-white border border-gray-100 rounded-lg mb-3">
                                    <QRCodeSVG value={`${baseUrl}/?token=${s.account?.qrToken}&view=transfer`} size={140} level="H" />
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium">QR 코드를 스캔하면 계좌로 바로 접속됩니다.</p>
                                <p className="text-[9px] text-indigo-600 font-semibold mt-1">※ 모바일에서 QR코드 인식 시 Chrome 브라우저로 접속 할 수 있도록 해주세요.</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 text-center text-xs text-gray-500 rounded-b-2xl space-y-1">
                    <p>인쇄 시 '배경 그래픽' 옵션을 켜주시면 더 깔끔하게 출력됩니다.</p>
                    <p className="font-bold text-indigo-600">※ 모바일에서 QR코드 인식 시 Chrome 브라우저로 접속 할 수 있도록 해주세요.</p>
                </div>
            </div>
        </div>
    );
};

const AddJobModal: React.FC<{ onClose: () => void, onComplete: () => void }> = ({ onClose, onComplete }) => {
    const { currentUser } = useContext(AuthContext); // currentUser 컨텍스트 추가
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [salary, setSalary] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !salary || !currentUser) return; // currentUser 체크 추가
        setLoading(true);
        try {
            await api.addJob(name, desc, parseInt(salary), currentUser.userId); // 4번째 인자(userId) 추가
            onComplete();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4">새 직업 추가</h3>
                <div className="space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="직업명" className="w-full p-3 border rounded-lg" />
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="설명" className="w-full p-3 border rounded-lg" rows={3} />
                    <input type="number" step="1" value={salary} onChange={e => setSalary(e.target.value)} placeholder="급여" className="w-full p-3 border rounded-lg" />
                    <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-[#2B548F] text-white font-bold rounded-lg disabled:bg-gray-300">
                        {loading ? '추가 중...' : '추가하기'}
                    </button>
                    <button onClick={onClose} className="w-full py-2 text-gray-500 font-medium">닫기</button>
                </div>
            </div>
        </div>
    );
};

const AssignJobModal: React.FC<{ job: Job, students: User[], onClose: () => void, onComplete: () => void }> = ({ job, students, onClose, onComplete }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(job.assigned_students?.map(s => s.userId) || []);
    const [loading, setLoading] = useState(false);

    const toggleStudent = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.manageJobAssignment(job.id, selectedIds);
            onComplete();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col max-h-[80vh]">
                <h3 className="text-xl font-bold mb-4">학생 배정: {job.jobName}</h3>
                <div className="flex-grow overflow-y-auto space-y-1 mb-4">
                    {students.map(s => (
                        <button key={s.userId} onClick={() => toggleStudent(s.userId)} className={`w-full flex justify-between items-center p-3.5 rounded-xl border-2 shadow-sm transition-all ${selectedIds.includes(s.userId) ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-700'}`}>
                            <span className="font-medium">{s.grade}-{s.class} {s.number} {s.name}</span>
                            {selectedIds.includes(s.userId) && <CheckIcon className="w-5 h-5" />}
                        </button>
                    ))}
                </div>
                <button onClick={handleSave} disabled={loading} className="w-full py-3 bg-[#2B548F] text-white font-bold rounded-lg">
                    {loading ? '저장 중...' : '저장하기'}
                </button>
                <button onClick={onClose} className="w-full py-2 text-gray-500 mt-2">닫기</button>
            </div>
        </div>
    );
};

const AddTaxModal: React.FC<{ students: User[], onClose: () => void, onComplete: () => void }> = ({ students, onClose, onComplete }) => {
    const { currentUser } = useContext(AuthContext); // currentUser 컨텍스트 추가
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>(students.map(s => s.userId));
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name || !amount || !dueDate || selectedIds.length === 0 || !currentUser) return; // currentUser 체크 추가
        setLoading(true);
        try {
            await api.createTax(name, parseInt(amount), dueDate, selectedIds, currentUser.userId); // 5번째 인자(userId) 추가
            onComplete();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col max-h-[90vh]">
                <h3 className="text-xl font-bold mb-4">세금 고지</h3>
                <div className="space-y-4 mb-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="세금 명칭 (예: 건강보험)" className="w-full p-3 border rounded-lg" />
                    <input type="number" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="금액" className="w-full p-3 border rounded-lg" />
                    <label className="block text-sm font-bold text-gray-700">납부 마감일<input aria-label="납부 마감일" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1.5 w-full p-3 border rounded-lg" /></label>
                </div>
                <div className="flex-grow overflow-y-auto border rounded-lg p-2 mb-4">
                    <div className="flex justify-between items-center px-2 mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase">대상 학생 선택</p>
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                if (selectedIds.length === students.length) {
                                    setSelectedIds([]);
                                } else {
                                    setSelectedIds(students.map(s => s.userId));
                                }
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                            {selectedIds.length === students.length ? '전체 해제' : '전체 선택'}
                        </button>
                    </div>
                    {students.map(s => (
                        <label key={s.userId} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input type="checkbox" checked={selectedIds.includes(s.userId)} onChange={() => setSelectedIds(prev => prev.includes(s.userId) ? prev.filter(i => i !== s.userId) : [...prev, s.userId])} className="w-5 h-5 text-indigo-600 rounded" />
                            <span className="text-sm font-medium">{s.grade}-{s.class} {s.number} {s.name}</span>
                        </label>
                    ))}
                </div>
                <button onClick={handleCreate} disabled={loading} className="w-full py-3 bg-[#2B548F] text-white font-bold rounded-lg">
                    {loading ? '고지 중...' : '고지하기'}
                </button>
                <button onClick={onClose} className="w-full py-2 text-gray-500 mt-2">닫기</button>
            </div>
        </div>
    );
};

const AddFundModal: React.FC<{ students: User[], onClose: () => void, onComplete: () => void }> = ({ students, onClose, onComplete }) => {
    const { currentUser } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [creatorId, setCreatorId] = useState('');
    const [unitPrice, setUnitPrice] = useState('10');
    const [targetAmount, setTargetAmount] = useState('1000');
    const [baseReward, setBaseReward] = useState('11'); 
    const [incentiveReward, setIncentiveReward] = useState('1'); 
    const [deadline, setDeadline] = useState('');
    const [maturity, setMaturity] = useState('');
    const [loading, setLoading] = useState(false);

    const unit = currentUser?.currencyUnit || '권';

    const handleSubmit = async () => {
        if (!name || !unitPrice || !targetAmount || !deadline || !maturity || !currentUser || !creatorId) {
            alert('모든 항목을 입력하고 신청 학생을 선택해주세요.');
            return;
        }
        setLoading(true);
        try {
            await api.createFund({
                name,
                description: desc,
                creatorId: creatorId,
                teacherId: currentUser.userId,
                unitPrice: parseInt(unitPrice),
                targetAmount: parseInt(targetAmount),
                baseReward: parseFloat(baseReward),
                incentiveReward: parseFloat(incentiveReward),
                recruitmentDeadline: deadline,
                maturityDate: maturity
            });
            onComplete();
            onClose();
        } catch (e: any) {
            console.error(e);
            alert(e.message || '펀드 등록 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col max-h-[90vh]">
                <h3 className="text-xl font-bold mb-4">새 펀드 상품 등록</h3>
                <div className="space-y-3 overflow-y-auto pr-1">
                    <div>
                        <label className="text-xs text-gray-500 ml-1">펀드 신청 학생 (기획자)</label>
                        <select 
                            value={creatorId} 
                            onChange={e => setCreatorId(e.target.value)} 
                            className="w-full p-2.5 border rounded-lg bg-white"
                        >
                            <option value="">학생을 선택하세요</option>
                            {students.map(s => (
                                <option key={s.userId} value={s.userId}>{s.grade}-{s.class} {s.number} {s.name}</option>
                            ))}
                        </select>
                    </div>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="펀드 명칭" className="w-full p-2.5 border rounded-lg" />
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="상품 설명" className="w-full p-2.5 border rounded-lg" rows={2} />
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 ml-1">1좌당 가격 ({unit})</label>
                            <input type="number" step="1" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="w-full p-2.5 border rounded-lg" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 ml-1">목표 금액 ({unit})</label>
                            <input type="number" step="1" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="w-full p-2.5 border rounded-lg" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 ml-1 font-bold text-blue-600">기본 배당금 ({unit})</label>
                            <input type="number" step="1" value={baseReward} onChange={e => setBaseReward(e.target.value)} placeholder="예: 11" className="w-full p-2.5 border-2 border-blue-100 rounded-lg focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 ml-1 font-bold text-indigo-600">추가 인센티브 ({unit})</label>
                            <input type="number" step="1" value={incentiveReward} onChange={e => setIncentiveReward(e.target.value)} placeholder="예: 1" className="w-full p-2.5 border-2 border-indigo-100 rounded-lg focus:border-indigo-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 ml-1">모집 마감일 (날짜만 선택)</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full p-2.5 border rounded-lg" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 ml-1">만기 정산일 (날짜만 선택)</label>
                        <input type="date" value={maturity} onChange={e => setMaturity(e.target.value)} className="w-full p-2.5 border rounded-lg" />
                    </div>
                </div>
                <button onClick={handleSubmit} disabled={loading} className="w-full py-3 mt-6 bg-[#2B548F] text-white font-bold rounded-lg shadow-lg hover:bg-[#234576] active:scale-95 transition-all">
                    {loading ? '등록 중...' : '상품 등록하기'}
                </button>
                <button onClick={onClose} className="w-full py-2 mt-2 text-gray-500 font-medium">닫기</button>
            </div>
        </div>
    );
};

const IssueCurrencyModal: React.FC<{ onClose: () => void, onComplete: () => void }> = ({ onClose, onComplete }) => {
    const { currentUser } = useContext(AuthContext);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const unit = currentUser?.currencyUnit || '권';

    const handleSubmit = async () => {
        if (!amount || parseInt(amount) <= 0 || !currentUser) return;
        setLoading(true);
        try {
            const targetId = currentUser.teacher_id || currentUser.userId;
            const res = await api.issueCurrency(targetId, parseInt(amount));
            const msg = typeof res === 'object' && (res as any)?.message 
                ? (res as any).message 
                : (typeof res === 'string' ? res : `${amount}${unit} 화폐가 성공적으로 발행되었습니다.`);
            await onComplete();
            setResult({ type: 'success', text: msg });
        } catch (e: any) {
            setResult({ type: 'error', text: e.message || '발행 중 오류가 발생했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    if (result) return <MessageModal isOpen type={result.type} message={result.text} onClose={() => { setResult(null); onClose(); }} />;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2">화폐 발행 (중앙은행)</h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">입력한 금액만큼 무(無)에서 화폐를 생성하여<br/><span className="text-indigo-600 font-bold">국고 계좌</span>로 즉시 입금합니다.</p>
                <div className="space-y-4">
                    <div className="relative">
                        <input type="number" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full p-4 pr-12 border-2 border-indigo-100 rounded-xl outline-none focus:border-indigo-500 text-2xl font-black" />
                        <span className="absolute right-4 top-5 font-bold text-gray-400">{unit}</span>
                    </div>
                    <button onClick={handleSubmit} disabled={loading || !amount} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:bg-gray-300">
                        {loading ? '발행 처리 중...' : '지금 발행하기'}
                    </button>
                    <button onClick={onClose} className="w-full py-2 text-gray-400 font-medium">취소</button>
                </div>
            </div>
        </div>
    );
};

const MartTransferModal: React.FC<{ onClose: () => void, onComplete: () => void }> = ({ onClose, onComplete }) => {
    const { currentUser } = useContext(AuthContext);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [teacherAccount, setTeacherAccount] = useState<Account | null>(null);
    const unit = currentUser?.currencyUnit || '권';

    useEffect(() => {
        api.getTeacherAccount().then(setTeacherAccount);
    }, []);

    const handleSubmit = async () => {
        if (!amount || parseInt(amount) <= 0 || !currentUser || !teacherAccount) return;
        setLoading(true);
        try {
            // 마트 계좌로 송금 (교사 계좌 -> 마트 계좌)
            await api.martTransfer(teacherAccount.accountId, parseInt(amount), 'FROM_STUDENT');
            onComplete();
            onClose();
        } catch (e: any) {
            alert(e.message || '송금 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2 text-indigo-600">마트 송금</h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">국고 계좌에서 <span className="font-bold text-gray-700">마트 계좌</span>로 자금을 이체합니다.</p>
                <div className="space-y-4">
                    <div className="relative">
                        <input type="number" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full p-4 pr-12 border-2 border-indigo-100 rounded-xl outline-none focus:border-indigo-500 text-2xl font-black" />
                        <span className="absolute right-4 top-5 font-bold text-gray-400">{unit}</span>
                    </div>
                    <button onClick={handleSubmit} disabled={loading || !amount} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:bg-gray-300">
                        {loading ? '처리 중...' : '송금하기'}
                    </button>
                    <button onClick={onClose} className="w-full py-2 text-gray-400 font-medium">취소</button>
                </div>
            </div>
        </div>
    );
};

const DeleteAccountModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { currentUser, logout } = useContext(AuthContext);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!password || !currentUser) return;
        setLoading(true);
        setError('');
        try {
            const result = await api.deleteTeacherAccount(currentUser.userId, password);
            if (result.success) {
                alert('계정이 삭제되었습니다. 이용해 주셔서 감사합니다.');
                logout();
            } else {
                setError(result.message);
            }
        } catch (e: any) {
            setError(e.message || '삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2 text-red-600">계정 삭제</h3>
                <div className="bg-red-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-red-700 font-bold mb-1">⚠️ 주의: 영구 삭제</p>
                    <p className="text-xs text-red-600 leading-relaxed">
                        계정을 삭제하면 모든 학생 정보, 계좌 잔액, 거래 내역이 <span className="underline">영구히 삭제되며 복구할 수 없습니다.</span>
                    </p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 ml-1">본인 확인을 위해 비밀번호를 입력하세요</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="비밀번호" 
                            className="w-full p-3 border-2 border-red-50 rounded-lg outline-none focus:border-red-500" 
                        />
                    </div>
                    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-lg">취소</button>
                        <button 
                            onClick={handleDelete} 
                            disabled={loading || !password} 
                            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg disabled:bg-gray-300"
                        >
                            {loading ? '삭제 중...' : '영구 삭제'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FundInvestorsModal: React.FC<{ fund: Fund, students?: User[], onClose: () => void }> = ({ fund, students, onClose }) => {
    const [investors, setInvestors] = useState<{ student_name: string, units: number, invested_amount: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const unit = useContext(AuthContext).currentUser?.currencyUnit || '권';

    const creator = students?.find(s => s.userId === fund.creatorId);
    const applicantName = fund.creatorName || creator?.name || fund.creatorId?.slice(0, 8) || '미지정';
    const sortedInvestors = [...investors].sort((a,b)=>Number(b.invested_amount)-Number(a.invested_amount));

    useEffect(() => {
        api.getFundInvestors(fund.id).then(setInvestors).finally(() => setLoading(false));
    }, [fund.id]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 className="text-xl font-bold text-gray-800">'{fund.name}' 투자자 목록</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <XIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {loading ? (
                        <div className="p-10 text-center text-gray-400 text-sm">조회 중...</div>
                    ) : investors.length > 0 ? (
                        <><SegmentedBar title="투자자별 투자 비율" unit={unit} rows={sortedInvestors.map(inv=>({name:inv.student_name,value:Number(inv.invested_amount)}))}/><table className="mt-4 w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-2 text-left">이름</th>
                                    <th className="p-2 text-right">구좌</th>
                                    <th className="p-2 text-right">투자액</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedInvestors.map((inv, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="p-2 font-medium">{inv.student_name}</td>
                                        <td className="p-2 text-right">{inv.units}좌</td>
                                        <td className="p-2 text-right font-bold text-indigo-600">{Number(inv.invested_amount).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></>
                    ) : (
                        <div className="p-10 text-center text-gray-400 font-medium">아직 가입한 학생이 없습니다.</div>
                    )}
                </div>

                {/* 기획자 보상 정책 */}
                <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-indigo-700 uppercase">기획자 보상 정책</span>
                        <span className="text-[10px] bg-indigo-200 text-indigo-800 font-black px-2 py-0.5 rounded-full">{applicantName}</span>
                    </div>
                    <ul className="text-[11px] text-indigo-900 font-bold space-y-1 leading-relaxed">
                        <li>• 성공: 펀딩액({Number(fund.totalInvestedAmount || 0).toLocaleString()}{unit})의 10% 지급</li>
                        <li>• 실패: 보상금 없음</li>
                    </ul>
                </div>

                {/* 투자자 보상 정책 */}
                <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-blue-700 uppercase">투자자 보상 정책</span>
                    </div>
                    <div className="text-[11px] text-blue-900 font-bold leading-relaxed">
                        • 인센티브({Number(fund.baseReward || 0).toLocaleString()}{unit}) + 추가 인센티브({Number(fund.incentiveReward || 0).toLocaleString()}{unit}) 지급
                    </div>
                </div>

                <button onClick={onClose} className="w-full py-3 mt-4 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200">닫기</button>
            </div>
        </div>
    );
};

const FailSettlementModal: React.FC<{ fund: Fund, onClose: () => void, onConfirm: (rate: number) => void }> = ({ fund, onClose, onConfirm }) => {
    const [rate, setRate] = useState<string>('');

    const handleSubmit = () => {
        const numRate = parseInt(rate);
        if (isNaN(numRate) || numRate < 0 || numRate > 100) {
            alert('0에서 100 사이의 정수를 입력해주세요.');
            return;
        }
        onConfirm(numRate);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-2">펀드 실패 정산</h3>
                <p className="text-sm text-gray-600 mb-4 font-medium leading-relaxed">
                    '{fund.name}' 펀드가 중단되었습니다.<br/>
                    실행률을 입력하면 그만큼의 원금이 학생들에게 반환됩니다.
                </p>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">펀드 실행률 (%)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={rate} 
                                onChange={e => setRate(e.target.value)} 
                                placeholder="0 ~ 100" 
                                className="w-full p-4 pr-12 border-2 border-red-50 rounded-xl outline-none focus:border-red-500 text-2xl font-black" 
                            />
                            <span className="absolute right-4 top-5 font-bold text-gray-400">%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">
                            * 학생이 실천한 펀드 실행률에 따라 원금이 반환됩니다.
                        </p>
                    </div>

                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                        <p className="text-[10px] text-red-700 font-bold leading-relaxed">
                            ⚠️ 펀드 실패 시, 신청 학생({fund.creatorName || fund.creatorId?.slice(0,8)})에게는 별도의 보상금이 지급되지 않습니다.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">취소</button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={rate === ''} 
                            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl disabled:bg-gray-300"
                        >
                            원금 반환
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Views ---

// Fix: Correctly destructure 'refresh' prop even if not currently used directly, to match type definition and prevent potential errors.
const DashboardView: React.FC<{ students: (User & { account: Account | null })[], refresh: () => void }> = ({ students, refresh }) => {
    const { currentUser } = useContext(AuthContext);
    const [teacherAccount, setTeacherAccount] = useState<Account | null>(null);
    const [teacherTransactions, setTeacherTransactions] = useState<Transaction[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false); // 발행 모달 상태 추가
    const [showMartModal, setShowMartModal] = useState(false); // 마트 송금 모달 상태 추가
    const [showDeleteModal, setShowDeleteModal] = useState(false); // 계정 삭제 모달 상태 추가
    const [visibleTeacherTxns, setVisibleTeacherTxns] = useState(5);
    const [visibleHistoryModalTxns, setVisibleHistoryModalTxns] = useState(10);
    const [activeTab, setActiveTab] = useState<'assets' | 'activity_up' | 'activity_down'>('assets');
    const [visibleRankingCount, setVisibleRankingCount] = useState(3);
    const [studentActivities, setStudentActivities] = useState<Record<string, number>>({});
    const [alarms, setAlarms] = useState<AlarmItem[]>([]);
    const [isAlarmsLoading, setIsAlarmsLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState<string | null>(null);
    const [studentTransactions, setStudentTransactions] = useState<Record<string, Transaction[]>>({});
    const [trendMetric, setTrendMetric] = useState<'total'|'average'|null>(null);
    const [trendStudent, setTrendStudent] = useState<(User & { account: Account | null }) | null>(null);
    const [csvDialog, setCsvDialog] = useState(false);
    const [csvRange, setCsvRange] = useState({start:'',end:new Date().toISOString().slice(0,10)});

    const alias = currentUser?.teacherAlias || '교사';
    const unit = currentUser?.currencyUnit || '권';

    const fetchTeacherData = useCallback(async () => {
        try {
            const targetId = currentUser?.teacher_id || currentUser?.userId;
            const acc = await api.getTeacherAccount(targetId);
            setTeacherAccount(acc);
            if (acc) {
                const trans = await api.getTransactionsByAccountId(acc.accountId);
                setTeacherTransactions(trans);
            }
        } catch (err) {
            console.error("Failed to fetch teacher account", err);
        }
    }, [currentUser?.teacher_id, currentUser?.userId]);

    useEffect(() => {
        fetchTeacherData();
    }, [fetchTeacherData]);

    useEffect(() => {
        const fetchData = async () => {
            setIsAlarmsLoading(true);
            const activityMap: Record<string, number> = {};
            const transactionMap: Record<string, Transaction[]> = {};
            const newAlarms: AlarmItem[] = [];
            const todayStr = new Date().toLocaleDateString();

            try {
                const [taxes, funds] = await Promise.all([
                    api.getTaxes(currentUser?.userId || ''), 
                    api.getFunds(currentUser?.userId || '')
                ]);
                
                taxes.forEach(tax => {
                    const dDay = getDDay(tax.dueDate);
                    if (dDay >= 0 && dDay <= 3) {
                        newAlarms.push({
                            id: `tax-${tax.id}-${dDay}`,
                            type: dDay === 0 ? 'danger' : 'warning',
                            category: '세금',
                            message: `'${tax.name}' 세금 납부 마감 ${dDay === 0 ? '당일' : 'D-' + dDay}입니다.`,
                            date: new Date()
                        });
                    }
                });

                funds.forEach(fund => {
                    if (fund.status === FundStatus.ONGOING || fund.status === FundStatus.RECRUITING) {
                        const dDay = getDDay(fund.maturityDate);
                        if (dDay >= 0 && dDay <= 3) {
                             newAlarms.push({
                                id: `fund-${fund.id}-${dDay}`,
                                type: dDay === 0 ? 'danger' : 'warning',
                                category: '펀드',
                                message: `'${fund.name}' 펀드 만기 ${dDay === 0 ? '당일' : 'D-' + dDay}입니다.`,
                                date: new Date()
                            });
                        }
                    }
                });

                await Promise.all(students.map(async (s) => {
                    if (s.account) {
                        const txns = await api.getTransactionsByAccountId(s.account.accountId);
                        transactionMap[s.userId] = txns;
                        activityMap[s.userId] = txns.length;

                        txns.forEach(t => {
                            const tDate = new Date(t.date).toLocaleDateString();
                            if (tDate === todayStr) {
                                if (Math.abs(t.amount) >= 100) {
                                    newAlarms.push({
                                        id: `large-tx-${t.transactionId}`,
                                        type: 'info',
                                        category: '고액거래',
                                        message: `${s.name} 학생: ${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${unit} 고액 거래 발생 (${t.description})`,
                                        date: new Date(t.date)
                                    });
                                }
                            }
                        });
                    } else {
                        activityMap[s.userId] = 0;
                    }
                }));

                setStudentActivities(activityMap);
                setStudentTransactions(transactionMap);
                setAlarms(newAlarms.sort((a,b) => b.date.getTime() - a.date.getTime()));
            } catch (err) {
                console.error("Failed to gather activity data", err);
            } finally {
                setIsAlarmsLoading(false);
            }
        };
        if (students.length > 0) fetchData();
    }, [students, unit, currentUser?.userId]);

    const totalAssets = students.reduce((acc, s) => acc + (s.account?.balance || 0), 0);
    const avgAssets = students.length > 0 ? Math.round(totalAssets / students.length) : 0;
    const classTrend = useMemo(()=>makeBalanceTrend(Object.values(studentTransactions).flat(),totalAssets).map(point=>({label:point.label,total:point.value,average:Math.round(point.value/Math.max(1,students.length))})),[studentTransactions,totalAssets,students.length]);
    const selectedTrend = useMemo(()=>trendStudent ? makeBalanceTrend(studentTransactions[trendStudent.userId]||[],trendStudent.account?.balance||0).map((point,index)=>({label:point.label,assets:point.value,activity:index+1})) : [],[trendStudent,studentTransactions]);
    const exportCsv = async () => {
        if(!currentUser)return; setExporting(true);
        try{
            const teacherId=currentUser.userId;
            const [jobs,taxes,funds,donations,savings,stocks] = await Promise.all([api.getJobs(teacherId),api.getTaxes(teacherId),api.getFunds(teacherId),api.getDonations(teacherId),api.getSavingsProducts(teacherId),api.getStockProducts(teacherId)]);
            const start=csvRange.start?new Date(`${csvRange.start}T00:00:00`).getTime():-Infinity,end=csvRange.end?new Date(`${csvRange.end}T23:59:59`).getTime():Infinity;
            const transactions=(Object.entries(studentTransactions) as [string,Transaction[]][]).flatMap(([userId,items])=>items.map(item=>({userId,...item}))).filter(item=>{const time=new Date(item.date).getTime();return time>=start&&time<=end;});
            const rows:any[][]=[['[학생 자산 현황]'],['번호','이름','학년','반','계좌번호','현재 잔액'],...students.map(s=>[s.number,s.name,s.grade,s.class,s.account?.accountId,s.account?.balance??0]),[],['[기간 내 전체 거래 기록]'],['일시','학생','거래 종류','금액','설명'],...transactions.map(t=>[t.date,students.find(s=>s.userId===t.userId)?.name||t.userId,t.type,t.amount,t.description]),[],['[직업]'],['직업명','급여','인센티브','배정 학생'],...jobs.map(j=>[j.jobName,j.salary,j.incentive,j.assigned_students.map(s=>s.name).join(' / ')]),[],['[세금]'],['세금명','금액','마감일','납부','미납'],...taxes.map(t=>[t.name,t.amount,t.dueDate,t.recipients.filter(r=>r.isPaid).length,t.recipients.filter(r=>!r.isPaid).length]),[],['[펀드]'],['펀드명','상태','투자자 수','총 투자금'],...funds.map(f=>[f.name,f.status,f.investorCount||0,f.totalInvestedAmount||0]),[],['[기부]'],['기부명','상태','누적 기부액'],...donations.map(d=>[d.title,d.status,d.current_amount||0]),[],['[예금 상품]'],['상품명','만기일수','이율','최대금액'],...savings.map(s=>[s.name,s.maturityDays,s.rate,s.maxAmount]),[],['[주식 종목]'],['종목명','현재가격','발행수량','평가액'],...stocks.map(s=>[s.name,s.currentPrice,(s as any).totalQuantity||0,(s as any).valuation||0])];
            downloadFile(`classbank-dashboard-${csvRange.start||'all'}-${csvRange.end||'today'}.csv`,'\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\n'),'text/csv;charset=utf-8'); setCsvDialog(false);setExportMessage('대시보드 전체 CSV를 저장했습니다.');
        }catch(e:any){setExportMessage(e.message||'CSV를 만들지 못했습니다.');}finally{setExporting(false);}
    };
    const exportBackup = async () => {
        if (!currentUser) return; setExporting(true);
        try {
            const teacherId = currentUser.userId;
            const [jobs,taxes,funds,donations,savings,stocks,teacherAccount] = await Promise.all([api.getJobs(teacherId),api.getTaxes(teacherId),api.getFunds(teacherId),api.getDonations(teacherId),api.getSavingsProducts(teacherId),api.getStockProducts(teacherId),api.getTeacherAccount(teacherId)]);
            const transactionGroups = await Promise.all([teacherAccount, ...students.map(s=>s.account)].filter(Boolean).map(acc => api.getTransactionsByAccountId((acc as Account).accountId)));
            const backup = { format:'classbank-backup-v1', exportedAt:new Date().toISOString(), teacher:{ userId:teacherId, alias:currentUser.teacherAlias, classCode:currentUser.classCode, currencyUnit:unit }, students, jobs, taxes, funds, donations, savings, stocks, transactions:transactionGroups.flat() };
            downloadFile(`classbank-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(backup,null,2), 'application/json;charset=utf-8');
            setExportMessage('학급 데이터 백업 파일을 저장했습니다.');
        } catch(e:any){ setExportMessage(e.message || '백업을 만들지 못했습니다.'); } finally { setExporting(false); }
    };
    
    const sortedRankingList = useMemo(() => {
        let list = [...students];
        if (activeTab === 'assets') {
            list.sort((a, b) => (b.account?.balance || 0) - (a.account?.balance || 0));
        } else if (activeTab === 'activity_up') {
            list.sort((a, b) => (studentActivities[b.userId] || 0) - (studentActivities[a.userId] || 0));
        } else if (activeTab === 'activity_down') {
            list.sort((a, b) => (studentActivities[a.userId] || 0) - (studentActivities[b.userId] || 0));
        }
        return list;
    }, [students, activeTab, studentActivities]);

    const handleIssueComplete = () => {
        fetchTeacherData();
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-wrap justify-end gap-2"><button onClick={()=>setCsvDialog(true)} className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700">CSV 다운로드</button><button onClick={exportBackup} disabled={exporting} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{exporting?'백업 준비 중...':'전체 백업'}</button></div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 선생님 지갑 박스: 가로 2배 (md:col-span-2) */}
                <div onClick={() => { setVisibleHistoryModalTxns(10); setShowHistoryModal(true); }} className="md:col-span-2 bg-[#2B548F] text-white p-8 rounded-xl shadow-lg cursor-pointer hover:bg-[#234576] transition-colors relative overflow-hidden group min-h-[160px] flex flex-col justify-center">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-medium text-blue-200 text-sm mb-1">{alias} 지갑 (국고)</h3>
                                <p className="text-5xl font-black">{teacherAccount?.balance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '0.0'}{unit}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowIssueModal(true); }} 
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg border border-white/30 transition-all active:scale-95 text-xs flex items-center"
                                >
                                    <PlusIcon className="w-4 h-4 mr-1" /> 발행
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowMartModal(true); }} 
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg border border-white/30 transition-all active:scale-95 text-xs flex items-center"
                                >
                                    <TransferIcon className="w-4 h-4 mr-1" /> 마트 송금
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-blue-200 mt-4 flex items-center">내역 보기 <span className="ml-1">→</span></p>
                    </div>
                    <img src="/design/hero-wallet.png" alt="" className="pointer-events-none absolute bottom-0 right-24 hidden h-36 object-contain opacity-90 md:block"/>
                </div>

                {/* 우측 세로 배열 박스들 */}
                <div className="flex flex-col gap-4">
                    <button onClick={()=>setTrendMetric('total')} className="group bg-white p-5 rounded-xl shadow-sm border border-indigo-100 flex justify-between items-center text-left transition hover:-translate-y-0.5 hover:shadow-md">
                        <h3 className="text-gray-500 font-bold text-sm">총 통화량</h3>
                        <p className="text-xl font-black text-indigo-600">{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit} <span className="inline-block animate-pulse text-sm">↗</span></p>
                    </button>
                    <button onClick={()=>setTrendMetric('average')} className="group bg-white p-5 rounded-xl shadow-sm border border-emerald-100 flex justify-between items-center text-left transition hover:-translate-y-0.5 hover:shadow-md">
                        <h3 className="text-gray-500 font-bold text-sm">평균 자산</h3>
                        <p className="text-xl font-black text-green-600">{avgAssets.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit} <span className="inline-block animate-pulse text-sm">↗</span></p>
                    </button>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <h3 className="text-gray-500 font-bold text-sm">등록 학생</h3>
                        <p className="text-xl font-black text-gray-800">{students.length}명</p>
                    </div>
                </div>
             </div>

             {exportMessage && <div className="rounded-xl bg-blue-50 p-3 text-center text-sm font-bold text-blue-700">{exportMessage} <button onClick={()=>setExportMessage(null)} className="ml-2 underline">닫기</button></div>}

             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <BellIcon className="w-5 h-5 mr-2 text-red-500 animate-bounce" /> 학급 경제 주요 알림
                    </h3>
                    <span className="text-xs text-gray-400">실시간 집계</span>
                </div>
                <div className="divide-y divide-gray-50">
                    {isAlarmsLoading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">데이터 분석 중...</div>
                    ) : alarms.length > 0 ? (
                        alarms.map(alarm => (
                            <div key={alarm.id} className="p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alarm.type === 'danger' ? 'bg-red-500' : alarm.type === 'warning' ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${alarm.type === 'danger' ? 'bg-red-50 text-red-600' : alarm.type === 'warning' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {alarm.category}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{new Date(alarm.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-xs text-gray-700 font-medium">{alarm.message}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-10 text-center text-gray-400 text-sm">현재 중요한 알림이 없습니다.</div>
                    )}
                </div>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
                     <div className="p-1 border-b bg-gray-50 flex">
                         <button 
                            onClick={() => { setActiveTab('assets'); setVisibleRankingCount(3); }}
                            className={`flex-1 py-3 text-sm font-bold transition-colors rounded-t-lg ${activeTab === 'assets' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                             자산 순위
                         </button>
                         <button 
                            onClick={() => { setActiveTab('activity_up'); setVisibleRankingCount(3); }}
                            className={`flex-1 py-3 text-sm font-bold transition-colors rounded-t-lg ${activeTab === 'activity_up' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                             활동량 ↑
                         </button>
                         <button 
                            onClick={() => { setActiveTab('activity_down'); setVisibleRankingCount(3); }}
                            className={`flex-1 py-3 text-sm font-bold transition-colors rounded-t-lg ${activeTab === 'activity_down' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                             활동량 ↓
                         </button>
                     </div>
                     <ul className="flex-grow">
                         {sortedRankingList.slice(0, visibleRankingCount).map((s, index) => (
                             <li key={s.userId} onMouseEnter={()=>setTrendStudent(s)} onClick={()=>setTrendStudent(s)} className="cursor-pointer p-4 border-b last:border-b-0 flex items-center justify-between hover:bg-blue-50 transition-colors">
                                 <div className="flex items-center">
                                     <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-50 text-gray-400'}`}>
                                         {index + 1}
                                     </span>
                                     <div>
                                         <p className="font-bold text-gray-800">{s.name}</p>
                                         <p className="text-xs text-gray-500">{s.grade}학년 {s.class}반 {s.number}번</p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="block font-mono font-bold text-indigo-600">{(s.account?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span>
                                    <span className="text-[10px] text-gray-400">활동 {studentActivities[s.userId] || 0}회</span>
                                 </div>
                             </li>
                         ))}
                         {sortedRankingList.length === 0 && <li className="p-8 text-center text-gray-400">데이터가 없습니다.</li>}
                     </ul>
                     {sortedRankingList.length > visibleRankingCount && (
                         <button 
                            onClick={() => setVisibleRankingCount(prev => prev + 5)}
                            className="w-full py-4 text-sm font-bold text-indigo-600 hover:bg-indigo-50 border-t transition-colors bg-white active:bg-indigo-100"
                         >
                            순위 더보기 (+5명)
                         </button>
                     )}
                 </div>
                 
                 <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
                     {trendStudent&&<div className="border-b bg-blue-50/50 p-4"><div className="flex items-center justify-between"><h3 className="font-black text-slate-800">{trendStudent.name} 학생 {activeTab==='assets'?'자산':'활동량'} 흐름</h3><span className="text-[10px] font-bold text-blue-500">순위에서 학생을 선택</span></div><TrendChart height={170} data={selectedTrend} lines={[activeTab==='assets'?{key:'assets',name:'자산 경향',color:'#2563eb'}:{key:'activity',name:'활동량 경향',color:'#10b981'}]}/></div>}
                     <div className="p-4 border-b bg-gray-50">
                         <h3 className="font-bold text-gray-800">국고 최근 거래 내역</h3>
                     </div>
                     <ul className="flex-grow">
                         {teacherTransactions.slice(0, visibleTeacherTxns).map(t => (
                             <li key={t.transactionId} className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                                 <div className="flex justify-between items-start mb-1">
                                     <span className="font-medium text-sm text-gray-800">{t.description}</span>
                                     <span className={`font-bold text-sm ${t.amount > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                         {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                     </span>
                                 </div>
                                 <div className="text-xs text-gray-400 text-right">
                                     {new Date(t.date).toLocaleString()}
                                 </div>
                             </li>
                         ))}
                         {teacherTransactions.length === 0 && <li className="p-8 text-center text-gray-400"><img src="/design/empty-transactions.png" alt="" className="mx-auto h-24 object-contain"/><span>거래 내역이 없습니다.</span></li>}
                     </ul>
                     {teacherTransactions.length > visibleTeacherTxns && (
                         <button 
                            onClick={() => setVisibleTeacherTxns(prev => prev + 10)}
                            className="w-full py-4 text-sm font-bold text-[#2B548F] hover:bg-blue-50 border-t transition-colors bg-white active:bg-blue-100"
                         >
                            거래 내역 더보기 (+10건)
                         </button>
                     )}
                 </div>
             </div>

             {trendMetric&&<ChartModal title={trendMetric==='total'?'총 통화량 변화':'평균 자산 변화'} onClose={()=>setTrendMetric(null)}><p className="mb-3 text-sm text-slate-500">보유 거래 기록을 기준으로 최근 경향을 재구성했습니다.</p><TrendChart data={classTrend} lines={[trendMetric==='total'?{key:'total',name:'총 통화량',color:'#4f46e5'}:{key:'average',name:'평균 자산',color:'#059669'}]}/></ChartModal>}
             {csvDialog&&<ChartModal title="대시보드 전체 CSV 다운로드" onClose={()=>setCsvDialog(false)}><p className="mb-5 text-sm text-slate-500">학생 자산, 거래 기록, 직업, 세금, 펀드, 기부, 예금과 주식 정보를 한 파일에 담습니다.</p><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">시작일<input type="date" value={csvRange.start} onChange={e=>setCsvRange(v=>({...v,start:e.target.value}))} className="mt-2 w-full rounded-xl border p-3"/></label><label className="text-sm font-bold text-slate-700">종료일<input type="date" value={csvRange.end} onChange={e=>setCsvRange(v=>({...v,end:e.target.value}))} className="mt-2 w-full rounded-xl border p-3"/></label></div><button onClick={exportCsv} disabled={exporting} className="mt-6 w-full rounded-2xl bg-emerald-600 py-3.5 font-black text-white">{exporting?'파일 만드는 중...':'CSV 다운로드'}</button></ChartModal>}

             {showHistoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowHistoryModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm md:max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center">
                                <ManageIcon className="w-5 h-5 mr-2 text-[#2B548F]"/> {alias} 지갑 내역 (국고)
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <XIcon className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto pr-1">
                            {teacherTransactions.length > 0 ? (
                                <>
                                    <ul className="divide-y divide-gray-100">
                                        {teacherTransactions.slice(0, visibleHistoryModalTxns).map(t => (
                                            <li key={t.transactionId} className="py-4 flex justify-between items-center hover:bg-gray-50 px-2 rounded-lg transition-colors">
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900">{t.description}</p>
                                                    <p className="text-xs text-gray-400 mt-1">{new Date(t.date).toLocaleString()}</p>
                                                </div>
                                                <p className={`font-extrabold text-base ${t.amount > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                                    {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span className="text-xs ml-0.5 font-normal">{unit}</span>
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                    {teacherTransactions.length > visibleHistoryModalTxns && (
                                        <button 
                                            onClick={() => setVisibleHistoryModalTxns(prev => prev + 10)}
                                            className="w-full mt-4 py-4 bg-gray-50 text-[#2B548F] font-bold text-sm rounded-xl border border-gray-100 hover:bg-blue-50 transition-colors active:scale-95"
                                        >
                                            내역 더보기 (+10건)
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <ErrorIcon className="w-12 h-12 text-gray-200 mb-3" />
                                    <p className="text-center text-gray-400">거래 내역이 존재하지 않습니다.</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-3 border-t text-right">
                             <button onClick={() => setShowHistoryModal(false)} className="px-6 py-2.5 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition-colors">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
             )}

             {showIssueModal && <IssueCurrencyModal onClose={() => setShowIssueModal(false)} onComplete={handleIssueComplete} />}
             {showMartModal && <MartTransferModal onClose={() => setShowMartModal(false)} onComplete={handleIssueComplete} />}
             
             {/* 계정 삭제 버튼 */}
             <div className="flex justify-end pt-8">
                <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="text-[10px] text-gray-300 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                    계정 삭제
                </button>
             </div>

             {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
        </div>
    );
};

// Fix: Correctly destructure 'refresh' prop from arguments to fix "Cannot find name 'refresh'" error.
const StudentManagementView: React.FC<{ students: (User & { account: Account | null })[], refresh: () => void }> = ({ students, refresh }) => {
    const { currentUser } = useContext(AuthContext);
    const unit = currentUser?.currencyUnit || '권';
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showQrPrintModal, setShowQrPrintModal] = useState(false);
    const [qrStudents, setQrStudents] = useState<(User & { account: Account | null })[]>([]);
    const [resetTarget, setResetTarget] = useState<User | null>(null);
    const [showResetSuccess, setShowResetSuccess] = useState(false);
    const [editTarget, setEditTarget] = useState<User | null>(null);

    const toggleStudent = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleDelete = async () => {
        try {
            await api.deleteStudents(selectedIds);
            setSelectedIds([]);
            setConfirmDelete(false);
            refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const handleResetPassword = async () => {
        if (!resetTarget) return;
        try {
            await api.resetPassword(resetTarget.userId);
            setResetTarget(null);
            setShowResetSuccess(true);
        } catch (e: any) {
            alert(e.message || '비밀번호 초기화 중 오류가 발생했습니다.');
        }
    };

    const openBulkQr = () => {
        if (selectedIds.length > 0) {
            setQrStudents(students.filter(s => selectedIds.includes(s.userId)));
        } else {
            setQrStudents(students);
        }
        setShowQrPrintModal(true);
    };

    const openSingleQr = (student: (User & { account: Account | null })) => {
        setQrStudents([student]);
        setShowQrPrintModal(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold text-gray-800">학생 관리</h2><FeatureGuide title="학생 관리 사용 안내" label="학생 관리 사용 안내" items={[{title:'학생을 등록해요',description:'학생 정보와 계좌를 만들고 QR을 발급합니다.'},{title:'정보를 관리해요',description:'학생을 선택해 수정하거나 필요한 학생만 삭제합니다.'}]}/></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddModal(true)} className="px-3 py-2 bg-[#2B548F] text-white rounded-lg text-sm font-bold shadow hover:bg-[#234576] transition-all active:scale-95">학생 추가</button>
                    <button onClick={openBulkQr} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow hover:bg-green-700 transition-all active:scale-95">QR 일괄 출력</button>
                    <button 
                        onClick={() => setConfirmDelete(true)} 
                        className={`px-3 py-2 text-white rounded-lg text-sm font-bold shadow transition-all active:scale-95 ${selectedIds.length > 0 ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-gray-400 hover:bg-gray-500'}`}
                    >
                        학생 삭제 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-3 w-12 text-center"><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? students.map(s => s.userId) : [])} checked={selectedIds.length === students.length && students.length > 0} className="w-4 h-4 rounded border-gray-300" /></th>
                            <th className="p-3 text-left font-bold text-gray-500 uppercase tracking-wider">번호</th>
                            <th className="p-3 text-left font-bold text-gray-500 uppercase tracking-wider">이름</th>
                            <th className="p-3 text-right font-bold text-gray-500 uppercase tracking-wider px-6">잔액</th>
                            <th className="p-3 text-left font-bold text-gray-500 uppercase tracking-wider">계좌번호</th>
                            <th className="p-3 text-center font-bold text-gray-500 uppercase tracking-wider">QR</th>
                            <th className="p-3 text-center font-bold text-gray-500 uppercase tracking-wider">수정</th>
                            <th className="p-3 text-center font-bold text-gray-500 uppercase tracking-wider">초기화</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.map(s => (
                            <tr key={s.userId} className="hover:bg-blue-50/50 transition-colors">
                                <td className="p-3 text-center"><input type="checkbox" checked={selectedIds.includes(s.userId)} onChange={() => toggleStudent(s.userId)} className="w-4 h-4 rounded border-gray-300" /></td>
                                <td className="p-3 font-medium text-gray-600">{s.number}</td>
                                <td className="p-3 font-bold text-gray-900">{s.name}</td>
                                <td className="p-3 text-right px-6">
                                    <span className="font-bold text-indigo-600">{(s.account?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span className="text-[10px] ml-0.5 font-black text-black">{unit}</span></span>
                                </td>
                                <td className="p-3 font-mono text-xs text-gray-800 font-bold">
                                    {s.account ? (
                                        (s.account as any).accountId || 
                                        (s.account as any).accountid || 
                                        (s.account as any).id || 
                                        '-'
                                    ) : '-'}
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => openSingleQr(s)} className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all mx-auto" title="개별 QR 코드">
                                        <QrCodeIcon className="w-5 h-5" />
                                    </button>
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => setEditTarget(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all mx-auto" title="정보 수정">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                </td>
                                <td className="p-3 text-center">
                                    <button onClick={() => setResetTarget(s)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold hover:bg-gray-200 transition-colors" title="비밀번호 초기화">
                                        초기화
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {students.length === 0 && (
                    <div className="p-16 text-center">
                        <ErrorIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">등록된 학생이 없습니다.</p>
                        <p className="text-gray-400 text-xs mt-1">'학생 추가' 버튼을 눌러 학생을 등록해 주세요.</p>
                    </div>
                )}
            </div>
            
            {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} onComplete={refresh} />}
            {editTarget && <EditStudentModal student={editTarget} onClose={() => setEditTarget(null)} onComplete={refresh} />}
            {showQrPrintModal && <QrPrintModal students={qrStudents} onClose={() => setShowQrPrintModal(false)} />}
            
            <ConfirmModal 
                isOpen={confirmDelete} 
                title="학생 삭제" 
                message={selectedIds.length > 0 ? `선택한 ${selectedIds.length}명의 학생을 영구적으로 삭제하시겠습니까? 계좌 및 모든 기록이 사라지며 복구할 수 없습니다.` : "삭제할 학생을 먼저 선택해 주세요."} 
                onConfirm={selectedIds.length > 0 ? handleDelete : () => setConfirmDelete(false)} 
                onCancel={() => setConfirmDelete(false)} 
                isDangerous={selectedIds.length > 0} 
                confirmText={selectedIds.length > 0 ? "삭제하기" : "확인"} 
            />

            <ConfirmModal 
                isOpen={!!resetTarget} 
                title="비밀번호 초기화" 
                message={`'${resetTarget?.name}' 학생의 비밀번호를 초기화하시겠습니까?`} 
                onConfirm={handleResetPassword} 
                onCancel={() => setResetTarget(null)} 
                confirmText="초기화하기" 
            />

            <MessageModal 
                isOpen={showResetSuccess} 
                type="success" 
                message="초기 비밀번호 '1234'로 변경되었습니다." 
                onClose={() => setShowResetSuccess(false)} 
            />
        </div>
    );
};

// Fix: Correctly destructure 'refresh' prop from arguments to fix "Cannot find name 'refresh'" error.
const JobManagementView: React.FC<{ refresh: () => void }> = ({ refresh }) => {
    const { currentUser } = useContext(AuthContext);
    const unit = currentUser?.currencyUnit || '권';
    const [jobs, setJobs] = useState<Job[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [assignJob, setAssignJob] = useState<Job | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'pay_all' | 'delete' | 'pay_one', data: any } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [j, s] = await Promise.all([
                api.getJobs(currentUser?.userId || ''), 
                api.getUsersByRole(Role.STUDENT, currentUser?.userId || '')
            ]);
            setJobs(j);
            setStudents(s);
        } catch (e) { console.error(e); }
    }, [currentUser?.userId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePaySalaries = async () => {
        try {
            const msg = await api.payAllSalaries(currentUser?.userId);
            setMessage({ type: 'success', text: msg });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setConfirmAction(null);
        }
    };

    const handleDeleteJob = async () => {
        if (!confirmAction || confirmAction.type !== 'delete') return;
        const jobId = confirmAction.data;
        try {
            const msg = await api.deleteJob(jobId);
            setMessage({ type: 'success', text: msg });
            fetchData();
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setConfirmAction(null);
        }
    };

    const handlePayOneSalary = async () => {
        if (!confirmAction || confirmAction.type !== 'pay_one') return;
        const jobId = confirmAction.data;
        try {
            const msg = await api.payJobSalary(jobId);
            setMessage({ type: 'success', text: msg });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setConfirmAction(null);
        }
    };

    const handleUpdateIncentive = async (jobId: string, value: string) => {
        const numValue = parseInt(value) || 0;
        try {
            await api.updateJobIncentive(jobId, numValue);
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, incentive: numValue } : j));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold text-gray-800">직업 관리</h2><FeatureGuide title="직업 관리 사용 안내" label="직업 관리 사용 안내" items={[{title:'직업을 만들어요',description:'업무와 급여를 설정합니다.'},{title:'학생을 배정해요',description:'담당 학생을 정하고 급여를 지급합니다.'}]}/></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddModal(true)} className="px-3 py-2 bg-[#2B548F] text-white rounded-lg text-sm font-bold shadow hover:bg-[#234576]">
                        + 직업 추가
                    </button>
                    <button onClick={() => setConfirmAction({ type: 'pay_all', data: null })} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow hover:bg-green-700">
                        급여 일괄 지급
                    </button>
                </div>
            </div>
            <div className="mb-4"><OverviewCards items={[{label:'등록 직업',value:`${jobs.length}개`},{label:'배정 학생',value:`${new Set(jobs.flatMap(j=>j.assigned_students.map(s=>s.userId))).size}명`,color:'text-blue-600'},{label:'예상 총급여',value:`${jobs.reduce((sum,j)=>sum+(j.salary+(j.incentive||0))*j.assigned_students.length,0).toLocaleString()}${unit}`},{label:'예상 총 소득세(10%)',value:`${Math.round(jobs.reduce((sum,j)=>sum+(j.salary+(j.incentive||0))*j.assigned_students.length,0)*0.1).toLocaleString()}${unit}`,color:'text-emerald-600'}]} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map(job => (
                    <div key={job.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{job.jobName}</h3>
                            <button onClick={() => setConfirmAction({ type: 'delete', data: job.id })} className="text-gray-400 hover:text-red-500"><XIcon className="w-5 h-5"/></button>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 flex-grow">{job.description}</p>
                        <div className="bg-gray-50 p-3 rounded-lg text-sm mb-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">기본 급여</span>
                                <span className="font-bold">{job.salary.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">인센티브</span>
                                <input 
                                    type="number" 
                                    defaultValue={job.incentive} 
                                    onBlur={(e) => handleUpdateIncentive(job.id, e.target.value)}
                                    className="w-20 p-1 text-right border rounded text-xs font-bold text-blue-600 bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                                />
                            </div>
                            <div className="border-t pt-2 flex justify-between items-center font-bold text-indigo-600">
                                <span>총 지급액</span>
                                <span>{(job.salary + (job.incentive || 0)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <div className="text-xs text-gray-500 mb-1">담당 학생 ({job.assigned_students?.length || 0}명)</div>
                            <div className="flex flex-wrap gap-1 mb-3 min-h-[1.5rem]">
                                {job.assigned_students?.map(s => (
                                    <span key={s.userId} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{s.name}</span>
                                ))}
                                {(!job.assigned_students || job.assigned_students.length === 0) && <span className="text-gray-300 text-xs">배정된 학생 없음</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setAssignJob(job)} className="py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
                                    학생 배정
                                </button>
                                <button onClick={() => setConfirmAction({ type: 'pay_one', data: job.id })} className="py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200 transition-colors">
                                    급여 지급
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onComplete={fetchData} />}
            {assignJob && <AssignJobModal job={assignJob} students={students} onClose={() => setAssignJob(null)} onComplete={fetchData} />}
            <ConfirmModal isOpen={confirmAction?.type === 'pay_all'} title="급여 일괄 지급" message="배정된 모든 학생들에게 급여(기본급+인센티브)를 지급하시겠습니까?" onConfirm={handlePaySalaries} onCancel={() => setConfirmAction(null)} />
            <ConfirmModal isOpen={confirmAction?.type === 'delete'} title="직업 삭제" message="이 직업을 삭제하시겠습니까? 배정된 학생 정보가 사라집니다." onConfirm={handleDeleteJob} onCancel={() => setConfirmAction(null)} isDangerous />
            <ConfirmModal isOpen={confirmAction?.type === 'pay_one'} title="급여 지급" message="이 직업을 담당하는 모든 학생들에게 급여를 지급하시겠습니까?" onConfirm={handlePayOneSalary} onCancel={() => setConfirmAction(null)} />
            {message && <MessageModal isOpen={true} type={message.type} message={message.text} onClose={() => setMessage(null)} />}
        </div>
    );
};

const TaxView: React.FC<{ students: User[] }> = ({ students }) => {
    const { currentUser } = useContext(AuthContext);
    const unit = currentUser?.currencyUnit || '권';
    const [taxes, setTaxes] = useState<TaxItemWithRecipients[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedTaxId, setExpandedTaxId] = useState<string | null>(null);
    const [messageModal, setMessageModal] = useState<{isOpen: boolean, type: 'success'|'error', message: string}>({isOpen: false, type: 'success', message: ''});
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete', data: any } | null>(null);

    const fetchTaxes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getTaxes(currentUser?.userId || '');
            setTaxes(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [currentUser?.userId]);

    useEffect(() => { fetchTaxes(); }, [fetchTaxes]);

    const handleDeleteConfirm = async () => {
        if (!confirmAction || confirmAction.type !== 'delete') return;
        const taxId = confirmAction.data;
        try {
            const msg = await api.deleteTax(taxId);
            setMessageModal({ isOpen: true, type: 'success', message: msg });
            fetchTaxes();
        } catch (e: any) {
            setMessageModal({ isOpen: true, type: 'error', message: e.message });
        } finally {
            setConfirmAction(null);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedTaxId(prev => prev === id ? null : id);
    };

    const getStudentName = (userId: string) => {
        const student = students.find(s => s.userId === userId);
        return student ? `${student.grade ? student.grade + '-' : ''}${student.class ? student.class + ' ' : ''}${student.number}. ${student.name}` : userId;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold text-gray-800">세금 관리</h2><FeatureGuide title="세금 관리 사용 안내" label="세금 관리 사용 안내" items={[{title:'세금을 고지해요',description:'금액, 납부 마감일과 대상을 정합니다.'},{title:'납부 현황을 봐요',description:'원그래프에 마우스를 올려 학생 명단을 확인합니다.'}]}/></div>
                <button onClick={() => setShowAddModal(true)} className="px-3 py-2 bg-[#2B548F] text-white rounded-lg text-sm font-bold shadow hover:bg-[#234576]">
                    + 세금 고지
                </button>
            </div>
            <div className="mb-4"><OverviewCards items={[{label:'고지 건수',value:`${taxes.length}건`},{label:'납부 완료',value:`${taxes.flatMap(t=>t.recipients).filter(r=>r.isPaid).length}명`,color:'text-emerald-600'},{label:'미납',value:`${taxes.flatMap(t=>t.recipients).filter(r=>!r.isPaid).length}명`,color:'text-red-600'},{label:'전체 납부율',value:`${Math.round(taxes.flatMap(t=>t.recipients).filter(r=>r.isPaid).length/Math.max(1,taxes.flatMap(t=>t.recipients).length)*100)}%`,color:'text-blue-600'}]} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {taxes.map(tax => {
                    const paidRecipients = tax.recipients.filter(r => r.isPaid);
                    const unpaidRecipients = tax.recipients.filter(r => !r.isPaid);
                    const paidCount = paidRecipients.length;
                    const totalCount = tax.recipients.length;
                    const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
                    const isExpanded = expandedTaxId === tax.id;
                    return (
                        <div key={tax.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg">{tax.name}</h3>
                                    <p className="text-sm text-gray-500">납부 기한: {new Date(tax.dueDate).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-lg text-red-600">{tax.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span>
                                    <button onClick={() => setConfirmAction({ type: 'delete', data: tax.id })} className="text-xs text-gray-400 hover:text-red-500 underline mt-1">삭제</button>
                                </div>
                            </div>
                            <div className="mt-4"><DonutCard title={`납부율 ${Math.round(progress)}%`} centerLabel="대상 학생" data={[{name:'납부',value:paidCount,details:paidRecipients.map(r=>getStudentName(r.studentUserId))},{name:'미납',value:unpaidRecipients.length,details:unpaidRecipients.map(r=>getStudentName(r.studentUserId))}]}/></div>
                        </div>
                    );
                })}
            </div>
            {showAddModal && <AddTaxModal students={students} onClose={() => setShowAddModal(false)} onComplete={fetchTaxes} />}
            <ConfirmModal isOpen={confirmAction?.type === 'delete'} title="세금 항목 삭제" message="이 세금 항목을 삭제하시겠습니까? 납부 기록도 함께 사라집니다." onConfirm={handleDeleteConfirm} onCancel={() => setConfirmAction(null)} isDangerous />
            <MessageModal isOpen={messageModal.isOpen} type={messageModal.type} message={messageModal.message} onClose={() => setMessageModal(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
};

const FundManagementView: React.FC<{ students: User[] }> = ({ students }) => {
    const { currentUser } = useContext(AuthContext);
    const unit = currentUser?.currencyUnit || '권';
    const [funds, setFunds] = useState<Fund[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedFundForInvestors, setSelectedFundForInvestors] = useState<Fund | null>(null);
    const [selectedFundForFail, setSelectedFundForFail] = useState<Fund | null>(null);
    const [fundToSettle, setFundToSettle] = useState<{ fund: Fund, status: FundStatus } | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [fundToDelete, setFundToDelete] = useState<string | null>(null); // 삭제 확인용 상태 추가
    const [fundInvestors, setFundInvestors] = useState<Record<string,{student_name:string;units:number;invested_amount:number}[]>>({});

    const fetchFunds = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getFunds(currentUser?.userId || '');
            setFunds(data);
            const entries=await Promise.all(data.map(async fund=>[fund.id,await api.getFundInvestors(fund.id)] as const));
            setFundInvestors(Object.fromEntries(entries));
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    }, [currentUser?.userId]);

    useEffect(() => { fetchFunds(); }, [fetchFunds]);

    const handleSettle = async (fundId: string, status: FundStatus, executionRate?: number) => {
        try {
            await api.settleFund(fundId, status, executionRate);
            setMessage({ type: 'success', text: '펀드 정산이 완료되었습니다.' });
            setSelectedFundForFail(null);
            fetchFunds();
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, fundId: string) => {
        e.stopPropagation(); // 카드 클릭 방지
        setFundToDelete(fundId); // 브라우저 confirm 대신 커스텀 모달용 상태 업데이트
    };

    const confirmDelete = async () => {
        if (!fundToDelete) return;
        try {
            await api.deleteFund(fundToDelete);
            setMessage({ type: 'success', text: '삭제되었습니다.' });
            fetchFunds();
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setFundToDelete(null);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold text-gray-800">펀드 관리</h2><FeatureGuide title="펀드 관리 사용 안내" label="펀드 관리 사용 안내" items={[{title:'펀드를 등록해요',description:'목표와 기간, 보상 조건을 설정합니다.'},{title:'가입 현황을 봐요',description:'원그래프와 투자자 목록에서 참여와 투자액을 확인합니다.'}]}/></div>
                <button onClick={() => setShowAddModal(true)} className="px-3 py-2 bg-[#2B548F] text-white rounded-lg text-sm font-bold shadow hover:bg-[#234576] transition-all">
                    + 펀드 등록
                </button>
            </div>
            <div className="mb-4"><OverviewCards items={[{label:'전체 펀드',value:`${funds.length}개`},{label:'모집·진행 중',value:`${funds.filter(f=>[FundStatus.RECRUITING,FundStatus.ONGOING].includes(f.status)).length}개`,color:'text-blue-600'},{label:'참여 학생 합계',value:`${funds.reduce((s,f)=>s+(f.investorCount||0),0)}명`,color:'text-emerald-600'},{label:'총 투자금',value:`${funds.reduce((s,f)=>s+(f.totalInvestedAmount||0),0).toLocaleString()}${unit}`}]} /></div>
            
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2B548F]"></div>
                </div>
            ) : funds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {funds.map(f => {
                        // DB에서 가져온 creatorName이 없을 경우, 현재 로드된 학생 목록(students)에서 이름을 한 번 더 찾음
                        const creator = students.find(s => s.userId === f.creatorId);
                        const applicantName = f.creatorName || creator?.name || f.creatorId?.slice(0, 8);

                        return (
                            <div key={f.id} onClick={() => setSelectedFundForInvestors(f)} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-black text-lg text-black">{f.name}</h3>
                                        <p className="text-[10px] text-indigo-700 font-black">신청자: {applicantName}</p>
                                    </div>
                                    <div className="flex gap-1 items-center">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black whitespace-nowrap shrink-0 ${f.status === FundStatus.RECRUITING ? 'bg-blue-100 text-blue-700' : f.status === FundStatus.ONGOING ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {f.status === FundStatus.RECRUITING ? '모집 중' : f.status === FundStatus.ONGOING ? '운용 중' : f.status === FundStatus.SUCCESS ? '성공' : f.status === FundStatus.FAIL ? '실패' : f.status === FundStatus.EXCEED ? '인센티브' : f.status}
                                        </span>
                                        <button onClick={(e) => handleDeleteClick(e, f.id)} className="text-gray-400 hover:text-red-500 p-1"><XIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-900 font-bold mb-3 line-clamp-2 min-h-[2.5rem]">{f.description}</p>
                                <DonutCard title="전체 학생 대비 가입자" centerLabel="학생" data={[{name:'가입자',value:fundInvestors[f.id]?.length||f.investorCount||0,details:(fundInvestors[f.id]||[]).map(inv=>inv.student_name)},{name:'미가입자',value:Math.max(0,students.length-(fundInvestors[f.id]?.length||f.investorCount||0)),details:students.filter(s=>!(fundInvestors[f.id]||[]).some(inv=>inv.student_name===s.name)).map(s=>s.name)}]}/>
                                <div className="bg-gray-50 p-3 rounded-lg text-xs mb-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-900 font-black">목표 / 모집액</span>
                                        <span className="font-black text-black">{(f.targetAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit} / <span className="text-indigo-700">{(f.totalInvestedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span></span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                                        <span className="text-gray-900 font-black">기본 배당금</span>
                                        <span className="font-black text-blue-700">{(f.baseReward || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-900 font-black">추가 인센티브</span>
                                        <span className="font-black text-indigo-700">+{(f.incentiveReward || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
                                        <div 
                                            className="bg-indigo-600 h-1.5 rounded-full" 
                                            style={{ width: `${Math.min(100, ((f.totalInvestedAmount || 0) / (f.targetAmount || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                <div className="mt-auto space-y-2" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between text-[10px] text-gray-800 font-black mb-1 px-1">
                                        <span>투자: {f.investorCount || 0}명</span>
                                        <span>만기: {f.maturityDate ? new Date(f.maturityDate).toLocaleDateString() : '-'}</span>
                                    </div>
                                    {f.status === FundStatus.ONGOING && (
                                        <div className="grid grid-cols-3 gap-1">
                                            <button onClick={() => setSelectedFundForFail(f)} className="py-2 bg-red-500 text-white rounded-lg text-[10px] font-bold hover:bg-red-600 transition-colors">실패</button>
                                            <button onClick={() => setFundToSettle({ fund: f, status: FundStatus.SUCCESS })} className="py-2 bg-green-500 text-white rounded-lg text-[10px] font-bold hover:bg-green-600 transition-colors">성공</button>
                                            <button onClick={() => setFundToSettle({ fund: f, status: FundStatus.EXCEED })} className="py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors">인센티브</button>
                                        </div>
                                    )}
                                    {f.status === FundStatus.RECRUITING && (
                                        <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold">모집 중...</button>
                                    )}
                                    {f.status !== FundStatus.RECRUITING && f.status !== FundStatus.ONGOING && (
                                        <div className="w-full py-2 bg-gray-100 text-gray-800 text-center rounded-lg text-[10px] font-black">
                                            정산됨: {f.status === FundStatus.SUCCESS ? '성공' : f.status === FundStatus.FAIL ? '실패' : f.status === FundStatus.EXCEED ? '인센티브' : f.status} {f.executionRate !== undefined && `(${f.executionRate}%)`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white p-16 rounded-xl border-2 border-dashed border-gray-100 text-center">
                    <NewFundIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-gray-400 font-medium">등록된 펀드 상품이 없습니다.</p>
                    <p className="text-gray-300 text-xs mt-1">상단의 '+ 펀드 등록' 버튼을 눌러 상품을 추가하세요.</p>
                </div>
            )}

            {showAddModal && <AddFundModal students={students} onClose={() => setShowAddModal(false)} onComplete={fetchFunds} />}
            {selectedFundForInvestors && <FundInvestorsModal fund={selectedFundForInvestors} students={students} onClose={() => setSelectedFundForInvestors(null)} />}
            {selectedFundForFail && <FailSettlementModal fund={selectedFundForFail} onClose={() => setSelectedFundForFail(null)} onConfirm={(rate) => handleSettle(selectedFundForFail.id, FundStatus.FAIL, rate)} />}
            
            {/* 성공/인센티브 정산 확인 모달 (보상금 안내 포함) */}
            {fundToSettle && (
                <ConfirmModal 
                    isOpen={true}
                    title="펀드 정산 확인"
                    message={`'${fundToSettle.fund.name}' 펀드를 정산하시겠습니까?\n\n[정산 결과]: ${fundToSettle.status === FundStatus.SUCCESS ? '성공' : '초과 인센티브'}\n[신청자 보상]: ${
                        fundToSettle.status === FundStatus.SUCCESS 
                            ? `${(fundToSettle.fund.totalInvestedAmount || 0) * 0.1}${unit} (10%)`
                            : `${(fundToSettle.fund.totalInvestedAmount || 0) * 0.1 + (fundToSettle.fund.incentiveReward || 0)}${unit} (10% + 인센티브)`
                    }\n\n정산 후에는 취소할 수 없습니다.`}
                    onConfirm={() => {
                        handleSettle(fundToSettle.fund.id, fundToSettle.status);
                        setFundToSettle(null);
                    }}
                    onCancel={() => setFundToSettle(null)}
                    confirmText="정산하기"
                />
            )}
            
            {message && <MessageModal isOpen={true} type={message.type} message={message.text} onClose={() => setMessage(null)} />}
            <ConfirmModal 
                isOpen={!!fundToDelete}
                title="펀드 삭제"
                message="이 펀드를 삭제하시겠습니까? 투자 기록이 모두 사라집니다."
                onConfirm={confirmDelete}
                onCancel={() => setFundToDelete(null)}
                confirmText="삭제하기"
                isDangerous
            />
        </div>
    );
};

const AddDonationModal: React.FC<{ onClose: () => void, onComplete: () => void }> = ({ onClose, onComplete }) => {
    const { currentUser } = useContext(AuthContext);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !currentUser) return;
        setLoading(true);
        try {
            await api.createDonation(currentUser.userId, title, url, content, imageUrl);
            onComplete();
            onClose();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900">새 기부 캠페인 등록</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1 uppercase">기부명</label>
                        <input 
                            type="text" 
                            required 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none font-bold" 
                            placeholder="예: 연말 불우이웃 돕기"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1 uppercase">기부 URL (선택)</label>
                        <input 
                            type="url" 
                            value={url} 
                            onChange={e => setUrl(e.target.value)} 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none font-bold" 
                            placeholder="https://..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1 uppercase">내용</label>
                        <textarea 
                            required 
                            value={content} 
                            onChange={e => setContent(e.target.value)} 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none font-bold h-32 resize-none" 
                            placeholder="기부 캠페인에 대한 설명을 입력하세요."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1 uppercase">이미지 URL (선택)</label>
                        <input 
                            type="url" 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)} 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none font-bold" 
                            placeholder="https://... (이미지 주소)"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-4 bg-pink-600 text-white font-black rounded-xl shadow-lg shadow-pink-100 hover:bg-pink-700 transition-all active:scale-95 disabled:bg-gray-200"
                    >
                        {loading ? '등록 중...' : '캠페인 등록하기'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const EditDonationModal: React.FC<{ donation: Donation, onClose: () => void, onComplete: () => void }> = ({ donation, onClose, onComplete }) => {
    const [title, setTitle] = useState(donation.title);
    const [url, setUrl] = useState(donation.url || '');
    const [content, setContent] = useState(donation.content);
    const [imageUrl, setImageUrl] = useState(donation.imageUrl || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.updateDonation(donation.id, title, url, content, imageUrl);
            onComplete();
            onClose();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900">기부 캠페인 수정</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1 uppercase">캠페인 제목</label>
                        <input 
                            required 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none font-bold" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1 uppercase">기부 URL (선택)</label>
                        <input 
                            type="url" 
                            value={url} 
                            onChange={e => setUrl(e.target.value)} 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none font-bold" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1 uppercase">내용</label>
                        <textarea 
                            required 
                            value={content} 
                            onChange={e => setContent(e.target.value)} 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none font-bold h-32 resize-none" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-700 mb-1 uppercase">이미지 URL (선택)</label>
                        <input 
                            type="url" 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)} 
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none font-bold" 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-gray-200"
                    >
                        {loading ? '수정 중...' : '수정 완료'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const DonationParticipantsModal: React.FC<{ donation: Donation, onClose: () => void }> = ({ donation, onClose }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const unit = useContext(AuthContext).currentUser?.currencyUnit || '권';
    const sortedLogs=[...logs].sort((a,b)=>Number(b.amount)-Number(a.amount));

    useEffect(() => {
        api.getDonationLogs(donation.id).then(data => {
            setLogs(data);
            setLoading(false);
        });
    }, [donation.id]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black text-gray-900">기부 참여자 목록</h3>
                        <p className="text-xs text-gray-500 font-bold">{donation.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div></div>
                    ) : logs.length > 0 ? (
                        <div className="space-y-2"><SegmentedBar title="기부자별 기부 비율" unit={unit} rows={sortedLogs.map(log=>({name:log.user?.name||'학생',value:Number(log.amount)}))}/>
                            {sortedLogs.map(log => (
                                <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-black text-gray-400 border border-gray-100">
                                            {log.user?.number}
                                        </div>
                                        <span className="font-black text-gray-900">{log.user?.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-pink-600">{log.amount.toLocaleString()}{unit}</div>
                                        <div className="text-[10px] text-gray-600 font-bold">{log.units || 1}권 참여</div>
                                        <div className="text-[10px] text-gray-400 font-bold">{new Date(log.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-400 font-bold">아직 참여한 학생이 없습니다.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DonationDetailModal: React.FC<{ donation: Donation, onClose: () => void }> = ({ donation, onClose }) => {
    const unit = useContext(AuthContext).currentUser?.currencyUnit || '권';
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4" onClick={onClose}>
            <div className="bg-white rounded-[40px] shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fadeIn" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h3 className="text-xl font-black text-gray-900">기부 상세 내용</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    {donation.imageUrl && (
                        <img src={donation.imageUrl} alt={donation.title} className="w-full h-64 object-cover rounded-2xl mb-6" referrerPolicy="no-referrer" />
                    )}

                    <div className="mb-6">
                        <p className="text-xs text-gray-500 font-bold mb-1 uppercase">캠페인</p>
                        <p className="font-black text-gray-900 text-xl">{donation.title}</p>
                    </div>

                    <div className="mb-8">
                        <p className="text-xs text-gray-500 font-bold mb-1 uppercase">내용</p>
                        <p className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">{donation.content}</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-gray-500 font-bold">현재 모금액</span>
                            <span className="font-black text-pink-600">{(donation.current_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full">
                            <div className="bg-pink-500 h-2 rounded-full w-full"></div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="w-full p-5 bg-gray-800 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] text-lg"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

const DonationManagementView: React.FC = () => {
    const { currentUser } = useContext(AuthContext);
    const unit = currentUser?.currencyUnit || '권';
    const [donations, setDonations] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
    const [participantsDonation, setParticipantsDonation] = useState<Donation | null>(null);
    const [viewingDonation, setViewingDonation] = useState<Donation | null>(null);
    const [deletingDonationId, setDeletingDonationId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [donationLogs, setDonationLogs] = useState<Record<string,any[]>>({});
    const [allStudents, setAllStudents] = useState<User[]>([]);

    const fetchDonations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getDonations(currentUser?.userId || '');
            setDonations(data);
            const [students,logEntries]=await Promise.all([api.getUsersByRole(Role.STUDENT,currentUser?.userId||''),Promise.all(data.map(async donation=>[donation.id,await api.getDonationLogs(donation.id)] as const))]);
            setAllStudents(students); setDonationLogs(Object.fromEntries(logEntries));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.userId]);

    useEffect(() => { fetchDonations(); }, [fetchDonations]);

    const handleCloseDonation = async (donationId: string) => {
        try {
            await api.closeDonation(donationId);
            setMessage({ type: 'success', text: '기부가 종료되었습니다.' });
            fetchDonations();
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        }
    };

    const handleDeleteDonation = (donationId: string) => {
        setDeletingDonationId(donationId);
    };

    const confirmDeleteDonation = async () => {
        if (!deletingDonationId) return;
        try {
            await api.deleteDonation(deletingDonationId);
            setMessage({ type: 'success', text: '기부가 삭제되었습니다.' });
            fetchDonations();
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setDeletingDonationId(null);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold text-gray-800">기부 관리</h2><FeatureGuide title="기부 관리 사용 안내" label="기부 관리 사용 안내" items={[{title:'기부함을 만들어요',description:'목적과 소개를 작성해 공개합니다.'},{title:'참여를 확인해요',description:'원그래프와 참여자 목록에서 기부 현황을 확인합니다.'}]}/></div>
                <button onClick={() => setShowAddModal(true)} className="px-3 py-2 bg-pink-600 text-white rounded-lg text-sm font-bold shadow hover:bg-pink-700 transition-all">
                    + 기부 등록
                </button>
            </div>
            <div className="mb-4"><OverviewCards items={[{label:'전체 모금함',value:`${donations.length}개`},{label:'진행 중',value:`${donations.filter(d=>d.status==='ongoing').length}개`,color:'text-pink-600'},{label:'종료',value:`${donations.filter(d=>d.status==='completed').length}개`},{label:'누적 기부액',value:`${donations.reduce((s,d)=>s+(d.current_amount||0),0).toLocaleString()}${unit}`,color:'text-emerald-600'}]} /></div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div>
                </div>
            ) : donations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {donations.map(d => (
                        <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            {d.imageUrl && (
                                <img src={d.imageUrl} alt={d.title} className="w-full h-40 object-cover" referrerPolicy="no-referrer" />
                            )}
                            <div className="p-5 flex flex-col flex-grow">
                                <DonutCard title="전체 학생 대비 기부 참여" centerLabel="학생" data={[{name:'기부 참여',value:new Set((donationLogs[d.id]||[]).map(log=>log.user?.name)).size,details:(donationLogs[d.id]||[]).map(log=>log.user?.name).filter(Boolean)},{name:'미참여',value:Math.max(0,allStudents.length-new Set((donationLogs[d.id]||[]).map(log=>log.user?.name)).size),details:allStudents.filter(s=>!(donationLogs[d.id]||[]).some(log=>log.user?.name===s.name)).map(s=>s.name)}]}/>
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <h3 
                                        className="font-black text-lg text-black cursor-pointer hover:text-pink-600 transition-colors line-clamp-1"
                                        onClick={() => setViewingDonation(d)}
                                    >
                                        {d.title}
                                    </h3>
                                    <span className={`text-[10px] px-2 py-1 rounded font-black whitespace-nowrap flex-shrink-0 min-w-[50px] text-center ${d.status === 'ongoing' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {d.status === 'ongoing' ? '기부 중' : '기부 완료'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-4 line-clamp-2">{d.content}</p>
                                
                                <div className="mt-auto space-y-2">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setParticipantsDonation(d)}
                                            className="flex-1 py-2 bg-pink-50 text-pink-700 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors"
                                        >
                                            참여자 목록
                                        </button>
                                        <button 
                                            onClick={() => setEditingDonation(d)}
                                            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                                        >
                                            수정
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteDonation(d.id)}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                            title="삭제"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-500 font-bold">현재 모금액</span>
                                            <span className="font-black text-pink-600">{(d.current_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{unit}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-1.5 rounded-full">
                                            <div className="bg-pink-500 h-1.5 rounded-full w-full"></div>
                                        </div>
                                    </div>
                                    
                                    {d.status === 'ongoing' && (
                                        <button 
                                            onClick={() => handleCloseDonation(d.id)}
                                            className="w-full py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
                                        >
                                            기부 종료하기
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white p-16 rounded-xl border-2 border-dashed border-gray-100 text-center">
                    <HeartIcon className="w-8 h-8 mx-auto mb-4 opacity-20 text-pink-600" />
                    <p className="text-gray-400 font-medium">등록된 기부 캠페인이 없습니다.</p>
                    <p className="text-gray-300 text-xs mt-1">상단의 '+ 기부 등록' 버튼을 눌러 캠페인을 추가하세요.</p>
                </div>
            )}

            {showAddModal && <AddDonationModal onClose={() => setShowAddModal(false)} onComplete={fetchDonations} />}
            {editingDonation && <EditDonationModal donation={editingDonation} onClose={() => setEditingDonation(null)} onComplete={fetchDonations} />}
            {participantsDonation && <DonationParticipantsModal donation={participantsDonation} onClose={() => setParticipantsDonation(null)} />}
            {viewingDonation && <DonationDetailModal donation={viewingDonation} onClose={() => setViewingDonation(null)} />}
            {message && <MessageModal isOpen={true} type={message.type} message={message.text} onClose={() => setMessage(null)} />}
            <ConfirmModal 
                isOpen={!!deletingDonationId} 
                title="기부 캠페인 삭제" 
                message="이 기부 캠페인을 삭제하시겠습니까? 관련 참여 기록도 모두 삭제됩니다." 
                onConfirm={confirmDeleteDonation} 
                onCancel={() => setDeletingDonationId(null)} 
                isDangerous 
            />
        </div>
    );
};

const StockTransactionsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { currentUser } = useContext(AuthContext);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [monitoringData, setMonitoringData] = useState<any>(null);
    const [isAnalysisMode, setIsAnalysisMode] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // 분석 기간 (기본값: 최근 1주일)
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const unit = currentUser?.currencyUnit || '권';

    const fetchTransactions = useCallback(() => {
        if (currentUser?.userId) {
            setLoading(true);
            api.getStockTransactions(currentUser.userId).then(data => {
                setTransactions(data);
                setLoading(false);
            });
        }
    }, [currentUser?.userId]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleAnalyzeAbuse = async () => {
        if (!currentUser?.userId) return;
        setIsAnalyzing(true);
        try {
            const data = await api.getSuspiciousTrading(currentUser.userId, startDate + ' 00:00:00', endDate + ' 23:59:59');
            setMonitoringData(data);
            setIsAnalysisMode(true);
        } catch (e: any) {
            alert(e.message || '분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsAnalysisMode(false)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${!isAnalysisMode ? 'bg-[#2B548F] text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            거래 내역
                        </button>
                        <button 
                            onClick={() => setIsAnalysisMode(true)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isAnalysisMode ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            이상 거래 탐지
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {isAnalysisMode && (
                    <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-bold text-red-500 mb-1 block">시작일</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 text-xs border rounded-lg" />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-bold text-red-500 mb-1 block">종료일</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 text-xs border rounded-lg" />
                            </div>
                            <button 
                                onClick={handleAnalyzeAbuse}
                                disabled={isAnalyzing}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-black rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                            >
                                {isAnalyzing ? '분석 중...' : '부당 거래 분석'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-grow overflow-y-auto">
                    {isAnalysisMode ? (
                        <div className="space-y-6">
                            {monitoringData ? (
                                <>
                                    {/* 세력 및 담합 의심 */}
                                    <section>
                                        <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                                            세력 및 담합 의심 (Collusion)
                                        </h4>
                                        <div className="space-y-2">
                                            {monitoringData.collusion?.length > 0 ? monitoringData.collusion.map((c: any, i: number) => (
                                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-red-50 text-xs">
                                                    <div className="flex justify-between font-bold mb-1">
                                                        <span className="text-red-600">{c.stock_name}</span>
                                                        <span className="text-gray-400">{new Date(c.trade_time).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-gray-600">
                                                        <span className="font-bold text-gray-900">{c.student1}</span>님과 
                                                        <span className="font-bold text-gray-900 ml-1">{c.student2}</span>님이 
                                                        5분 내 유사 거래 포착 (담합 의심)
                                                    </p>
                                                </div>
                                            )) : <p className="text-center py-4 text-gray-400 text-xs">의심 정황이 없습니다.</p>}
                                        </div>
                                    </section>

                                    {/* 쿨타임 우회 */}
                                    <section>
                                        <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                            쿨타임 우회 (Bypass)
                                        </h4>
                                        <div className="space-y-2">
                                            {monitoringData.cooltime?.length > 0 ? monitoringData.cooltime.map((c: any, i: number) => (
                                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-orange-50 text-xs">
                                                    <div className="flex justify-between font-bold mb-1">
                                                        <span className="text-gray-900">{c.student_name}</span>
                                                        <span className="text-orange-600">{c.interval_minutes.toFixed(1)}분 간격</span>
                                                    </div>
                                                    <p className="text-gray-500 mb-1">{c.trade1} → {c.trade2}</p>
                                                    <p className="text-right font-black text-indigo-600">추정 차익: {c.profit_estimate.toLocaleString()}{unit}</p>
                                                </div>
                                            )) : <p className="text-center py-4 text-gray-400 text-xs">의심 정황이 없습니다.</p>}
                                        </div>
                                    </section>

                                    {/* 자전 거래 */}
                                    <section>
                                        <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            자전 거래 및 거래 대금 부풀리기
                                        </h4>
                                        <div className="space-y-2">
                                            {monitoringData.wash?.length > 0 ? monitoringData.wash.map((w: any, i: number) => (
                                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-blue-50 text-xs">
                                                    <div className="flex justify-between font-bold mb-1">
                                                        <span className="text-gray-900">{w.student_name}</span>
                                                        <span className="text-blue-600">일일 {w.trade_count}회 거래</span>
                                                    </div>
                                                    <p className="text-right font-black text-indigo-600">금액 총합: {w.net_cash_flow.toLocaleString()}{unit}</p>
                                                </div>
                                            )) : <p className="text-center py-4 text-gray-400 text-xs">의심 정황이 없습니다.</p>}
                                        </div>
                                    </section>

                                    {/* 수익률 이상치 */}
                                    <section>
                                        <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                            수익률 이상치 및 급등 계좌
                                        </h4>
                                        <div className="space-y-2">
                                            {monitoringData.abnormal?.length > 0 ? monitoringData.abnormal.map((a: any, i: number) => (
                                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-purple-50 text-xs">
                                                    <div className="flex justify-between font-bold mb-1">
                                                        <span className="text-gray-900">{a.student_name}</span>
                                                        <span className="text-purple-600">거래 {a.trade_count}회</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <div className="bg-white p-1.5 rounded border border-gray-100">
                                                            <div className="text-[8px] text-gray-400">총 매수</div>
                                                            <div className="font-bold">{a.total_buy.toLocaleString()}{unit}</div>
                                                        </div>
                                                        <div className="bg-white p-1.5 rounded border border-gray-100">
                                                            <div className="text-[8px] text-gray-400">총 매도</div>
                                                            <div className="font-bold">{a.total_sell.toLocaleString()}{unit}</div>
                                                        </div>
                                                    </div>
                                                    <p className="text-right font-black text-indigo-600 mt-2">순수익: {a.profit.toLocaleString()}{unit}</p>
                                                </div>
                                            )) : <p className="text-center py-4 text-gray-400 text-xs">의심 정황이 없습니다.</p>}
                                        </div>
                                    </section>
                                </>
                            ) : (
                                <div className="text-center py-20">
                                    <p className="font-bold text-gray-400">분석을 위해 상단의 '부당 거래 분석' 버튼을 눌러주세요.</p>
                                    <p className="text-[10px] text-gray-300 mt-1">설정된 기간 내의 모든 거래 데이터를 심층 분석합니다.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        loading ? (
                            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                        ) : transactions.length > 0 ? (
                            <div className="space-y-2">
                                {transactions.map(t => (
                                    <div key={t.transaction_id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 border border-indigo-50 shadow-sm">
                                                {t.student_name?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900">{t.student_name}</div>
                                                <div className="text-[10px] text-gray-500 font-bold">{t.description}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-black ${t.type === 'StockSell' ? 'text-blue-600' : 'text-red-600'}`}>
                                                {t.type === 'StockSell' ? '+' : ''}{t.amount.toLocaleString()}{unit}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-bold">{new Date(t.date).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-400 font-bold">거래 내역이 없습니다.</div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const TeacherDashboard: React.FC<{ onBackToMenu?: () => void }> = ({ onBackToMenu }) => {
    const { currentUser, logout } = useContext(AuthContext);
    type TeacherView = 'dashboard' | 'students' | 'jobs' | 'tax' | 'funds' | 'donations';
    const teacherSectionKey = `class_bank_teacher_section_${currentUser?.userId || 'unknown'}`;
    const [view, setViewState] = useState<TeacherView>(() => {
        const saved = localStorage.getItem(teacherSectionKey);
        return ['dashboard','students','jobs','tax','funds','donations'].includes(saved || '') ? saved as TeacherView : 'dashboard';
    });
    const setView = (next: TeacherView) => { setViewState(next); localStorage.setItem(teacherSectionKey, next); };
    const [showStockTransactions, setShowStockTransactions] = useState(false);
    const [students, setStudents] = useState<(User & { account: Account | null })[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 학생 유저 목록 가져오기
            const users = await api.getUsersByRole(Role.STUDENT, currentUser?.userId || '');
            
            // 각 유저의 계좌 정보를 순차적으로 혹은 병렬로 가져오되, 에러 발생 시 개별 학생 데이터는 유지
            const usersWithAccounts = await Promise.all(
                users.map(async u => {
                    try {
                        const account = await api.getStudentAccountByUserId(u.userId);
                        return { ...u, account };
                    } catch (err) {
                        console.warn(`학생(${u.name}) 계좌 조회 실패:`, err);
                        return { ...u, account: null }; // 계좌 조회가 실패해도 유저는 리스트에 포함
                    }
                })
            );
            
            usersWithAccounts.sort((a,b) => (a.number || 0) - (b.number || 0));
            setStudents(usersWithAccounts);
        } catch (error) { 
            console.error("데이터 로딩 중 치명적 오류:", error); 
        }
        finally { setLoading(false); }
    }, [currentUser?.userId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const alias = currentUser?.teacherAlias || '교사 관리자';
    const classCode = currentUser?.classCode || '----';
    const handleLogout = onBackToMenu || logout;
    const guideByView: Record<TeacherView, { title: string; description: string }[]> = {
        dashboard: [{title:'현황을 살펴봐요',description:'학생 자산, 활동량, 국고와 주요 알림을 한눈에 확인합니다.'},{title:'자료를 저장해요',description:'CSV는 학생 현황을, 전체 백업은 주요 학급 데이터를 파일로 저장합니다.'},{title:'알림을 확인해요',description:'세금 마감, 펀드 만기와 큰 거래를 확인합니다.'}],
        students: [{title:'학생을 등록해요',description:'학생 계정과 번호를 만들고 QR 또는 로그인 정보를 제공합니다.'},{title:'정보를 관리해요',description:'학생 정보를 수정하거나 필요한 계정을 선택해 관리합니다.'},{title:'삭제 전 확인해요',description:'학생 삭제는 연결된 금융 정보에 영향을 줄 수 있으므로 백업 후 진행하세요.'}],
        jobs: [{title:'직업을 만들어요',description:'역할 설명과 기본 급여를 정해 직업을 등록합니다.'},{title:'학생을 배정해요',description:'직업별 담당 학생을 선택하고 인센티브를 설정합니다.'},{title:'급여를 지급해요',description:'개별 직업 또는 전체 직업의 급여를 지급합니다.'}],
        tax: [{title:'세금을 고지해요',description:'세금명, 금액, 납부 마감일과 대상 학생을 정합니다.'},{title:'납부율을 확인해요',description:'상단 현황과 세금별 진행 막대에서 납부 상태를 확인합니다.'},{title:'미납자를 확인해요',description:'세금 카드를 펼치면 납부·미납 학생을 확인할 수 있습니다.'}],
        funds: [{title:'펀드를 등록해요',description:'목표, 모집 기간, 만기와 보상 조건을 설정합니다.'},{title:'참여 현황을 확인해요',description:'목표 달성률과 투자자 목록을 확인합니다.'},{title:'결과를 정산해요',description:'실행 결과를 확인한 뒤 성공·초과·실패로 정산합니다.'}],
        donations: [{title:'모금함을 만들어요',description:'기부 목적과 소개, 관련 이미지를 등록합니다.'},{title:'참여를 확인해요',description:'모금액과 참여 학생 기록을 확인합니다.'},{title:'종료해요',description:'목표 활동이 끝나면 모금함을 종료합니다.'}]
    };

    const renderContent = () => {
        switch (view) {
            case 'dashboard': return <DashboardView students={students} refresh={fetchData} />;
            case 'students': return <StudentManagementView students={students} refresh={fetchData} />;
            case 'jobs': return <JobManagementView refresh={fetchData} />;
            case 'tax': return <TaxView students={students} />;
            case 'funds': return <FundManagementView students={students} />;
            case 'donations': return <DonationManagementView />;
            default: return <DashboardView students={students} refresh={fetchData} />;
        }
    };

    const NavButton = ({ id, label, Icon }: { id: typeof view | 'stocks', label: string, Icon: React.FC<any> }) => (
        <button onClick={() => id === 'stocks' ? setShowStockTransactions(true) : setView(id)} className={`w-full flex items-center p-3 text-sm font-semibold rounded-lg transition-colors ${view === id ? 'bg-[#2B548F] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <div className="w-10 h-10 mr-3 flex items-center justify-center">
                <Icon className={id === 'donations' ? 'w-5 h-5' : 'w-10 h-10'} />
            </div>
            {label}
        </button>
    );

    const MobileNavButton = ({ id, label, Icon }: { id: typeof view | 'stocks', label: string, Icon: React.FC<any> }) => (
        <button onClick={() => id === 'stocks' ? setShowStockTransactions(true) : setView(id)} className={`flex flex-col items-center justify-center w-full py-2 ${view === id ? 'text-[#2B548F]' : 'text-gray-400'}`}>
            <div className="w-12 h-12 mb-1 flex items-center justify-center">
                <Icon className={id === 'donations' ? 'w-6 h-6' : 'w-12 h-12'} />
            </div>
            <span className="text-[10px]">{label}</span>
        </button>
    );

    return (
        <div className="flex h-full bg-gray-100">
            <aside className="hidden md:flex flex-col w-64 bg-white border-r p-4 shadow-sm z-10">
                <div className="px-2 mb-8">
                    <h1 className="text-xl font-bold text-gray-800">{alias}</h1>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] font-black px-1.5 py-0.5 bg-blue-50 text-[#0066FF] rounded uppercase">Class Code</span>
                        <span className="text-sm font-black text-[#0066FF] tracking-widest">{classCode}</span>
                    </div>
                </div>
                <nav className="flex flex-col space-y-2 flex-grow">
                    <NavButton id="dashboard" label="대시보드" Icon={NewDashboardIcon} />
                    <NavButton id="students" label="학생 관리" Icon={NewManageAccountsIcon} />
                    <NavButton id="jobs" label="직업 관리" Icon={NewBriefcaseIcon} />
                    <NavButton id="tax" label="세금 관리" Icon={NewTaxIcon} />
                    <NavButton id="funds" label="펀드 관리" Icon={NewFundIcon} />
                    <NavButton id="donations" label="기부 관리" Icon={HeartIcon} />
                </nav>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <button 
                        onClick={() => setShowStockTransactions(true)} 
                        className="w-full flex items-center gap-3 p-4 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all group border border-indigo-100 shadow-sm"
                    >
                        <div className="w-6 h-6 flex items-center justify-center">
                            <NewStockIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        주식 관리
                    </button>
                </div>

                <button onClick={handleLogout} className="w-full flex items-center p-3 text-sm text-gray-600 rounded-lg hover:bg-gray-100 mt-auto">
                    <LogoutIcon className="w-10 h-10 mr-3" /> {onBackToMenu ? '메뉴로' : '로그아웃'}
                </button>
            </aside>
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="md:hidden bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">{alias}</h1>
                        <p className="text-[10px] font-black text-[#0066FF]">코드: {classCode}</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-gray-600"><LogoutIcon className="w-12 h-12" /></button>
                </header>
                <main className="flex-grow p-4 md:p-8 overflow-y-auto bg-[#F3F4F6]">
                    {loading ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B548F]"></div></div> : renderContent()}
                </main>
                <nav className="md:hidden bg-white border-t grid grid-cols-6 pb-safe">
                    <MobileNavButton id="dashboard" label="대시보드" Icon={NewDashboardIcon} />
                    <MobileNavButton id="students" label="학생" Icon={NewManageAccountsIcon} />
                    <MobileNavButton id="jobs" label="직업" Icon={NewBriefcaseIcon} />
                    <MobileNavButton id="tax" label="세금" Icon={NewTaxIcon} />
                    <MobileNavButton id="funds" label="펀드" Icon={NewFundIcon} />
                    <MobileNavButton id="donations" label="기부" Icon={HeartIcon} />
                </nav>
                <div className="md:hidden px-4 pb-4">
                    <button 
                        onClick={() => setShowStockTransactions(true)} 
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-black text-xs border border-indigo-100"
                    >
                        <NewStockIcon className="w-6 h-6" /> 주식 관리
                    </button>
                </div>
                {showStockTransactions && <StockTransactionsModal onClose={() => setShowStockTransactions(false)} />}
            </div>
        </div>
    );
};

export default TeacherDashboard;
