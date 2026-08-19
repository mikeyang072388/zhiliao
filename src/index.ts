/**
 * 知了 · 公共导出
 * 库使用者 / 插件作者从这里 import。
 */
export { ZhiliaoRuntime, ToolRegistry } from './plugins/runtime.js';
export type { ZhiliaoPlugin } from './plugins/runtime.js';
export type { ToolDefinition } from './tools/types.js';
export { toOpenAiTools } from './tools/types.js';
export { builtinTools, bashTool, readTool, writeTool, editTool } from './tools/builtin.js';
export { runTurn, DEFAULT_SYSTEM } from './loop.js';
export type { TurnOptions, TurnResult } from './loop.js';
export { chat, defaultLlmConfig, toolResultMessage } from './llm.js';
export type { LlmConfig, ChatMessage, ToolCall, AssistantReply } from './llm.js';
export { Session } from './session.js';
export { loadConfig, saveConfig, resolveLlmConfig, configPath } from './config.js';
export type { ZhiliaoConfig } from './config.js';
export {
  emptyGarden, doChore, onChat, onFail, expToNext, moodFace, stageOf,
  renderGarden, toolAction, loadGarden, saveGarden, FRUITS,
} from './game.js';
export type { GardenState, ChoreResult } from './game.js';
