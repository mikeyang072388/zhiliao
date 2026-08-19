/**
 * 知了 · 网页 UI(零构建:原生 HTML/CSS/JS 内嵌)
 *
 * 特色:顶部一个会动的 CSS 花园(云飘、花摇、果实挂树、蝉蹦跳),
 * 中部聊天区,底部状态栏 + 输入框。花园状态与 CLI 共用 garden.json。
 */

const STAGES: Record<number, string> = { 1: '🥚', 2: '🥚', 3: '🐛', 4: '🐛', 5: '🐛', 6: '🍂', 7: '🍂', 8: '🍂', 9: '🍂', 10: '🦗' };

export function renderPage(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🍃 知了 · 蝉之园</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif; height: 100vh; display: flex; flex-direction: column; background: #d9f2ff; }
  /* ── 花园 ── */
  .garden { position: relative; height: 190px; overflow: hidden; background: linear-gradient(#aee6ff 0%, #d9f2ff 55%, #7ec850 55%, #5da83f 100%); border-bottom: 4px solid #3e7d2a; }
  .cloud { position: absolute; font-size: 30px; opacity: .9; animation: drift linear infinite; }
  .cloud.c1 { top: 12px; animation-duration: 38s; }
  .cloud.c2 { top: 44px; font-size: 22px; animation-duration: 52s; animation-delay: -20s; }
  @keyframes drift { from { transform: translateX(-70px); } to { transform: translateX(110vw); } }
  .sun { position: absolute; right: 26px; top: 8px; font-size: 40px; animation: spin 24s linear infinite; }
  @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  .ground { position: absolute; bottom: 0; left: 0; right: 0; height: 64px; }
  .tree { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); font-size: 84px; line-height: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,.15)); transition: font-size .5s; }
  .cicada { position: absolute; bottom: 96px; left: calc(50% + 34px); font-size: 26px; animation: hop 2.8s ease-in-out infinite; }
  @keyframes hop { 0%,100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-8px) rotate(8deg); } }
  .flowers { position: absolute; bottom: 4px; left: 0; right: 0; text-align: center; font-size: 26px; letter-spacing: 10px; white-space: nowrap; }
  .flower { display: inline-block; animation: sway 2.4s ease-in-out infinite; }
  .flower:nth-child(2n) { animation-delay: -.8s; }
  .flower:nth-child(3n) { animation-delay: -1.5s; }
  @keyframes sway { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
  .fruits { position: absolute; left: calc(50% - 8px); bottom: 84px; transform: translateX(-50%); font-size: 20px; letter-spacing: -2px; white-space: nowrap; }
  .fruit { display: inline-block; animation: drop .6s ease-in; }
  @keyframes drop { from { transform: translateY(-26px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .hint { position: absolute; right: 12px; bottom: 8px; color: rgba(255,255,255,.9); font-size: 12px; background: rgba(0,0,0,.25); padding: 2px 8px; border-radius: 10px; }
  /* ── 聊天 ── */
  .chat { flex: 1; overflow-y: auto; padding: 14px 16px; background: rgba(255,255,255,.78); backdrop-filter: blur(2px); }
  .msg { margin: 8px 0; display: flex; }
  .msg .bubble { max-width: 82%; padding: 8px 12px; border-radius: 14px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; font-size: 14px; }
  .msg.user { justify-content: flex-end; }
  .msg.user .bubble { background: #2e7d32; color: #fff; border-bottom-right-radius: 4px; }
  .msg.assistant .bubble { background: #fff; border: 1px solid #cde8c2; border-bottom-left-radius: 4px; }
  .msg.tool .bubble { background: #fff8e1; border: 1px dashed #e6c35c; color: #8a6d1a; font-size: 13px; }
  .msg.system .bubble { background: transparent; color: #7a7a7a; font-size: 13px; padding: 2px 12px; }
  .typing { color: #999; font-size: 13px; padding: 4px 12px; }
  /* ── 状态栏 + 输入 ── */
  .status { background: #2e7d32; color: #fff; padding: 6px 14px; display: flex; align-items: center; gap: 14px; font-size: 13px; flex-wrap: wrap; }
  .expbar { width: 120px; height: 8px; background: rgba(255,255,255,.25); border-radius: 4px; overflow: hidden; }
  .expfill { height: 100%; background: linear-gradient(90deg, #aeea00, #fdd835); transition: width .4s; }
  .inputbar { display: flex; padding: 10px 14px; background: #fff; border-top: 1px solid #ddd; gap: 8px; }
  #input { flex: 1; padding: 9px 14px; border: 1px solid #cde8c2; border-radius: 20px; font-size: 14px; outline: none; }
  #input:focus { border-color: #2e7d32; }
  #send { padding: 9px 20px; border: none; border-radius: 20px; background: #2e7d32; color: #fff; font-size: 14px; cursor: pointer; }
  #send:hover { background: #1b5e20; }
  #send:disabled { background: #a5d6a7; cursor: not-allowed; }
</style>
</head>
<body>
  <!-- 花园 -->
  <div class="garden" id="garden">
    <div class="cloud c1">☁️</div>
    <div class="cloud c2">☁️</div>
    <div class="sun">☀️</div>
    <div class="tree" id="tree">🌱</div>
    <div class="cicada" id="cicada">🥚</div>
    <div class="fruits" id="fruits"></div>
    <div class="flowers" id="flowers"></div>
    <div class="hint" id="hint">蝉之园</div>
  </div>

  <!-- 聊天 -->
  <div class="chat" id="chat"></div>

  <!-- 状态栏 -->
  <div class="status">
    <span id="stLevel">Lv.1</span>
    <span id="stMood">(•ᴗ•)</span>
    <span id="stFruits">果实 —</span>
    <span class="expbar"><div class="expfill" id="expfill" style="width:0%"></div></span>
    <span id="stExp">0/50</span>
    <span id="stDeeds">劳作 0</span>
  </div>

  <!-- 输入 -->
  <div class="inputbar">
    <input id="input" placeholder="和蝉说点什么…(/exit 无用,网页常驻)" autocomplete="off">
    <button id="send">发送 🌱</button>
  </div>

<script>
  const $ = (id) => document.getElementById(id);
  const chat = $('chat');
  const FLOWERS = ['🌷', '🌸', '🌻', '🌼'];
  const MOOD = [
    [80, '(๑˃ᴗ˂)ﻭ'], [55, '(•ᴗ•)'], [30, '(・_・;)'], [0, '(╥﹏╥)'],
  ];
  const STAGE = { 1: '🥚', 3: '🐛', 6: '🍂', 10: '🦗' };
  const TREE = { 1: '🌱', 3: '🌿', 5: '🌳', 9: '🌳🌳' };

  function scrollDown() { chat.scrollTop = chat.scrollHeight; }

  function addMsg(role, text) {
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + role;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (role === 'assistant') bubble.textContent = '🍃 ' + text;
    else if (role === 'tool') bubble.textContent = '⚒️ ' + text;
    else bubble.textContent = text;
    wrap.appendChild(bubble);
    chat.appendChild(wrap);
    scrollDown();
    return bubble;
  }

  function stageFor(lv) {
    let s = '🥚';
    for (const [min, icon] of Object.entries(STAGE)) { if (lv >= Number(min)) s = icon; }
    return s;
  }
  function treeFor(lv) {
    let s = '🌱';
    for (const [min, icon] of Object.entries(TREE)) { if (lv >= Number(min)) s = icon; }
    return s;
  }
  function moodFor(m) {
    for (const [min, face] of MOOD) { if (m >= min) return face; }
    return '(╥﹏╥)';
  }

  function renderGarden(g) {
    $('tree').textContent = treeFor(g.level);
    $('cicada').textContent = stageFor(g.level);
    // 花:按劳作数
    const n = Math.min(10, 1 + Math.floor(g.deeds / 3));
    $('flowers').innerHTML = '';
    for (let i = 0; i < n; i++) {
      const f = document.createElement('span');
      f.className = 'flower';
      f.textContent = FLOWERS[i % FLOWERS.length];
      $('flowers').appendChild(f);
    }
    // 果实:最多显示 8 个,新果实在最前面有掉落动画
    const fruits = g.fruits.slice(-8);
    $('fruits').innerHTML = '';
    for (let i = 0; i < fruits.length; i++) {
      const fr = document.createElement('span');
      fr.className = 'fruit' + (i === fruits.length - 1 ? '' : '');
      fr.textContent = fruits[i];
      $('fruits').appendChild(fr);
    }
    // 状态栏
    $('stLevel').textContent = 'Lv.' + g.level;
    $('stMood').textContent = moodFor(g.mood);
    $('stFruits').textContent = '果实 ' + (g.fruits.length ? g.fruits.join('') : '—');
    $('stDeeds').textContent = '劳作 ' + g.deeds + ' · 对话 ' + (g.chats ?? 0);
    $('expfill').style.width = Math.min(100, (g.exp / 50 / g.level / g.level) * 100) + '%';
    $('stExp').textContent = g.exp + '/' + 50 * g.level * g.level;
    $('hint').textContent = '蝉之园 · 劳作 ' + g.deeds + ' 次';
  }

  async function send() {
    const text = $('input').value.trim();
    if (!text) return;
    $('input').value = '';
    $('send').disabled = true;
    const typing = document.createElement('div');
    typing.className = 'typing';
    typing.textContent = '🍃 蝉在花园里忙碌…';
    chat.appendChild(typing);

    let assistantBubble = null;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const data = t.slice(5).trim();
          if (!data) continue;
          let ev;
          try { ev = JSON.parse(data); } catch { continue; }
          if (ev.type === 'user') addMsg('user', ev.text);
          else if (ev.type === 'tool') addMsg('tool', ev.icon + ' ' + ev.name);
          else if (ev.type === 'system') addMsg('system', ev.text);
          else if (ev.type === 'delta') {
            if (!assistantBubble) {
              typing.remove();
              assistantBubble = addMsg('assistant', '');
            }
            assistantBubble.textContent += ev.text;
            scrollDown();
          } else if (ev.type === 'state') {
            renderGarden(ev.garden);
          } else if (ev.type === 'error') {
            typing.remove();
            addMsg('system', '🥀 ' + ev.text);
          }
        }
      }
    } catch (err) {
      typing.remove();
      addMsg('system', '🥀 连接出错: ' + err);
    } finally {
      typing.remove();
      $('send').disabled = false;
      $('input').focus();
    }
  }

  $('send').addEventListener('click', send);
  $('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  // 初始化花园状态
  fetch('/api/garden').then((r) => r.json()).then((d) => {
    renderGarden(d.garden);
    addMsg('system', '欢迎回到蝉之园!花园 Lv.' + d.garden.level + ',说句话开始劳作吧。');
  }).catch(() => {});
  $('input').focus();
</script>
</body>
</html>`;
}
