/**
 * 知了 · 网页 UI(零构建:原生 HTML/CSS/JS 内嵌)
 *
 * 布局:左侧边栏(会话列表 + 新建 + 农具),右侧主区(会动的花园 + 聊天 + 输入)。
 * 支持多会话切换,花园与 CLI 共享 garden.json。
 * 注意:整个 HTML 用 String.raw 包裹,内嵌 JS 的反斜杠(如 '\n')必须原样保留。
 */

export function renderPage(): string {
  return String.raw`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🍃 知了 · 蝉之园</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif; height: 100vh; background: #d9f2ff; }
  .app { display: flex; height: 100vh; }
  /* ── 侧边栏 ── */
  .sidebar { width: 240px; min-width: 240px; background: linear-gradient(#1b5e20, #2e7d32); color: #fff; display: flex; flex-direction: column; padding: 14px 10px; gap: 8px; }
  .brand { font-size: 20px; font-weight: 700; padding: 4px 8px; }
  .brand small { font-size: 12px; font-weight: 400; opacity: .8; display: block; }
  #newbtn { background: #aeea00; color: #1b5e20; border: none; border-radius: 10px; padding: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  #newbtn:hover { background: #c6ff00; }
  .sess-title { font-size: 12px; opacity: .7; padding: 6px 8px 2px; }
  .sessions { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }
  .sess { padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; line-height: 1.4; background: rgba(255,255,255,.06); }
  .sess:hover { background: rgba(255,255,255,.14); }
  .sess.active { background: rgba(255,255,255,.24); box-shadow: inset 3px 0 0 #aeea00; }
  .sess .t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sess .m { font-size: 11px; opacity: .65; }
  .tools { padding: 4px 8px; font-size: 12px; opacity: .85; display: flex; flex-wrap: wrap; gap: 4px; }
  .tools span { background: rgba(255,255,255,.12); padding: 2px 7px; border-radius: 8px; }
  .plugins { padding: 2px 8px 6px; display: flex; flex-direction: column; gap: 4px; }
  .plug { background: rgba(255,255,255,.08); border-radius: 8px; padding: 5px 8px; font-size: 12px; line-height: 1.35; }
  .plug .n { font-weight: 600; }
  .plug .d { opacity: .7; font-size: 11px; }
  .plug.bad { border-left: 3px solid #ff6d6d; }
  .plug.good { border-left: 3px solid #aeea00; }
  .mini { background: rgba(255,255,255,.16); border: none; color: #fff; border-radius: 8px; padding: 2px 8px; font-size: 11px; cursor: pointer; margin-left: 4px; vertical-align: 1px; }
  .mini:hover { background: rgba(255,255,255,.3); }
  .settings { padding: 2px 8px 8px; display: flex; flex-direction: column; gap: 5px; }
  .settings input { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); color: #fff; border-radius: 7px; padding: 6px 8px; font-size: 12px; outline: none; }
  .settings input::placeholder { color: rgba(255,255,255,.55); }
  .settings .mini { background: #aeea00; color: #1b5e20; padding: 6px; font-weight: 600; }
  .sess-title { display: flex; align-items: center; }
  /* ── 主区 ── */
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .garden { position: relative; height: 170px; overflow: hidden; background: linear-gradient(#aee6ff 0%, #d9f2ff 55%, #7ec850 55%, #5da83f 100%); border-bottom: 4px solid #3e7d2a; }
  .cloud { position: absolute; font-size: 28px; opacity: .9; animation: drift linear infinite; }
  .cloud.c1 { top: 10px; animation-duration: 38s; }
  .cloud.c2 { top: 40px; font-size: 20px; animation-duration: 52s; animation-delay: -20s; }
  @keyframes drift { from { transform: translateX(-70px); } to { transform: translateX(110vw); } }
  .sun { position: absolute; right: 24px; top: 6px; font-size: 36px; animation: spin 24s linear infinite; }
  @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  .tree { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); font-size: 76px; line-height: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,.15)); transition: font-size .5s; }
  .cicada { position: absolute; bottom: 86px; left: calc(50% + 32px); font-size: 24px; animation: hop 2.8s ease-in-out infinite; }
  @keyframes hop { 0%,100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-8px) rotate(8deg); } }
  .flowers { position: absolute; bottom: 4px; left: 0; right: 0; text-align: center; font-size: 24px; letter-spacing: 9px; white-space: nowrap; }
  .flower { display: inline-block; animation: sway 2.4s ease-in-out infinite; }
  .flower:nth-child(2n) { animation-delay: -.8s; }
  .flower:nth-child(3n) { animation-delay: -1.5s; }
  @keyframes sway { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
  .fruits { position: absolute; left: calc(50% - 6px); bottom: 76px; transform: translateX(-50%); font-size: 18px; letter-spacing: -2px; white-space: nowrap; }
  .fruit { display: inline-block; animation: drop .6s ease-in; }
  @keyframes drop { from { transform: translateY(-24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  /* ── 聊天 ── */
  .chat { flex: 1; overflow-y: auto; padding: 12px 16px; background: rgba(255,255,255,.78); }
  .msg { margin: 7px 0; display: flex; }
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
<div class="app">
  <!-- 侧边栏 -->
  <aside class="sidebar">
    <div class="brand">🍃 知了<small>蝉之园 · 中文优先编码 agent</small></div>
    <button id="newbtn">＋ 新会话</button>
    <div class="sess-title">💬 会话</div>
    <div class="sessions" id="sessions"></div>
    <div class="sess-title">🧩 插件 <button class="mini" id="reloadbtn" title="重新扫描 ~/.zhiliao/plugins/">↻ 重载</button></div>
    <div class="plugins" id="plugins"></div>
    <div class="sess-title">🛠 农具</div>
    <div class="tools" id="tools"></div>
    <div class="sess-title">⚙️ 设置</div>
    <div class="settings" id="settings">
      <input id="cfgBase" placeholder="端点(默认 DeepSeek)">
      <input id="cfgModel" placeholder="模型(默认 deepseek-chat)">
      <input id="cfgKey" type="password" placeholder="API key(留空不改)">
      <button class="mini" id="savecfg">保存设置</button>
    </div>
  </aside>

  <!-- 主区 -->
  <main class="main">
    <div class="garden">
      <div class="cloud c1">☁️</div>
      <div class="cloud c2">☁️</div>
      <div class="sun">☀️</div>
      <div class="tree" id="tree">🌱</div>
      <div class="cicada" id="cicada">🥚</div>
      <div class="fruits" id="fruits"></div>
      <div class="flowers" id="flowers"></div>
    </div>

    <div class="chat" id="chat"></div>

    <div class="status">
      <span id="stLevel">Lv.1</span>
      <span id="stMood">(•ᴗ•)</span>
      <span id="stFruits">果实 —</span>
      <span class="expbar"><div class="expfill" id="expfill" style="width:0%"></div></span>
      <span id="stExp">0/50</span>
      <span id="stDeeds">劳作 0</span>
    </div>

    <div class="inputbar">
      <input id="input" placeholder="和蝉说点什么…(Enter 发送)" autocomplete="off">
      <button id="send">发送 🌱</button>
    </div>
  </main>
</div>

<script>
  const $ = (id) => document.getElementById(id);
  const chat = $('chat');
  const FLOWERS = ['🌷', '🌸', '🌻', '🌼'];
  const MOOD = [[80, '(๑˃ᴗ˂)ﻭ'], [55, '(•ᴗ•)'], [30, '(・_・;)'], [0, '(╥﹏╥)']];
  const STAGE = { 1: '🥚', 3: '🐛', 6: '🍂', 10: '🦗' };
  const TREE = { 1: '🌱', 3: '🌿', 5: '🌳', 9: '🌳🌳' };
  let currentSessionId = null;

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

  function stageFor(lv) { let s = '🥚'; for (const k in STAGE) { if (lv >= Number(k)) s = STAGE[k]; } return s; }
  function treeFor(lv) { let s = '🌱'; for (const k in TREE) { if (lv >= Number(k)) s = TREE[k]; } return s; }
  function moodFor(m) { for (const [min, face] of MOOD) { if (m >= min) return face; } return '(╥﹏╥)'; }

  function renderGarden(g) {
    $('tree').textContent = treeFor(g.level);
    $('cicada').textContent = stageFor(g.level);
    const n = Math.min(10, 1 + Math.floor(g.deeds / 3));
    $('flowers').innerHTML = '';
    for (let i = 0; i < n; i++) {
      const f = document.createElement('span');
      f.className = 'flower';
      f.textContent = FLOWERS[i % FLOWERS.length];
      $('flowers').appendChild(f);
    }
    $('fruits').innerHTML = '';
    for (const fr of g.fruits.slice(-8)) {
      const el = document.createElement('span');
      el.className = 'fruit';
      el.textContent = fr;
      $('fruits').appendChild(el);
    }
    $('stLevel').textContent = 'Lv.' + g.level;
    $('stMood').textContent = moodFor(g.mood);
    $('stFruits').textContent = '果实 ' + (g.fruits.length ? g.fruits.join('') : '—');
    $('stDeeds').textContent = '劳作 ' + g.deeds + ' · 对话 ' + (g.chats ?? 0);
    $('expfill').style.width = Math.min(100, (g.exp / 50 / g.level / g.level) * 100) + '%';
    $('stExp').textContent = g.exp + '/' + 50 * g.level * g.level;
  }

  function fmtTime(ms) {
    const d = new Date(ms);
    return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  async function loadSessions() {
    const res = await fetch('/api/sessions');
    const { sessions } = await res.json();
    const box = $('sessions');
    box.innerHTML = '';
    for (const s of sessions) {
      const el = document.createElement('div');
      el.className = 'sess' + (s.id === currentSessionId ? ' active' : '');
      el.innerHTML = '<div class="t">' + s.title.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</div><div class="m">' + fmtTime(s.time) + ' · ' + s.count + ' 条</div>';
      el.addEventListener('click', () => selectSession(s.id));
      box.appendChild(el);
    }
  }

  async function selectSession(id) {
    currentSessionId = id;
    chat.innerHTML = '';
    const res = await fetch('/api/session/' + id);
    const data = await res.json();
    for (const m of data.messages) addMsg(m.role, m.content);
    if (!data.messages.length) addMsg('system', '(新会话,说句话开始)');
    loadSessions();
  }

  async function newSession() {
    const res = await fetch('/api/session/create', { method: 'POST' });
    const { id } = await res.json();
    await selectSession(id);
  }

  async function loadTools() {
    const res = await fetch('/api/tools');
    const { tools } = await res.json();
    $('tools').innerHTML = tools.map((t) => '<span>' + t.icon + ' ' + t.name + '</span>').join('');
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
        body: JSON.stringify({ message: text, sessionId: currentSessionId }),
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
          if (ev.type === 'session') { currentSessionId = ev.id; loadSessions(); }
          else if (ev.type === 'user') addMsg('user', ev.text);
          else if (ev.type === 'tool') addMsg('tool', ev.icon + ' ' + ev.name);
          else if (ev.type === 'system') addMsg('system', ev.text);
          else if (ev.type === 'delta') {
            if (!assistantBubble) { typing.remove(); assistantBubble = addMsg('assistant', ''); }
            assistantBubble.textContent += ev.text;
            scrollDown();
          } else if (ev.type === 'state') renderGarden(ev.garden);
          else if (ev.type === 'error') { typing.remove(); addMsg('system', '🥀 ' + ev.text); }
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
  $('newbtn').addEventListener('click', newSession);

  async function loadPlugins() {
    const res = await fetch('/api/plugins');
    const data = await res.json();
    const box = $('plugins');
    box.innerHTML = '';
    for (const p of data.plugins) {
      const el = document.createElement('div');
      el.className = 'plug ' + (p.ok ? 'good' : 'bad');
      el.innerHTML = '<div class="n">' + (p.ok ? '✅ ' : '❌ ') + p.name + (p.ok ? ' <span style="opacity:.6">+' + p.toolCount + ' 工具</span>' : '') + '</div>' + (p.description ? '<div class="d">' + p.description + '</div>' : '') + (p.error ? '<div class="d">' + p.error + '</div>' : '');
      box.appendChild(el);
    }
    if (!data.plugins.length) {
      box.innerHTML = '<div class="d" style="opacity:.6;font-size:11px;padding:2px 8px">放个 .js 到 ~/.zhiliao/plugins/ 试试</div>';
    }
  }

  async function reloadPlugins() {
    const btn = $('reloadbtn');
    btn.textContent = '…';
    btn.disabled = true;
    try {
      const res = await fetch('/api/plugins/reload', { method: 'POST' });
      await res.json();
      await loadPlugins();
      await loadTools();
      btn.textContent = '✓ 已重载';
      setTimeout(() => { btn.textContent = '↻ 重载'; btn.disabled = false; }, 1200);
    } catch (e) {
      btn.textContent = '↻ 重载';
      btn.disabled = false;
    }
  }

  async function loadConfig() {
    const res = await fetch('/api/config');
    const c = await res.json();
    $('cfgBase').value = c.baseURL || '';
    $('cfgModel').value = c.model || '';
    $('cfgKey').placeholder = c.hasKey ? 'API key 已设置(输入可更换)' : 'API key(必填)';
  }

  async function saveCfg() {
    const btn = $('savecfg');
    btn.textContent = '保存中…';
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: $('cfgBase').value.trim() || undefined,
          model: $('cfgModel').value.trim() || undefined,
          apiKey: $('cfgKey').value.trim() || undefined,
        }),
      });
      const d = await res.json();
      btn.textContent = d.ok ? '✓ 已保存' : '✗ 失败';
      $('cfgKey').value = '';
      loadConfig();
      setTimeout(() => { btn.textContent = '保存设置'; }, 1200);
    } catch (e) { btn.textContent = '✗ 失败'; }
  }

  $('reloadbtn').addEventListener('click', reloadPlugins);
  $('savecfg').addEventListener('click', saveCfg);

  // 初始化
  loadTools();
  loadPlugins();
  loadConfig();
  fetch('/api/garden').then((r) => r.json()).then((d) => {
    renderGarden(d.garden);
    addMsg('system', '欢迎回到蝉之园!花园 Lv.' + d.garden.level + ',说句话开始劳作吧。');
  }).catch(() => {});
  loadSessions().then(() => {
    if (!currentSessionId) {
      // 默认选中最新会话
      const first = document.querySelector('.sess');
      if (first) first.click();
      else newSession();
    }
  });
  $('input').focus();
</script>
</body>
</html>`;
}
