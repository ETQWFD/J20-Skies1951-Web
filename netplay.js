// 长空·1951 网页联机（主机权威 · 并肩歼击美军）
// 传输：与页面同源的 WebSocket(/ws)，由 server.py 提供中继。GitHub Pages 无 /ws，须用局域网服务器。
import * as THREE from 'three';
import { buildWorld, groundH, makeSoldier, poseSoldier, makeViewGun, bloodTex, BUILD } from './core.js';
import { equipRealGuns } from './guns.js';

const $ = id => document.getElementById(id);
window.__errs = [];
addEventListener('error', e => { try { window.__errs.push(String(e.message) + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno + ':' + e.colno); } catch (_) {} });
addEventListener('unhandledrejection', e => { try { window.__errs.push('PROMISE ' + String(e.reason)); } catch (_) {} });
$('ver').textContent = BUILD + ' · 联机';
$('hosturl').textContent = location.host || '（需运行 server.py）';
const Q = (innerWidth > 820 && !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) ? 'pc' : 'mob';
document.body.className = Q;

const AI_N = 30;                 // 美军人数
const SPAWN = { x: 0, z: 40 };   // 志愿军出生点（向 -z 进攻）
const OBJ = { x: 0, z: -120 };   // 美军阵地

let ws = null, mySid = 0, isHost = false, inMatch = false, hostSid = 0;
let W = null, scene, camera, cv;
const players = new Map();       // sid -> {name, x,y,z,yaw,pitch, dead, target 插值}
const pmeshes = new Map();       // sid -> 士兵 mesh
let enemies = [];                // 30 个美军
let vg = null;                   // 第一人称持枪
let myName = '志愿军' + Math.floor(Math.random() * 900 + 100);
$('nm').value = myName;

/* ================= 音效（程序化） ================= */
let actx = null;
function ac() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return actx; }
function blip(f0, f1, dur, type = 'square', vol = .12) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, a.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
const sndShot = () => blip(820, 120, .14, 'square', .10);
const sndFar = () => blip(300, 70, .18, 'sawtooth', .045);
const sndHit = () => blip(1400, 900, .06, 'sine', .08);
const sndHurt = () => blip(160, 60, .22, 'sawtooth', .12);

/* ================= 连接 / 大厅 ================= */
function setStat(t, color) { const e = $('lstat'); e.textContent = t; if (color) e.style.color = color; }
function connect(role) {
  myName = ($('nm').value.trim() || myName).slice(0, 12);
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  if (!location.host) { setStat('请用 server.py 启动后，通过它给出的 http://局域网IP:端口/net.html 打开本页', '#ff8a7a'); return; }
  setStat('正在连接本机/局域网服务器…', '#d8b26a');
  try { ws = new WebSocket(url); } catch (e) { setStat('无法创建连接：' + e.message, '#ff8a7a'); return; }
  ws.onopen = () => setStat('已连接，' + (role === 'host' ? '正在创建房间…' : '正在加入房间…'), '#9fd0ff');
  ws.onclose = () => { setStat('与服务器断开（确认 server.py 正在运行、且与房主同一 Wi-Fi）', '#ff8a7a'); if (inMatch) backLobby('与服务器断开'); };
  ws.onerror = () => setStat('连接失败：本机/局域网没有联机服务器（GitHub Pages 不能联机，请运行 server.py）', '#ff8a7a');
  ws.onmessage = ev => { try { onNet(JSON.parse(ev.data), role); } catch (err) { window.__errs.push('ONMSG ' + (err && err.stack ? err.stack : err)); } };
}
$('bHost').onclick = () => connect('host');
$('bJoin').onclick = () => connect('join');
if (location.search.includes('autohost')) addEventListener('load', () => connect('host'));
if (location.search.includes('autojoin')) addEventListener('load', () => connect('join'));
window.__dbg = () => ({ nv: '1.9.7d', wsState: ws ? ws.readyState : null, mySid, isHost, hostSid, inMatch, errs: window.__errs,
  players: [...players.entries()].map(([id, p]) => ({ id, name: p.name, tx: p.tx, tz: p.tz, dead: p.dead })),
  enemies: enemies.length });

function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

function onNet(o, role) {
  let src = o.sid, m = o.d;
  if (m === undefined) { m = o; src = (m.t === 'sid') ? 0 : mySid; }
  switch (m.t) {
    case 'sid':
      mySid = m.sid;
      if (role === 'host') { isHost = true; send({ t: 'hostup', name: myName }); startMatch(); }
      else {
        send({ t: 'join', name: myName });
        clearTimeout(window._waitRoom);
        window._waitRoom = setTimeout(() => { if (!inMatch) setStat('没有找到房间：请让房主先点“创建房间”，并确认大家连的是同一台服务器', '#ff8a7a'); }, 3500);
      }
      break;
    case 'hostup':
      if (!isHost) { hostSid = src; players.set(src, { name: m.name, x: SPAWN.x, y: 0, z: SPAWN.z, yaw: 0, pitch: 0, dead: false }); }
      break;
    case 'join': {
      const known = players.has(src);
      players.set(src, known ? Object.assign(players.get(src), { name: m.name }) : { name: m.name, x: SPAWN.x, y: 0, z: SPAWN.z, yaw: 0, pitch: 0, dead: false });
      if (isHost) {
        send({ t: 'welcome', to: src, host: mySid });
        send({ t: 'roster', to: src, list: [...players.entries()].map(([id, p]) => ({ id, name: p.name, dead: !!p.dead })) });
        if (!known) feed((m.name || '战友') + ' 加入了战场', 's');
      }
      break;
    }
    case 'welcome': if (m.to === mySid) { hostSid = m.host; beginClient(); } break;
    case 'roster': players.clear(); for (const p of m.list) players.set(p.id, { name: p.name, x: SPAWN.x, y: 0, z: SPAWN.z, yaw: 0, pitch: 0, dead: !!p.dead }); break;
    case 'start': if (!inMatch) beginClient(); break;
    case 'me': if (src !== mySid) { const p = players.get(src) || { name: '战友', x: 0, y: 0, z: 60, yaw: 0, pitch: 0, dead: false }; p.tx = m.x; p.tz = m.z; p.ty = m.y; p.tyaw = m.yaw; p.tpitch = m.pitch; p.dead = !!m.dead; players.set(src, p); } break;
    case 'ai': if (!isHost) applySnapshot(m); break;
    case 'hit': if (isHost) hostHit(src, m.i, m.dmg, m.hx, m.hz); break;
    case 'dmg': if (m.id === mySid) takeDamage(m.n); break;
    case 'kill': onKill(m.i, m.by, m.byName, m.x, m.z); break;
    case 'efx': onEfx(m); break;
    case 'win': endMatch(true); break;
    case 'leave':
      if (src === hostSid) { backLobby('房主已离开，战局结束'); return; }
      players.delete(m.sid); removePMesh(m.sid); break;
  }
}

/* ================= 进入战局：构建世界 ================= */
function startMatch() {
  hostSid = mySid;
  // 房主立即把自己登记进玩家表
  players.set(mySid, { name: myName, x: SPAWN.x, y: 0, z: SPAWN.z, yaw: 0, pitch: 0, dead: false });
  beginClient();
}

function beginClient() {
  if (inMatch) return; inMatch = true;
  $('lobby').classList.add('hidden'); $('hud').classList.remove('hidden');
  ac();

  W = buildWorld(Q, { ground: true, theme: 'dusk' });
  scene = W.scene; camera = W.camera; cv = document.getElementById('cv');
  camera.rotation.order = 'YXZ';
  vg = makeViewGun('sniper'); camera.add(vg); window._vg = vg;
  equipRealGuns({ mosin: vg }, W.renderer, scene);

  // 美军 mesh（主机权威状态；客户端由快照插值）
  enemies = [];
  for (let i = 0; i < AI_N; i++) {
    const root = makeSoldier('us'); root.visible = false; scene.add(root);
    const bar = makeBar('#e0443a');
    enemies.push({ i, root, bar, x: OBJ.x, y: 0, z: OBJ.z, yaw: Math.PI, hp: 100, dead: false, deadT: -1, phase: Math.random() * 6, move: 0, aim: 0,
      tx: OBJ.x, tz: OBJ.z, tyaw: Math.PI });
  }
  const blTex = bloodTex();
  window._blTex = blTex;
  // 阵地烟柱
  for (let k = 0; k < 5; k++) W.addPlume(OBJ.x + (Math.random() - .5) * 120, OBJ.z - 20 - Math.random() * 80, true);

  if (isHost) hostInit();
  bindControls();
  W.setUpdate(isHost ? hostFrame : tick);
  setHud();
}

/* ================= 玩家自身状态/操控（两端共用） ================= */
const me = { x: SPAWN.x, y: 0, z: SPAWN.z, yaw: 0, pitch: -.03, vy: 0, onGround: true, hp: 100, dead: false,
  mag: 5, reload: 0, fireCd: 0, ads: 0, wantAds: false, firing: false, shake: 0, moveT: 0 };
const keys = {}; let joy = { x: 0, y: 0 };
const ray = new THREE.Raycaster();
const tracers = [];

function makeBar(color) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 10;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(.7, .11, 1); sp.visible = false; scene.add(sp); sp.userData = { c, color }; return sp;
}
function drawBar(sp, r) {
  const x = sp.userData.c.getContext('2d'); x.clearRect(0, 0, 64, 10);
  x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 0, 64, 10); x.fillStyle = sp.userData.color; x.fillRect(1, 1, 62 * Math.max(0, r), 8);
  sp.material.map.needsUpdate = true;
}

function bindControls() {
  addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') tryJump(); if (e.code === 'KeyR') startReload(); });
  addEventListener('keyup', e => keys[e.code] = false);
  if (Q === 'pc') {
    cv.addEventListener('click', () => { if (!paused && !me.dead) cv.requestPointerLock && cv.requestPointerLock(); });
    document.addEventListener('mousemove', e => { if (document.pointerLockElement === cv && !paused) { const s = .0021 * (1 - me.ads * .55); me.yaw -= e.movementX * s; me.pitch -= e.movementY * s; me.pitch = Math.max(-1.45, Math.min(1.45, me.pitch)); } });
    document.addEventListener('mousedown', e => { if (document.pointerLockElement === cv && e.button === 0) me.firing = true; if (document.pointerLockElement === cv && e.button === 2) me.wantAds = true; });
    document.addEventListener('mouseup', e => { if (e.button === 0) me.firing = false; if (e.button === 2) me.wantAds = false; });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }
  // 摇杆
  const jz = $('jz'), knob = $('knob'); let jid = null, jo = { x: 0, y: 0 };
  const jset = t => { const r = jz.getBoundingClientRect(); let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2); const m = Math.hypot(dx, dy), R = r.width / 2; if (m > R) { dx *= R / m; dy *= R / m; } knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; joy.x = dx / R; joy.y = dy / R; };
  jz.addEventListener('touchstart', e => { e.preventDefault(); jid = e.changedTouches[0].identifier; jset(e.changedTouches[0]); }, { passive: false });
  jz.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === jid) jset(t); e.preventDefault(); }, { passive: false });
  const jend = e => { for (const t of e.changedTouches) if (t.identifier === jid) { jid = null; joy.x = joy.y = 0; knob.style.transform = 'translate(-50%,-50%)'; } };
  jz.addEventListener('touchend', jend); jz.addEventListener('touchcancel', jend);
  window._joy = joy;
  // 视角滑动（右屏 #look）
  const look = $('look'); let lid = null, lx = 0, ly = 0;
  look.addEventListener('touchstart', e => { const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: true });
  look.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === lid) { const s = .005 * (1 - me.ads * .55); me.yaw -= (t.clientX - lx) * s; me.pitch -= (t.clientY - ly) * s; me.pitch = Math.max(-1.45, Math.min(1.45, me.pitch)); lx = t.clientX; ly = t.clientY; } }, { passive: true });
  look.addEventListener('touchend', e => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; });
  $('bFire').addEventListener('touchstart', e => { e.preventDefault(); me.firing = true; }, { passive: false });
  $('bFire').addEventListener('touchend', e => { e.preventDefault(); me.firing = false; }, { passive: false });
  $('bAds').addEventListener('touchstart', e => { e.preventDefault(); me.wantAds = true; }, { passive: false });
  $('bAds').addEventListener('touchend', e => { e.preventDefault(); me.wantAds = false; }, { passive: false });
  $('bJump').addEventListener('touchstart', e => { e.preventDefault(); tryJump(); }, { passive: false });
  $('bPause').onclick = () => togglePause();
  $('bResume').onclick = () => togglePause();
  $('bQuit').onclick = () => location.reload();
  $('overBtn').onclick = () => location.reload();
}

let paused = false;
function togglePause() { if (me.dead) return; paused = !paused; $('po').classList.toggle('hidden', !paused); if (paused && document.pointerLockElement) document.exitPointerLock && document.exitPointerLock(); }
function tryJump() { if (me.onGround && !me.dead && !paused) { me.vy = 5.4; me.onGround = false; } }
function startReload() { if (me.reload <= 0 && me.mag < 5) me.reload = 1.7; }

function takeDamage(n) {
  if (me.dead) return;
  me.hp = Math.max(0, me.hp - n); sndHurt();
  const h = $('hurt'); h.style.opacity = 1; setTimeout(() => h.style.opacity = 0, 130);
  me.shake = Math.min(.5, me.shake + .25); setHud();
  if (me.hp <= 0) { me.dead = true; me.firing = false; endMatch(false); }
}

/* ================= 主帧：自身移动 / 射击 / 插值渲染 ================= */
let sendAcc = 0;
function tick(dtRaw) {
  if (paused) return;
  const dt = Math.min(.04, dtRaw);
  // —— 自身移动 ——
  if (!me.dead) {
    let mf = 0, ms = 0;
    if (keys.KeyW || keys.ArrowUp) mf += 1; if (keys.KeyS || keys.ArrowDown) mf -= 1;
    if (keys.KeyD || keys.ArrowRight) ms += 1; if (keys.KeyA || keys.ArrowLeft) ms -= 1;
    mf += -window._joy.y; ms += window._joy.x;
    const ml = Math.hypot(mf, ms); if (ml > 1) { mf /= ml; ms /= ml; }
    const spd = 6.2 * (me.ads > .5 ? .55 : 1);
    const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
    me.x += (fx * mf + rx * ms) * spd * dt; me.z += (fz * mf + rz * ms) * spd * dt;
    me.x = Math.max(-520, Math.min(520, me.x)); me.z = Math.max(-520, Math.min(220, me.z));
    me.vy -= 16 * dt; me.y += me.vy * dt;
    const gh = groundH(me.x, me.z);
    if (me.y <= gh) { me.y = gh; me.vy = 0; me.onGround = true; }
    me.moveT += (ml > .1 ? 9 * dt : 0);
    // 瞄准 / 装填 / 射击节奏
    me.ads += ((me.wantAds ? 1 : 0) - me.ads) * Math.min(1, dt * 12);
    camera.fov = 72 - me.ads * (72 - 28); camera.updateProjectionMatrix();
    const scoped = me.ads > .68;
    $('scope').style.opacity = scoped ? 1 : 0; $('cross').style.opacity = scoped ? 0 : .9;
    if (vg && vg.userData.flash) vg.userData.flash.material.opacity = Math.max(0, vg.userData.flash.material.opacity - dt * 16);
    if (me.reload > 0) { me.reload -= dt; if (me.reload <= 0) me.mag = 5; setHud(); }
    me.fireCd -= dt;
    if (me.firing && me.fireCd <= 0 && me.reload <= 0) fire();
    me.shake = Math.max(0, me.shake - dt * 1.6);
  }
  const sh = me.shake * .12;
  camera.position.set(me.x + (Math.random() - .5) * sh, me.y + 1.62 + (Math.random() - .5) * sh, me.z + (Math.random() - .5) * sh);
  camera.rotation.set(me.pitch, me.yaw, 0);
  me.kick = Math.max(0, (me.kick || 0) - dt * 3);
  if (vg) {
    const bob = Math.sin(me.moveT) * .012;
    vg.position.set(.26 - .26 * me.ads, -.24 + .12 * me.ads + bob, -.55 + me.kick * .08);
    vg.rotation.set(bob * .6, 0, 0);
  }
  W.followLight(me.x, me.y + 1.6, me.z);

  // —— 美军插值 + 动画 ——
  const now = performance.now();
  for (const e of enemies) {
    const k = 1 - Math.exp(-12 * dt);
    e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k;
    let dy = e.tyaw - e.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; e.yaw += dy * k;
    const gy = groundH(e.x, e.z);
    e.root.position.set(e.x, gy, e.z); e.root.rotation.y = e.yaw;
    e.root.visible = !e.dead || e.deadT < 1.2;
    if (e.dead) { e.deadT += dt; poseSoldier(e.root, e.phase, 0, 0, e.deadT); }
    else { e.phase += (e.move > .1 ? 7 * dt : dt); poseSoldier(e.root, e.phase * 1.4, e.move, e.aim, -1); }
    e.bar.position.set(e.x, gy + 2.05, e.z); e.bar.visible = !e.dead && e.hp < 100; drawBar(e.bar, e.hp / 100);
  }
  // —— 战友插值 ——
  for (const [id, p] of players) {
    if (id === mySid) continue;
    p.x += ((p.tx ?? p.x) - p.x) * k0(dt); p.z += ((p.tz ?? p.z) - p.z) * k0(dt); p.y += ((p.ty ?? groundH(p.x, p.z)) - p.y) * k0(dt);
    let m = pmeshes.get(id);
    if (!m) { m = makeSoldier('vol'); scene.add(m); pmeshes.set(id, m); }
    m.visible = !p.dead; m.position.set(p.x, groundH(p.x, p.z), p.z); m.rotation.y = p.tyaw ?? p.yaw;
    poseSoldier(m, now * .008 + id, .8, .4, p.dead ? 1 : -1);
  }
  // 曳光弹
  for (let i = tracers.length - 1; i >= 0; i--) { const t = tracers[i]; t.life -= dt; t.line.material.opacity = Math.max(0, t.life / .12); if (t.life <= 0) { scene.remove(t.line); tracers.splice(i, 1); } }

  // —— 上报自身 ——
  sendAcc += dt;
  if (sendAcc > .066) { sendAcc = 0; send({ t: 'me', x: me.x, y: me.y, z: me.z, yaw: me.yaw, pitch: me.pitch, dead: me.dead }); }
}
const k0 = dt => 1 - Math.exp(-14 * dt);

/* ---------- 开火：本地射线 + 向主机报命中 ---------- */
function fire() {
  me.fireCd = 1.15;
  if (me.mag <= 0) { startReload(); return; }
  me.mag--; setHud(); sndShot(); me.kick = .9;
  if (vg && vg.userData.flash) vg.userData.flash.material.opacity = 1;
  W.flashLight(new THREE.Vector3(me.x, me.y + 1.6, me.z), 0xffd2a0, 2.4, 16, .08);
  camera.position.y += .03;
  ray.setFromCamera({ x: 0, y: 0 }, camera); ray.far = 420;
  // 地形遮挡步进
  const o = ray.ray.origin, d = ray.ray.direction; let blocked = 420;
  for (let s0 = 4; s0 < 420; s0 += 6) { const px = o.x + d.x * s0, py = o.y + d.y * s0, pz = o.z + d.z * s0; if (py < groundH(px, pz) + .2) { blocked = s0; break; } }
  let best = null, bd = 1e9;
  for (const e of enemies) { if (e.dead) continue; const box = new THREE.Box3().setFromObject(e.root); const hit = new THREE.Vector3(); if (ray.ray.intersectBox(box, hit)) { const dist = o.distanceTo(hit); if (dist < bd && dist < blocked) { bd = dist; best = { e, hit }; } } }
  let end = o.clone().add(d.clone().multiplyScalar(best ? bd : blocked));
  addTracer(new THREE.Vector3(me.x, me.y + 1.55, me.z), end);
  if (best) {
    const gy = groundH(best.e.x, best.e.z); const hy = best.hit.y - gy;
    const head = hy > 1.5, leg = hy < .85;
    const dmg = head ? 100 : leg ? 34 : 52;
    sndHit(); $('hitmark').style.opacity = 1; setTimeout(() => $('hitmark').style.opacity = 0, 90);
    send({ t: 'hit', i: best.e.i, dmg, hx: best.e.x, hz: best.e.z });
  }
  if (me.mag <= 0) startReload();
}
function addTracer(a, b) {
  const A = a.isVector3 ? a : new THREE.Vector3(a.x, a.y, a.z), B = b.isVector3 ? b : new THREE.Vector3(b.x, b.y, b.z);
  const g = new THREE.BufferGeometry().setFromPoints([A, B]);
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: .9 }));
  scene.add(line); tracers.push({ line, life: .12 });
}

/* ---------- 快照 / 事件（客户端收） ---------- */
function applySnapshot(m) {
  if (!inMatch) return;
  for (const s of m.list) {
    const e = enemies[s.i]; if (!e) continue;
    e.tx = s.x; e.tz = s.z; e.tyaw = s.yaw; e.hp = s.hp; e.move = s.mv; e.aim = s.aim;
    if (s.dead && !e.dead) { e.dead = true; e.deadT = 0; }
  }
}
function onKill(i, by, byName, x, z) {
  const e = enemies[i]; if (!e) return;
  if (!e.dead) { e.dead = true; e.deadT = 0; e.hp = 0; }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: window._blTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 3; m.position.set(x, groundH(x, z) + .05, z); scene.add(m);
  feed((by === mySid ? '你' : (byName || '战友')) + ' 击毙一名美军', 'k'); setHud();
}
function onEfx(m) {
  if (m.k === 'eshot') { const e = enemies[m.i]; if (e && !e.dead) W.flashLight(new THREE.Vector3(e.x, groundH(e.x, e.z) + 1.5, e.z), 0xffd2a0, 1.6, 14, .07); sndFar(); if (m.tx !== undefined) addTracer({ x: m.x, y: m.y, z: m.z }, { x: m.tx, y: m.ty, z: m.tz }); }
  if (m.k === 'boom') { const p = new THREE.Vector3(m.x, m.y, m.z); W.boom(p, m.sc || 1); const d = Math.hypot(m.x - me.x, m.z - me.z); if (d < 60) me.shake = Math.min(.6, me.shake + .4 * (1 - d / 60)); }
}
function feed(txt, cls) { const f = $('feed'); const d = document.createElement('div'); d.className = cls; d.textContent = txt; f.prepend(d); while (f.children.length > 6) f.lastChild.remove(); }
function setHud() { $('hp').textContent = me.hp | 0; const alive = enemies.filter(e => !e.dead).length; $('ai').innerHTML = '美军 <b>' + alive + '</b>'; $('ally').innerHTML = '战友 <b>' + players.size + '</b>'; $('obj').textContent = '目标：并肩歼灭来犯美军 ' + alive + ' 人'; $('ammo').innerHTML = me.reload > 0 ? '装填中…' : ('莫辛-纳甘步枪 ' + me.mag + ' 发'); }

/* ================= 主机权威模拟 ================= */
const host = { snapAcc: 0, fireAcc: 0, ai: [], ended: false };
function hostInit() {
  for (let i = 0; i < AI_N; i++) {
    const a = (Math.random() - .5) * 2.4, rr = 6 + Math.random() * 70;
    host.ai.push({ i, x: OBJ.x + Math.cos(a) * rr, z: OBJ.z + Math.sin(a) * rr * .7, yaw: Math.PI, hp: 100, dead: false, cd: .5 + Math.random() * 2, mv: .7, aim: 0, jitter: Math.random() * 20 });
  }
  // 主机自己的玩家表
  const selfP = players.get(mySid) || { name: myName, dead: false }; selfP.x = me.x; selfP.z = me.z; players.set(mySid, selfP);
}
function alivePlayers() { const arr = []; for (const [id, p] of players) if (!p.dead && (p.tx !== undefined || id === mySid)) arr.push({ id, p }); return arr; }
function hostTick(dt) {
  // 同步主机自身位置
  const sp = players.get(mySid); if (sp) { sp.x = me.x; sp.y = me.y; sp.z = me.z; sp.yaw = me.yaw; sp.dead = me.dead; }
  let anyFire = false;
  for (const a of host.ai) {
    if (a.dead) continue;
    // 找最近活着的玩家
    let tgt = null, td = 1e9;
    for (const { id, p } of alivePlayers()) { const px = id === mySid ? me.x : (p.tx ?? p.x), pz = id === mySid ? me.z : (p.tz ?? p.z); const dd = Math.hypot(px - a.x, pz - a.z); if (dd < td) { td = dd; tgt = { id, x: px, z: pz }; } }
    if (!tgt) { a.mv = 0; continue; }
    const dx = tgt.x - a.x, dz = tgt.z - a.z; const want = 26 + (a.i % 5) * 5;
    a.yaw = Math.atan2(dx, dz);
    if (td > want) { const v = 2.4; a.x += dx / td * v * dt; a.z += dz / td * v * dt; a.mv = .9; a.aim = Math.max(0, a.aim - dt * 2); }
    else { a.mv = .1; a.aim = Math.min(1, a.aim + dt * 2); }
    // 开火
    a.cd -= dt;
    if (td < 90 && a.cd <= 0) {
      a.cd = 1.4 + Math.random() * 1.8; anyFire = true;
      const prob = Math.max(.05, .55 - td / 220);
      const my = new THREE.Vector3(a.x, groundH(a.x, a.z) + 1.5, a.z);
      const tp = new THREE.Vector3(tgt.x, groundH(tgt.x, tgt.z) + 1.3, tgt.z);
      send({ t: 'efx', k: 'eshot', i: a.i, x: my.x, y: my.y, z: my.z, tx: tp.x, ty: tp.y, tz: tp.z });
      if (Math.random() < prob) { const dmg = 8 + Math.random() * 12; send({ t: 'dmg', id: tgt.id, n: dmg }); if (tgt.id === mySid) takeDamage(dmg); }
    }
  }
  // 快照（同时把权威状态镜像到主机本地渲染 mesh）
  host.snapAcc += dt;
  if (host.snapAcc > .08) {
    host.snapAcc = 0;
    for (const a of host.ai) {
      const e = enemies[a.i];
      if (e) { e.tx = a.x; e.tz = a.z; e.tyaw = a.yaw; e.hp = a.hp; e.move = a.mv; e.aim = a.aim; if (a.dead && !e.dead) { e.dead = true; e.deadT = 0; } }
    }
    send({ t: 'ai', list: host.ai.map(a => ({ i: a.i, x: a.x, z: a.z, yaw: a.yaw, hp: a.hp, dead: a.dead ? 1 : 0, mv: a.mv, aim: a.aim })) });
  }
}
function hostHit(src, i, dmg, hx, hz) {
  const a = host.ai[i]; if (!a || a.dead) return;
  const p = players.get(src);
  dmg = Math.max(1, Math.min(100, dmg | 0));
  a.hp -= dmg;
  if (a.hp <= 0) {
    a.hp = 0; a.dead = true;
    const nm = src === mySid ? myName : (p ? p.name : '战友');
    send({ t: 'kill', i, by: src, byName: nm, x: hx, z: hz });
    onKill(i, src, nm, hx, hz);
    if (host.ai.every(e => e.dead) && !host.ended) { host.ended = true; setTimeout(() => send({ t: 'win' }), 900); }
  }
}
// 主机帧：先做与普通端相同的本地渲染，再跑权威 AI 模拟
function hostFrame(dt) { tick(dt); if (!paused && inMatch) hostTick(Math.min(.04, dt)); }

/* ================= 结算 / 大厅 ================= */
function endMatch(win) {
  if (!inMatch) return;
  $('over').classList.remove('hidden');
  $('overTitle').textContent = win ? '胜 利' : '壮 烈 牺 牲';
  $('overTitle').style.color = win ? '#ffd98a' : '#c96a5a';
  $('overTxt').innerHTML = win
    ? '来犯美军已被全部歼灭。<br>阵地插上了五星红旗——这是并肩作战换来的胜利。'
    : '你倒在了冲锋的路上，战友仍在继续战斗。<br>铭记每一个为和平挺身而出的人。';
}
function backLobby(msg) { inMatch = false; isHost = false; try { if (ws) ws.close(); } catch (e) {} location.reload(); }
