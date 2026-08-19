/**
 * 知了 · 花园 TUI
 *
 * 把终端编码 agent 变成一个"养花园"的小游戏:
 *  - 花园画布随劳作成长(树长大、花开)
 *  - 蝉有等级/心情,工具调用 = 劳作,5 次劳作结一个果
 *  - 对话区 = 花园日志,输入框在底部
 * 完全不同于市面上的极简终端 agent 或聊天网页 UI。
 */
import React, { useRef, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import type { LlmConfig } from '../llm.js';
import type { ZhiliaoRuntime } from '../plugins/runtime.js';
import type { Session } from '../session.js';
import { runTurn } from '../loop.js';
import {
  loadGarden, saveGarden, doChore, onChat, onFail,
  moodFace, stageOf, expToNext, renderGarden, toolAction,
  type GardenState,
} from '../game.js';

interface UIMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
}

const MAX_LOG = 40; // 对话区最多保留的消息条数

interface GardenAppProps {
  runtime: ZhiliaoRuntime;
  cfg: LlmConfig;
  session: Session;
}

export function GardenApp({ runtime, cfg, session }: GardenAppProps) {
  const { exit } = useApp();
  const [garden, setGarden] = useState<GardenState>(() => loadGarden());
  const gardenRef = useRef(garden);
  const [messages, setMessages] = useState<UIMessage[]>([
    { role: 'system', text: `欢迎回到花园,蝉之园 Lv.${garden.level}!今天想种点什么?` },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const push = (m: UIMessage) => {
    setMessages((prev) => [...prev.slice(-(MAX_LOG - 1)), m]);
  };

  const submit = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');

    // 花园命令
    if (text === '/exit') {
      exit();
      return;
    }
    if (text === '/tools') {
      push({
        role: 'system',
        text: '农具: ' + runtime.listTools().map((t) => `${toolAction(t.name).icon} ${t.name}`).join(' · '),
      });
      return;
    }
    if (text === '/garden') {
      push({
        role: 'system',
        text: `${stageOf(garden.level)} 蝉之园 Lv.${garden.level} · 心情 ${garden.mood}/100 · 果实 ${garden.fruits.join('') || '暂无'} · 劳作 ${garden.deeds} 次`,
      });
      return;
    }

    push({ role: 'user', text });
    setBusy(true);
    try {
      const result = await runTurn(runtime, cfg, session, text, {
        onStep: (step) => {
          if (step.kind === 'tool') {
            const { icon, verb } = toolAction(step.tool ?? '');
            push({ role: 'tool', text: `${icon} 蝉${verb}(${step.tool})` });
            const g = { ...gardenRef.current };
            const r = doChore(g);
            gardenRef.current = g;
            setGarden(g);
            saveGarden(g);
            if (r.fruit) {
              push({ role: 'system', text: `🍎 结了一个 ${r.fruit}!(+${r.expGained} 经验)` });
            } else if (r.levelUp) {
              push({ role: 'system', text: `🎉 升级啦!蝉之园 Lv.${g.level}(+${r.expGained} 经验)` });
            }
          }
        },
      });
      if (result.reply) push({ role: 'assistant', text: result.reply });
      const g = { ...gardenRef.current };
      onChat(g);
      gardenRef.current = g;
      setGarden(g);
      saveGarden(g);
    } catch (err) {
      const g = { ...gardenRef.current };
      onFail(g);
      gardenRef.current = g;
      setGarden(g);
      saveGarden(g);
      push({ role: 'system', text: `🥀 哎呀,一株花蔫了...(${err instanceof Error ? err.message : String(err)})` });
    } finally {
      setBusy(false);
    }
  };

  // 经验条
  const need = expToNext(garden.level);
  const pct = Math.min(1, garden.exp / need);
  const bar = '█'.repeat(Math.round(pct * 10)) + '░'.repeat(10 - Math.round(pct * 10));

  return (
    <Box flexDirection="column" width="100%" borderStyle="round" borderColor="green" paddingX={1}>
      {/* 花园画布 */}
      <Box>
        <Text color="greenBright">{renderGarden(garden).join('\n')}</Text>
      </Box>

      {/* 状态栏 */}
      <Box marginTop={0}>
        <Text color="yellow">蝉之园 Lv.{garden.level} </Text>
        <Text color="cyan">{stageOf(garden.level)}</Text>
        <Text color="magenta"> {moodFace(garden.mood)} </Text>
        <Text color="gray">经验 {bar} {garden.exp}/{need}</Text>
        <Text color="green"> 果实 {garden.fruits.length ? garden.fruits.join('') : '暂无'}</Text>
        <Text color="gray"> · 劳作 {garden.deeds} 次 · 对话 {garden.chats} 轮</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" marginTop={1} flexDirection="column" height={14}>
        {messages.slice(-14).map((m, i) => (
          <Text key={i} wrap="wrap" color={m.role === 'user' ? 'cyan' : m.role === 'tool' ? 'yellow' : m.role === 'system' ? 'gray' : 'green'}>
            {m.role === 'user' ? '你> ' : m.role === 'tool' ? '' : m.role === 'system' ? '· ' : '🍃 '}
            {m.text}
          </Text>
        ))}
        {busy && <Text color="gray">…蝉在花园里忙碌着</Text>}
      </Box>

      {/* 输入区 */}
      <Box marginTop={1}>
        <Text color="green">你&gt; </Text>
        <TextInput value={input} onChange={setInput} onSubmit={submit} />
      </Box>
      <Text color="gray">/exit 离开花园 · /tools 看农具 · /garden 看花园状态</Text>
    </Box>
  );
}
