/**
 * 知了 · 简洁界面
 *
 * 干净可靠的三段式布局:
 *  - 顶部:一行花园状态(保留养成的趣味)
 *  - 中间:消息流(用 ink 的 Static,内容再多也不会重叠/溢出)
 *  - 底部:输入框
 * 不用固定高度的边框容器——那是之前长文本重叠的根源。
 */
import React, { useRef, useState } from 'react';
import { Box, Text, Static, useApp } from 'ink';
import TextInput from 'ink-text-input';
import type { LlmConfig } from '../llm.js';
import type { ZhiliaoRuntime } from '../plugins/runtime.js';
import type { Session } from '../session.js';
import { runTurn } from '../loop.js';
import {
  loadGarden, saveGarden, doChore, onChat, onFail,
  moodFace, stageOf, toolAction,
} from '../game.js';

interface UIMessage {
  id: number;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
}

interface SimpleAppProps {
  runtime: ZhiliaoRuntime;
  cfg: LlmConfig;
  session: Session;
}

export function SimpleApp({ runtime, cfg, session }: SimpleAppProps) {
  const { exit } = useApp();
  const [garden, setGarden] = useState(() => loadGarden());
  const gardenRef = useRef(garden);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const seqRef = useRef(0);

  const push = (role: UIMessage['role'], text: string) => {
    seqRef.current += 1;
    setMessages((prev) => [...prev, { id: seqRef.current, role, text }]);
  };

  const submit = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');

    if (text === '/exit') {
      exit();
      return;
    }
    if (text === '/tools') {
      push('system', '农具: ' + runtime.listTools().map((t) => `${toolAction(t.name).icon} ${t.name}`).join(' · '));
      return;
    }
    if (text === '/garden') {
      push('system', `蝉之园 Lv.${garden.level} · ${stageOf(garden.level)} ${moodFace(garden.mood)} · 果实 ${garden.fruits.join('') || '暂无'} · 劳作 ${garden.deeds} 次`);
      return;
    }

    push('user', text);
    setBusy(true);
    try {
      const result = await runTurn(runtime, cfg, session, text, {
        onStep: (step) => {
          if (step.kind === 'tool') {
            const { icon, verb } = toolAction(step.tool ?? '');
            push('tool', `${icon} ${verb}(${step.tool})`);
            const g = { ...gardenRef.current };
            const r = doChore(g);
            gardenRef.current = g;
            setGarden(g);
            saveGarden(g);
            if (r.fruit) push('system', `🍎 收获 ${r.fruit}!`);
            if (r.levelUp) push('system', `🎉 升级!Lv.${g.level}`);
          }
        },
      });
      if (result.reply) push('assistant', result.reply);
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
      push('system', `🥀 ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const colorOf = (r: UIMessage['role']) =>
    r === 'user' ? 'cyan' : r === 'tool' ? 'yellow' : r === 'system' ? 'gray' : 'green';
  const prefix = (r: UIMessage['role']) =>
    r === 'user' ? '你> ' : r === 'assistant' ? '🍃 ' : r === 'system' ? '· ' : '  ';

  return (
    <Box flexDirection="column">
      {/* 消息流(Static 滚动,内容再多也不重叠) */}
      <Box flexDirection="column" flexGrow={1} flexShrink={1}>
        <Static items={messages}>
          {(m) => (
            <Text key={m.id} color={colorOf(m.role)} wrap="wrap">
              {prefix(m.role)}
              {m.text}
            </Text>
          )}
        </Static>
        {busy && <Text dimColor>…蝉在劳作</Text>}
      </Box>

      {/* 底部:状态行 + 输入框 */}
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color="green">蝉之园 Lv.{garden.level}</Text>
          <Text color="magenta"> {stageOf(garden.level)}{moodFace(garden.mood)}</Text>
          <Text color="yellow"> 果实 {garden.fruits.join('') || '—'}</Text>
          <Text color="gray"> · 劳作 {garden.deeds} · /exit 退出</Text>
        </Box>
        <Box>
          <Text color="green">你&gt; </Text>
          <TextInput value={input} onChange={setInput} onSubmit={submit} />
        </Box>
      </Box>
    </Box>
  );
}
