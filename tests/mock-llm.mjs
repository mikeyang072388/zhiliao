/**
 * 端到端测试用的 mock LLM server(OpenAI 兼容 + SSE 流式)。
 * 行为:
 *  - 第一次请求(无工具结果):要求调 bash 执行 echo(流式 tool_calls)
 *  - 之后请求(带工具结果):返回流式中文回复
 *  - 严格协议校验:assistant 带 tool_calls 后必须有 role='tool' 消息覆盖每个 id
 * 用法:node tests/mock-llm.mjs,监听 18080
 */
import http from 'node:http';

let callCount = 0;

function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/** 把一段文本切成若干增量片发送 */
function streamText(res, text, chunk = 8) {
  for (let i = 0; i < text.length; i += chunk) {
    sse(res, { choices: [{ delta: { content: text.slice(i, i + chunk) } }] });
  }
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    callCount++;
    const parsed = JSON.parse(body);
    const messages = parsed.messages ?? [];

    // 严格协议校验(模拟 DeepSeek 的 400)
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

    const hasToolResult = JSON.stringify(messages).includes('tool_call_id');
    console.log(`[mock] 第 ${callCount} 次请求 · messages=${messages.length} · 带工具结果=${hasToolResult}`);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    if (!hasToolResult) {
      // 第一次:要求调用 bash,分片发出 tool_calls
      sse(res, { choices: [{ delta: { content: '我先执行命令看看。' } }] });
      sse(res, {
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              id: 'call-1',
              type: 'function',
              function: { name: 'bash', arguments: '' },
            }],
          },
        }],
      });
      const args = JSON.stringify({ command: 'echo 你好知了' });
      for (let i = 0; i < args.length; i += 6) {
        sse(res, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(i, i + 6) } }] } }] });
      }
    } else {
      streamText(res, '命令执行完成,你好知了!');
    }
    res.end('data: [DONE]\n\n');
  });
});

server.listen(18080, '127.0.0.1', () => console.log('[mock] SSE LLM server on http://127.0.0.1:18080'));
