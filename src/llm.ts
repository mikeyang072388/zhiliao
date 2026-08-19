/**
 * 知了 · LLM 适配层
 *
 * 只依赖原生 fetch(Node 22+),实现 OpenAI 兼容的流式/非流式调用。
 * 支持任何 OpenAI 兼容端点:DeepSeek、Kimi(Moonshot)、Qwen(通义)、
 * 以及本地 ollama(http://localhost:11434/v1)。这就是"多模型适配器"
 * 的最小实现——provider 只是一个 baseURL + apiKey 的配置对象。
 */

export interface LlmConfig {
  /** OpenAI 兼容端点,如 https://api.deepseek.com/v1 */
  baseURL: string;
  /** API key;本地模型(ollama)可为空 */
  apiKey?: string;
  /** 模型名,如 deepseek-chat / qwen-max / ollama 上的模型 */
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** assistant 消息可携带工具调用(OpenAI 协议 tool_calls) */
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON 字符串
}

export interface AssistantReply {
  content: string | null;
  toolCalls: ToolCall[];
}

/** 从环境变量解析默认配置:ZHI_LLM_BASE / ZHI_LLM_KEY / ZHI_LLM_MODEL */
export function defaultLlmConfig(): LlmConfig {
  return {
    baseURL: process.env.ZHI_LLM_BASE ?? 'https://api.deepseek.com/v1',
    apiKey: process.env.ZHI_LLM_KEY ?? process.env.DEEPSEEK_API_KEY,
    model: process.env.ZHI_LLM_MODEL ?? 'deepseek-chat',
  };
}

/** 把内部消息转成 OpenAI wire 格式(assistant 带 tool_calls 时原样回传) */
function toWire(m: ChatMessage): Record<string, unknown> {
  const base: Record<string, unknown> = { role: m.role, content: m.content };
  if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
    base.tool_calls = m.toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: tc.arguments },
    }));
  }
  return base;
}

/** 调用模型。tools 为 JSON Schema 数组;为空则纯对话。返回内容与工具调用。 */
export async function chat(
  cfg: LlmConfig,
  messages: ChatMessage[],
  tools?: unknown[],
): Promise<AssistantReply> {
  const url = `${cfg.baseURL.replace(/\/$/, '')}/chat/completions`;
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: messages.map(toWire),
    stream: false,
  };
  if (tools && tools.length > 0) body.tools = tools;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM 请求失败 (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: unknown[] } }[];
  };
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new Error('LLM 返回为空');

  const toolCalls: ToolCall[] = Array.isArray(msg.tool_calls)
    ? msg.tool_calls
        .map((tc: any) => ({
          id: String(tc.id ?? `call-${Math.random().toString(36).slice(2)}`),
          name: String(tc.function?.name ?? ''),
          arguments: String(tc.function?.arguments ?? '{}'),
        }))
        .filter((tc) => tc.name)
    : [];

  return { content: msg.content ?? null, toolCalls };
}

/** 在 messages 中追加一个工具调用结果(user 角色,OpenAI 协议) */
export function toolResultMessage(callId: string, content: string): ChatMessage {
  return {
    role: 'user',
    content: JSON.stringify({
      type: 'tool_result',
      tool_call_id: callId,
      content,
    }),
  };
}
