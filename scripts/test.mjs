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
process.exit(result.status ?? 1);
