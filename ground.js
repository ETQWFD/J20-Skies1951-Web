// 长空·1951 网页版 — 陆战（步兵）模式：第一人称冲锋 · 士兵行进动画 · 枪械/手雷 · 敌我 AI
import * as THREE from 'three';
import { buildWorld, groundH, makeSoldier, poseSoldier, makeViewGun, makeRifle, makeRedFlag, blobTex, bloodTex, fireTex, smokeTex, radialTex, BUILD } from './core.js';

export function initGround(Q) {
  document.body.classList.add(Q === 'pc' ? 'pc' : 'mobile');
  document.body.innerHTML =
    `<div id="hud">
      <canvas id="fl1" width="54" height="36" class="flag"></canvas>
      <canvas id="fl2" width="54" height="36" class="flag"></canvas>
      <div id="stats"></div>
      <div id="ammo"></div>
      <div id="feed"></div>
      <div id="cross"><span></span></div>
      <div id="hit">×</div>
      <div id="vig"></div>
      <div id="banner"></div>
      <div id="ver">${BUILD} · 陆战</div>
      <div id="obj"></div>
      <div id="stick"><div id="knob"></div></div>
      <div id="btnFire" class="tb">火</div>
      <div id="btnAim" class="tb sm">镜</div>
      <div id="btnJump" class="tb sm jp">跳</div>
      <div id="btnGre" class="tb sm gr">雷</div>
      <div id="btnSwap" class="tb sm sw">换</div>
      <div id="btnPause" class="tb ps">Ⅱ</div>
      <div id="hint"></div>
    </div>
    <div id="ov" class="ov"><div class="box">
      <h1>夺 取 高 地</h1>
      <div class="sub">J-20 SKIES OVER KOREA · ${Q === 'pc' ? '电脑版' : '手机版'} · 陆战 · 抗美援朝</div>
      <div class="panel" id="help"></div>
      <button id="go">冲 锋</button>
      <div class="tip">铭记历史 · 珍爱和平 · 吾辈自强　·　<a href="pc.html">换空战</a> · <a href="index.html">返回选版</a></div>
    </div></div>
    <div id="po" class="ov" style="display:none"><div class="box">
      <h2>已暂停</h2>
      <button id="resume">继续战斗</button><br>
      <button id="restart" class="ghost">重新集结</button><br>
      <a class="gh" href="index.html">返回选版</a>
    </div></div>
    <div id="end" class="ov" style="display:none"><div class="box">
      <h1 id="endT"></h1><div class="panel" id="endP"></div>
      <button id="again">再 打 一 次</button>
    </div></div>`;
  const $ = id => document.getElementById(id);
  $('help').innerHTML = Q === 'pc'
    ? `WASD 移动 · Shift 冲刺 · <b>空格</b>跳跃（单跳）· 鼠标视角（点击画面锁定）<br>
       左键开火 · 右键开镜 · <b>1</b>步枪 <b>2</b>AKM <b>3</b>大刀 <b>0</b>拳头 · 长按 <b>M</b> 手雷 · P 暂停`
    : `左摇杆 移动 · 右半屏滑动 视角 · <b>火</b>开火 · <b>镜</b>开镜<br>跳/雷（长按蓄力）/换 武器 · 右上 Ⅱ 暂停`;
  if (Q === 'pc') $('hint').textContent = '点击画面用鼠标视角';

  const css = `
    html,body{margin:0;height:100%;overflow:hidden;background:#20232a;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;-webkit-user-select:none;user-select:none;touch-action:none}
    #hud{position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;color:#ffe9c0;text-shadow:0 1px 3px #000;z-index:5}
    .flag{position:absolute;top:10px;left:12px;border:1px solid rgba(255,220,150,.6)} #fl2{left:74px}
    #stats{position:absolute;top:12px;left:142px;font-size:14px;line-height:1.7} #stats b{color:#ffd25e}
    #ammo{position:absolute;right:16px;bottom:14px;text-align:right;font-size:15px;line-height:1.6;color:#ffe1ae}
    #feed{position:absolute;left:14px;bottom:64px;font-size:13px;line-height:1.7;color:#ffd6c8;max-width:60%}
    #feed div{background:rgba(60,20,16,.42);border-left:3px solid #c8452f;padding:2px 8px;margin-top:4px;border-radius:2px;transition:opacity 1s}
    #cross{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:26px;height:26px;opacity:.9}
    #cross span{position:absolute;inset:0}
    #cross span:before,#cross span:after{content:'';position:absolute;background:rgba(255,240,210,.9)}
    #cross span:before{left:50%;top:0;width:2px;height:100%;transform:translateX(-50%)}
    #cross span:after{top:50%;left:0;height:2px;width:100%;transform:translateY(-50%)}
    #hit{position:absolute;left:50%;top:50%;transform:translate(-50%,-56%) scale(1.6);font-size:26px;color:#ff5a44;opacity:0}
    #vig{position:absolute;inset:0;background:radial-gradient(120% 120% at 50% 50%,transparent 55%,rgba(150,10,10,.55) 100%);opacity:0;transition:opacity .15s}
    #banner{position:absolute;left:50%;top:26%;transform:translateX(-50%);font-size:30px;font-weight:700;letter-spacing:6px;color:#ffd9a0;opacity:0;transition:opacity .3s;white-space:nowrap;text-shadow:0 2px 8px #000}
    #obj{position:absolute;left:50%;top:56px;transform:translateX(-50%);font-size:15px;color:#ffb3a6;letter-spacing:2px}
    #ver{position:absolute;right:8px;top:6px;font-size:10px;opacity:.45}
    .ov{position:fixed;inset:0;background:radial-gradient(120% 120% at 50% 0%,#3a3f4a 0%,#16191f 72%);display:flex;align-items:center;justify-content:center;z-index:20;text-align:center;color:#f2e6cf}
    .ov h1{font-size:${Q==='pc'?44:32}px;margin:0 0 6px;color:#ffd77a;letter-spacing:10px}
    .ov h2{font-size:30px;color:#ffd77a;letter-spacing:8px}
    .sub{opacity:.8;margin-bottom:20px;font-size:14px}
    .panel{font-size:${Q==='pc'?14:12.5}px;line-height:2;background:rgba(0,0,0,.32);border:1px solid rgba(255,210,140,.35);border-radius:12px;padding:16px 20px;margin-bottom:22px}
    button{border:none;background:linear-gradient(180deg,#d23b2c,#9c2318);color:#fff;font-size:20px;letter-spacing:6px;padding:13px 50px;border-radius:40px;box-shadow:0 8px 26px rgba(0,0,0,.5);cursor:pointer;margin:6px}
    button.ghost{background:linear-gradient(180deg,#555b66,#33373f);letter-spacing:3px;font-size:16px;padding:10px 30px}
    .tip{margin-top:16px;font-size:12px;opacity:.6} .tip a,.gh{color:#ffd77a}
    #hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);font-size:13px;opacity:.65}
    .tb{position:fixed;width:78px;height:78px;border-radius:50%;background:rgba(255,255,255,.10);border:2px solid rgba(255,255,255,.35);display:none;align-items:center;justify-content:center;color:#fff;font-size:22px;pointer-events:auto;z-index:6}
    .tb.sm{width:60px;height:60px;font-size:17px}.tb.ps{width:46px;height:46px;font-size:16px;top:12px;right:14px}
    #btnFire{right:26px;bottom:118px} #btnAim{right:104px;bottom:210px}
    #btnJump{right:118px;bottom:54px} #btnGre{right:26px;bottom:214px} #btnSwap{right:96px;bottom:286px}
    #stick{position:fixed;left:34px;bottom:56px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.3);display:none;z-index:6}
    #knob{position:absolute;left:38px;top:38px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.35)}
    body.mobile .tb{display:flex} body.mobile #stick{display:block}
    @media (pointer:coarse){body.pc .tb:not(.ps){display:none}}
  `;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

  // 国旗
  function drawFlag(cv, text) {
    const x = cv.getContext('2d'); x.fillStyle = '#de141a'; x.fillRect(0, 0, 54, 36); x.fillStyle = '#ffee46';
    const star = (cx, cy, r, rot = 0) => { x.save(); x.translate(cx, cy); x.rotate(rot); x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); x.restore(); };
    star(9, 9, 5.2);
    [[10, 2], [12, 4], [12, 7], [10, 9]].forEach(p => star(p[0] * 1.8, p[1] * 2, 1.9, Math.atan2(9 - p[1] * 2, 9 - p[0] * 1.8) + Math.PI / 2));
    if (text) { x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText('八一', 27, 24); }
  }
  drawFlag($('fl1'), false); drawFlag($('fl2'), true);

  const W = buildWorld(Q, { ground: true });
  const { scene, camera, cfg } = W;

  /* ---------- 极简程序化音效（无外部资源） ---------- */
  let actx = null;
  function sndGun() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, n = actx.sampleRate * .12, buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
      const src = actx.createBufferSource(); src.buffer = buf; const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
      const g = actx.createGain(); g.gain.value = .16; src.connect(f).connect(g).connect(actx.destination); src.start();
    } catch (e) { }
  }

  /* ---------- 武器 ---------- */
  const WPN = [
    { id: 'sniper', name: '莫辛-纳甘步枪', mag: 5, auto: false, cd: .85, adsFov: 28, spread: .002, reach: 700, gun: 'sniper' },
    { id: 'akm', name: 'AKM', mag: 100, auto: true, cd: .105, adsFov: 52, spread: .016, reach: 320, gun: 'akm' },
    { id: 'knife', name: '大刀', melee: true, cd: .5, reach: 2.8, dmg: 100 },
    { id: 'fist', name: '拳头', melee: true, cd: .42, reach: 2.1, dmg: 34 },
  ];
  let wpn = 0, mag = [5, 100, 0, 0], grenades = 1, fireCd = 0, ads = 0, wantAds = false, firing = false, dead = false, win = false, paused = false, started = false;
  const viewGuns = WPN.map(w => { const g = makeViewGun(w.gun); g.visible = false; camera.add(g); return g; });
  const greView = makeViewGun('grenade'); greView.visible = false; greView.scale.setScalar(1.5); camera.add(greView);
  setWpn(0);
  const muzzleWorld = new THREE.Vector3();

  /* ---------- 玩家状态 ---------- */
  const pos = new THREE.Vector3(0, groundH(0, 40), 40);
  let yaw = 0, pitch = -.05, vy = 0, onGround = true, hp = 100, moveT = 0, recoil = 0;
  camera.position.set(pos.x, pos.y + 1.62, pos.z);

  /* ---------- 敌我士兵 ---------- */
  const NE = Q === 'pc' ? 14 : 10, NA = Q === 'pc' ? 6 : 4;
  const OBJ = new THREE.Vector3(0, 0, -360); OBJ.y = groundH(OBJ.x, OBJ.z);
  function makeBar(color) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 10;
    const t = new THREE.CanvasTexture(cv);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(.7, .11, 1); s.userData.color = color; s.userData.cv = cv; s.userData.last = -1; scene.add(s); return s;
  }
  function drawBar(sp, ratio) {
    const x = sp.userData.cv.getContext('2d'); x.clearRect(0, 0, 64, 10);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 0, 64, 10);
    x.fillStyle = sp.userData.color; x.fillRect(1, 1, 62 * Math.max(0, ratio), 8);
    sp.material.map.needsUpdate = true;
  }
  function makeUnit(team, x, z) {
    const root = makeSoldier(team); root.position.set(x, groundH(x, z), z); scene.add(root);
    const u = { team, root, hp: 100, deadT: -1, fireCd: Math.random() * 2, phase: Math.random() * 6, yaw: 0,
      bar: makeBar(team === 'us' ? '#e0443a' : '#4a90e2'), home: new THREE.Vector3(x, 0, z) };
    return u;
  }
  const units = [];
  // 敌军围绕高地散布
  for (let i = 0; i < NE; i++) {
    const a = (i / NE) * Math.PI * 2, rr = 18 + hashSpread(i) * 70;
    const x = OBJ.x + Math.cos(a) * rr + (hashSpread(i + 50) - .5) * 30, z = OBJ.z + Math.sin(a) * rr * .7;
    units.push(makeUnit('us', x, z));
  }
  for (let i = 0; i < NA; i++) units.push(makeUnit('vol', -10 + i * 4 + (i % 2 ? 3 : -3), 24 - i * 2));
  units.forEach((u, i) => u.idx = i);
  function hashSpread(i) { const n = Math.sin(i * 91.7) * 43758.5; return n - Math.floor(n); }

  // 假接触阴影（手机无阴影贴图时）+ 血渍
  const bTex = blobTex(), blobs = [];
  if (!cfg.shadows) for (let i = 0; i < NE + NA; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: bTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); blobs.push(m); }
  const blTex = bloodTex(), decals = [];
  function addDecal(x, z) {
    if (decals.length > 36) { const old = decals.shift(); scene.remove(old); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: blTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 3; m.position.set(x, groundH(x, z) + .05, z); scene.add(m); decals.push(m);
  }

  // 沙袋掩体（视觉）
  const sandM = new THREE.MeshLambertMaterial({ color: 0x7a6c52 });
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(2.2, .55, 6, 12, Math.PI * 1.4), sandM);
    const a = i / 6 * Math.PI * 2; t.position.set(OBJ.x + Math.cos(a) * 30, groundH(OBJ.x + Math.cos(a) * 30, OBJ.z + Math.sin(a) * 30) + .4, OBJ.z + Math.sin(a) * 30);
    t.rotation.x = Math.PI / 2; t.rotation.z = -a; scene.add(t);
  }
  // 胜利红旗
  const flagG = makeRedFlag(); flagG.position.copy(OBJ); flagG.scale.y = .001; scene.add(flagG);

  /* ---------- 曳光弹 / 血雾 / 抛射物 ---------- */
  const tracers = [], tracerGeo = new THREE.BoxGeometry(.05, .05, 1);
  function tracer(a, b, foe) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: foe ? 0xff6a4a : 0xffe09a, transparent: true, opacity: .95, blending: THREE.AdditiveBlending }));
    m.position.copy(a).add(b).multiplyScalar(.5); m.lookAt(b); m.scale.z = a.distanceTo(b);
    scene.add(m); tracers.push({ m, life: .09 });
  }
  const puffs = [];
  function puff(p, color) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, color], [1, 'rgba(120,10,10,0)']]), transparent: true, depthWrite: false }));
    s.position.copy(p); s.scale.setScalar(.6); scene.add(s); puffs.push({ s, life: .5 });
  }
  function dust(p) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(150,132,104,.8)'], [1, 'rgba(150,132,104,0)']]), transparent: true, depthWrite: false }));
    s.position.set(p.x, p.y + .2, p.z); s.scale.setScalar(.5); scene.add(s); puffs.push({ s, life: .35 });
  }
  const nades = [];
  const arcDots = []; for (let i = 0; i < 22; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: .0 })); scene.add(d); arcDots.push(d); }
  let greCharge = 0, greHeld = false;

  /* ---------- 击杀播报 / 提示 ---------- */
  function addFeed(t) { const el = $('feed'), d = document.createElement('div'); d.textContent = t; el.appendChild(d); while (el.children.length > 5) el.removeChild(el.firstChild); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 1000); }, 4600); }
  function flash(t) { const b = $('banner'); b.textContent = t; b.style.opacity = 1; clearTimeout(flash._t); flash._t = setTimeout(() => b.style.opacity = 0, 1900); }
  function hitMark() { const h = $('hit'); h.style.opacity = 1; clearTimeout(hitMark._t); hitMark._t = setTimeout(() => h.style.opacity = 0, 90); }
  let vig = 0; function damage(n) { hp -= n; vig = 1; if (hp <= 0 && !dead) { hp = 0; die(); } }

  /* ---------- 命中检测 ---------- */
  function raySphere(ro, rd, c, r) {
    const oc = ro.clone().sub(c), b = oc.dot(rd), cc = oc.dot(oc) - r * r, disc = b * b - cc;
    if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t >= 0 ? t : null;
  }
  const headV = new THREE.Vector3(), chestV = new THREE.Vector3(), legV = new THREE.Vector3();
  function fireHitscan() {
    const w = WPN[wpn], ro = camera.getWorldPosition(new THREE.Vector3());
    camera.getWorldDirection(muzzleWorld);
    const dir = muzzleWorld.clone();
    dir.x += (Math.random() - .5) * w.spread * (ads > .6 ? .4 : 1);
    dir.y += (Math.random() - .5) * w.spread * (ads > .6 ? .4 : 1);
    dir.normalize();
    let best = null, bestT = w.reach;
    for (const u of units) {
      if (u.team !== 'us' || u.deadT >= 0) continue;
      u.root.userData.rig.headG.getWorldPosition(headV);
      chestV.copy(u.root.position); chestV.y += 1.22; legV.copy(u.root.position); legV.y += .55;
      const th = raySphere(ro, dir, headV, .19), tb = raySphere(ro, dir, chestV, .42), tl = raySphere(ro, dir, legV, .4);
      if (th !== null && th < bestT) { bestT = th; best = { u, part: 'head' }; }
      if (tb !== null && tb < bestT) { bestT = tb; best = { u, part: 'body' }; }
      if (tl !== null && tl < bestT) { bestT = tl; best = { u, part: 'leg' }; }
    }
    const mz = ro.clone().addScaledVector(dir, .9);
    let end = ro.clone().addScaledVector(dir, w.reach);
    if (best) end.copy(ro).addScaledVector(dir, bestT);
    else for (let s = 2; s < w.reach; s += 3) { const p = ro.clone().addScaledVector(dir, s); if (p.y < groundH(p.x, p.z)) { end = p; dust(p); break; } }
    tracer(mz, end, false);
    if (!best) return;
    const u = best.u;
    let dmg;
    if (wpn === 0) dmg = best.part === 'head' ? 100 : best.part === 'body' ? 55 : 36;
    else dmg = best.part === 'head' ? 108 : best.part === 'body' ? 36 : 22;
    dmgUnit(u, dmg, best.part, true);
    hitMark();
    puff(end, best.part === 'head' ? 'rgba(150,20,20,.9)' : 'rgba(130,30,30,.7)');
  }
  function melee() {
    const w = WPN[wpn], ro = camera.getWorldPosition(new THREE.Vector3()); camera.getWorldDirection(muzzleWorld);
    for (const u of units) {
      if (u.team !== 'us' || u.deadT >= 0) continue;
      chestV.copy(u.root.position); chestV.y += 1.2;
      if (ro.distanceTo(chestV) < w.reach && muzzleWorld.dot(chestV.clone().sub(ro).normalize()) > .6) { dmgUnit(u, w.dmg, 'body', true); hitMark(); return; }
    }
  }
  function dmgUnit(u, n, part, byPlayer) {
    if (u.deadT >= 0) return;
    u.hp -= n;
    if (u.hp <= 0) {
      u.deadT = 0; u.root.userData.face = Math.random() < .5 ? 1 : -1; u.bar.visible = false;
      addDecal(u.root.position.x, u.root.position.z);
      W.boom(u.root.position.clone().setY(u.root.position.y + 1.1), .8);
      if (byPlayer) addFeed(`${part === 'head' ? '爆头' : '击毙'}${u.team === 'us' ? '美军士兵' : '战友'}`);
      else if (u.team === 'us') addFeed('战友击毙美军士兵');
    }
  }

  /* ---------- 手雷 ---------- */
  function throwGrenade(power) {
    if (grenades <= 0) { flash('手雷已用尽'); return; }
    grenades--;
    const ro = camera.getWorldPosition(new THREE.Vector3()); camera.getWorldDirection(muzzleWorld);
    const g = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3f4637 }));
    g.position.copy(ro); scene.add(g);
    nades.push({ m: g, v: muzzleWorld.clone().multiplyScalar(8 + power * 20).add(new THREE.Vector3(0, 5 + power * 5, 0)), t: 2.4 });
    addFeed('投出手雷');
  }
  function explode(p) {
    W.boom(p, 1.8); sndGun();
    for (const u of units) { if (u.deadT >= 0) continue; const d = Math.hypot(u.root.position.x - p.x, u.root.position.z - p.z); if (d < 7) dmgUnit(u, Math.round(110 * (1 - d / 7)), 'body', true); }
    const dp = Math.hypot(pos.x - p.x, pos.z - p.z); if (dp < 7) damage(Math.round(70 * (1 - dp / 7)));
  }

  /* ---------- 输入 ---------- */
  const keys = {};
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') { tryJump(); e.preventDefault(); }
    if (e.code === 'Digit1') setWpn(0); if (e.code === 'Digit2') setWpn(1); if (e.code === 'Digit3') setWpn(2); if (e.code === 'Digit0') setWpn(3);
    if (e.code === 'KeyM' && !greHeld) { greHeld = true; greCharge = 0; }
    if (e.code === 'KeyR') flash('没有多余弹药');
    if (e.code === 'KeyP') togglePause();
  });
  addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyM' && greHeld) { greHeld = false; throwGrenade(greCharge); greCharge = 0; } });
  let mlook = 0;
  document.addEventListener('mousedown', e => { if (document.pointerLockElement !== cvEl) return; if (e.button === 0) firing = true; if (e.button === 2) wantAds = true; });
  addEventListener('mouseup', e => { if (e.button === 0) firing = false; if (e.button === 2) wantAds = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('mousemove', e => { if (document.pointerLockElement === cvEl) { yaw -= e.movementX * .0023 * (ads > .6 ? .7 : 1); pitch -= e.movementY * .0021 * (ads > .6 ? .7 : 1); mlook = 1; } });
  const cvEl = W.renderer.domElement;
  cvEl.addEventListener('click', () => { if (Q === 'pc' && started && !paused && !dead) cvEl.requestPointerLock?.(); });

  // 触控
  let mvX = 0, mvY = 0, lookDX = 0, lookDY = 0, sId = null, lId = null, lx = 0, ly = 0, sprintTouch = false;
  const stick = $('stick'), knob = $('knob');
  function sp(t) { const r = stick.getBoundingClientRect(); return { x: t.clientX - r.left - r.width / 2, y: t.clientY - r.top - r.height / 2 }; }
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * .42 && sId === null && t.clientY > innerHeight - 300) { sId = t.identifier; const p = sp(t); mvX = Math.max(-1, Math.min(1, p.x / 44)); mvY = Math.max(-1, Math.min(1, -p.y / 44)); knob.style.transform = `translate(${p.x}px,${p.y}px)`; }
      else if (t.clientY > innerHeight - 320 && t.clientX > innerWidth - 300) { /* 按钮 */ }
      else if (lId === null) { lId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: true });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === sId) { const p = sp(t); mvX = Math.max(-1, Math.min(1, p.x / 44)); mvY = Math.max(-1, Math.min(1, -p.y / 44)); knob.style.transform = `translate(${Math.max(-38, Math.min(38, p.x))}px,${Math.max(-38, Math.min(38, p.y))}px)`; }
      else if (t.identifier === lId) { lookDX += (t.clientX - lx) * .4; lookDY += (t.clientY - ly) * .42; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: true });
  addEventListener('touchend', e => { for (const t of e.changedTouches) { if (t.identifier === sId) { sId = null; mvX = mvY = 0; knob.style.transform = ''; } if (t.identifier === lId) lId = null; } }, { passive: true });
  const hold = (id, dn, up) => { $(id).addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); dn(); }, { passive: false }); if (up) $(id).addEventListener('touchend', e => { e.preventDefault(); up(); }, { passive: false }); };
  hold('btnFire', () => firing = true, () => firing = false);
  hold('btnAim', () => wantAds = true, () => wantAds = false);
  hold('btnGre', () => { greHeld = true; greCharge = 0; }, () => { if (greHeld) { greHeld = false; throwGrenade(greCharge); greCharge = 0; } });
  $('btnJump').addEventListener('touchstart', e => { e.preventDefault(); tryJump(); }, { passive: false });
  $('btnSwap').addEventListener('touchstart', e => { e.preventDefault(); setWpn((wpn + 1) % 4); }, { passive: false });
  $('btnPause').addEventListener('touchstart', e => { e.preventDefault(); togglePause(); }, { passive: false });
  $('btnPause').addEventListener('click', togglePause);

  function setWpn(i) { if (wpn === i) return; wpn = i; viewGuns.forEach((g, k) => g.visible = k === i); greView.visible = false; firing = false; }
  function tryJump() { if (onGround) { vy = 5.4; onGround = false; } }
  function togglePause() { if (!started || dead || win) return; paused = !paused; $('po').style.display = pulsed = paused ? 'flex' : 'none'; if (!paused) lastT = performance.now(); }
  let pulsed = false;

  /* ---------- 流程 ---------- */
  function die() {
    dead = true; W.boom(new THREE.Vector3(pos.x, pos.y + 1.4, pos.z), 1.6);
    setTimeout(() => { $('endT').textContent = '你 已 牺 牲'; $('endP').innerHTML = '青山处处埋忠骨，何须马革裹尸还。<br>调整战术，再次冲锋。'; $('end').style.display = 'flex'; }, 700);
  }
  function victory() {
    win = true; flash('高地已夺取 · 胜 利');
    let g = .001;
    const rise = setInterval(() => { g = Math.min(1, g + .06); flagG.scale.y = g; if (g >= 1) clearInterval(rise); }, 60);
    setTimeout(() => { $('endT').textContent = '胜 利'; $('endT').style.color = '#ffd77a'; $('endP').innerHTML = '战友在高地上竖起五星红旗。<br>这一战，我们替先辈守住了山河。'; $('end').style.display = 'flex'; }, 2200);
  }
  $('go').addEventListener('click', () => { try { (actx = actx || new (window.AudioContext || window.webkitAudioContext)()).resume(); } catch (e) { } $('ov').style.display = 'none'; started = true; lastT = performance.now(); flash('夺 取 前 方 高 地'); });
  $('resume').addEventListener('click', togglePause);
  $('restart').addEventListener('click', () => location.reload());
  $('again').addEventListener('click', () => location.reload());
  document.addEventListener('visibilitychange', () => { if (document.hidden && started && !paused && !dead) togglePause(); });

  // 自动开局（截图）
  if (location.search.includes('autostart')) { $('ov').style.display = 'none'; started = true; }

  /* ---------- 主循环 ---------- */
  let lastT = performance.now();
  const FWD0 = new THREE.Vector3(), RIGHT0 = new THREE.Vector3(), wish = new THREE.Vector3();

  W.setUpdate(dt => {
    if (!started || paused) { W.followLight(pos.x, pos.y + 2, pos.z); return; }

    /* 视角 */
    yaw -= lookDX * .006 * (ads > .6 ? .7 : 1); pitch -= lookDY * .0055 * (ads > .6 ? .7 : 1); lookDX = lookDY = 0;
    pitch = Math.max(-1.42, Math.min(1.42, pitch));
    const wantAim = wantAds && (wpn === 0 || wpn === 1);
    ads += ((wantAim ? 1 : 0) - ads) * Math.min(1, dt * 12);
    const targetFov = (wpn === 0 || wpn === 1) ? (72 + (WPN[wpn].adsFov - 72) * ads) : 72;
    if (Math.abs(camera.fov - targetFov) > .1) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 12); camera.updateProjectionMatrix(); }

    /* 移动 */
    let mf = 0, mr = 0;
    if (keys.KeyW) mf += 1; if (keys.KeyS) mf -= 1; if (keys.KeyD) mr += 1; if (keys.KeyA) mr -= 1;
    mf += -mvY; mr += mvX;
    const sprint = keys.ShiftLeft || keys.ShiftRight || (Math.hypot(mvX, mvY) > .92);
    const spd = sprint ? 6.6 : 4.1;
    FWD0.set(-Math.sin(yaw), 0, -Math.cos(yaw)); RIGHT0.set(Math.cos(yaw), 0, -Math.sin(yaw));
    wish.set(0, 0, 0).addScaledVector(FWD0, mf).addScaledVector(RIGHT0, mr);
    if (wish.lengthSq() > 1) wish.normalize();
    pos.x += wish.x * spd * dt; pos.z += wish.z * spd * dt;
    if (wish.lengthSq() > .01) moveT += dt * (sprint ? 11 : 7.5);
    // 边界 + 树干推出
    pos.x = Math.max(-2600, Math.min(2600, pos.x)); pos.z = Math.max(-1200, Math.min(1300, pos.z));
    for (const t of W.trees) { const dx = pos.x - t.x, dz = pos.z - t.z, d2 = dx * dx + dz * dz; if (d2 < t.r * t.r && pos.y < groundH(t.x, t.z) + 8) { const d = Math.sqrt(d2) || .01; pos.x = t.x + dx / d * t.r; pos.z = t.z + dz / d * t.r; } }
    // 重力 / 地形
    vy -= 15 * dt; pos.y += vy * dt;
    const gh = groundH(pos.x, pos.z);
    if (pos.y <= gh) { pos.y = gh; vy = 0; onGround = true; } else onGround = false;
    camera.position.set(pos.x, pos.y + 1.62, pos.z);
    camera.rotation.order = 'YXZ'; camera.rotation.set(pitch + recoil, yaw, 0);
    recoil = Math.max(0, recoil - dt * 3);

    /* 武器 */
    fireCd -= dt;
    const w = WPN[wpn];
    if (firing && fireCd <= 0) {
      fireCd = w.cd;
      if (w.melee) { melee(); recoil = .04; }
      else if (mag[wpn] > 0) { mag[wpn]--; fireHitscan(); sndGun(); recoil = wpn === 0 ? .07 : .028; viewGuns[wpn].userData.flash.material.opacity = 1; }
      else flash('空仓 · 弹药已尽');
      if (!w.auto) firing = false;
    }
    viewGuns[wpn].userData.flash.material.opacity = Math.max(0, viewGuns[wpn].userData.flash.material.opacity - dt * 16);
    if (greHeld) { greCharge = Math.min(1, greCharge + dt / 1.2); }
    drawArc();

    /* 相机持枪姿态：开镜居中，平时右下，走动晃动；蓄力时换成手雷 */
    viewGuns.forEach((g, k) => g.visible = (k === wpn && !greHeld));
    greView.visible = greHeld;
    const vg = greHeld ? greView : viewGuns[wpn];
    const bob = Math.sin(moveT) * .012 * Math.min(1, wish.length());
    vg.position.set(greHeld ? .05 : .26 - .26 * ads, greHeld ? -.18 : -.24 + .12 * ads + bob, greHeld ? -.5 : -.55 + recoil * .6);
    vg.rotation.set(bob * .6, 0, 0);

    /* AI 士兵 */
    let foesAlive = 0;
    for (const u of units) {
      if (u.deadT >= 0) { u.deadT += dt; poseSoldier(u.root, 0, 0, 0, u.deadT); if (!cfg.shadows && blobs[u.idx]) blobs[u.idx].visible = false; continue; }
      const enemy = u.team === 'us';
      if (enemy) foesAlive++;
      // 选最近敌方目标（仅美军会向玩家开火）
      let tgt = null, td = 1e9;
      if (enemy) {
        const dp = Math.hypot(pos.x - u.root.position.x, pos.z - u.root.position.z);
        if (dp < 260) { td = dp; tgt = { x: pos.x, y: pos.y + 1.5, z: pos.z, isPlayer: true }; }
      }
      for (const o of units) {
        if (o.team === u.team || o.deadT >= 0) continue;
        const d = Math.hypot(o.root.position.x - u.root.position.x, o.root.position.z - u.root.position.z);
        if (d < (enemy ? 300 : 420) && d < td) { td = d; tgt = { x: o.root.position.x, y: o.root.position.y + 1.3, z: o.root.position.z, unit: o }; }
      }
      let moving = 0, aimAmt = 0;
      if (tgt) {
        const dx = tgt.x - u.root.position.x, dz = tgt.z - u.root.position.z, dist = Math.hypot(dx, dz);
        u.yaw = Math.atan2(-dx, -dz);
        const stopDist = enemy ? 115 : 150;
        if (dist > stopDist) {
          const sp = enemy ? 2.3 : 2.7;
          u.root.position.x += dx / dist * sp * dt; u.root.position.z += dz / dist * sp * dt; moving = 1; u.phase += dt * 7;
        } else { aimAmt = .7 + Math.random() * .3; u.phase += dt * 2; }
        // 开火
        u.fireCd -= dt;
        if (dist < (enemy ? 240 : 360) && u.fireCd <= 0) {
          u.fireCd = (enemy ? .7 : .6) + Math.random() * 1.3;
          const from = new THREE.Vector3(u.root.position.x, u.root.position.y + 1.45, u.root.position.z);
          const to = new THREE.Vector3(tgt.x + (Math.random() - .5) * 2.2, tgt.y + (Math.random() - .5) * 1.2, tgt.z + (Math.random() - .5) * 2.2);
          tracer(from, to, enemy); sndGun();
          if (Math.random() < (enemy ? .5 : .6)) {
            if (tgt.isPlayer) { if (dist < 200) damage(4 + Math.floor(Math.random() * 7)); }
            else dmgUnit(tgt.unit, enemy ? 22 : 30, 'body', false);
          }
        }
      } else {
        // 向高地/出生方向推进
        const tx = enemy ? OBJ.x : OBJ.x, tz = enemy ? u.home.z : OBJ.z;
        const dx = tx - u.root.position.x, dz = tz - u.root.position.z, d = Math.hypot(dx, dz);
        if (!enemy && d > 8) { u.root.position.x += dx / d * 2.4 * dt; u.root.position.z += dz / d * 2.4 * dt; u.yaw = Math.atan2(-dx, -dz); moving = 1; u.phase += dt * 7; }
      }
      u.root.position.y = groundH(u.root.position.x, u.root.position.z);
      u.root.rotation.y = u.yaw;
      poseSoldier(u.root, u.phase, moving, aimAmt, -1);
      // 血条
      u.bar.position.set(u.root.position.x, u.root.position.y + 2.05, u.root.position.z);
      if (Math.round(u.hp) !== u.bar.userData.last) { drawBar(u.bar, u.hp / 100); u.bar.userData.last = Math.round(u.hp); }
      if (!cfg.shadows) { const b = blobs[u.idx]; if (b) { b.visible = true; b.position.set(u.root.position.x, u.root.position.y + .04, u.root.position.z); } }
    }

    /* 手雷 */
    for (let i = nades.length - 1; i >= 0; i--) {
      const g = nades[i]; g.t -= dt; g.v.y -= 13 * dt; g.m.position.addScaledVector(g.v, dt);
      const gy = groundH(g.m.position.x, g.m.position.z) + .12;
      if (g.m.position.y < gy) { g.m.position.y = gy; g.v.y *= -.35; g.v.x *= .6; g.v.z *= .6; }
      if (g.t <= 0) { explode(g.m.position.clone()); scene.remove(g.m); nades.splice(i, 1); }
    }
    /* 曳光/血雾寿命 */
    for (let i = tracers.length - 1; i >= 0; i--) { const t = tracers[i]; t.life -= dt; t.m.material.opacity = Math.max(0, t.life / .09); if (t.life <= 0) { scene.remove(t.m); tracers.splice(i, 1); } }
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.life -= dt * 2; p.s.scale.multiplyScalar(1.05); p.s.material.opacity = Math.max(0, p.life); if (p.life <= 0) { scene.remove(p.s); puffs.splice(i, 1); } }

    /* 胜负 */
    if (foesAlive === 0 && !win && !dead) victory();

    W.followLight(pos.x, pos.y + 2, pos.z);
    vig = Math.max(0, vig - dt * 1.6); $('vig').style.opacity = vig;

    /* HUD */
    $('stats').innerHTML = `生命 <b>${Math.round(hp)}</b>　美军 <b>${foesAlive}</b>　战友 <b>${units.filter(u => u.team === 'vol' && u.deadT < 0).length}</b>`;
    $('obj').textContent = win ? '' : `目标：夺取前方高地 ${Math.round(Math.hypot(OBJ.x - pos.x, OBJ.z - pos.z))} m`;
    $('ammo').innerHTML = wpn < 2 ? `${w.name} <b style="color:#ffd25e">${mag[wpn]}</b> 发<br>手雷 ${grenades}` : `${w.name}<br>手雷 ${grenades}`;
  });

  /* 手雷抛物线预览 */
  function drawArc() {
    if (!greHeld) { arcDots.forEach(d => d.material.opacity = 0); return; }
    const ro = camera.getWorldPosition(new THREE.Vector3()); camera.getWorldDirection(muzzleWorld);
    const v = muzzleWorld.clone().multiplyScalar(8 + greCharge * 20).add(new THREE.Vector3(0, 5 + greCharge * 5, 0));
    for (let i = 0; i < arcDots.length; i++) {
      const tt = i * .11; const p = ro.clone().addScaledVector(v, tt); p.y -= .5 * 13 * tt * tt;
      if (p.y < groundH(p.x, p.z)) { arcDots[i].material.opacity = 0; } else { arcDots[i].position.copy(p); arcDots[i].material.opacity = .9; }
    }
  }

  // 版本提示
  if (!location.search.includes('autostart')) setInterval(async () => {
    try { const v = (await (await fetch('version.txt?ts=' + Date.now(), { cache: 'no-store' })).text()).trim(); if (v && v !== BUILD && !$('#upd2')) { const a = document.createElement('a'); a.id = 'upd2'; a.href = 'javascript:location.reload()'; a.textContent = '发现新版本 ' + v; a.style.cssText = 'position:fixed;left:50%;top:60px;transform:translateX(-50%);z-index:30;background:#9c2318;color:#ffe9c0;padding:8px 18px;border-radius:20px;font-size:14px'; $('hud').appendChild(a); } } catch (e) { }
  }, 60000);
}
