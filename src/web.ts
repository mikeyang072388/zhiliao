/**
 * 知了 · 网页服务
 *
 * 零依赖(原生 node:http):托管内嵌页面 + SSE 对话流 + 会话/花园/工具 API。
 * 支持多会话:侧边栏列出全部会话,可新建/切换,与 CLI 共享同一份数据。
 */
import http from 'node:http';
import type { ZhiliaoRuntime } from './plugins/runtime.js';
import type { LlmConfig } from './llm.js';
import { Session } from './session.js';
import { runTurn } from './loop.js';
import {
  loadGarden, saveGarden, doChore, onChat, onFail, toolAction, expToNext,
} from './game.js';
import { renderPage } from './web-static.js';

export interface WebServerOptions {
  runtime: ZhiliaoRuntime;
  cfg: LlmConfig;
  port: number;
}

export function startWebServer(opts: WebServerOptions): http.Server {
  const { runtime, cfg, port } = opts;
  const cwd = process.cwd();
  const garden = loadGarden(); // 与 CLI 共享的花园数据
  const sessions = new Map<string, Session>(); // 进程内缓存已激活的会话

  const getSession = (id?: string): Session => {
    if (id && sessions.has(id)) return sessions.get(id)!;
    if (id) {
      const resumed = Session.resume(id, cwd);
      if (resumed) {
        sessions.set(id, resumed);
        return resumed;
      }
    }
    // 默认:最新会话或新建
    const latest = Session.listWithMeta(cwd)[0];
    const s = latest ? Session.resume(latest.id, cwd)! : Session.create(cwd);
    sessions.set(s.id, s);
    return s;
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;
    const json = (code: number, data: unknown) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };

    if (path === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderPage());
      return;
    }

    if (path === '/api/garden' && req.method === 'GET') {
      json(200, { garden, expToNext: expToNext(garden.level) });
      return;
    }

    if (path === '/api/sessions' && req.method === 'GET') {
      json(200, { sessions: Session.listWithMeta(cwd) });
      return;
    }

    if (path === '/api/session/create' && req.method === 'POST') {
      const s = Session.create(cwd);
      sessions.set(s.id, s);
      json(200, { id: s.id });
      return;
    }

    if (path.startsWith('/api/session/') && req.method === 'GET') {
      const id = path.slice('/api/session/'.length);
      const s = Session.resume(id, cwd);
      json(200, s ? { id: s.id, messages: s.toView() } : { id, messages: [] });
      return;
    }

    if (path === '/api/tools' && req.method === 'GET') {
      json(200, {
        tools: runtime.listTools().map((t) => ({ name: t.name, icon: toolAction(t.name).icon, description: t.description })),
      });
      return;
    }

    if (path === '/api/chat' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        let message = '';
        let sessionId: string | undefined;
        try {
          const parsed = JSON.parse(body || '{}');
          message = String(parsed.message ?? '');
          sessionId = parsed.sessionId ? String(parsed.sessionId) : undefined;
        } catch {
          // 忽略坏请求体
        }
        const session = getSession(sessionId);
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

        send('session', { id: session.id });
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
