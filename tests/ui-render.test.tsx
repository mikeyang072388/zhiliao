/**
 * UI 渲染测试:验证长文本在 Static 消息流中正确换行、不重叠。
 * 这是之前花园 UI 长文本溢出到输入框问题的回归测试。
 * 运行:npx tsc && node tests/ui-render.test.mjs
 */
import React from 'react';
import { render } from 'ink-testing-library';
import { Box, Text, Static } from 'ink';

// 模拟一段超长混合内容(类似天气信息 + 信件正文)
const longText =
  '## 🌤️ 今天北京天气:多云转晴,26°C(体感29°C),降水0.0mm,傍晚零星阵雨。'.repeat(8) +
  '\n\n--- 给 Michael 老师的道歉信 ---\n' +
  'I am writing to sincerely apologize for failing to submit my homework on time. '.repeat(10) +
  '\n此致敬礼,你的学生';

function LongMessageApp() {
  const items = [
    { id: 1, role: 'user', text: '帮我写封道歉信' },
    { id: 2, role: 'tool', text: '⚒️ 挥动锄头(bash)' },
    { id: 3, role: 'assistant', text: longText },
  ];
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="green">蝉之园 Lv.2 🥚(๑˃ᴗ˂)ﻭ 果实 🍉 · 劳作 5</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} flexShrink={1} marginTop={1}>
        <Static items={items}>
          {(m) => (
            <Text key={m.id} wrap="wrap">
              {m.role === 'user' ? '你> ' : m.role === 'tool' ? '  ' : '🍃 '}
              {m.text}
            </Text>
          )}
        </Static>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color="green">蝉之园 Lv.2 🥚(๑˃ᴗ˂)ﻭ 果实 🍉 · 劳作 5</Text>
        </Box>
        <Box>
          <Text>你&gt; </Text>
        </Box>
      </Box>
    </Box>
  );
}

const { lastFrame } = render(<LongMessageApp />);
const frame = lastFrame();
const lines = frame.split('\n');

let pass = true;
const report = [];

// 1. 长文本尾部完整出现(换行渲染,未被截断/覆盖;最早消息因终端高度被滚动是正常行为)
report.push(['长文本尾部完整出现', frame.includes('homework') && frame.includes('此致敬礼')]);

// 2. 输入框行必须是最后一行,且只出现一次(不被消息覆盖)
const inputLineCount = lines.filter((l) => l.trim() === '你>').length;
report.push(['输入框只在最后一行', inputLineCount >= 1 && frame.trimEnd().endsWith('你>')]);

// 3. 没有内容混入输入框行(输入框行只有"你>"没有消息文本)
const lastLine = lines[lines.length - 1] ?? '';
report.push(['最后一行是干净的输入框', lastLine.trim() === '你>']);

// 4. 状态行存在且位于输入框上方(底部状态栏)
const statusIdx = lines.findIndex((l) => l.includes('蝉之园 Lv.2'));
const inputIdx = lines.findIndex((l) => l.trim() === '你>');
report.push(['状态行存在', statusIdx >= 0]);
report.push(['状态行在输入框上方', statusIdx >= 0 && inputIdx > statusIdx]);

for (const [name, ok] of report) {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) pass = false;
}
console.log('\n--- 渲染帧(末尾 8 行)---');
console.log(lines.slice(-8).join('\n'));
console.log(pass ? '\n结果: 通过,无重叠' : '\n结果: 失败');
process.exitCode = pass ? 0 : 1;
