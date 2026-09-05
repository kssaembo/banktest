
import { isDemo } from './runtime';
import type { api as SupabaseApi } from './supabaseApi';
export type BankApi = typeof SupabaseApi;
// The live implementation is not loaded in demo mode.
const backend = isDemo ? import('./demoApi') : import('./supabaseApi');
export const api = new Proxy({} as BankApi, {
  get(_target, method: string) {
    if (method === 'then') return undefined;
    return async (...args: unknown[]) => {
      const { api: implementation } = await backend;
      const fn = implementation[method as keyof BankApi];
      if (typeof fn !== 'function') throw new Error(`지원하지 않는 기능: ${method}`);
      return (fn as (...args: unknown[]) => unknown)(...args);
    };
  },
});
