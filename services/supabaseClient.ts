
import { createClient } from '@supabase/supabase-js';
import { isDemo } from './runtime';
import { validateTestProjectUrl } from './testProject';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!isDemo && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = isDemo
  ? new Proxy({} as ReturnType<typeof createClient>, { get() { throw new Error('가상 학급에서는 실제 데이터베이스에 연결할 수 없습니다.'); } })
  : createClient(validateTestProjectUrl(supabaseUrl), supabaseAnonKey, {
      auth: { storage: localStorage, persistSession: true, autoRefreshToken: true, storageKey: 'classbank-test-hoktiaduvzoaeapymuqw-auth' },
    });
