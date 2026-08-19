# 知了 (zhiliao)

> 中文优先 · 轻量 · 把每一步都讲给你看的终端 AI 编码 agent · **万物皆插件**

知了是一个用 TypeScript 写的终端 AI 编码 agent,设计目标是三个词:

1. **中文优先** — 交互、错误、输出全中文;内置 DeepSeek / Kimi / Qwen / 本地 ollama 适配,开箱即用
2. **轻量** — 只依赖 `commander` + `cordis`,一个 npm 包全局安装即可运行,本地模型也能跑
3. **透明** — 每个回合都记录到会话日志(JSONL),支持 `--resume` 续聊,每一步做了什么都可以回放

## 万物皆插件

知了基于 [Cordis](https://github.com/cordiverse/cordis)(与 DeepSeek Harness 同款插件框架)构建。

**一切能力都是插件**:连内置的 `bash` / `read` / `write` / `edit` 工具,本身也是一个名为 `builtin-core` 的插件。第三方插件与内置工具走**同一条注册协议**:

```ts
// 一个插件 = 一个对象,apply 里用 ctx.tools.register() 注册工具
export const myPlugin = {
  name: 'my-plugin',
  description: '示例插件',
  apply(ctx) {
    ctx.tools.register({
      name: 'greet',
      description: '向用户问好',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false,
      },
      async execute(args) {
        return `你好,${args.name}!`;
      },
    });
  },
};
```

## 快速开始

```bash
# 安装
npm i -g zhiliao

# 配置(二选一)
export ZHI_LLM_KEY=sk-...                 # DeepSeek / Kimi / 任意 OpenAI 兼容
export ZHI_LLM_BASE=http://localhost:11434/v1   # 本地 ollama(无需 key)

# 直接执行任务
zhiliao "帮我写一个二分查找函数"

# 交互模式
zhiliao

# 续聊之前的会话
zhiliao --resume <会话id>

# 查看已加载的插件和工具
zhiliao --list-plugins
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ZHI_LLM_KEY` | `DEEPSEEK_API_KEY` | API key(本地模型可省略) |
| `ZHI_LLM_BASE` | `https://api.deepseek.com/v1` | OpenAI 兼容端点 |
| `ZHI_LLM_MODEL` | `deepseek-chat` | 模型名 |

## 会话存储

每个会话一个 JSONL 文件,逐事件落盘于 `~/.zhiliao/sessions/<工作区>/<会话id>.jsonl`:

```
session/start      会话创建
user/message       用户输入
assistant/tool-calls  模型请求调用工具
tool/call          工具调用
tool/result        工具结果
assistant/message  模型最终回复
```

`--resume <id>` 会重放这些事件还原对话历史。

## 项目结构

```
src/
├── bin.ts              # CLI 入口(commander)
├── loop.ts             # agent 循环(用户 → LLM → 工具 → 回灌 → 回复)
├── llm.ts              # LLM 适配层(OpenAI 兼容,任意 provider)
├── session.ts          # 会话持久化(JSONL + --resume)
├── tools/
│   ├── types.ts        # 工具协议(万物皆插件的最小契约)
│   └── builtin.ts      # 内置工具(bash/read/write/edit)
└── plugins/
    └── runtime.ts      # 插件运行时(Cordis: Context + Service)
```

## 开发

```bash
git clone <repo> && cd zhiliao
npm install
npm run build           # tsc 编译到 dist
npm run dev             # 编译 + 运行
node tests/mock-llm.mjs # (可选)端到端测试用 mock LLM
```

## 路线图

- [ ] 插件 CLI(`zhiliao plugin add <npm包>` 安装第三方插件)
- [ ] TUI 可视化(思考过程 + 工具时间线分屏)
- [ ] 流式输出、MCP 支持、更多内置工具
- [ ] 权限系统(工具调用前确认)

## License

MIT
