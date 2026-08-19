/**
 * 知了 · 内置工具
 *
 * 四个最小工具:bash / read / write / edit。
 * 注意:它们和第三方插件工具走同一条注册协议——"内置"只是"随包发布"的意思。
 */
import { exec } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
import type { ToolDefinition } from './types.js';

const execAsync = promisify(exec);

export const bashTool: ToolDefinition = {
  name: 'bash',
  description: '在 shell 中执行命令并返回 stdout/stderr(会真实修改文件系统,请谨慎)',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '要执行的 shell 命令' },
      workdir: { type: 'string', description: '工作目录(默认当前目录)' },
    },
    required: ['command'],
    additionalProperties: false,
  },
  async execute(args) {
    const command = String(args.command ?? '');
    const workdir = args.workdir ? String(args.workdir) : process.cwd();
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: workdir, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
      return [stdout, stderr].filter(Boolean).join('\n').slice(0, 200_000) || '(无输出)';
    } catch (err: any) {
      return `命令失败: ${String(err.message ?? err)}\n${String(err.stdout ?? '')}${String(err.stderr ?? '')}`.slice(0, 200_000);
    }
  },
};

export const readTool: ToolDefinition = {
  name: 'read',
  description: '读取文件内容,返回带行号的行(offset/limit 控制范围)',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '要读取的文件路径' },
      offset: { type: 'integer', description: '起始行(1 起),默认 1' },
      limit: { type: 'integer', description: '最多返回行数,默认 2000' },
    },
    required: ['file_path'],
    additionalProperties: false,
  },
  async execute(args) {
    const file = String(args.file_path ?? '');
    const offset = Number(args.offset ?? 1);
    const limit = Number(args.limit ?? 2000);
    try {
      const lines = readFileSync(file, 'utf8').split('\n');
      const start = Math.max(0, offset - 1);
      const slice = lines.slice(start, start + limit);
      const numbered = slice.map((line, i) => `${start + i + 1}: ${line}`).join('\n');
      return numbered || '(文件为空或范围外)';
    } catch (err: any) {
      return `读取失败: ${String(err.message ?? err)}`;
    }
  },
};

export const writeTool: ToolDefinition = {
  name: 'write',
  description: '写入文件(覆盖整个文件;父目录不存在时自动创建)',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '目标文件路径' },
      content: { type: 'string', description: '完整文件内容' },
    },
    required: ['file_path', 'content'],
    additionalProperties: false,
  },
  async execute(args) {
    const file = String(args.file_path ?? '');
    const content = String(args.content ?? '');
    try {
      writeFileSync(file, content, 'utf8');
      return `已写入 ${file}(${content.length} 字符)`;
    } catch (err: any) {
      return `写入失败: ${String(err.message ?? err)}`;
    }
  },
};

export const editTool: ToolDefinition = {
  name: 'edit',
  description: '编辑文件:用 new_string 替换 old_string(必须唯一匹配;replace_all 可全部替换)',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: '目标文件路径' },
      old_string: { type: 'string', description: '要替换的原文' },
      new_string: { type: 'string', description: '替换后的文本' },
      replace_all: { type: 'boolean', description: '是否替换所有匹配,默认 false' },
    },
    required: ['file_path', 'old_string', 'new_string'],
    additionalProperties: false,
  },
  async execute(args) {
    const file = String(args.file_path ?? '');
    const oldStr = String(args.old_string ?? '');
    const newStr = String(args.new_string ?? '');
    const replaceAll = Boolean(args.replace_all);
    try {
      const before = readFileSync(file, 'utf8');
      if (!before.includes(oldStr)) {
        return `编辑失败: 未找到目标文本(可能已修改或拼写不同),请重新 read 后再 edit`;
      }
      const count = replaceAll
        ? before.split(oldStr).length - 1
        : before.split(oldStr).length - 1;
      if (!replaceAll && count > 1) {
        return `编辑失败: 目标文本出现 ${count} 次,请提供更长的 old_string 或设置 replace_all`;
      }
      const after = replaceAll ? before.split(oldStr).join(newStr) : before.replace(oldStr, newStr);
      writeFileSync(file, after, 'utf8');
      return `已替换 ${count} 处: ${file}`;
    } catch (err: any) {
      return `编辑失败: ${String(err.message ?? err)}`;
    }
  },
};

/** 内置工具列表(以插件方式注册,见 plugins/runtime.ts) */
export const builtinTools: ToolDefinition[] = [bashTool, readTool, writeTool, editTool];
