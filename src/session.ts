/**
 * 知了 · 会话持久化
 *
 * 每个会话一个 JSONL 文件,逐事件落盘(参考 DSH 的事件日志设计但完全独立实现):
 *   ~/.zhiliao/sessions/<slug>/<sessionId>.jsonl
 * 事件:session/start, user/message, assistant/message, tool/call, tool/result, turn/end
 * 支持 --resume <id> 续聊:重放历史消息。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ChatMessage } from './llm.js';
import { toolResultMessage } from './llm.js';

export interface SessionEvent {
  type: string;
  time: number;
  [k: string]: unknown;
}

/** 把会话目录放在 ~/.zhiliao/sessions */
export function sessionsRoot(): string {
  return join(homedir(), '.zhiliao', 'sessions');
}

function slugify(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'default';
}

export class Session {
  readonly id: string;
  readonly cwd: string;
  private file: string;

  constructor(id: string, cwd: string) {
    this.id = id;
    this.cwd = cwd;
    this.file = join(sessionsRoot(), slugify(cwd), `${id}.jsonl`);
  }

  static create(cwd: string): Session {
    const s = new Session(randomUUID(), cwd);
    mkdirSync(join(sessionsRoot(), slugify(cwd)), { recursive: true });
    s.append('session/start', { cwd });
    return s;
  }

  static resume(id: string, cwd: string): Session | null {
    const s = new Session(id, cwd);
    if (!existsSync(s.file)) return null;
    return s;
  }

  /** 追加一条事件并立即落盘 */
  append(type: string, data: Record<string, unknown> = {}): void {
    const ev: SessionEvent = { type, time: Date.now(), ...data };
    writeFileSync(this.file, JSON.stringify(ev) + '\n', { flag: 'a' });
  }

  /** 重放历史,还原为 OpenAI 协议的消息数组 */
  readMessages(): ChatMessage[] {
    if (!existsSync(this.file)) return [];
    const messages: ChatMessage[] = [];
    let pendingToolCalls: { id: string; name: string; arguments: string }[] = [];
    let pendingContent: string | null = null;

    for (const line of readFileSync(this.file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const ev = JSON.parse(line) as SessionEvent;
      if (ev.type === 'user/message') {
        messages.push({ role: 'user', content: String(ev.content) });
      } else if (ev.type === 'assistant/message') {
        messages.push({ role: 'assistant', content: String(ev.content ?? '') });
      } else if (ev.type === 'assistant/tool-calls') {
        pendingToolCalls = (ev.calls as any[]) ?? [];
        pendingContent = (ev.content as string) ?? null;
        const msg: ChatMessage = {
          role: 'assistant',
          content: pendingContent ?? '',
          toolCalls: pendingToolCalls,
        };
        messages.push(msg);
      } else if (ev.type === 'tool/result') {
        const id = String(ev.callId ?? '');
        const content = String(ev.content ?? '');
        messages.push(toolResultMessage(id, content));
      }
    }
    return messages;
  }

  /** 列出某工作区下所有会话 id(供 --resume 提示) */
  static list(cwd: string): string[] {
    const dir = join(sessionsRoot(), slugify(cwd));
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => f.slice(0, -6));
  }

  /** 列出会话及其元信息(标题=首条用户消息,时间=文件修改时间,消息数),按时间倒序 */
  static listWithMeta(cwd: string): { id: string; title: string; time: number; count: number }[] {
    const dir = join(sessionsRoot(), slugify(cwd));
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => {
        const file = join(dir, f);
        let title = '';
        let count = 0;
        try {
          for (const line of readFileSync(file, 'utf8').split('\n')) {
            if (!line.trim()) continue;
            count++;
            if (!title) {
              const ev = JSON.parse(line) as SessionEvent;
              if (ev.type === 'user/message') title = String(ev.content ?? '').slice(0, 24);
            }
          }
        } catch {
          // 跳过损坏的会话文件
        }
        return { id: f.slice(0, -6), title: title || '(空会话)', time: statSync(file).mtimeMs, count };
      })
      .sort((a, b) => b.time - a.time);
  }

  /** 删除一个会话文件(网页侧边栏用);返回是否删除成功 */
  static delete(cwd: string, id: string): boolean {
    const file = join(sessionsRoot(), slugify(cwd), `${id}.jsonl`);
    if (!existsSync(file)) return false;
    unlinkSync(file);
    return true;
  }

  /** 会话的公开消息视图(网页切换会话时展示) */
  toView(): { role: string; content: string }[] {
    return this.readMessages()
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
      .map((m) => ({ role: m.role, content: m.content }));
  }
}
