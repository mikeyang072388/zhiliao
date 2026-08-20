<h1 align="center">🍃 知了 zhiliao</h1>

<p align="center">
  <b>会养花园的中文 AI 编码 agent</b><br>
  把编码变成一场养成游戏 —— 每个工具都是农具,每次成功都结一个果实 🍎
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/zhiliao"><img src="https://img.shields.io/npm/v/zhiliao?style=flat-square&label=npm&color=2e7d32" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/zhiliao"><img src="https://img.shields.io/npm/dt/zhiliao?style=flat-square&label=下载量&color=43a047" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/license-MIT-2e7d32?style=flat-square" alt="MIT">
  <img src="https://img.shields.io/badge/插件-万物皆插件-7cb342?style=flat-square" alt="plugins">
</p>

<p align="center">
  <b>🇨🇳 中文优先</b> · <b>🧩 万物皆插件</b> · <b>🌸 花园养成</b> · <b>⚡ 轻量零依赖</b> · <b>🏠 本地模型</b>
</p>

---

## 为什么是知了?

市面上的 AI 编码 agent,要么是冷冰冰的极简黑盒,要么是千篇一律的英文聊天气泡。**它们帮你写代码,却从不认识你。**

知了不一样。它是**一只住在终端里的蝉**,你每次让它干活,它就在花园里挥锄头、播种、收获:

```
      ☁️        ☀️        ☁️
       🌳
    🌷🌱🌸🌻🌼
 蝉之园 Lv.5 🦗 (๑˃ᴗ˂)ﻭ 经验 ██████░░░░ 🍎🍐🍑
 ─────────────────────────────────
你> 帮我写个排序算法
⚒️ 蝉挥动锄头(bash)
🍎 收获 🍊!(+10 经验)
🍃 写好了,快速排序,O(n log n)
─────────────────────────────────
你> _
```

**你用工具,它长大;你犯错,它心疼。** 花园跨会话永久保存——今天种的果实,明天还在。

## ✨ 特性

| | 特性 | 说明 |
|---|---|---|
| 🌸 | **花园养成(独此一家)** | 工具=农具,5 次劳作结一个果,升级让树长大 🌱→🌿→🌳;心情会变,失败花会蔫 🥀 |
| 🧩 | **万物皆插件** | 放一个 `.js` 文件到 `~/.zhiliao/plugins/` 就生效——**网页侧边栏点"重载"即时热更新**,不用改代码、不用重启。基于 [Cordis](https://github.com/cordiverse/cordis)(DeepSeek Harness 同款框架) |
| 🇨🇳 | **中文优先** | 全中文交互;DeepSeek / Kimi / Qwen 开箱即用;中文路径、中文输出零障碍 |
| ⚡ | **轻到极致** | 原生 Node,零构建链;CLI + 网页双界面,共用一个核心 |
| 🖥️ | **会动的花园网页** | `zhiliao web` → 浏览器里云在飘、花在摇、蝉在蹦,果实在树上发光 |
| 🏠 | **本地模型友好** | 一行配置接 ollama,数据不出本机,隐私无忧 |
| 🔒 | **Key 只在本机** | API key 存在 `~/.zhiliao/config.json`(权限 0600),发布开源也绝不泄漏 |
| 💾 | **透明会话** | 每轮对话 JSONL 落盘,`--resume` 续聊,随时回放 |

## 🚀 30 秒上手

```bash
# 1. 安装
npm i -g zhiliao

# 2. 配一次 key(永久生效,以后不用再输)
zhiliao config --key sk-你的key

# 3. 开始!
zhiliao "帮我写一个二分查找"
zhiliao                        # 进入花园交互模式
zhiliao web                    # 打开会动的花园网页 http://127.0.0.1:3939
```

本地模型?`zhiliao config --base http://localhost:11434/v1 --key ""` 即可。

## 🧩 万物皆插件,真的"万物"

**内置工具本身就是一个插件**(`builtin-core`)——第三方插件和它走同一条协议,没有任何特权。

```bash
mkdir -p ~/.zhiliao/plugins
cp node_modules/zhiliao/examples/weather.plugin.js ~/.zhiliao/plugins/  # 抄一个示例
# 改吧改吧,存盘,网页点"↻ 重载",完事。
```

```js
// 一个插件 = 一个对象。就这么简单。
export default {
  name: 'my-plugin',
  apply(ctx) {
    ctx.tools.register({
      name: 'greet',
      description: '向用户问好',
      parameters: { type: 'object', properties: { name: { type: 'string' } } },
      async execute(args) { return `你好, ${args.name}!`; },
    });
  },
};
```

随包 5 个示例插件:`hello` / `time` / `http` / `weather`(免费查天气,无需 key)/ `calc`。写错了也不怕——**单个插件失败不影响其他任何功能**。

## ⚔️ 和它们比

| | 🍃 知了 | Claude Code | Codex | 通用聊天 agent |
|---|---|---|---|---|
| 中文优先 | ✅ 原生 | 一般 | 一般 | 一般 |
| 花园养成 | ✅ 独有 | ❌ | ❌ | ❌ |
| 万物皆插件(文件即插即用) | ✅ | MCP 生态 | plugin 系统 | ❌ |
| 本地模型 | ✅ 一行接入 | 有限 | ❌ | 有限 |
| 网页花园 UI | ✅ 零依赖 | ❌ | 部分 | 通用 |
| 启动/占用 | 极轻 | 中 | 中 | 重 |

## 🗺️ 路线图

- [x] CLI agent 循环 + 会话持久化
- [x] 万物皆插件 + 用户插件热重载
- [x] 花园养成系统(等级/果实/心情)
- [x] 网页 UI(侧边栏/多会话/Markdown)
- [x] SSE 流式输出
- [ ] 插件市场(一键分享/安装社区插件)
- [ ] MCP 支持
- [ ] 会话删除/重命名
- [ ] 移动端 PWA

## 🤝 一起玩

知了还是个刚破壳的小蝉 🥚。如果它让你会心一笑,或者真的帮到了你:

- ⭐ **点个 Star**,让它有动力继续长高 🌱
- 🐛 遇到 bug 提 [Issue](https://github.com/mikeyang072388/zhiliao/issues)
- 🧩 写了插件?欢迎分享到 [Discussions](https://github.com/mikeyang072388/zhiliao/discussions)
- 💬 想聊天?[Discussions](https://github.com/mikeyang072388/zhiliao/discussions) 见

**技术栈**:TypeScript · Node · [Cordis](https://github.com/cordiverse/cordis)(插件框架)· ink(终端 UI)· 零依赖网页

**License**: [MIT](LICENSE)
