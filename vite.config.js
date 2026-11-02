import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         -> dist/        (nhiều file, dùng để deploy web thường)
// `npm run build:single`  -> dist-single/ (1 file HTML duy nhất, mở trực tiếp được)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 1500,
  },
  test: { environment: 'node', include: ['tests/**/*.test.js'], setupFiles: ['tests/setup.js'] },
}));
