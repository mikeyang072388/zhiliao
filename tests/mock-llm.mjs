/**
 * 端到端测试用的 mock LLM server(OpenAI 兼容)。
 * 行为:
 *  - 第一次请求(无工具结果):要求模型调 bash 执行 echo
 *  - 之后请求(带工具结果):返回最终中文回复
 * 用法:node tests/mock-llm.mjs,监听 18080
 */
import http from 'node:http';

let callCount = 0;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    callCount++;
    const parsed = JSON.parse(body);
    const messages = parsed.messages ?? [];
    const hasToolResult = JSON.stringify(messages).includes('tool_call_id');

    // 严格协议校验(模拟 DeepSeek 的 400):assistant 带 tool_calls 后,
    // 后续必须有 role='tool' 消息覆盖每个 tool_call_id
    const missing = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'assistant' && Array.isArray(messages[i].tool_calls)) {
        const ids = new Set(messages[i].tool_calls.map((c) => c.id));
        for (let j = i + 1; j < messages.length; j++) {
          if (messages[j].role === 'tool') ids.delete(messages[j].tool_call_id);
        }
        for (const id of ids) missing.push(id);
      }
    }
    if (missing.length > 0) {
      console.log(`[mock] 协议校验失败: 缺少 tool 消息 ${missing.join(', ')}`);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { message: `missing tool messages: ${missing.join(',')}` } }));
      return;
    }

    console.log(`[mock] 第 ${callCount} 次请求 · messages=${messages.length} · 带工具结果=${hasToolResult}`);
    res.setHeader('Content-Type', 'application/json');
    if (!hasToolResult) {
      res.end(JSON.stringify({
        choices: [{
          message: {
            content: '我先执行命令看看。',
            tool_calls: [{
              id: 'call-1',
              type: 'function',
              function: { name: 'bash', arguments: JSON.stringify({ command: 'echo 你好知了' }) },
            }],
          },
        }],
      }));
    } else {
      res.end(JSON.stringify({
        choices: [{ message: { content: '命令执行完成,你好知了!' } }],
      }));
    }
  });
});

server.listen(18080, '127.0.0.1', () => console.log('[mock] LLM server on http://127.0.0.1:18080'));
