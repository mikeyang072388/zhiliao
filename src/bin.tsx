#!/usr/bin/env node
/**
 * 知了 · CLI 入口
 * 用法:
 *   zhiliao "帮我写一个函数"    直接执行任务
 *   zhiliao                     进入交互模式
 *   zhiliao --resume <id>       续聊会话
 *   zhiliao --list-plugins      查看已加载插件与工具
 */
import { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { render } from 'ink';
import { ZhiliaoRuntime } from './plugins/runtime.js';
import { builtinTools } from './tools/builtin.js';
import { Session } from './session.js';
import { runTurn } from './loop.js';
import { resolveLlmConfig, loadConfig, saveConfig, configPath } from './config.js';
import { SimpleApp } from './ui/simple.js';
import { loadGarden, saveGarden, doChore, renderGarden } from './game.js';

const program = new Command();

program
  .name('zhiliao')
  .description('知了 · 中文优先、轻量、把每一步都讲给你看的终端 AI 编码 agent(万物皆插件)')
  .version('0.1.0')
  .argument('[任务]', '直接执行一个任务;省略则进入交互模式')
  .option('--resume <id>', '续聊指定会话 id')
  .option('--model <model>', '模型名(默认取 ZHI_LLM_MODEL 或 deepseek-chat)')
  .option('--base <url>', 'OpenAI 兼容端点(默认取 ZHI_LLM_BASE 或 DeepSeek)')
  .option('--list-plugins', '列出已加载插件与工具后退出')
  .option('--verbose', '显示每一步工具调用过程')
  .action(async (task: string | undefined, opts: Record<string, unknown>) => {
    try {
      await main(task, opts);
    } catch (err) {
      console.error(`[知了] 出错: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    }
  });

const USER_PLUGIN_DIR = () => join(homedir(), '.zhiliao', 'plugins');

/** 加载用户插件目录并打印结果(CLI 与 web 共用) */
async function loadUserPlugins(runtime: ZhiliaoRuntime): Promise<void> {
  const results = await runtime.loadUserPlugins(USER_PLUGIN_DIR());
  for (const r of results) {
    if (r.ok) console.log(`[插件] ${r.name} 已加载(+${r.toolCount} 个工具)`);
    else console.log(`[插件] ${r.file} 加载失败: ${r.error}`);
  }
}

async function main(task: string | undefined, opts: Record<string, any>): Promise<void> {
  const runtime = new ZhiliaoRuntime();
  // 内置工具也是"插件"——万物皆插件的第一课
  await runtime.mountBuiltin({ name: 'builtin-core', tools: builtinTools });
  await loadUserPlugins(runtime);

  if (opts.listPlugins) {
    console.log('已加载插件:');
    for (const p of runtime.loadedPlugins()) console.log(`  - ${p}`);
    console.log('可用工具:');
    for (const t of runtime.listTools()) console.log(`  - ${t.name}: ${t.description}`);
    return;
  }

  const cfg = resolveLlmConfig({ model: opts.model, baseURL: opts.base });
  const isLocal = /localhost|127\.0\.0\.1/.test(cfg.baseURL);
  if (!cfg.apiKey && !isLocal) {
    console.error('[知了] 未找到 API key。请先运行: zhiliao config --key sk-xxx');
    console.error('       或设置环境变量 ZHI_LLM_KEY / DEEPSEEK_API_KEY(本地 ollama 可忽略)');
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const session = opts.resume ? Session.resume(String(opts.resume), cwd) : Session.create(cwd);
  if (!session) {
    console.error(`[知了] 找不到会话 ${opts.resume}(本工作区会话:${Session.list(cwd).join(', ') || '无'})`);
    process.exitCode = 1;
    return;
  }
  console.log(`[知了] 会话 ${session.id.slice(0, 8)} · 模型 ${cfg.model} · 工具 ${runtime.listTools().length} 个`);
  if (opts.resume) console.log('[知了] 已从历史续聊。');

  const onStep =
    opts.verbose
      ? (s: { kind: string; tool?: string; text?: string }) => {
          if (s.kind === 'tool') console.log(`  ⚙ ${s.tool}: ${(s.text ?? '').slice(0, 80)}`);
        }
      : () => undefined;

  if (task) {
    // 单任务模式:开场看一眼花园,结束时汇报收获
    const garden = loadGarden();
    console.log(renderGarden(garden).join('\n'));
    console.log(`[知了] 蝉之园 Lv.${garden.level} · 开始劳作:${task}`);
    const r = await runTurn(runtime, cfg, session, task, {
      onStep: (s) => {
        if (s.kind === 'tool') {
          const g = { ...garden };
          const res = doChore(g);
          Object.assign(garden, g);
          saveGarden(garden);
          if (res.fruit) console.log(`  🍎 收获 ${res.fruit}!`);
          if (res.levelUp) console.log(`  🎉 升级!Lv.${garden.level}`);
        }
      },
    });
    console.log('\n' + (r.reply ?? ''));
    console.log(`[知了] 今日收获:果实 ${garden.fruits.length} 个 · 劳作 ${garden.deeds} 次 · Lv.${garden.level}`);
    return;
  }

  // 交互模式:有 TTY 时用花园界面,否则回退到简单 readline
  if (stdout.isTTY) {
    const { waitUntilExit } = render(<SimpleApp runtime={runtime} cfg={cfg} session={session} />);
    await waitUntilExit();
    await runtime.dispose();
    return;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  for (;;) {
    const line = await rl.question('你> ');
    const t = line.trim();
    if (!t || t === '/exit') break;
    if (t === '/tools') {
      for (const tool of runtime.listTools()) console.log(`  - ${tool.name}: ${tool.description}`);
      continue;
    }
    if (t === '/resume') {
      for (const id of Session.list(cwd)) console.log(`  - ${id}`);
      continue;
    }
    const r = await runTurn(runtime, cfg, session, t, { onStep });
    console.log('\n知了> ' + (r.reply ?? ''));
  }
  rl.close();
  await runtime.dispose();
}

/** 子命令:网页 UI(浏览器打开一个会动的花园聊天页) */
const webCmd = program
  .command('web')
  .description('启动网页 UI:浏览器打开花园聊天页(与 CLI 共享养成数据)');
webCmd
  .option('--port <port>', '监听端口(默认 3939)')
  .action(async (opts: Record<string, unknown>) => {
    const port = Number(opts.port ?? 3939);
    const runtime = new ZhiliaoRuntime();
    await runtime.mountBuiltin({ name: 'builtin-core', tools: builtinTools });
    await loadUserPlugins(runtime);
    const cfg = resolveLlmConfig();
    const isLocal = /localhost|127\.0\.0\.1/.test(cfg.baseURL);
    if (!cfg.apiKey && !isLocal) {
      console.error('[知了] 未找到 API key,请先运行: zhiliao config --key sk-xxx(本地 ollama 可忽略)');
      process.exitCode = 1;
      return;
    }
    const session = Session.create(process.cwd());
    const server = await import('./web.js').then((m) => m.startWebServer({ runtime, cfg, port }));
    console.log(`[知了] 模型 ${cfg.model} · 工具 ${runtime.listTools().length} 个 · Ctrl+C 停止`);
    const stop = () => {
      server.close();
      void runtime.dispose();
      process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });

/** 子命令:持久化配置(写入 ~/.zhiliao/config.json)
 * 注意:不要在此定义 --model/--base,它们与主命令同名,commander 会冲突;
 * model/base 走交互式提问或环境变量。 */
const configCmd = program
  .command('config')
  .description('设置持久化配置(交互式;或 --key 直接指定,--show 查看)');
configCmd
  .option('--key <key>', '直接指定 API key,跳过提问')
  .option('--show', '查看当前配置(key 打码)')
  .action(async (opts: Record<string, unknown>) => {
    if (opts.show) {
      const c = loadConfig();
      console.log(`端点:   ${c.baseURL ?? '(默认 https://api.deepseek.com/v1)'}`);
      console.log(`模型:   ${c.model ?? '(默认 deepseek-chat)'}`);
      console.log(`API key: ${c.apiKey ? c.apiKey.slice(0, 6) + '****' : '(未设置)'}`);
      console.log(`配置文件: ${configPath()}`);
      return;
    }

    if (opts.key) {
      // 快捷方式:一条命令只设 key,不提问
      saveConfig({ apiKey: String(opts.key) });
      console.log(`已保存 API key 到 ${configPath()}(以后无需再输入)`);
      return;
    }

    // 交互式:依次问 key / model / base(空 = 保持现有/默认)
    const rl = createInterface({ input: stdin, output: stdout });
    const ask = async (prompt: string): Promise<string> => (await rl.question(prompt)).trim();
    const patch: Record<string, string | undefined> = {};
    const key = await ask('API key(回车保持现有): ');
    if (key) patch.apiKey = key;
    const model = await ask('模型名(回车 = deepseek-chat): ');
    if (model) patch.model = model;
    const base = await ask('OpenAI 兼容端点(回车 = DeepSeek 官方): ');
    if (base) patch.baseURL = base;
    rl.close();

    if (Object.keys(patch).length === 0) {
      console.log('未做任何修改。');
      return;
    }
    saveConfig(patch);
    console.log(`已保存配置到 ${configPath()}(以后无需再输入)`);
  });

program.parseAsync(process.argv);
