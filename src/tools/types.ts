/**
 * 知了 · 工具协议
 *
 * "万物皆插件"的最小契约:一切能力都是一个 ToolDefinition。
 * 内置工具与第三方插件工具走同一条注册协议——这是知了插件系统的核心。
 */

export interface ToolDefinition {
  /** 工具名,模型调用时使用(小写 + 下划线/连字符) */
  name: string;
  /** 一句话描述,给模型看的 */
  description: string;
  /** JSON Schema(parameters 部分) */
  parameters: Record<string, unknown>;
  /** 执行函数,入参为模型给的 JSON 对象,返回给模型看的文本 */
  execute(args: Record<string, unknown>): Promise<string>;
}

/** 把工具列表转成 OpenAI tools 协议 */
export function toOpenAiTools(tools: ToolDefinition[]): unknown[] {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}
