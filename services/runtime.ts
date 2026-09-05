// A missing setting must never connect a preview to the live database.
export const dataMode = import.meta.env.VITE_DATA_MODE || 'demo';
if (!['demo', 'supabase'].includes(dataMode)) throw new Error('VITE_DATA_MODE는 demo 또는 supabase여야 합니다.');
export const isDemo = dataMode === 'demo';
export const sessionKey = isDemo ? 'class_bank_demo_user_id' : 'class_bank_user_id';
