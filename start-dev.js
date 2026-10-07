import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Memulai SANDI (Sistem Arsip & Navigasi Dokumen Internal)...');

// 1. Jalankan Backend Server
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// 2. Jalankan Frontend Client
const client = spawn('npm', ['run', 'dev', '--prefix', 'client'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

process.on('SIGINT', () => {
  server.kill();
  client.kill();
  process.exit();
});
