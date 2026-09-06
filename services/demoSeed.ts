import { Role, User, Account, StockProductWithDetails, StudentStock, SavingsProduct, StudentSaving, Job, TaxItemWithRecipients, StockHistory, Fund, FundStatus, FundInvestment, Donation, TransactionType } from '../types';

// Helper function to generate UUIDs
const uuidv4 = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
            return crypto.randomUUID();
        } catch (e) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Check if the current session is a guest session
export const isGuestSession = (): boolean => {
    try {
        return sessionStorage.getItem('class_bank_is_guest') === 'true' || localStorage.getItem('class_bank_is_guest') === 'true';
    } catch (e) {
        return false;
    }
};

// Get current guest user ID
export const getGuestUserId = (): string | null => {
    try {
        return sessionStorage.getItem('class_bank_user_id') || localStorage.getItem('class_bank_user_id');
    } catch (e) {
        return null;
    }
};

// Default Mock Database State
export const createDefaultMockState = () => {
    const teacherId = 'guest_teacher';
    const classCode = '2026';
    const currencyUnit = '톨';
    const teacherAlias = '은하쌤';

    const teacherUser: User = {
        userId: teacherId,
        name: teacherAlias,
        role: Role.TEACHER,
        teacherAlias,
        currencyUnit,
        classCode
    };

    const students: User[] = [
        { userId: 'guest_student_1', name: '김민준', role: Role.STUDENT, grade: 5, class: 1, number: 1, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_2', name: '이서연', role: Role.STUDENT, grade: 5, class: 1, number: 2, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_3', name: '박지우', role: Role.STUDENT, grade: 5, class: 1, number: 3, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_4', name: '최도윤', role: Role.STUDENT, grade: 5, class: 1, number: 4, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_5', name: '정하윤', role: Role.STUDENT, grade: 5, class: 1, number: 5, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_6', name: '강준우', role: Role.STUDENT, grade: 5, class: 1, number: 6, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_7', name: '조아라', role: Role.STUDENT, grade: 5, class: 1, number: 7, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_8', name: '한지민', role: Role.STUDENT, grade: 5, class: 1, number: 8, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_9', name: '임현우', role: Role.STUDENT, grade: 5, class: 1, number: 9, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
        { userId: 'guest_student_10', name: '윤소희', role: Role.STUDENT, grade: 5, class: 1, number: 10, teacher_id: teacherId, teacherAlias, currencyUnit, classCode },
    ];

    const accounts: Account[] = [
        { id: 'guest_treasury_acc', accountId: 'guest_treasury_acc', userId: teacherId, balance: 450000, teacher_id: teacherId, account_type: 'treasury' },
        { id: 'guest_mart_acc', accountId: 'guest_mart_acc', userId: teacherId, balance: 120000, teacher_id: teacherId, account_type: 'mart' },
        ...students.map((s, index) => ({
            id: `guest_acc_${s.userId}`,
            accountId: `guest_acc_${s.userId}`,
            userId: s.userId,
            balance: 15000 + (index * 4500),
            teacher_id: teacherId,
            account_type: 'personal',
            qrToken: `token_${s.userId}`
        }))
    ];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    const transactions: any[] = [];
    
    // Add default initial transactions
    students.forEach((s, index) => {
        const accId = `guest_acc_${s.userId}`;
        transactions.push({
            transactionId: `tx_init_${s.userId}`,
            accountId: accId,
            type: TransactionType.SALARY,
            amount: 3000,
            date: dayBeforeYesterday.toISOString(),
            description: '6월 기본 급여 지급',
            teacher_id: teacherId
        });
        transactions.push({
            transactionId: `tx_mart_${s.userId}`,
            accountId: accId,
            type: TransactionType.MART,
            amount: 500,
            date: yesterday.toISOString(),
            description: '교실 마트 간식 구매',
            teacher_id: teacherId
        });
    });

    const jobs: Job[] = [
        { id: 'job_1', jobName: '은행원', salary: 3500, description: '오프라인 현금을 통장 잔고로 환전해주고 저축 상품 가입을 도웁니다.', teacher_id: teacherId, incentive: 0, assigned_students: [{ userId: 'guest_student_1', name: '김민준' }] },
        { id: 'job_2', jobName: '마트 판매원', salary: 3200, description: '교실 마트에서 물품을 판매하고 결제 서비스를 조작합니다.', teacher_id: teacherId, incentive: 0, assigned_students: [{ userId: 'guest_student_2', name: '이서연' }] },
        { id: 'job_3', jobName: '환경 미화원', salary: 2800, description: '교실 환기와 분리 수거를 담당하여 쾌적한 교실을 만듭니다.', teacher_id: teacherId, incentive: 100, assigned_students: [] },
        { id: 'job_4', jobName: '학급 반장', salary: 4000, description: '학급 자치 회의를 이끌고 선생님을 도와 학급 대소사를 관리합니다.', teacher_id: teacherId, incentive: 200, assigned_students: [{ userId: 'guest_student_5', name: '정하윤' }] },
        { id: 'job_5', jobName: '경제 기자', salary: 3000, description: '학급 뉴스를 발굴하고 정기적으로 시황 기사를 작성합니다.', teacher_id: teacherId, incentive: 0, assigned_students: [] },
    ];

    const stockProducts: any[] = [
        { id: 'stock_1', name: '애플 파이 (간식 제조사)', currentPrice: 150, volatility: 0.05, stockAccountId: 'guest_stock_acc_1', teacher_id: teacherId },
        { id: 'stock_2', name: '은하 우주선 (학급 교통)', currentPrice: 480, volatility: 0.08, stockAccountId: 'guest_stock_acc_2', teacher_id: teacherId },
        { id: 'stock_3', name: '모둠 칠판 (학급 서비스)', currentPrice: 80, volatility: 0.03, stockAccountId: 'guest_stock_acc_3', teacher_id: teacherId },
    ];

    const stockHistory: StockHistory[] = [];
    stockProducts.forEach(sp => {
        for (let i = 5; i >= 0; i--) {
            const hDate = new Date();
            hDate.setHours(hDate.getHours() - i * 4);
            const priceFactor = 1 + (Math.random() * 0.2 - 0.1);
            stockHistory.push({
                id: `sh_${sp.id}_${i}`,
                stockId: sp.id,
                price: Math.round(sp.currentPrice * priceFactor),
                createdAt: hDate.toISOString()
            });
        }
    });

    const studentStocks: StudentStock[] = [
        { userId: 'guest_student_1', stockId: 'stock_1', quantity: 20, purchasePrice: 140, teacher_id: teacherId },
        { userId: 'guest_student_1', stockId: 'stock_2', quantity: 5, purchasePrice: 450, teacher_id: teacherId },
        { userId: 'guest_student_2', stockId: 'stock_1', quantity: 15, purchasePrice: 145, teacher_id: teacherId },
        { userId: 'guest_student_3', stockId: 'stock_3', quantity: 50, purchasePrice: 75, teacher_id: teacherId },
        { userId: 'guest_student_4', stockId: 'stock_2', quantity: 10, purchasePrice: 490, teacher_id: teacherId },
    ];

    const savingsProducts: SavingsProduct[] = [
        { id: 'savings_1', name: '7일 행운 예금', maturityDays: 7, rate: 0.1, cancellationRate: 0.02, maxAmount: 50000, teacher_id: teacherId },
        { id: 'savings_2', name: '14일 보름달 적금', maturityDays: 14, rate: 0.25, cancellationRate: 0.05, maxAmount: 100000, teacher_id: teacherId },
    ];

    const studentSavings: StudentSaving[] = [
        { savingId: 'ss_1', userId: 'guest_student_1', productId: 'savings_1', amount: 5000, joinDate: yesterday.toISOString(), maturityDate: new Date(yesterday.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), teacher_id: teacherId, product: savingsProducts[0] },
        { savingId: 'ss_2', userId: 'guest_student_3', productId: 'savings_2', amount: 10000, joinDate: dayBeforeYesterday.toISOString(), maturityDate: new Date(dayBeforeYesterday.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), teacher_id: teacherId, product: savingsProducts[1] },
    ];

    const taxes: any[] = [
        { id: 'tax_1', name: '6월 종합소득세', amount: 300, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), teacher_id: teacherId },
        { id: 'tax_2', name: '급식실 위반 과태료', amount: 50, dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), teacher_id: teacherId }
    ];

    // Some students already paid, some unpaid
    const taxPayments: any[] = [
        { userId: 'guest_student_1', taxId: 'tax_1', paid: true, paidDate: yesterday.toISOString() },
        { userId: 'guest_student_2', taxId: 'tax_1', paid: true, paidDate: yesterday.toISOString() },
        { userId: 'guest_student_3', taxId: 'tax_1', paid: false },
        { userId: 'guest_student_4', taxId: 'tax_1', paid: false },
        { userId: 'guest_student_5', taxId: 'tax_1', paid: true, paidDate: yesterday.toISOString() },
        { userId: 'guest_student_6', taxId: 'tax_1', paid: false },
        { userId: 'guest_student_7', taxId: 'tax_1', paid: false },
        { userId: 'guest_student_8', taxId: 'tax_1', paid: false },
        { userId: 'guest_student_9', taxId: 'tax_1', paid: false },
        { userId: 'guest_student_10', taxId: 'tax_1', paid: false },
        
        { userId: 'guest_student_1', taxId: 'tax_2', paid: false },
        { userId: 'guest_student_5', taxId: 'tax_2', paid: true, paidDate: yesterday.toISOString() },
    ];

    const funds: Fund[] = [
        { id: 'fund_1', name: '우리반 수학익힘책 다풀기 펀드', description: '우리 반 전원이 6월 수학익힘책 풀기 숙제를 인증하면 성공 보너스가 지급됩니다!', creatorId: 'guest_teacher', creatorName: '은하쌤', teacher_id: teacherId, unitPrice: 100, targetAmount: 50000, baseReward: 10, incentiveReward: 20, recruitmentDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), maturityDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), status: FundStatus.ONGOING, executionRate: 0, createdAt: dayBeforeYesterday.toISOString(), totalInvestedAmount: 32000, investorCount: 3 },
        { id: 'fund_2', name: '지각생 없는 일주일 만들기 펀드', description: '한 주 동안 우리 반에 지각생이 단 한 명도 안 나오면 투자금의 1.5배로 배당해드립니다!', creatorId: 'guest_teacher', creatorName: '은하쌤', teacher_id: teacherId, unitPrice: 500, targetAmount: 20000, baseReward: 50, incentiveReward: 100, recruitmentDeadline: dayBeforeYesterday.toISOString(), maturityDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), status: FundStatus.SUCCESS, executionRate: 100, createdAt: dayBeforeYesterday.toISOString(), totalInvestedAmount: 20000, investorCount: 2 },
    ];

    const fundInvestments: FundInvestment[] = [
        { id: 'fi_1', fundId: 'fund_1', studentUserId: 'guest_student_1', units: 50, investedAt: yesterday.toISOString(), fund: funds[0] },
        { id: 'fi_2', fundId: 'fund_1', studentUserId: 'guest_student_2', units: 80, investedAt: yesterday.toISOString(), fund: funds[0] },
        { id: 'fi_3', fundId: 'fund_1', studentUserId: 'guest_student_3', units: 120, investedAt: yesterday.toISOString(), fund: funds[0] },
        { id: 'fi_4', fundId: 'fund_2', studentUserId: 'guest_student_1', units: 20, investedAt: yesterday.toISOString(), fund: funds[1] },
        { id: 'fi_5', fundId: 'fund_2', studentUserId: 'guest_student_5', units: 20, investedAt: yesterday.toISOString(), fund: funds[1] },
    ];

    const donations: Donation[] = [
        { id: 'donation_1', title: '사랑의 연탄 나누기 모금함 🪵', url: 'https://naver.com', content: '추운 겨울 이웃들을 위해 은하쌤 학급이 따뜻함을 선물합니다. 기부된 톨은 사회복지기관을 통해 연탄으로 기증됩니다.', imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300', status: 'ongoing', current_amount: 12500, teacher_id: teacherId, created_at: dayBeforeYesterday.toISOString() },
        { id: 'donation_2', title: '우리 교실 새로운 보드게임 추가 구입 ♟️', url: 'https://naver.com', content: '점심시간에 함께 즐길 부루마블과 루미큐브 추가 기금 모금함입니다!', imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300', status: 'ongoing', current_amount: 4500, teacher_id: teacherId, created_at: dayBeforeYesterday.toISOString() },
    ];

    const donationLogs: any[] = [
        { id: 'dl_1', donation_id: 'donation_1', user_id: 'guest_student_1', amount: 1500, user_name: '김민준', user_number: 1, created_at: yesterday.toISOString() },
        { id: 'dl_2', donation_id: 'donation_1', user_id: 'guest_student_2', amount: 3000, user_name: '이서연', user_number: 2, created_at: yesterday.toISOString() },
        { id: 'dl_3', donation_id: 'donation_1', user_id: 'guest_student_3', amount: 8000, user_name: '박지우', user_number: 3, created_at: yesterday.toISOString() },
        { id: 'dl_4', donation_id: 'donation_2', user_id: 'guest_student_5', amount: 4500, user_name: '정하윤', user_number: 5, created_at: yesterday.toISOString() },
    ];

    const martItems = [
        { id: 'mart_item_1', teacher_id: teacherId, name: '연필', price: 300, category: '학용품', is_active: true, sort_order: 1, created_at: yesterday.toISOString(), updated_at: yesterday.toISOString() },
        { id: 'mart_item_2', teacher_id: teacherId, name: '지우개', price: 200, category: '학용품', is_active: true, sort_order: 2, created_at: yesterday.toISOString(), updated_at: yesterday.toISOString() },
        { id: 'mart_item_3', teacher_id: teacherId, name: '간식 교환권', price: 500, category: '교환권', is_active: true, sort_order: 3, created_at: yesterday.toISOString(), updated_at: yesterday.toISOString() },
    ];

    return {
        teacherUser,
        students,
        accounts,
        transactions,
        jobs,
        stockProducts,
        stockHistory,
        studentStocks,
        savingsProducts,
        studentSavings,
        taxes,
        taxPayments,
        funds,
        fundInvestments,
        donations,
        donationLogs
        ,martItems
    };
};

// State Manager

