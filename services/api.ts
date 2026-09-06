import {operationCue,playSound} from './sounds';

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
      try {const result=await (fn as (...args: unknown[]) => unknown)(...args);const cue=operationCue(method);if(cue)playSound(cue);return result;} catch(error){if(!/^(get|login|validate)/.test(method))playSound('error-soft');throw error;}
    };
  },
});
