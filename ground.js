// 长空·1951 网页版 — 陆战：四战役 · 载具 · 阵地 · 敌机轰炸 · 补给 · 吹号插旗 (Three.js)
import * as THREE from 'three';
import { buildWorld, groundH, makeSoldier, poseSoldier, makeViewGun, makeRedFlag, blobTex, bloodTex, radialTex, BUILD } from './core.js';
import { makeTruck, makeTank, makeGunEmplacement, makeCrate, makeMedTent, makeMine, makeIceLake } from './entities.js';

/* ---------------- 战役 ---------------- */
const SCEN = [
  { id: 0, key: 'hill', name: '高 地 攻 坚', sub: '夺取前方高地，肃清守军', theme: 'dusk',
    spawn: { x: 0, z: 40 }, obj: { x: 0, z: -360 }, objFar: true,
    ne: 0, na: 0, waves: 0, tank: true, mortar: 1, mg: 2, mines: 8, airGap: 26, crates: 3, tent: true,
    story: '硝烟笼罩的黄昏，随战友仰攻美军据守的高地。' },
  { id: 1, key: 'chosin', name: '长津湖 · 冰 雕 连', sub: '零下四十度，越过冰湖夜袭', theme: 'night',
    spawn: { x: 0, z: 40 }, obj: { x: 0, z: -520 }, objFar: true,
    ne: 4, na: 2, waves: 1, tank: true, mortar: 1, mg: 2, mines: 10, airGap: 42, crates: 3, tent: true,
    ice: { x: 0, z: -250, r: 150 },
    story: '1950 年冬，长津湖畔。志愿军卧雪设伏，成建制冻成“冰雕”仍保持战斗姿态。' },
  { id: 2, key: 'songgok', name: '松 骨 峰 阻 击', sub: '守住阵地，打垮轮番进攻', theme: 'day',
    spawn: { x: 0, z: -300 }, obj: { x: 0, z: -300 }, objFar: false,
    ne: 6, na: 4, waves: 2, tank: true, mortar: 1, mg: 2, mines: 4, airGap: 24, crates: 4, tent: true,
    story: '敌人从南面成营成团涌来。人在阵地在，打退一轮又一轮冲锋。' },
  { id: 3, key: 'trench', name: '坑 道 争 夺', sub: '近战攻坚，肃清工事残敌', theme: 'dusk',
    spawn: { x: 0, z: 60 }, obj: { x: 0, z: -200 }, objFar: true,
    ne: 8, na: 4, waves: 0, tank: false, mortar: 2, mg: 3, mines: 4, airGap: 30, crates: 4, tent: true,
    story: '迫击炮与机枪交叉火力封锁的阵地，短促突击，刺刀见红。' },
];

export function initGround(Q) {
  const s = parseInt(new URLSearchParams(location.search).get('s'), 10);
  if (!(s >= 0 && s < SCEN.length)) { showCampaign(Q); return; }
  start(Q, SCEN[s]);
}

function showCampaign(Q) {
  const icons = ['⛰️', '❄️', '🎖️', '🕳️'];
  document.body.innerHTML =
    `<div style="position:fixed;inset:0;overflow:auto;background:linear-gradient(180deg,#2b2e36,#14171d);color:#f0e6d2;
      font-family:'PingFang SC','Microsoft YaHei',system-ui,sans-serif">
     <div style="max-width:900px;margin:0 auto;padding:6vh 18px 40px;text-align:center">
       <div style="font-size:clamp(28px,6vw,44px);color:#ffd77a;letter-spacing:10px">陆 战 · 战 役</div>
       <div style="opacity:.65;letter-spacing:3px;font-size:13px;margin:8px 0 26px">J-20 SKIES OVER KOREA · ${Q === 'pc' ? '网页电脑版' : '网页手机版'}</div>
       <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">
       ${SCEN.map((c, i) => `
         <a href="?ground&s=${i}" style="display:block;text-decoration:none;color:inherit;background:rgba(0,0,0,.34);
            border:1px solid rgba(255,210,140,.3);border-radius:14px;padding:22px 16px">
           <div style="font-size:38px">${icons[i]}</div>
           <h3 style="color:#ffd77a;letter-spacing:3px;margin:8px 0 4px;font-size:19px">${c.name}</h3>
           <div style="color:#e7c98e;font-size:13px;margin-bottom:8px">${c.sub}</div>
           <p style="opacity:.72;font-size:12.5px;line-height:1.8;min-height:44px">${c.story}</p>
           <span style="display:inline-block;margin-top:8px;background:linear-gradient(180deg,#d23b2c,#9c2318);color:#fff;
             letter-spacing:3px;padding:9px 26px;border-radius:24px;font-size:14px">投 入 战 斗</span>
         </a>`).join('')}
       </div>
       <div style="margin-top:26px;font-size:12.5px;opacity:.6">
         <a style="color:#ffd77a" href="pc.html?air">玩空战</a> · <a style="color:#ffd77a" href="index.html">返回选版</a>
         <br>铭记历史 · 珍爱和平 · 吾辈自强</div>
     </div></div>`;
}

function start(Q, S) {
  const NE = (Q === 'pc' ? 14 : 10) + (S.ne || 0), NA = (Q === 'pc' ? 6 : 4) + (S.na || 0);
  const WSZ = 6, WAVES = S.waves || 0;
  const TOTAL = NE + WAVES * WSZ;

  document.body.classList.add(Q === 'pc' ? 'pc' : 'mobile');
  document.body.innerHTML =
    `<div id="hud">
      <canvas id="fl1" width="54" height="36" class="flag"></canvas>
      <canvas id="fl2" width="54" height="36" class="flag"></canvas>
      <div id="stats"></div><div id="ammo"></div><div id="feed"></div>
      <div id="cross"><span></span></div><div id="hit">×</div><div id="vig"></div>
      <div id="banner"></div><div id="warn"></div><div id="ver">${BUILD} · 陆战</div>
      <div id="obj"></div><div id="prompt"></div>
      <div id="stick"><div id="knob"></div></div>
      <div id="btnFire" class="tb">火</div><div id="btnAim" class="tb sm">镜</div>
      <div id="btnJump" class="tb sm jp">跳</div><div id="btnGre" class="tb sm gr">雷</div>
      <div id="btnSwap" class="tb sm sw">换</div><div id="btnUse" class="tb sm use">车</div>
      <div id="btnPause" class="tb ps">Ⅱ</div>
    </div>
    <div id="ov" class="ov"><div class="box">
      <h1>${S.name}</h1><div class="sub">J-20 SKIES OVER KOREA · ${Q === 'pc' ? '电脑版' : '手机版'} · ${S.sub}</div>
      <div class="story">${S.story}</div>
      <div class="panel" id="help"></div>
      <button id="go">冲 锋</button>
      <div class="tip">铭记历史 · 珍爱和平 · 吾辈自强　·　<a href="?ground">换战役</a> · <a href="index.html">返回选版</a></div>
    </div></div>
    <div id="po" class="ov" style="display:none"><div class="box">
      <h2>已暂停</h2>
      <button id="resume">继续战斗</button><br><button id="restart" class="ghost">重新集结</button><br>
      <a class="gh" href="?ground">换战役</a>
    </div></div>
    <div id="end" class="ov" style="display:none"><div class="box">
      <h1 id="endT"></h1><div class="panel" id="endP"></div>
      <button id="again">再 打 一 次</button>
    </div></div>`;
  const $ = id => document.getElementById(id);
  $('help').innerHTML = Q === 'pc'
    ? `WASD 移动 · Shift 冲刺 · 空格跳 · 鼠标视角（点击锁定）<br>左键开火 · 右键开镜 · <b>1</b>步枪 <b>2</b>AKM <b>3</b>大刀 <b>0</b>拳头 · 长按 <b>M</b> 手雷<br><b>E/F</b> 上车下车·抢占坦克·拾取补给 · P 暂停`
    : `左摇杆 移动/驾驶 · 右半屏 视角 · 火/镜/跳/雷/换 · <b>车</b>键 上下车·拾取 · 右上 Ⅱ 暂停`;

  const css = `
    html,body{margin:0;height:100%;overflow:hidden;background:#20232a;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;-webkit-user-select:none;user-select:none;touch-action:none}
    #hud{position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;color:#ffe9c0;text-shadow:0 1px 3px #000;z-index:5}
    .flag{position:absolute;top:10px;left:12px;border:1px solid rgba(255,220,150,.6)} #fl2{left:74px}
    #stats{position:absolute;top:12px;left:142px;font-size:14px;line-height:1.7} #stats b{color:#ffd25e}
    #ammo{position:absolute;right:16px;bottom:14px;text-align:right;font-size:15px;line-height:1.6;color:#ffe1ae}
    #feed{position:absolute;left:14px;bottom:64px;font-size:13px;line-height:1.7;color:#ffd6c8;max-width:60%}
    #feed div{background:rgba(60,20,16,.42);border-left:3px solid #c8452f;padding:2px 8px;margin-top:4px;border-radius:2px;transition:opacity 1s}
    #cross{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:26px;height:26px;opacity:.9} #cross span{position:absolute;inset:0}
    #cross span:before,#cross span:after{content:'';position:absolute;background:rgba(255,240,210,.9)}
    #cross span:before{left:50%;top:0;width:2px;height:100%;transform:translateX(-50%)}
    #cross span:after{top:50%;left:0;height:2px;width:100%;transform:translateY(-50%)}
    #hit{position:absolute;left:50%;top:50%;transform:translate(-50%,-56%) scale(1.6);font-size:26px;color:#ff5a44;opacity:0}
    #vig{position:absolute;inset:0;background:radial-gradient(120% 120% at 50% 50%,transparent 55%,rgba(150,10,10,.55) 100%);opacity:0;transition:opacity .15s}
    #banner{position:absolute;left:50%;top:24%;transform:translateX(-50%);font-size:30px;font-weight:700;letter-spacing:6px;color:#ffd9a0;opacity:0;transition:opacity .3s;white-space:nowrap;text-shadow:0 2px 8px #000}
    #warn{position:absolute;left:50%;top:15%;transform:translateX(-50%);font-size:${Q==='pc'?22:18}px;font-weight:700;letter-spacing:3px;color:#ff5a44;opacity:0;text-align:center;text-shadow:0 2px 8px #000}
    #obj{position:absolute;left:50%;top:56px;transform:translateX(-50%);font-size:15px;color:#ffb3a6;letter-spacing:2px}
    #prompt{position:absolute;left:50%;bottom:${Q==='pc'?'22%':'15%'};transform:translateX(-50%);background:rgba(20,16,10,.7);border:1px solid rgba(255,210,140,.5);border-radius:20px;padding:7px 18px;font-size:15px;color:#ffe1ae;opacity:0;transition:opacity .12s}
    #ver{position:absolute;right:8px;top:6px;font-size:10px;opacity:.45}
    .ov{position:fixed;inset:0;background:radial-gradient(120% 120% at 50% 0%,#3a3f4a 0%,#14171d 72%);display:flex;align-items:center;justify-content:center;z-index:20;text-align:center;color:#f2e6cf}
    .ov h1{font-size:${Q==='pc'?42:30}px;margin:0 0 6px;color:#ffd77a;letter-spacing:8px}
    .ov h2{font-size:30px;color:#ffd77a;letter-spacing:8px}
    .sub{opacity:.8;margin-bottom:14px;font-size:14px}
    .story{max-width:560px;margin:0 auto 16px;font-size:${Q==='pc'?14:12.5}px;line-height:1.9;color:#e7c98e;background:rgba(0,0,0,.22);border-left:3px solid #c8452f;padding:8px 16px;border-radius:4px}
    .panel{font-size:${Q==='pc'?13.5:12}px;line-height:1.9;background:rgba(0,0,0,.32);border:1px solid rgba(255,210,140,.35);border-radius:12px;padding:13px 18px;margin-bottom:20px}
    button{border:none;background:linear-gradient(180deg,#d23b2c,#9c2318);color:#fff;font-size:20px;letter-spacing:6px;padding:13px 50px;border-radius:40px;box-shadow:0 8px 26px rgba(0,0,0,.5);cursor:pointer;margin:6px}
    button.ghost{background:linear-gradient(180deg,#555b66,#33373f);letter-spacing:3px;font-size:16px;padding:10px 30px}
    .tip{margin-top:14px;font-size:12px;opacity:.6} .tip a,.gh{color:#ffd77a}
    .tb{position:fixed;width:78px;height:78px;border-radius:50%;background:rgba(255,255,255,.10);border:2px solid rgba(255,255,255,.35);display:none;align-items:center;justify-content:center;color:#fff;font-size:22px;pointer-events:auto;z-index:6}
    .tb.sm{width:60px;height:60px;font-size:17px}.tb.ps{width:46px;height:46px;font-size:16px;top:12px;right:14px}
    #btnFire{right:26px;bottom:118px} #btnAim{right:104px;bottom:210px}
    #btnJump{right:118px;bottom:54px} #btnGre{right:26px;bottom:214px} #btnSwap{right:96px;bottom:286px}
    #btnUse{left:176px;bottom:64px;font-size:16px;background:rgba(210,60,44,.28);opacity:0;pointer-events:none;transition:opacity .15s}
    #stick{position:fixed;left:34px;bottom:56px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.3);display:none;z-index:6}
    #knob{position:absolute;left:38px;top:38px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.35)}
    body.mobile .tb{display:flex} body.mobile #stick{display:block}
    @media (pointer:coarse){body.pc .tb:not(.ps){display:none}}
  `;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

  function drawFlag(cv, text) {
    const x = cv.getContext('2d'); x.fillStyle = '#de141a'; x.fillRect(0, 0, 54, 36); x.fillStyle = '#ffee46';
    const star = (cx, cy, r, rot = 0) => { x.save(); x.translate(cx, cy); x.rotate(rot); x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); x.restore(); };
    star(9, 9, 5.2); [[10, 2], [12, 4], [12, 7], [10, 9]].forEach(p => star(p[0] * 1.8, p[1] * 2, 1.9, Math.atan2(9 - p[1] * 2, 9 - p[0] * 1.8) + Math.PI / 2));
    if (text) { x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText('八一', 27, 24); }
  }
  drawFlag($('fl1'), false); drawFlag($('fl2'), true);

  const W = buildWorld(Q, { ground: true, theme: S.theme });
  const { scene, camera, cfg } = W;
  const OBJ = new THREE.Vector3(S.obj.x, 0, S.obj.z); OBJ.y = groundH(OBJ.x, OBJ.z);
  if (S.ice) { const ice = makeIceLake(S.ice.r); ice.position.set(S.ice.x, groundH(S.ice.x, S.ice.z) + .12, S.ice.z); scene.add(ice); }

  /* ---------- 音效 ---------- */
  let actx = null;
  function noiseShot(freq = 1500, vol = .16, dur = .12) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, n = actx.sampleRate * dur, buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
      const src = actx.createBufferSource(); src.buffer = buf; const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
      const g = actx.createGain(); g.gain.value = vol; src.connect(f).connect(g).connect(actx.destination); src.start();
    } catch (e) { }
  }
  const sndGun = () => noiseShot(1500, .16, .12);
  function sndBugle() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = [392, 523, 659, 523, 659, 784, 659, 523, 392, 523, 659, 784];
      notes.forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f;
        const st = actx.currentTime + i * .26; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(.22, st + .03); g.gain.setValueAtTime(.22, st + .22); g.gain.linearRampToValueAtTime(0, st + .26);
        o.connect(g).connect(actx.destination); o.start(st); o.stop(st + .28); });
    } catch (e) { }
  }

  /* ---------- 武器 ---------- */
  const WPN = [
    { name: '莫辛-纳甘步枪', mag: 5, auto: false, cd: .85, adsFov: 28, spread: .002, reach: 700, gun: 'sniper' },
    { name: 'AKM', mag: 100, auto: true, cd: .105, adsFov: 52, spread: .016, reach: 320, gun: 'akm' },
    { name: '大刀', melee: true, cd: .5, reach: 2.8, dmg: 100 },
    { name: '拳头', melee: true, cd: .42, reach: 2.1, dmg: 34 },
  ];
  let wpn = 0, mag = [5, 100, 0, 0], grenades = 1, fireCd = 0, ads = 0, wantAds = false, firing = false, dead = false, win = false, paused = false, started = false, inVeh = null;
  const viewGuns = WPN.map(w => { const g = makeViewGun(w.gun); g.visible = false; camera.add(g); return g; });
  const greView = makeViewGun('grenade'); greView.visible = false; greView.scale.setScalar(1.5); camera.add(greView);
  setWpn(0);
  const muzzleWorld = new THREE.Vector3();

  /* ---------- 玩家 ---------- */
  const pos = new THREE.Vector3(S.spawn.x, groundH(S.spawn.x, S.spawn.z), S.spawn.z);
  let yaw = 0, pitch = -.05, vy = 0, onGround = true, hp = 100, moveT = 0, recoil = 0, shake = 0;
  camera.position.set(pos.x, pos.y + 1.62, pos.z);

  /* ---------- 士兵 ---------- */
  function hashSpread(i) { const n = Math.sin(i * 91.7 + S.id * 13) * 43758.5; return n - Math.floor(n); }
  function enemyPos(i) {
    const r1 = hashSpread(i), r2 = hashSpread(i + 50);
    if (S.key === 'songgok') { const a = (r1 - .5) * 1.7; const rr = 120 + r2 * 180; return { x: OBJ.x + Math.sin(a) * rr * .8, z: OBJ.z + rr }; }
    if (S.key === 'trench') { const a = r1 * Math.PI * 2, rr = 6 + r2 * 42; return { x: OBJ.x + Math.cos(a) * rr + (r2 - .5) * 14, z: OBJ.z + Math.sin(a) * rr * .85 }; }
    if (S.key === 'chosin') { const a = r1 * Math.PI * 2, rr = 12 + r2 * 92; return { x: OBJ.x + Math.cos(a) * rr + (r2 - .5) * 20, z: OBJ.z + Math.sin(a) * rr * .8 }; }
    const a = r1 * Math.PI * 2, rr = 18 + r2 * 70; return { x: OBJ.x + Math.cos(a) * rr + (r2 - .5) * 30, z: OBJ.z + Math.sin(a) * rr * .7 };
  }
  function makeBar(color) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 10;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
    sp.scale.set(.7, .11, 1); sp.userData = { color, cv, last: -1 }; scene.add(sp); return sp;
  }
  function drawBar(sp, ratio) {
    const x = sp.userData.cv.getContext('2d'); x.clearRect(0, 0, 64, 10);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 0, 64, 10); x.fillStyle = sp.userData.color; x.fillRect(1, 1, 62 * Math.max(0, ratio), 8);
    sp.material.map.needsUpdate = true;
  }
  function makeUnit(team, x, z) {
    const root = makeSoldier(team); root.position.set(x, groundH(x, z), z); scene.add(root);
    return { team, root, hp: 100, deadT: -1, held: false, fireCd: Math.random() * 2, phase: Math.random() * 6, yaw: 0,
      bar: makeBar(team === 'us' ? '#e0443a' : '#4a90e2'), home: new THREE.Vector3(x, 0, z) };
  }
  const units = [];
  for (let i = 0; i < NE; i++) { const p = enemyPos(i); units.push(makeUnit('us', p.x, p.z)); }
  for (let i = 0; i < NA; i++) units.push(makeUnit('vol', S.spawn.x - 10 + i * 4 + (i % 2 ? 3 : -3), S.spawn.z - 16 - i * 2));
  for (let w = 0; w < WAVES; w++) for (let k = 0; k < WSZ; k++) { const u = makeUnit('us', S.spawn.x, S.spawn.z + 400); u.held = true; u.root.visible = false; u.bar.visible = false; u._wave = w + 1; units.push(u); }
  units.forEach((u, i) => u.idx = i);

  const bTex = blobTex(), blobs = [];
  if (!cfg.shadows) for (let i = 0; i < TOTAL + NA; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: bTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); blobs.push(m); }
  const blTex = bloodTex(), decals = [];
  function addDecal(x, z) {
    if (decals.length > 36) { scene.remove(decals.shift()); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: blTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 3; m.position.set(x, groundH(x, z) + .05, z); scene.add(m); decals.push(m);
  }

  /* ---------- 沙袋 / 阵地 ---------- */
  const sandM = new THREE.MeshLambertMaterial({ color: 0x7a6c52 });
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(2.2, .55, 6, 12, Math.PI * 1.4), sandM);
    const a = i / 6 * Math.PI * 2, px = OBJ.x + Math.cos(a) * 30, pz = OBJ.z + Math.sin(a) * 30;
    t.position.set(px, groundH(px, pz) + .4, pz); t.rotation.x = Math.PI / 2; t.rotation.z = -a; scene.add(t);
  }
  const emplacements = [];
  for (let i = 0; i < S.mg; i++) { const e = makeGunEmplacement('mg'); const a = i / S.mg * Math.PI * 2, px = OBJ.x + Math.cos(a) * (S.key === 'trench' ? 14 : 34), pz = OBJ.z + Math.sin(a) * (S.key === 'trench' ? 14 : 34); e.position.set(px, groundH(px, pz), pz); e.rotation.y = -a; scene.add(e); emplacements.push(e); }
  for (let i = 0; i < (S.mortar || 0); i++) { const e = makeGunEmplacement('mortar'); const px = OBJ.x + (i ? 26 : -26), pz = OBJ.z + 18; e.position.set(px, groundH(px, pz), pz); e.rotation.y = Math.PI; scene.add(e); emplacements.push(e); }

  /* ---------- 载具 ---------- */
  const vehicles = [];
  function addVehicle(type, team, x, z) { const g = type === 'truck' ? makeTruck() : makeTank(team); g.position.set(x, groundH(x, z), z); g.rotation.y = 0; scene.add(g); const v = { type, team, g, hp: type === 'tank' ? 100 : 60, alive: true, yaw: 0, speed: 0, fireCd: 0, aiCd: 2 + Math.random() * 2 }; vehicles.push(v); return v; }
  addVehicle('truck', 'vol', S.spawn.x + 8, S.spawn.z + 6);
  let enemyTank = null; if (S.tank) enemyTank = addVehicle('tank', 'us', OBJ.x, OBJ.z + 46);

  /* ---------- 补给 / 医疗 / 地雷 ---------- */
  const crates = [];
  for (let i = 0; i < S.crates; i++) { const kind = i % 2 ? 'med' : 'ammo'; const c = makeCrate(kind); const x = S.spawn.x + (i - S.crates / 2) * 5, z = S.spawn.z + 4 + (i % 2) * 4; c.position.set(x, groundH(x, z), z); scene.add(c); crates.push({ g: c, kind, taken: false }); }
  let tent = null;
  if (S.tent) { tent = makeMedTent(); const tx = S.spawn.x - 16, tz = S.spawn.z + 14; tent.position.set(tx, groundH(tx, tz), tz); scene.add(tent); }
  const mines = [];
  for (let i = 0; i < S.mines; i++) { const m = makeMine(); const a = hashSpread(i + 90) * Math.PI * 2, rr = 40 + hashSpread(i + 30) * (S.key === 'trench' ? 30 : 80); const x = OBJ.x + Math.cos(a) * rr, z = OBJ.z + 60 + Math.sin(a) * rr * .7; m.position.set(x, groundH(x, z) + .02, z); scene.add(m); mines.push({ g: m, x, z, live: true }); }

  /* 胜利红旗（目标点，初始放倒） */
  const flagG = makeRedFlag(); flagG.position.copy(OBJ); flagG.scale.y = .001; flagG.visible = false; scene.add(flagG);

  /* ---------- 曳光 / 血雾 / 手雷 ---------- */
  const tracers = [], tracerGeo = new THREE.BoxGeometry(.05, .05, 1);
  function tracer(a, b, foe) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: foe ? 0xff6a4a : 0xffe09a, transparent: true, opacity: .95, blending: THREE.AdditiveBlending }));
    m.position.copy(a).add(b).multiplyScalar(.5); m.lookAt(b); m.scale.z = a.distanceTo(b); scene.add(m); tracers.push({ m, life: .09 });
  }
  const puffs = [];
  function puff(p, color) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, color], [1, 'rgba(120,10,10,0)']]), transparent: true, depthWrite: false })); s.position.copy(p); s.scale.setScalar(.6); scene.add(s); puffs.push({ s, life: .5 }); }
  function dust(p) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(150,132,104,.8)'], [1, 'rgba(150,132,104,0)']]), transparent: true, depthWrite: false })); s.position.set(p.x, p.y + .2, p.z); s.scale.setScalar(.5); scene.add(s); puffs.push({ s, life: .35 }); }
  const nades = [];
  const arcDots = []; for (let i = 0; i < 22; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0 })); scene.add(d); arcDots.push(d); }
  let greCharge = 0, greHeld = false;

  /* ---------- 炮击/轰炸预警（红圈标记） ---------- */
  const ringPool = []; for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.9, 1.4, 28), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.visible = false; scene.add(r); ringPool.push(r); }
  const strikes = [];
  function warnStrike(x, z, delay, rad, text) {
    const ring = ringPool.find(r => !r.visible); if (ring) { ring.visible = true; ring.position.set(x, groundH(x, z) + .15, z); ring.userData.t = 0; ring.userData.rad = rad; }
    strikes.push({ x, z, t: delay, rad, text: text || '' });
    if (text) { const w = $('warn'); w.textContent = text; w.style.opacity = 1; setTimeout(() => { if (!strikes.some(s => s.text)) w.style.opacity = 0; }, 1800); }
  }
  function explodeAt(x, z, rad, dmg) {
    const p = new THREE.Vector3(x, groundH(x, z) + 1.1, z); W.boom(p, 2.1); noiseShot(500, .28, .4); shake = Math.max(shake, .6);
    for (const u of units) { if (u.held || u.deadT >= 0) continue; const d = Math.hypot(u.root.position.x - x, u.root.position.z - z); if (d < rad) dmgUnit(u, Math.round(dmg * (1 - d / rad)), 'body', true); }
    const dp = Math.hypot(pos.x - x, pos.z - z); if (dp < rad) damage(Math.round(dmg * .75 * (1 - dp / rad)));
    for (const v of vehicles) { if (!v.alive) continue; const d = Math.hypot(v.g.position.x - x, v.g.position.z - z); if (d < rad + 2) { v.hp -= dmg * (1 - Math.min(1, d / (rad + 2))); if (v.hp <= 0) killVehicle(v); } }
    for (const m of mines) { if (m.live && Math.hypot(m.x - x, m.z - z) < 6) detonate(m); }
  }

  /* ---------- 播报 / 受伤 ---------- */
  function addFeed(t) { const el = $('feed'), d = document.createElement('div'); d.textContent = t; el.appendChild(d); while (el.children.length > 5) el.removeChild(el.firstChild); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 1000); }, 4600); }
  function flash(t) { const b = $('banner'); b.textContent = t; b.style.opacity = 1; clearTimeout(flash._t); flash._t = setTimeout(() => b.style.opacity = 0, 1900); }
  function hitMark() { const h = $('hit'); h.style.opacity = 1; clearTimeout(hitMark._t); hitMark._t = setTimeout(() => h.style.opacity = 0, 90); }
  let vig = 0; function damage(n) { if (dead) return; hp -= n; vig = 1; shake = Math.max(shake, .25); if (hp <= 0) { hp = 0; die(); } }

  /* ---------- 命中 ---------- */
  function raySphere(ro, rd, c, r) { const oc = ro.clone().sub(c), b = oc.dot(rd), cc = oc.dot(oc) - r * r, disc = b * b - cc; if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t >= 0 ? t : null; }
  const headV = new THREE.Vector3(), chestV = new THREE.Vector3(), legV = new THREE.Vector3();
  function fireHitscan() {
    const w = WPN[wpn], ro = camera.getWorldPosition(new THREE.Vector3()); camera.getWorldDirection(muzzleWorld);
    const dir = muzzleWorld.clone(); const sp2 = w.spread * (ads > .6 ? .4 : 1);
    dir.x += (Math.random() - .5) * sp2; dir.y += (Math.random() - .5) * sp2; dir.normalize();
    let best = null, bestT = w.reach;
    for (const u of units) {
      if (u.held || u.team !== 'us' || u.deadT >= 0) continue;
      u.root.userData.rig.headG.getWorldPosition(headV); chestV.copy(u.root.position); chestV.y += 1.22; legV.copy(u.root.position); legV.y += .55;
      const th = raySphere(ro, dir, headV, .19), tb = raySphere(ro, dir, chestV, .42), tl = raySphere(ro, dir, legV, .4);
      if (th !== null && th < bestT) { bestT = th; best = { u, part: 'head' }; }
      if (tb !== null && tb < bestT) { bestT = tb; best = { u, part: 'body' }; }
      if (tl !== null && tl < bestT) { bestT = tl; best = { u, part: 'leg' }; }
    }
    // 载具命中
    let vhit = null, vhitT = bestT;
    for (const v of vehicles) { if (!v.alive) continue; const c = v.g.position.clone(); c.y += 1.1; const t = raySphere(ro, dir, c, v.type === 'tank' ? 2.4 : 2.2); if (t !== null && t < vhitT) { vhitT = t; vhit = v; } }
    // 地雷可被射击引爆
    let mhit = null, mhitT = bestT;
    for (const m of mines) { if (!m.live) continue; const c = new THREE.Vector3(m.x, groundH(m.x, m.z) + .2, m.z); const t = raySphere(ro, dir, c, .35); if (t !== null && t < mhitT) { mhitT = t; mhit = m; } }
    const mz = ro.clone().addScaledVector(dir, .9);
    let end = ro.clone().addScaledVector(dir, w.reach);
    if (best) end.copy(ro).addScaledVector(dir, bestT);
    else if (vhit) end.copy(ro).addScaledVector(dir, vhitT);
    else if (mhit) end.copy(ro).addScaledVector(dir, mhitT);
    else for (let s = 2; s < w.reach; s += 3) { const p = ro.clone().addScaledVector(dir, s); if (p.y < groundH(p.x, p.z)) { end = p; dust(p); break; } }
    tracer(mz, end, false);
    const muzzleP = camera.localToWorld(new THREE.Vector3(0, 0, -1)); W.flashLight(muzzleP, 0xffc58a, 1.4, 13, .07);
    if (best) { const u = best.u; const dmg = wpn === 0 ? (best.part === 'head' ? 100 : best.part === 'body' ? 55 : 36) : (best.part === 'head' ? 108 : best.part === 'body' ? 36 : 22); dmgUnit(u, dmg, best.part, true); hitMark(); puff(end, best.part === 'head' ? 'rgba(150,20,20,.9)' : 'rgba(130,30,30,.7)'); }
    else if (vhit) { vhit.hp -= wpn === 0 ? 26 : 9; hitMark(); addFeed(vhit.type === 'tank' ? '命中坦克装甲' : '命中军车'); if (vhit.hp <= 0) killVehicle(vhit); }
    else if (mhit) { detonate(mhit); }
  }
  function melee() {
    const w = WPN[wpn], ro = camera.getWorldPosition(new THREE.Vector3()); camera.getWorldDirection(muzzleWorld);
    for (const u of units) { if (u.held || u.team !== 'us' || u.deadT >= 0) continue; chestV.copy(u.root.position); chestV.y += 1.2; if (ro.distanceTo(chestV) < w.reach && muzzleWorld.dot(chestV.clone().sub(ro).normalize()) > .6) { dmgUnit(u, w.dmg, 'body', true); hitMark(); return; } }
  }
  function dmgUnit(u, n, part, byPlayer) {
    if (u.held || u.deadT >= 0) return;
    u.hp -= n;
    if (u.hp <= 0) {
      u.deadT = 0; u.root.userData.face = Math.random() < .5 ? 1 : -1; u.bar.visible = false; addDecal(u.root.position.x, u.root.position.z);
      W.boom(u.root.position.clone().setY(u.root.position.y + 1.1), .8);
      if (byPlayer) addFeed(`${part === 'head' ? '爆头' : '击毙'}${u.team === 'us' ? '美军士兵' : '战友'}`);
      else if (u.team === 'us') addFeed('战友击毙美军士兵');
    }
  }
  function killVehicle(v) {
    if (!v.alive) return; v.alive = false; v.hp = 0; v.speed = 0;
    W.boom(v.g.position.clone().setY(v.g.position.y + 1.2), 2.6); noiseShot(400, .3, .5); shake = Math.max(shake, .7);
    v.g.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(.32); } });
    addFeed(v.type === 'tank' ? (v.team === 'us' ? '敌坦克被击毁' : '坦克被摧毁') : '军车被摧毁');
    if (inVeh === v) { ejectVehicle(true); }
  }

  /* ---------- 手雷 / 地雷 ---------- */
  function throwGrenade(power) {
    if (grenades <= 0) { flash('手雷已用尽'); return; }
    grenades--;
    const ro = camera.getWorldPosition(new THREE.Vector3()); camera.getWorldDirection(muzzleWorld);
    const g = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3f4637 })); g.position.copy(ro); scene.add(g);
    nades.push({ m: g, v: muzzleWorld.clone().multiplyScalar(8 + power * 20).add(new THREE.Vector3(0, 5 + power * 5, 0)), t: 2.4 });
    addFeed('投出手雷');
  }
  function explode(p) {
    W.boom(p, 1.8); noiseShot(500, .22, .3);
    for (const u of units) { if (u.held || u.deadT >= 0) continue; const d = Math.hypot(u.root.position.x - p.x, u.root.position.z - p.z); if (d < 7) dmgUnit(u, Math.round(110 * (1 - d / 7)), 'body', true); }
    const dp = Math.hypot(pos.x - p.x, pos.z - p.z); if (dp < 7) damage(Math.round(70 * (1 - dp / 7)));
    for (const v of vehicles) { if (v.alive) { const d = Math.hypot(v.g.position.x - p.x, v.g.position.z - p.z); if (d < 8) { v.hp -= 60 * (1 - d / 8); if (v.hp <= 0) killVehicle(v); } } }
    for (const m of mines) { if (m.live && Math.hypot(m.x - p.x, m.z - p.z) < 6) detonate(m); }
  }
  function detonate(m) { if (!m.live) return; m.live = false; scene.remove(m.g); explodeAt(m.x, m.z, 6.5, 95); }

  /* ---------- 交互（上车/拾取） ---------- */
  function nearestInteract() {
    if (dead || win) return null;
    for (const v of vehicles) {
      if (!v.alive) continue;
      const d = Math.hypot(v.g.position.x - pos.x, v.g.position.z - pos.z);
      if (d < 4.2) {
        if (v === inVeh) return { kind: 'leave', v, label: '下车' };
        if (v.type === 'tank' && v.team === 'us') return { kind: 'take', v, label: '抢占敌坦克（击毙乘员）' };
        return { kind: 'enter', v, label: v.type === 'tank' ? '登上坦克' : '驾驶军车' };
      }
    }
    for (const c of crates) { if (!c.taken) { const g = c.g.position; const d = Math.hypot(g.x - pos.x, g.z - pos.z); if (d < 2.6) return { kind: 'crate', c, label: c.kind === 'ammo' ? '拾取弹药 · 手雷' : '使用急救包' }; } }
    return null;
  }
  function enterVehicle(v) {
    inVeh = v; if (v.team === 'us') v.team = 'vol';
    v.speed = 0; vy = 0; viewGuns.forEach(g => g.visible = false); greView.visible = false; $('cross').style.opacity = .7;
    addFeed(v.type === 'tank' ? '已进入坦克 · 火 键开炮' : '已驾驶军车');
  }
  function ejectVehicle(forced) {
    if (!inVeh) return; const v = inVeh; inVeh = null; v.speed = 0;
    pos.set(v.g.position.x + Math.cos(yaw) * 3.2, 0, v.g.position.z - Math.sin(yaw) * 3.2); pos.y = groundH(pos.x, pos.z);
    setWpn(wpn); if (forced) damage(25); $('cross').style.opacity = .9;
  }
  function doInteract(act) {
    if (inVeh && (!act || act.kind === 'leave')) { ejectVehicle(false); return; }
    if (!act) return;
    if (act.kind === 'enter' || act.kind === 'take') enterVehicle(act.v);
    else if (act.kind === 'crate') {
      const c = act.c; c.taken = true; scene.remove(c.g);
      if (c.kind === 'ammo') { mag[0] = 5; mag[1] = 100; grenades = Math.min(3, grenades + 1); addFeed('补给：步枪/AKM 压满 · 手雷 +1'); flash('弹药已补充'); }
      else { hp = 100; addFeed('急救包：生命恢复'); flash('伤口已包扎'); }
    }
  }

  /* ---------- 输入 ---------- */
  const keys = {};
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') { if (!inVeh) tryJump(); e.preventDefault(); }
    if (e.code === 'Digit1') setWpn(0); if (e.code === 'Digit2') setWpn(1); if (e.code === 'Digit3') setWpn(2); if (e.code === 'Digit0') setWpn(3);
    if (e.code === 'KeyE' || e.code === 'KeyF') doInteract(nearestInteract());
    if (e.code === 'KeyM' && !greHeld && !inVeh) { greHeld = true; greCharge = 0; }
    if (e.code === 'KeyP') togglePause();
  });
  addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyM' && greHeld) { greHeld = false; throwGrenade(greCharge); greCharge = 0; } });
  document.addEventListener('mousedown', e => { if (document.pointerLockElement !== cvEl) return; if (e.button === 0) firing = true; if (e.button === 2) wantAds = true; });
  addEventListener('mouseup', e => { if (e.button === 0) firing = false; if (e.button === 2) wantAds = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('mousemove', e => { if (document.pointerLockElement === cvEl) { yaw -= e.movementX * .0023 * (ads > .6 ? .7 : 1); pitch -= e.movementY * .0021 * (ads > .6 ? .7 : 1); } });
  const cvEl = W.renderer.domElement;
  cvEl.addEventListener('click', () => { if (Q === 'pc' && started && !paused && !dead) cvEl.requestPointerLock?.(); });

  let mvX = 0, mvY = 0, lookDX = 0, lookDY = 0, sId = null, lId = null, lx = 0, ly = 0;
  const stick = $('stick'), knob = $('knob');
  function sp(t) { const r = stick.getBoundingClientRect(); return { x: t.clientX - r.left - r.width / 2, y: t.clientY - r.top - r.height / 2 }; }
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * .42 && sId === null && t.clientY > innerHeight - 300) { sId = t.identifier; const p = sp(t); mvX = Math.max(-1, Math.min(1, p.x / 44)); mvY = Math.max(-1, Math.min(1, -p.y / 44)); knob.style.transform = `translate(${p.x}px,${p.y}px)`; }
      else if (t.clientY > innerHeight - 340 && t.clientX > innerWidth - 320) { /* 按钮 */ }
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
  hold('btnGre', () => { if (!inVeh) { greHeld = true; greCharge = 0; } }, () => { if (greHeld) { greHeld = false; throwGrenade(greCharge); greCharge = 0; } });
  $('btnJump').addEventListener('touchstart', e => { e.preventDefault(); if (!inVeh) tryJump(); }, { passive: false });
  $('btnSwap').addEventListener('touchstart', e => { e.preventDefault(); if (!inVeh) setWpn((wpn + 1) % 4); }, { passive: false });
  $('btnUse').addEventListener('touchstart', e => { e.preventDefault(); doInteract(nearestInteract()); }, { passive: false });
  $('btnPause').addEventListener('touchstart', e => { e.preventDefault(); togglePause(); }, { passive: false });
  $('btnPause').addEventListener('click', togglePause);

  function setWpn(i) { if (inVeh) return; if (wpn === i) return; wpn = i; viewGuns.forEach((g, k) => g.visible = k === i); greView.visible = false; firing = false; }
  function tryJump() { if (onGround) { vy = 5.4; onGround = false; } }
  function togglePause() { if (!started || dead || win) return; paused = !paused; $('po').style.display = paused ? 'flex' : 'none'; if (!paused) lastT = performance.now(); }

  /* ---------- 流程 ---------- */
  let bearer = null, flagT = 0, wavesLeft = WAVES;
  function die() {
    dead = true; W.boom(new THREE.Vector3(pos.x, pos.y + 1.4, pos.z), 1.6);
    setTimeout(() => { $('endT').textContent = '你 已 牺 牲'; $('endP').innerHTML = '青山处处埋忠骨，何须马革裹尸还。<br>调整战术，再次冲锋。'; $('end').style.display = 'flex'; }, 700);
  }
  function victory() {
    win = true; sndBugle(); flash('冲锋号响 · 占领阵地');
    bearer = units.filter(u => u.team === 'vol' && u.deadT < 0 && !u.held).sort((a, b) => Math.hypot(a.root.position.x - OBJ.x, a.root.position.z - OBJ.z) - Math.hypot(b.root.position.x - OBJ.x, b.root.position.z - OBJ.z))[0] || null;
    flagT = 0;
    setTimeout(() => { $('endT').textContent = '胜 利'; $('endT').style.color = '#ffd77a'; $('endP').innerHTML = '班长/战友把五星红旗插上敌人阵地。<br>这一战，我们替先辈守住了山河。'; $('end').style.display = 'flex'; }, 4200);
  }
  $('go').addEventListener('click', () => { try { (actx = actx || new (window.AudioContext || window.webkitAudioContext)()).resume(); } catch (e) { } $('ov').style.display = 'none'; started = true; lastT = performance.now(); flash(S.objFar ? '夺 取 前 方 阵 地' : '人 在 阵 地 在'); });
  $('resume').addEventListener('click', togglePause);
  $('restart').addEventListener('click', () => location.reload());
  $('again').addEventListener('click', () => location.reload());
  document.addEventListener('visibilitychange', () => { if (document.hidden && started && !paused && !dead) togglePause(); });
  if (location.search.includes('autostart')) { $('ov').style.display = 'none'; started = true; }

  /* ---------- 主循环 ---------- */
  let lastT = performance.now();
  let airT = 12, mortT = 6;
  const FWD0 = new THREE.Vector3(), RIGHT0 = new THREE.Vector3(), wish = new THREE.Vector3();
  const camBase = new THREE.Vector3();

  function usAlive() { let n = 0; for (const u of units) if (u.team === 'us' && !u.held && u.deadT < 0) n++; if (enemyTank && enemyTank.alive) n++; return n; }
  function alliesAlive() { return units.filter(u => u.team === 'vol' && !u.held && u.deadT < 0).length; }

  W.setUpdate(dt => {
    if (!started || paused) { W.followLight(pos.x, pos.y + 2, pos.z); return; }

    /* 波次增援（松骨峰） */
    if (WAVES && !win && !dead) {
      const fieldUs = units.filter(u => u.team === 'us' && !u.held && u.deadT < 0).length;
      if (fieldUs <= 3 && wavesLeft > 0) {
        const wnum = WAVES - wavesLeft + 1;
        for (const u of units) if (u.held && u._wave === wnum) { u.held = false; u.root.visible = true; u.bar.visible = true; const a = Math.random() * Math.PI, rr = 150 + Math.random() * 120; u.root.position.set(OBJ.x + Math.sin(a) * rr * .8, groundH(0, 0), OBJ.z + rr); u.root.position.y = groundH(u.root.position.x, u.root.position.z); u.hp = 100; }
        wavesLeft--; flash('敌人新一轮增援到达'); addFeed(`第 ${wnum + 1} 波美军压上来了`);
      }
    }

    /* 视角 */
    yaw -= lookDX * .006 * (ads > .6 ? .7 : 1); pitch -= lookDY * .0055 * (ads > .6 ? .7 : 1); lookDX = lookDY = 0;
    pitch = Math.max(-1.42, Math.min(1.42, pitch));
    const wantAim = wantAds && !inVeh && (wpn === 0 || wpn === 1);
    ads += ((wantAim ? 1 : 0) - ads) * Math.min(1, dt * 12);
    const targetFov = (!inVeh && (wpn === 0 || wpn === 1)) ? (72 + (WPN[wpn].adsFov - 72) * ads) : (inVeh && inVeh.type === 'tank' ? 60 : 72);
    if (Math.abs(camera.fov - targetFov) > .1) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 12); camera.updateProjectionMatrix(); }

    if (inVeh) {
      /* ===== 驾驶 ===== */
      const v = inVeh; v.yaw = yaw; v.g.rotation.y = yaw;
      yaw -= mvX * 1.7 * dt;          // 手机：左摇杆左右转向
      let thr = 0;
      if (keys.KeyW) thr += 1; if (keys.KeyS) thr -= 1; thr += -mvY;
      const maxv = v.type === 'tank' ? 8.5 : 15;
      v.speed += (thr * maxv - v.speed) * Math.min(1, dt * 2.2);
      FWD0.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      v.g.position.x += FWD0.x * v.speed * dt; v.g.position.z += FWD0.z * v.speed * dt;
      v.g.position.x = Math.max(-2600, Math.min(2600, v.g.position.x)); v.g.position.z = Math.max(-1200, Math.min(1300, v.g.position.z));
      v.g.position.y = groundH(v.g.position.x, v.g.position.z);
      if (v.type === 'tank' && v.g.userData.turret) v.g.userData.turret.rotation.y = 0;
      for (const t of v.g.userData.wheels || []) t.rotation.x += v.speed * dt / .52;
      pos.set(v.g.position.x, v.g.position.y, v.g.position.z);
      camBase.copy(v.g.position).add(v.g.userData.seat.clone().applyEuler(new THREE.Euler(0, yaw, 0)));
      camera.position.set(camBase.x, camBase.y, camBase.z);
      camera.rotation.order = 'YXZ'; camera.rotation.set(pitch * .4, yaw, 0);
      // 坦克开炮
      v.fireCd -= dt;
      if (firing && v.type === 'tank' && v.fireCd <= 0) {
        v.fireCd = 1.7; noiseShot(300, .34, .5); recoil = .12; shake = Math.max(shake, .35);
        FWD0.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        const sx = v.g.position.x + FWD0.x * 3, sz = v.g.position.z + FWD0.z * 3;
        let tx = sx + FWD0.x * 150, tz = sz + FWD0.z * 150;
        for (let d = 12; d < 220; d += 4) { const px = v.g.position.x + FWD0.x * d, pz = v.g.position.z + FWD0.z * d, py = v.g.position.y + 2.0; if (groundH(px, pz) > py) { tx = px; tz = pz; break; } }
        tracer(new THREE.Vector3(sx, v.g.position.y + 2, sz), new THREE.Vector3(tx, groundH(tx, tz) + .5, tz), false);
        setTimeout(() => explodeAt(tx, tz, 8.5, 125), 160);
      }
    } else {
      /* ===== 步行 ===== */
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
      pos.x = Math.max(-2600, Math.min(2600, pos.x)); pos.z = Math.max(-1200, Math.min(1300, pos.z));
      for (const t of W.trees) { const dx = pos.x - t.x, dz = pos.z - t.z, d2 = dx * dx + dz * dz; if (d2 < t.r * t.r && pos.y < groundH(t.x, t.z) + 8) { const d = Math.sqrt(d2) || .01; pos.x = t.x + dx / d * t.r; pos.z = t.z + dz / d * t.r; } }
      for (const v of vehicles) { if (!v.alive) continue; const dx = pos.x - v.g.position.x, dz = pos.z - v.g.position.z, d2 = dx * dx + dz * dz; if (d2 < 5.2) { const d = Math.sqrt(d2) || .01; pos.x = v.g.position.x + dx / d * 2.4; pos.z = v.g.position.z + dz / d * 2.4; } }
      vy -= 15 * dt; pos.y += vy * dt;
      const gh = groundH(pos.x, pos.z);
      if (pos.y <= gh) { pos.y = gh; vy = 0; onGround = true; } else onGround = false;
      camera.position.set(pos.x, pos.y + 1.62, pos.z);
      camera.rotation.order = 'YXZ'; camera.rotation.set(pitch + recoil, yaw, 0);
      recoil = Math.max(0, recoil - dt * 3);
    }
    // 屏幕震动
    if (shake > 0) { shake = Math.max(0, shake - dt * 1.8); const s = shake * .5; camera.position.x += (Math.random() - .5) * s; camera.position.y += (Math.random() - .5) * s; camera.position.z += (Math.random() - .5) * s; }

    /* 武器（仅步行） */
    if (!inVeh) {
      fireCd -= dt; const w = WPN[wpn];
      if (firing && fireCd <= 0) {
        fireCd = w.cd;
        if (w.melee) { melee(); recoil = .04; }
        else if (mag[wpn] > 0) { mag[wpn]--; fireHitscan(); sndGun(); recoil = wpn === 0 ? .07 : .028; viewGuns[wpn].userData.flash.material.opacity = 1; }
        else flash('空仓 · 找弹药箱补给');
        if (!w.auto) firing = false;
      }
      viewGuns[wpn].userData.flash.material.opacity = Math.max(0, viewGuns[wpn].userData.flash.material.opacity - dt * 16);
      if (greHeld) greCharge = Math.min(1, greCharge + dt / 1.2);
      drawArc();
      viewGuns.forEach((g, k) => g.visible = (k === wpn && !greHeld));
      greView.visible = greHeld;
      const vg = greHeld ? greView : viewGuns[wpn];
      const bob = Math.sin(moveT) * .012 * Math.min(1, wish.length());
      vg.position.set(greHeld ? .05 : .26 - .26 * ads, greHeld ? -.18 : -.24 + .12 * ads + bob, greHeld ? -.5 : -.55 + recoil * .6);
      vg.rotation.set(bob * .6, 0, 0);
    }

    /* AI 士兵 */
    for (const u of units) {
      if (u.held) continue;
      if (u.deadT >= 0) { u.deadT += dt; poseSoldier(u.root, 0, 0, 0, u.deadT); if (!cfg.shadows && blobs[u.idx]) blobs[u.idx].visible = false; continue; }
      const enemy = u.team === 'us';
      let tgt = null, td = 1e9;
      if (enemy) { const dp = Math.hypot(pos.x - u.root.position.x, pos.z - u.root.position.z); if (dp < 260) { td = dp; tgt = { x: pos.x, y: (inVeh ? pos.y + 1.6 : pos.y + 1.5), z: pos.z, isPlayer: true }; } }
      for (const o of units) { if (o.held || o.team === u.team || o.deadT >= 0) continue; const d = Math.hypot(o.root.position.x - u.root.position.x, o.root.position.z - u.root.position.z); if (d < (enemy ? 300 : 420) && d < td) { td = d; tgt = { x: o.root.position.x, y: o.root.position.y + 1.3, z: o.root.position.z, unit: o }; } }
      let moving = 0, aimAmt = 0;
      if (tgt) {
        const dx = tgt.x - u.root.position.x, dz = tgt.z - u.root.position.z, dist = Math.hypot(dx, dz);
        u.yaw = Math.atan2(-dx, -dz);
        if (dist > (enemy ? 115 : 150)) { const sp2 = enemy ? 2.3 : 2.7; u.root.position.x += dx / dist * sp2 * dt; u.root.position.z += dz / dist * sp2 * dt; moving = 1; u.phase += dt * 7; }
        else { aimAmt = .7 + Math.random() * .3; u.phase += dt * 2; }
        u.fireCd -= dt;
        if (dist < (enemy ? 240 : 360) && u.fireCd <= 0) {
          u.fireCd = (enemy ? .7 : .6) + Math.random() * 1.3;
          tracer(new THREE.Vector3(u.root.position.x, u.root.position.y + 1.45, u.root.position.z), new THREE.Vector3(tgt.x + (Math.random() - .5) * 2.2, tgt.y + (Math.random() - .5) * 1.2, tgt.z + (Math.random() - .5) * 2.2), enemy); sndGun();
          if (Math.random() < (enemy ? .5 : .6)) { if (tgt.isPlayer) { if (dist < 200) damage(4 + Math.floor(Math.random() * 7)); } else dmgUnit(tgt.unit, enemy ? 22 : 30, 'body', false); }
        }
      } else if (!enemy) {
        const dx = OBJ.x - u.root.position.x, dz = OBJ.z - u.root.position.z, d = Math.hypot(dx, dz);
        if (d > 8) { u.root.position.x += dx / d * 2.4 * dt; u.root.position.z += dz / d * 2.4 * dt; u.yaw = Math.atan2(-dx, -dz); moving = 1; u.phase += dt * 7; }
      }
      u.root.position.y = groundH(u.root.position.x, u.root.position.z);
      u.root.rotation.y = u.yaw;
      poseSoldier(u.root, u.phase, moving, aimAmt, -1);
      u.bar.position.set(u.root.position.x, u.root.position.y + 2.05, u.root.position.z);
      if (Math.round(u.hp) !== u.bar.userData.last) { drawBar(u.bar, u.hp / 100); u.bar.userData.last = Math.round(u.hp); }
      if (!cfg.shadows) { const b = blobs[u.idx]; if (b) { b.visible = true; b.position.set(u.root.position.x, u.root.position.y + .04, u.root.position.z); } }
    }

    /* 敌方坦克 AI */
    if (enemyTank && enemyTank.alive && enemyTank.team === 'us' && !win) {
      const v = enemyTank, gp = v.g.position;
      const dx = pos.x - gp.x, dz = pos.z - gp.z, d = Math.hypot(dx, dz);
      if (d > 120 && d < 700) { gp.x += dx / d * 1.8 * dt; gp.z += dz / d * 1.8 * dt; }
      gp.y = groundH(gp.x, gp.z);
      v.yaw = Math.atan2(-dx, -dz); v.g.rotation.y = v.yaw;
      const ta = Math.atan2(-dx, -dz); if (v.g.userData.turret) v.g.userData.turret.rotation.y = ta - v.yaw;
      v.aiCd -= dt;
      if (d < 420 && v.aiCd <= 0) { v.aiCd = 4.2 + Math.random() * 2; warnStrike(pos.x + (Math.random() - .5) * 14, pos.z + (Math.random() - .5) * 14, 1.5, 7, '敌坦克开火 · 快躲避'); }
    }

    /* 迫击炮炮击 + 敌机轰炸 */
    const fightOn = !win && !dead;
    if (fightOn && S.mortar) { mortT -= dt; if (mortT <= 0) { mortT = 6.5 + Math.random() * 3; warnStrike(pos.x + (Math.random() - .5) * 70, pos.z + (Math.random() - .5) * 70, 2.6, 7, '敌炮弹来袭'); } }
    if (fightOn) { airT -= dt; if (airT <= 0) { airT = S.airGap + Math.random() * 8; const n = S.key === 'chosin' ? 1 : 2; for (let i = 0; i < n; i++) setTimeout(() => { if (!dead && !win) warnStrike(pos.x + 14 + (Math.random() - .5) * 50, pos.z - 6 + (Math.random() - .5) * 50, 2.2, 9, '敌机轰炸 · 快隐蔽'); }, i * 900); } }

    /* 预警圈更新 + 引爆 */
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i]; s.t -= dt;
      const ring = ringPool.find(r => r.visible && Math.abs(r.position.x - s.x) < .1 && Math.abs(r.position.z - s.z) < .1);
      if (ring) { const k = 1 + Math.sin(performance.now() * .02) * .25; ring.scale.setScalar(k * (s.rad / 1.4)); ring.material.opacity = .25 + .5 * (1 - s.t / 2.6); }
      if (s.t <= 0) { if (ring) ring.visible = false; explodeAt(s.x, s.z, s.rad, 100); strikes.splice(i, 1); }
    }

    /* 地雷接触 */
    if (!inVeh) for (const m of mines) { if (m.live && Math.hypot(m.x - pos.x, m.z - pos.z) < m.g.userData.radius) detonate(m); }

    /* 手雷 */
    for (let i = nades.length - 1; i >= 0; i--) {
      const g = nades[i]; g.t -= dt; g.v.y -= 13 * dt; g.m.position.addScaledVector(g.v, dt);
      const gy = groundH(g.m.position.x, g.m.position.z) + .12;
      if (g.m.position.y < gy) { g.m.position.y = gy; g.v.y *= -.35; g.v.x *= .6; g.v.z *= .6; }
      if (g.t <= 0) { explode(g.m.position.clone()); scene.remove(g.m); nades.splice(i, 1); }
    }
    for (let i = tracers.length - 1; i >= 0; i--) { const t = tracers[i]; t.life -= dt; t.m.material.opacity = Math.max(0, t.life / .09); if (t.life <= 0) { scene.remove(t.m); tracers.splice(i, 1); } }
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.life -= dt * 2; p.s.scale.multiplyScalar(1.05); p.s.material.opacity = Math.max(0, p.life); if (p.life <= 0) { scene.remove(p.s); puffs.splice(i, 1); } }

    /* 医疗帐篷范围回血 */
    if (tent && hp < 100) { const tp = tent.position; if (Math.hypot(tp.x - pos.x, tp.z - pos.z) < 7) { hp = Math.min(100, hp + 9 * dt); } }

    /* 胜利：旗手奔袭 + 升旗 */
    if (win) {
      if (bearer && bearer.deadT < 0) {
        const b = bearer.root, dx = OBJ.x - b.position.x, dz = OBJ.z - b.position.z, d = Math.hypot(dx, dz);
        if (d > 4) { b.position.x += dx / d * 4.2 * dt; b.position.z += dz / d * 4.2 * dt; b.position.y = groundH(b.position.x, b.position.z); b.rotation.y = Math.atan2(-dx, -dz); bearer.phase += dt * 8; poseSoldier(b, bearer.phase, 1, 0, -1); }
        else { bearer = null; }
      }
      flagT = Math.min(1, flagT + dt / 1.6);
      flagG.visible = true; flagG.scale.y = .001 + flagT * .999; flagG.position.y = OBJ.y;
      flagG.userData.flag.geometry.attributes.position.needsUpdate = true;
      const pa = flagG.userData.flag.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, x < -.68 ? 0 : Math.sin(performance.now() * .004 + x * 3) * .14); }
    }

    /* 胜负判定 */
    if (usAlive() === 0 && !win && !dead) victory();

    W.followLight(pos.x, pos.y + 2, pos.z);
    vig = Math.max(0, vig - dt * 1.6); $('vig').style.opacity = vig;

    /* 交互提示 / 手机车键 */
    const act = nearestInteract();
    $('prompt').style.opacity = act ? 1 : 0; if (act) $('prompt').textContent = (Q === 'pc' ? '[E/F] ' : '') + act.label;
    const useShow = (Q !== 'pc' && (act || inVeh));
    $('btnUse').style.opacity = useShow ? 1 : 0; $('btnUse').style.pointerEvents = useShow ? 'auto' : 'none'; $('btnUse').textContent = inVeh ? '下' : '车';

    /* HUD */
    const foeN = usAlive(), allN = alliesAlive();
    $('stats').innerHTML = `生命 <b>${Math.round(hp)}</b>　美军 <b>${foeN}</b>　战友 <b>${allN}</b>${inVeh ? `　${inVeh.type === 'tank' ? '坦克' : '军车'} <b>${Math.max(0, Math.round(inVeh.hp))}</b>` : ''}`;
    $('obj').textContent = win ? '' : (S.objFar ? `目标：夺取前方阵地 ${Math.round(Math.hypot(OBJ.x - pos.x, OBJ.z - pos.z))} m` : `目标：歼灭来犯美军 ${foeN} 人`);
    $('ammo').innerHTML = inVeh ? (inVeh.type === 'tank' ? `坦克主炮　${inVeh.fireCd > 0 ? '装填中' : '就绪'}` : '军车 · 无武器') : (wpn < 2 ? `${WPN[wpn].name} <b style="color:#ffd25e">${mag[wpn]}</b> 发<br>手雷 ${grenades}` : `${WPN[wpn].name}<br>手雷 ${grenades}`);
  });

  function drawArc() {
    if (!greHeld) { arcDots.forEach(d => d.material.opacity = 0); return; }
    const ro = camera.getWorldPosition(new THREE.Vector3()); camera.getWorldDirection(muzzleWorld);
    const v = muzzleWorld.clone().multiplyScalar(8 + greCharge * 20).add(new THREE.Vector3(0, 5 + greCharge * 5, 0));
    for (let i = 0; i < arcDots.length; i++) {
      const tt = i * .11; const p = ro.clone().addScaledVector(v, tt); p.y -= .5 * 13 * tt * tt;
      if (p.y < groundH(p.x, p.z)) arcDots[i].material.opacity = 0; else { arcDots[i].position.copy(p); arcDots[i].material.opacity = .9; }
    }
  }

  if (!location.search.includes('autostart')) setInterval(async () => {
    try { const v = (await (await fetch('version.txt?ts=' + Date.now(), { cache: 'no-store' })).text()).trim(); if (v && v !== BUILD && !$('#upd2')) { const a = document.createElement('a'); a.id = 'upd2'; a.href = 'javascript:location.reload()'; a.textContent = '发现新版本 ' + v; a.style.cssText = 'position:fixed;left:50%;top:60px;transform:translateX(-50%);z-index:30;background:#9c2318;color:#ffe9c0;padding:8px 18px;border-radius:20px;font-size:14px'; $('hud').appendChild(a); } } catch (e) { }
  }, 60000);
}
