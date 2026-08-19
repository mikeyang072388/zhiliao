/**
 * 知了 · 花园游戏逻辑
 *
 * 把编码工作变成"养花园":每个工具调用是一次劳作,累积经验升级,
 * 每 5 次劳作结一个果实,失败会让花蔫了。花园状态跨会话持久化
 * 在 ~/.zhiliao/garden.json——所以这是真正的"养成"。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const FRUITS = ['🍎', '🍐', '🍑', '🍊', '🍇', '🍓', '🍉', '🥝'] as const;

export interface GardenState {
  /** 蝉的等级 */
  level: number;
  /** 当前等级经验 */
  exp: number;
  /** 收获的果实(每个元素一个 emoji) */
  fruits: string[];
  /** 累计劳作(工具调用)次数 */
  deeds: number;
  /** 心情 0-100 */
  mood: number;
  /** 对话轮数 */
  chats: number;
}

export function emptyGarden(): GardenState {
  return { level: 1, exp: 0, fruits: [], deeds: 0, mood: 70, chats: 0 };
}

/** 升到下一级所需经验:50 * lv^2 */
export function expToNext(level: number): number {
  return 50 * level * level;
}

export interface ChoreResult {
  /** 本次劳作是否结果实 */
  fruit: string | null;
  /** 是否升级 */
  levelUp: boolean;
  expGained: number;
}

/** 一次劳作(成功调用一个工具):+10 经验,+2 心情;每 5 次结一个果 */
export function doChore(state: GardenState): ChoreResult {
  state.deeds += 1;
  state.mood = Math.min(100, state.mood + 2);
  const expGained = 10;
  state.exp += expGained;
  let levelUp = false;
  while (state.exp >= expToNext(state.level)) {
    state.exp -= expToNext(state.level);
    state.level += 1;
    levelUp = true;
  }
  let fruit: string | null = null;
  if (state.deeds % 5 === 0) {
    fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    state.fruits.push(fruit);
  }
  return { fruit, levelUp, expGained };
}

/** 一轮对话完成:+3 心情 */
export function onChat(state: GardenState): void {
  state.chats += 1;
  state.mood = Math.min(100, state.mood + 3);
}

/** 工具失败:-8 心情 */
export function onFail(state: GardenState): void {
  state.mood = Math.max(0, state.mood - 8);
}

/** 蝉的表情(按心情) */
export function moodFace(mood: number): string {
  if (mood >= 80) return '(๑˃ᴗ˂)ﻭ';
  if (mood >= 55) return '(•ᴗ•)';
  if (mood >= 30) return '(・_・;)';
  return '(╥﹏╥)';
}

/** 蝉的生命阶段(等级形象) */
export function stageOf(level: number): string {
  if (level < 3) return '🥚';
  if (level < 6) return '🐛';
  if (level < 10) return '🍂';
  return '🦗';
}

/** 花园画布(多行字符串) */
export function renderGarden(state: GardenState): string[] {
  const tree = state.level >= 8 ? '🌳🌳' : state.level >= 5 ? '🌳' : state.level >= 3 ? '🌿' : '🌱';
  const flowers = ['🌷', '🌸', '🌻', '🌼'];
  const flowerCount = Math.min(10, 1 + Math.floor(state.deeds / 3));
  const flowerRow = Array.from({ length: flowerCount }, (_, i) => flowers[i % flowers.length]).join('');
  const pad = (s: string, w: number) => (s.length >= w ? s : s + ' '.repeat(w - s.length));
  return [
    '      ☁️        ☀️        ☁️',
    '       ' + pad(tree, 6),
    '    ' + flowerRow,
  ];
}

/** 农具图标:工具名 → 劳作动作 */
export function toolAction(name: string): { icon: string; verb: string } {
  switch (name) {
    case 'bash': return { icon: '⚒️', verb: '挥动锄头' };
    case 'read': return { icon: '🔍', verb: '蹲下观察' };
    case 'write': return { icon: '🌱', verb: '播下种子' };
    case 'edit': return { icon: '✂️', verb: '修剪枝叶' };
    default: return { icon: '✨', verb: '施展园艺魔法' };
  }
}

// ── 持久化 ────────────────────────────────────────────────

export function gardenPath(): string {
  return join(homedir(), '.zhiliao', 'garden.json');
}

export function loadGarden(): GardenState {
  try {
    if (existsSync(gardenPath())) {
      const raw = JSON.parse(readFileSync(gardenPath(), 'utf8')) as Partial<GardenState>;
      return { ...emptyGarden(), ...raw };
    }
  } catch {
    // 损坏则重新开始
  }
  return emptyGarden();
}

export function saveGarden(state: GardenState): void {
  const dir = join(homedir(), '.zhiliao');
  mkdirSync(dir, { recursive: true });
  writeFileSync(gardenPath(), JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
}
