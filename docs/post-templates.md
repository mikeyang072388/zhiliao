# 知了 · 发帖文案模板

复制即可用。发布时记得配一张 GIF(docs/demo.gif)或截图,标题党一点没关系,内容真实就行。

---

## 🇨🇳 V2EX(程序员社区)

**标题**:我把 AI 编码 agent 做成了养成游戏:每个工具都是农具,每次成功都结一个果实 🍎

**正文**:

> 最近把"AI 编码 agent"玩出了点新花样——不是又一个冷冰冰的终端黑盒,而是一只住在终端里的蝉 🦗。
>
> 它叫**知了(zhiliao)**,中文优先、开源(MIT)、`npm i -g zhiliao` 一行安装。
>
> **它有什么不一样?**
>
> - 🌸 **花园养成(独此一家)**:你用 bash 它就在挥锄头,5 次成功结一个随机果实,升级让树长大;失败它会蔫 🥀,心情还会变
> - 🧩 **万物皆插件**:放一个 .js 文件到 `~/.zhiliao/plugins/` 就生效,网页侧边栏点"重载"即时热更新,不用改代码不用重启(基于 Cordis,DeepSeek Harness 同款框架)
> - 🇨🇳 **中文优先**:DeepSeek/Kimi/Qwen 开箱即用,本地 ollama 也行
> - ⚡ **轻到极致**:原生 Node 零依赖,CLI + 网页双界面(网页是纯 CSS 会动的花园)
> - 🔒 **Key 只在本机**,发布开源也不怕泄漏
>
> 30 秒上手:
>
> ```bash
> npm i -g zhiliao
> zhiliao config --key sk-你的key
> zhiliao web          # 打开会动的花园网页
> ```
>
> 已经发布到 npm 和 GitHub,还带 5 个示例插件(查天气/算数/HTTP…)。如果你也觉得"把工具变成农具"这个点子有意思,欢迎来逛逛:https://github.com/mikeyang072388/zhiliao
>
> 顺便求个 star 🌱,让小蝉有动力长大。

---

## 🇨🇳 掘金(技术写作社区)

**标题**:我做了一个会养花园的 AI 编码 agent —— 把编码变成养成游戏的尝试

**正文**:同上(V2EX 版),开头加一句:"掘金的朋友们好,这篇文章分享一下我最近写的开源项目……" 结尾加"欢迎交流,项目地址:https://github.com/mikeyang072388/zhiliao"

---

## 🇬🇧 Reddit r/commandline 或 r/LocalLLaMA

**Title**: I turned my AI coding agent into a farming game — every tool is a garden tool, every success grows a fruit 🍎

**Body**:

> I've been building a terminal AI coding agent that's... a bit different. Instead of another cold black-box CLI, it's a cicada that lives in your terminal and maintains a little garden. 🦗
>
> **What makes it different:**
>
> - 🌸 **Garden farming (unique)**: every successful tool call is "farming" — 5 calls grow a random fruit 🍎, leveling makes the tree grow 🌱→🌿→🌳. Fail too much and the flowers wilt 🥀. Your garden persists across sessions — it's genuinely a long-term companion.
> - 🧩 **Everything is a plugin**: drop a `.js` file into `~/.zhiliao/plugins/` and it just works — hot reload from the web sidebar, no restarts. Powered by Cordis (same framework behind DeepSeek Harness).
> - 🇨🇳 **Chinese-first** but fully usable in English: DeepSeek / Kimi / Qwen out of the box, local ollama in one line.
> - ⚡ **Ridiculously light**: pure Node, zero build chain. CLI + animated CSS garden web UI (`zhiliao web`).
> - 🔒 Keys live only in a local 0600 file — publishing open source never leaks them.
>
> ```bash
> npm i -g zhiliao
> zhiliao config --key sk-your-key
> zhiliao web   # animated garden web UI
> ```
>
> Open source, MIT: https://github.com/mikeyang072388/zhiliao (includes 5 example plugins — weather, calc, http, time...)
>
> If "tools as farm tools" made you smile, a ⭐ would help this little cicada grow. 🌱

---

## 🇬🇧 Hacker News

**Title**: Show HN: I turned my coding agent into a farming game (garden grows as you work)

**Body**:

> A terminal AI coding agent where the agent keeps a garden: every successful tool call is a "farming action", every 5 actions grow a random fruit, and the tree levels up as you work. Sessions persist the garden — it's a long-term companion, not a throwaway CLI.
>
> Everything is a plugin: drop a .js file in `~/.zhiliao/plugins/`, hot-reload from the web UI. Built on Cordis (the framework behind DeepSeek Harness). Chinese-first, but works with any OpenAI-compatible endpoint incl. local ollama. Pure Node, no build chain — CLI + animated web garden in one package.
>
> npm i -g zhiliao · MIT · https://github.com/mikeyang072388/zhiliao
>
> Demo: [GIF]
