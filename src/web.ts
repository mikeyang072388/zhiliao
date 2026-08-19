/**
 * 知了 · 网页服务
 *
 * 零依赖(原生 node:http):托管内嵌页面 + SSE 对话流 + 花园 API。
 * 前端与后端共享 garden.json(和 CLI 同一份养成数据)。
 */
import http from 'node:http';
import type { ZhiliaoRuntime } from './plugins/runtime.js';
import type { LlmConfig } from './llm.js';
import type { Session } from './session.js';
import { runTurn } from './loop.js';
import {
  loadGarden, saveGarden, doChore, onChat, onFail, toolAction, expToNext,
} from './game.js';
import { renderPage } from './web-static.js';

export interface WebServerOptions {
  runtime: ZhiliaoRuntime;
  cfg: LlmConfig;
  session: Session;
  port: number;
}

export function startWebServer(opts: WebServerOptions): http.Server {
  const { runtime, cfg, session, port } = opts;
  const garden = loadGarden(); // 与 CLI 共享的花园数据

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    if (path === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderPage());
      return;
    }

    if (path === '/api/garden' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ garden, expToNext: expToNext(garden.level) }));
      return;
    }

    if (path === '/api/chat' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        let message = '';
        try {
          message = String(JSON.parse(body || '{}').message ?? '');
        } catch {
          // 忽略坏请求体
        }
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        const send = (type: string, data: Record<string, unknown> = {}) => {
          res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
        };
        const sendState = () => {
          send('state', { garden: { ...garden }, expToNext: expToNext(garden.level) });
        };

        send('user', { text: message });
        try {
          await runTurn(runtime, cfg, session, message, {
            onStep: (step) => {
              if (step.kind === 'tool') {
                const { icon, verb } = toolAction(step.tool ?? '');
                send('tool', { icon, name: `${verb}(${step.tool})` });
                const r = doChore(garden);
                saveGarden(garden);
                sendState();
                if (r.fruit) send('system', { text: `🍎 收获 ${r.fruit}!` });
                if (r.levelUp) send('system', { text: `🎉 升级!Lv.${garden.level}` });
              }
            },
            onDelta: (text) => send('delta', { text }),
          });
          onChat(garden);
          saveGarden(garden);
          sendState();
        } catch (err) {
          onFail(garden);
          saveGarden(garden);
          sendState();
          send('error', { text: err instanceof Error ? err.message : String(err) });
        }
        send('done');
        res.end();
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  });

  server.listen(port, () => {
    console.log(`🍃 知了网页: http://127.0.0.1:${port}`);
  });
  return server;
}
