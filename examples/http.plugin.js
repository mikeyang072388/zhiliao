/**
 * 知了 · 示例插件:HTTP 请求
 * 让 agent 不用 bash 也能读取网页/调用 API(更可控)。
 */
export default {
  name: 'http',
  description: 'HTTP 请求工具:读取网页或调用 API',
  apply(ctx) {
    ctx.tools.register({
      name: 'http_get',
      description: '发送 HTTP GET 请求,返回响应文本(最多 8000 字符)。用于读取网页或调用 JSON API',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: '完整 URL' } },
        required: ['url'],
        additionalProperties: false,
      },
      async execute(args) {
        const url = String(args.url ?? '');
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
          const text = await res.text();
          return `状态 ${res.status}\n${text.slice(0, 8000)}`;
        } catch (err) {
          return `请求失败: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });
  },
};
