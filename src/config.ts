/**
 * 知了 · 持久化配置
 *
 * 配置存在 ~/.zhiliao/config.json(权限 0600,含 API key)。
 * 解析优先级:命令行参数 > 环境变量(ZHI_*) > 配置文件 > 默认值。
 * 用 `zhiliao config --key sk-xxx` 写入一次,以后无需再输入。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { LlmConfig } from './llm.js';

export interface ZhiliaoConfig {
  baseURL?: string;
  apiKey?: string;
  model?: string;
}

export function configPath(): string {
  return join(homedir(), '.zhiliao', 'config.json');
}

export function loadConfig(): ZhiliaoConfig {
  try {
    if (existsSync(configPath())) {
      const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as ZhiliaoConfig;
      return raw;
    }
  } catch {
    // 配置损坏时静默忽略,回落到默认值
  }
  return {};
}

export function saveConfig(patch: ZhiliaoConfig): ZhiliaoConfig {
  const dir = join(homedir(), '.zhiliao');
  mkdirSync(dir, { recursive: true });
  const merged: ZhiliaoConfig = { ...loadConfig(), ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
  writeFileSync(configPath(), JSON.stringify(merged, null, 2) + '\n', { mode: 0o600 });
  return merged;
}

/**
 * 合并出最终 LLM 配置。
 * @param overrides 来自命令行的覆盖(--model / --base)
 */
export function resolveLlmConfig(overrides: { model?: string; baseURL?: string } = {}): LlmConfig {
  const file = loadConfig();
  return {
    baseURL: overrides.baseURL ?? process.env.ZHI_LLM_BASE ?? file.baseURL ?? 'https://api.deepseek.com/v1',
    apiKey: process.env.ZHI_LLM_KEY ?? process.env.DEEPSEEK_API_KEY ?? file.apiKey,
    model: overrides.model ?? process.env.ZHI_LLM_MODEL ?? file.model ?? 'deepseek-chat',
  };
}
