import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { 'jalaali-js': fileURLToPath(new URL('./node_modules/jalaali-js', import.meta.url)) } },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 20000, fileParallelism: false }
});
