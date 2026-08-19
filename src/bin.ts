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
import { ZhiliaoRuntime } from './plugins/runtime.js';
import { builtinTools } from './tools/builtin.js';
import { Session } from './session.js';
import { runTurn } from './loop.js';
import { defaultLlmConfig } from './llm.js';

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

async function main(task: string | undefined, opts: Record<string, any>): Promise<void> {
  const runtime = new ZhiliaoRuntime();
  // 内置工具也是"插件"——万物皆插件的第一课
  await runtime.mountBuiltin({ name: 'builtin-core', tools: builtinTools });

  if (opts.listPlugins) {
    console.log('已加载插件:');
    for (const p of runtime.loadedPlugins()) console.log(`  - ${p}`);
    console.log('可用工具:');
    for (const t of runtime.listTools()) console.log(`  - ${t.name}: ${t.description}`);
    return;
  }

  const cfg = defaultLlmConfig();
  if (opts.model) cfg.model = String(opts.model);
  if (opts.base) cfg.baseURL = String(opts.base);
  const isLocal = /localhost|127\.0\.0\.1/.test(cfg.baseURL);
  if (!cfg.apiKey && !isLocal) {
    console.error('[知了] 未找到 API key:请设置环境变量 ZHI_LLM_KEY 或 DEEPSEEK_API_KEY(本地 ollama 可忽略)');
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
    const r = await runTurn(runtime, cfg, session, task, { onStep });
    console.log('\n' + (r.reply ?? ''));
    return;
  }

  // 交互模式
  const rl = createInterface({ input: stdin, output: stdout });
  console.log('(输入 /exit 退出 · /tools 查看工具 · /resume 查看会话)');
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

program.parseAsync(process.argv);
