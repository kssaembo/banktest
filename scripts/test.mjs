import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({
  entryPoints: ['tests/development.test.ts'], outfile: '.test-build/development.test.mjs',
  bundle: true, platform: 'node', format: 'esm', packages: 'external',
  define: { 'import.meta.env': JSON.stringify({
    VITE_SUPABASE_URL: 'https://must-not-connect.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'not-a-real-key',
  }) },
});
const result = spawnSync(process.execPath, ['--test', '.test-build/development.test.mjs'], { stdio: 'inherit' });
await build({entryPoints:['tests/auth-gate-browser.tsx'],outfile:'.test-build/auth-gate.js',bundle:true,format:'esm',define:{'import.meta.env':JSON.stringify({VITE_DATA_MODE:'supabase'})},plugins:[{name:'mock-supabase',setup(b){b.onResolve({filter:/services\/supabaseClient$/},()=>({path:fileURLToPath(new URL('../tests/auth-gate-mock.ts',import.meta.url))}));}}]});
writeFileSync('.test-build/auth-gate.html','<!doctype html><meta charset="UTF-8"><div id="root"></div><p id="result">RUNNING</p><script type="module" src="./auth-gate.js"></script>');
process.exit(result.status ?? 1);
