/**
 * 知了 · 插件运行时
 *
 * "万物皆插件"的宿主:基于 Cordis 的 Context + Service。
 * - 插件 = { name, apply(ctx) },通过 ctx.plugin() 挂载,返回 fiber,可卸载
 * - 插件通过 ctx.tools.register(...) 注册工具(与内置工具同一协议)
 * - 内置工具本身也是一个"内置插件"——证明万物皆插件
 * - 用户插件:放在 ~/.zhiliao/plugins/*.js,启动时自动加载,可重载
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Context, Service } from '@deepseek-ai/cordis';
import type { ToolDefinition } from '../tools/types.js';

/** 工具注册服务:提供 ctx.tools 给所有插件 */
export class ToolRegistry extends Service {
  private tools = new Map<string, ToolDefinition>();
  private owners = new Map<string, string>();
  private defaultOwner = 'builtin';

  constructor(ctx: Context) {
    super(ctx, 'tools');
  }

  /** 挂载某插件期间,未显式指定 owner 的注册归该插件所有(卸载时才能清理) */
  setDefaultOwner(owner: string): void {
    this.defaultOwner = owner;
  }

  register(tool: ToolDefinition, owner = this.defaultOwner): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具 "${tool.name}" 已存在(被 ${this.owners.get(tool.name)} 注册)`);
    }
    this.tools.set(tool.name, tool);
    this.owners.set(tool.name, owner);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** 卸载某插件时移除它注册的全部工具 */
  removeOwner(owner: string): void {
    for (const [name, o] of this.owners) {
      if (o === owner) {
        this.tools.delete(name);
        this.owners.delete(name);
      }
    }
  }
}

/** 声明合并:让 Cordis Context 认识 ctx.tools(与 Service 注册同步) */
declare module '@deepseek-ai/cordis' {
  interface Context {
    tools: ToolRegistry;
  }
}

/** 第三方插件形态:一个普通对象,apply 收到 Cordis Context */
export interface ZhiliaoPlugin {
  name: string;
  description?: string;
  apply(ctx: Context): void | Promise<void>;
}

/** 用户插件加载结果(供 CLI/网页展示) */
export interface PluginLoadInfo {
  file: string;
  name: string;
  description?: string;
  toolCount: number;
  ok: boolean;
  error?: string;
}

export class ZhiliaoRuntime {
  readonly ctx: Context;
  private registry: ToolRegistry;
  private fibers = new Map<string, { dispose: () => Promise<void> }>();
  private userPluginNames: string[] = [];
  private lastUserPlugins: PluginLoadInfo[] = [];

  constructor() {
    this.ctx = new Context();
    this.registry = new ToolRegistry(this.ctx);
  }

  /** 挂载一个插件并等待其 apply 完成;重复挂载同名插件报错 */
  async mount(plugin: ZhiliaoPlugin): Promise<void> {
    if (this.fibers.has(plugin.name)) {
      throw new Error(`插件 "${plugin.name}" 已加载,请先卸载`);
    }
    this.registry.setDefaultOwner(plugin.name); // 插件注册的工具归插件所有
    const fiber = this.ctx.plugin({
      name: plugin.name,
      apply: (ctx: Context) => plugin.apply(ctx),
    });
    this.fibers.set(plugin.name, fiber);
    await fiber.await(); // apply 是异步调度的,必须等它跑完
  }

  /** 卸载插件并清理它注册的工具 */
  async unmount(name: string): Promise<void> {
    const fiber = this.fibers.get(name);
    if (!fiber) throw new Error(`插件 "${name}" 未加载`);
    this.registry.removeOwner(name);
    await fiber.dispose();
    this.fibers.delete(name);
  }

  /**
   * 加载用户插件目录 ~/.zhiliao/plugins/*.js
   * 每个文件:export default { name, description?, apply(ctx) } 或 export const plugin = {...}
   * 返回逐文件加载结果;失败不中断其他插件。
   */
  async loadUserPlugins(dir: string): Promise<PluginLoadInfo[]> {
    const results: PluginLoadInfo[] = [];
    if (!existsSync(dir)) return results;
    const files = readdirSync(dir).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
    for (const file of files) {
      const abs = join(dir, file);
      try {
        const mod = await import(pathToFileURL(abs).href + `?t=${Date.now()}`); // 时间戳防缓存
        const plugin: ZhiliaoPlugin | undefined = mod.default ?? mod.plugin;
        if (!plugin || typeof plugin.apply !== 'function') {
          throw new Error('插件文件必须 export default { name, apply(ctx) }');
        }
        const before = this.listTools().length;
        await this.mount(plugin);
        this.userPluginNames.push(plugin.name);
        results.push({
          file, name: plugin.name, description: plugin.description,
          toolCount: this.listTools().length - before, ok: true,
        });
      } catch (err) {
        results.push({ file, name: file.replace(/\.(js|mjs)$/, ''), toolCount: 0, ok: false, error: String(err) });
      }
    }
    this.lastUserPlugins = results;
    return results;
  }

  /** 最近一次用户插件加载/重载的结果(供网页展示) */
  getUserPluginInfos(): PluginLoadInfo[] {
    return this.lastUserPlugins;
  }

  /** 重载用户插件:卸载已加载的用户插件,再重新扫描目录 */
  async reloadUserPlugins(dir: string): Promise<PluginLoadInfo[]> {
    for (const name of [...this.userPluginNames]) {
      await this.unmount(name).catch(() => undefined);
    }
    this.userPluginNames = [];
    return this.loadUserPlugins(dir);
  }

  /** 用户插件名列表(供 web 显示/重载) */
  userPluginNamesList(): string[] {
    return [...this.userPluginNames];
  }

  /** 运行内置插件(它就是"内置工具",与第三方插件无差别) */
  async mountBuiltin(builtin: { name: string; tools: ToolDefinition[] }): Promise<void> {
    await this.mount({
      name: builtin.name,
      description: '内置工具',
      apply: (ctx) => {
        for (const tool of builtin.tools) ctx.tools.register(tool, builtin.name);
      },
    });
  }

  listTools(): ToolDefinition[] {
    return this.registry.list();
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.registry.get(name);
  }

  loadedPlugins(): string[] {
    return [...this.fibers.keys()];
  }

  /** 卸载全部(进程退出前调用) */
  async dispose(): Promise<void> {
    for (const name of [...this.fibers.keys()]) {
      await this.unmount(name).catch(() => undefined);
    }
  }
}
