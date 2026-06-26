import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 纯前端静态站（React + TS）。
// dev 时自动用系统默认浏览器打开，避免内嵌预览窗拦截文件框。
// base: './' 让产物用相对路径，方便部署到 GitHub Pages 子路径或本地直接打开。
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    open: false,
    host: true
  },
  build: {
    target: 'es2018'
  }
});
