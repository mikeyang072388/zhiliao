/**
 * 知了 · agent 循环
 *
 * 用户输入 → 调 LLM(携带工具目录)→ 若有工具调用则执行并回灌 → 再调 LLM,
 * 直到模型不再调用工具。整个过程逐事件写入会话日志(可 --resume 重放)。
 */
import type { LlmConfig } from './llm.js';
import { chat, toolResultMessage } from './llm.js';
import type { ZhiliaoRuntime } from './plugins/runtime.js';
import type { Session } from './session.js';
import { toOpenAiTools } from './tools/types.js';

export interface TurnOptions {
  /** 系统提示(默认中文 persona) */
  system?: string;
  /** 单轮最多工具迭代次数,防死循环 */
  maxIterations?: number;
  /** 每步输出回调(用于可视化/教学模式的钩子) */
  onStep?: (step: { kind: 'llm' | 'tool' | 'done'; text?: string; tool?: string }) => void;
}

export const DEFAULT_SYSTEM = `你叫"知了",一个中文优先、轻量、把每一步都讲给你看的终端 AI 编码 agent。
你可以调用工具完成文件操作、执行命令等任务。规则:
1. 能自己用工具查证的就不要猜;
2. 每一步尽量简短说明你在做什么(教学风格);
3. 最终用中文回答用户。`;

export interface TurnResult {
  reply: string | null;
  toolCalls: number;
}

export async function runTurn(
  runtime: ZhiliaoRuntime,
  cfg: LlmConfig,
  session: Session,
  userText: string,
  opts: TurnOptions = {},
): Promise<TurnResult> {
  const system = opts.system ?? DEFAULT_SYSTEM;
  const maxIterations = opts.maxIterations ?? 20;
  const onStep = opts.onStep ?? (() => undefined);

  // 重放历史 + 新用户消息
  const messages = session.readMessages();
  if (!messages.some((m) => m.role === 'system')) {
    messages.unshift({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: userText });
  session.append('user/message', { content: userText });

  let reply: string | null = null;
  let toolCalls = 0;

  for (let i = 0; i < maxIterations; i++) {
    const tools = toOpenAiTools(runtime.listTools());
    onStep({ kind: 'llm', text: `第 ${i + 1} 次请求模型(可用工具 ${tools.length} 个)` });
    const res = await chat(cfg, messages, tools);

    if (res.toolCalls.length === 0) {
      reply = res.content;
      session.append('assistant/message', { content: reply ?? '' });
      onStep({ kind: 'done', text: reply ?? '' });
      return { reply, toolCalls };
    }

    // assistant 消息带 tool_calls 落盘,并原样回传给模型
    session.append('assistant/tool-calls', { content: res.content ?? '', calls: res.toolCalls });
    messages.push({ role: 'assistant', content: res.content ?? '', toolCalls: res.toolCalls });

    for (const call of res.toolCalls) {
      const tool = runtime.getTool(call.name);
      let resultText: string;
      try {
        const args = JSON.parse(call.arguments || '{}');
        resultText = tool
          ? await tool.execute(args)
          : `未知工具 "${call.name}",可用工具: ${runtime.listTools().map((t) => t.name).join(', ')}`;
      } catch (err) {
        resultText = `调用失败: ${String(err)}`;
      }
      session.append('tool/call', { name: call.name, args: call.arguments });
      session.append('tool/result', { name: call.name, callId: call.id, content: resultText });
      messages.push(toolResultMessage(call.id, resultText));
      toolCalls++;
      onStep({ kind: 'tool', tool: call.name, text: resultText.slice(0, 120) });
    }
  }

  reply = '(达到单轮迭代上限,请考虑把任务拆小或补充说明)';
  session.append('assistant/message', { content: reply });
  onStep({ kind: 'done', text: reply });
  return { reply, toolCalls };
}
