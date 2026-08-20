# 知了 (zhiliao)

> 中文优先 · 轻量 · 把每一步都讲给你看的终端 AI 编码 agent · **万物皆插件** · 终端花园养成

知了是一个用 TypeScript 写的终端 AI 编码 agent,设计目标是四个词:

1. **中文优先** — 交互、错误、输出全中文;内置 DeepSeek / Kimi / Qwen / 本地 ollama 适配,开箱即用
2. **轻量** — 只依赖 `commander` + `cordis` + `ink`,一个 npm 包全局安装即可运行,本地模型也能跑
3. **透明** — 每个回合都记录到会话日志(JSONL),支持 `--resume` 续聊,每一步做了什么都可以回放
4. **趣味** — 终端不是冰冷的对话框,而是一座**蝉之园**:你让蝉干活,它就在花园里劳作、升级、结果实(养成数据跨会话持久化在 `~/.zhiliao/garden.json`)

## 🌸 蝉之园(为什么和别人不一样)

市面上的 agent 终端要么极简黑盒,要么标准聊天气泡。知了把终端变成一个**养成花园**——界面保持干净简洁,但底部有你的蝉和它的果园:

```
帮你写个排序算法
⚒️ 蝉挥动锄头(bash)
🍎 收获 🍊!
🍃 写好了,用快速排序,复杂度 O(n log n)

蝉之园 Lv.5 🦗(๑˃ᴗ˂)ﻭ 果实 🍎🍐 · 劳作 12 · /exit 退出
你>
```

- **工具 = 农具**:`bash` 是挥锄头 ⚒️、`read` 是观察 🔍、`write` 是播种 🌱、`edit` 是修剪 ✂️
- **成长**:每成功一次工具调用 +10 经验,升级让蝉换形态(🥚→🐛→🍂→🦗)
- **收获**:每 5 次劳作结一个随机果实 🍎🍐🍑🍊🍇,存进你的果园
- **心情**:成功心情好,失败花会蔫 🥀(蝉的表情会变:从 (๑˃ᴗ˂)ﻭ 到 (╥﹏╥))
- **养成是真实的**:花园数据存在 `~/.zhiliao/garden.json`,今天种的明天还在
- **界面可靠**:长文本自动换行,消息流滚动,不会重叠到输入框

## 网页 UI 🌐

除了终端,知了还有一个**会动的花园网页**(零构建,纯 CSS 动画):

```bash
zhiliao web            # 默认端口 3939
zhiliao web --port 8080
# 浏览器打开 http://127.0.0.1:3939
```

- **侧边栏**:会话列表(标题/时间/消息数,点击切换)、新建会话、农具一览
- **花园**:云在飘、太阳转、花在摇、蝉在蹦,树随等级长大,果实挂上树
- **聊天**:流式打字机输出,工具调用显示为"⚒️ 挥动锄头",Enter 或点击发送;回复支持 **Markdown 渲染**(代码块/标题/列表/链接)
- 多会话隔离,历史可回看;花园数据与 CLI **完全共享**(同一个 `~/.zhiliao/garden.json`)

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

### 🚀 开发你自己的插件(放个文件就生效)

**不用改任何代码,不用重启工程**——把你的插件存到 `~/.zhiliao/plugins/` 目录:

```bash
mkdir -p ~/.zhiliao/plugins
# 复制示例插件(项目里 examples/hello.plugin.js)
cp node_modules/zhiliao/examples/hello.plugin.js ~/.zhiliao/plugins/hello.js

# CLI:下次启动自动加载,立即可用
zhiliao --list-plugins          # 能看到 hello 插件和 say_hello 工具

# 网页:启动后侧边栏"🧩 插件"类目显示,点"↻ 重载"即时生效,不用重启服务
zhiliao web
```

- **插件文件格式**:`export default { name, description?, apply(ctx) }`(JS 即可,无需 TS/构建)
- **apply(ctx) 里能做什么**:`ctx.tools.register(...)` 注册工具;还能用 Cordis 的能力(服务、事件、生命周期)
- **改完即生效**:网页侧边栏点"重载",或重启 CLI——工具列表立刻更新
- **失败不炸**:某个插件写错了,只影响它自己,其他插件和内置工具照常

### 📦 随包示例插件(已装在 ~/.zhiliao/plugins/)

| 插件 | 工具 | 说明 |
|---|---|---|
| `hello` | `say_hello` | 入门示例:注册一个问候工具 |
| `time` | `now` | 当前日期时间 |
| `http` | `http_get` | HTTP GET 请求,读网页/调 API(无需 bash) |
| `weather` | `weather` | 城市天气(open-meteo 免费 API,无需 key) |
| `calc` | `calc` | 数学计算器(sqrt/log/pow 等) |

源码在项目 `examples/*.plugin.js`,复制到 `~/.zhiliao/plugins/` 即启用;写自己的插件照这个格式即可。

## 快速开始

```bash
# 安装
npm i -g zhiliao

# 配置(只需一次,持久化到 ~/.zhiliao/config.json,以后永远不用再输)
zhiliao config --key sk-xxx                 # 设置 API key
zhiliao config --show                       # 查看当前配置
zhiliao config                              # 交互式设置 key/模型/端点

# 直接执行任务
zhiliao "帮我写一个二分查找函数"

# 交互模式
zhiliao

# 续聊之前的会话
zhiliao --resume <会话id>

# 查看已加载的插件和工具
zhiliao --list-plugins
```

## 配置优先级

命令行参数 > 环境变量 > 配置文件(`~/.zhiliao/config.json`)> 默认值

| 来源 | 示例 |
|---|---|
| 命令行 | `zhiliao --model qwen-max "..."` |
| 环境变量 | `ZHI_LLM_KEY` / `ZHI_LLM_BASE` / `ZHI_LLM_MODEL`(以及 `DEEPSEEK_API_KEY`) |
| 配置文件 | `zhiliao config --key sk-xxx` 写入 |

本地 ollama 无需 key:`zhiliao config --base http://localhost:11434/v1 --key ""` 后设置模型即可。

## 环境变量(可选的临时覆盖,优先级高于配置文件)

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
├── bin.tsx             # CLI 入口(commander:任务/交互/web/config)
├── loop.ts             # agent 循环(用户 → LLM → 工具 → 回灌 → 回复)
├── llm.ts              # LLM 适配层(OpenAI 兼容 + SSE 流式)
├── session.ts          # 会话持久化(JSONL + --resume)
├── config.ts           # 持久化配置(~/.zhiliao/config.json)
├── game.ts             # 花园养成逻辑(等级/果实/心情)
├── web.ts              # 网页服务(原生 http + SSE)
├── web-static.ts       # 网页前端(纯 CSS 花园,零构建)
├── tools/
│   ├── types.ts        # 工具协议(万物皆插件的最小契约)
│   └── builtin.ts      # 内置工具(bash/read/write/edit)
├── ui/
│   └── simple.tsx      # 终端花园界面(ink)
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
