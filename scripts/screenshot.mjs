/**
 * 知了 · 花园页面截图脚本(生成 README banner / GIF 素材)
 * 用法:node scripts/screenshot.mjs [帧数] [间隔ms]
 * 前置:zhiliao web 已在 3939 运行;chrome-headless-shell 路径见下方常量。
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const CHROME = '/home/mikeyang0723/deepseek-harness/action-guide/chrome/chrome-headless-shell-linux64/chrome-headless-shell';
const DEBUG_PORT = 9222;
const TARGET = process.env.ZHI_SHOT_TARGET ?? 'http://127.0.0.1:3939';
const FRAMES = Number(process.argv[2] ?? 24);
const INTERVAL = Number(process.argv[3] ?? 300);
const WIDTH = 1280;
const HEIGHT = 800;

const chrome = spawn(
  CHROME,
  [`--remote-debugging-port=${DEBUG_PORT}`, '--no-sandbox', '--disable-gpu', `--window-size=${WIDTH},${HEIGHT}`, 'about:blank'],
  { stdio: 'ignore' },
);

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // chrome 还没起来
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('chrome 启动超时');
}

const ws = new WebSocket(await getWsUrl());
let seq = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const mid = ++seq;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
  }
};
await new Promise((r) => (ws.onopen = r));

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: TARGET });
await new Promise((r) => setTimeout(r, 3000)); // 等页面与花园动画就绪

mkdirSync('docs', { recursive: true });
rmSync('docs/frame-*.png', { force: true });
for (let i = 0; i < FRAMES; i++) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`docs/frame-${String(i).padStart(2, '0')}.png`, Buffer.from(data, 'base64'));
  await new Promise((r) => setTimeout(r, INTERVAL));
}
chrome.kill();
console.log(`✅ 已截取 ${FRAMES} 帧到 docs/frame-*.png`);
