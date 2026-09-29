// 长空·1951 网页版 — 共用引擎 (Three.js r160)
// 电脑版 / 手机版两套画质与操控共用本文件。
import * as THREE from 'three';

export const BUILD = '1.9.6-web';

/* ---------------- 确定性噪声（与桌面端同思路的柏林/fBm） ---------------- */
function hash2(x, z) { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbm(x, z) { let f = 0, a = .5, fr = 1; for (let i = 0; i < 5; i++) { f += a * vnoise(x * fr, z * fr); fr *= 2; a *= .5; } return f; }
function groundH(x, z) {
  let h = (fbm(x * .0016 + 11, z * .0016 - 7) - .5) * 120;
  const r = Math.pow(fbm(x * .0028 - 30, z * .0028 + 12), 1.6);
  h += r * 260 * Math.max(0, (-z - 200) / 1600) * Math.min(1, Math.abs(x) / 900 + .25);
  const d = Math.hypot(x, z);
  if (d < 200) h = h * Math.min(1, (d - 120) / 80) + 2 * Math.max(0, (200 - d) / 80);
  return h;
}

/* ---------------- 程序化贴图 ---------------- */
function radialTex(stops) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  stops.forEach(s => gr.addColorStop(s[0], s[1]));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SMOKE_TEX = () => radialTex([[0, 'rgba(64,60,57,.95)'], [1, 'rgba(64,60,57,0)']]);
const FIRE_TEX = () => radialTex([[0, 'rgba(255,214,130,1)'], [.5, 'rgba(232,110,38,.75)'], [1, 'rgba(232,110,38,0)']]);
function starTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = '#ffde3c'; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
  x.closePath(); x.fill(); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- 飞机模型（修：机翼/尾翼实体、炮口、喷焰） ---------------- */
function makeJet(ours) {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: ours ? 0xc7ccd6 : 0x8b9098 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x26292e });
  const fus = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 9), body); g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.4, 16), body);
  nose.rotation.x = -Math.PI / 2; nose.position.z = -6.0; g.add(nose);
  // 三角翼：一体挤出，不再用方块顶替
  const sh = new THREE.Shape();
  sh.moveTo(0, -2.2); sh.lineTo(5.6, 2.1); sh.lineTo(1.0, 2.1); sh.lineTo(-1.0, 2.1); sh.lineTo(-5.6, 2.1); sh.lineTo(0, -2.2);
  const wg = new THREE.ExtrudeGeometry(sh, { depth: .16, bevelEnabled: false });
  wg.rotateX(Math.PI / 2); wg.translate(0, .08, 0);
  g.add(new THREE.Mesh(wg, body));
  for (const sx of [1, -1]) { // 双垂尾
    const t = new THREE.Mesh(new THREE.BoxGeometry(.14, 2.0, 2.4), body);
    t.position.set(sx * 1.0, 1.0, 3.4); t.rotation.z = sx * .22; g.add(t);
  }
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(.7, 12, 8), new THREE.MeshLambertMaterial({ color: 0x22303e }));
  canopy.scale.set(.8, .55, 1.7); canopy.position.set(0, .55, -3.4); g.add(canopy);
  // 双发喷口 + 机炮炮口（机头根部）
  for (const sx of [-.7, .7]) { const nz = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .6, 12), dark); nz.rotation.x = Math.PI / 2; nz.position.set(sx, -.02, 4.7); g.add(nz); }
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .8, 8), dark);
  muzzle.rotation.x = -Math.PI / 2; muzzle.position.set(0, -.15, -6.4); g.add(muzzle);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE_TEX(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.position.set(0, 0, 5.3); flame.scale.setScalar(3); g.add(flame);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE_TEX(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  flash.position.set(0, -.15, -7.0); flash.scale.setScalar(2.2); g.add(flash);
  if (ours) { // 红星机徽
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: starTex(), transparent: true, side: THREE.DoubleSide }));
    sm.rotation.x = -Math.PI / 2; sm.position.set(0, .12, .2); g.add(sm);
  }
  g.userData.flame = flame; g.userData.flash = flash;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

/* ---------------- 导弹模型（修：原来导弹没有模型） ---------------- */
function makeMissileMesh() {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: 0xd8d2c4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 2.2, 8), m);
  body.rotation.x = -Math.PI / 2; g.add(body);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.18, .5, 8), m);
  tip.rotation.x = -Math.PI / 2; tip.position.z = -1.35; g.add(tip);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(.04, .4, .35), m);
    const a = i * Math.PI / 2; f.position.set(Math.cos(a) * .2, Math.sin(a) * .2, 1.0); f.rotation.z = -a; g.add(f);
  }
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: FIRE_TEX(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.position.set(0, 0, 1.5); flame.scale.setScalar(1.6); g.add(flame);
  g.visible = false; return g;
}

/* ---------------- 高射机枪阵地（地面枪械） ---------------- */
function makeAAA() {
  const g = new THREE.Group();
  const sand = new THREE.MeshLambertMaterial({ color: 0x6b5d46 });
  const gun = new THREE.MeshLambertMaterial({ color: 0x3c3f45 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, .8, 6, 14), sand);
  ring.rotation.x = Math.PI / 2; ring.position.y = .8; g.add(ring);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.4, 10), gun); base.position.y = 1.1; g.add(base);
  const pivot = new THREE.Group(); pivot.position.y = 2.0; g.add(pivot);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, .8, 1.6), gun); pivot.add(head);
  // 双联水冷枪管
  const barrels = [];
  for (const sx of [-.25, .25]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 4.2, 8), gun);
    b.rotation.x = -Math.PI / 2; b.position.set(sx, .1, -2.2); pivot.add(b); barrels.push(b);
  }
  g.userData.pivot = pivot; g.userData.cd = 1 + Math.random() * 2;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ---------------- 模式选择 ---------------- */
export function initGame(quality) {
  const Q = quality;                         // 'pc' | 'mobile'
  if (location.search.includes('ground')) { import('./ground.js').then(m => m.initGround(Q)); return; }
  if (!location.search.includes('air')) { showSelect(Q); return; }
  startAir(Q);
}

function showSelect(Q) {
  document.body.classList.add(Q === 'pc' ? 'pc' : 'mobile');
  document.body.innerHTML =
    `<div style="position:fixed;inset:0;overflow:auto;background:
       radial-gradient(100% 70% at 50% -10%,rgba(180,140,90,.25),transparent 60%),
       linear-gradient(180deg,#2b2e36,#16191f);color:#f0e6d2;
       font-family:'PingFang SC','Microsoft YaHei',system-ui,sans-serif">
      <div style="max-width:860px;margin:0 auto;padding:7vh 20px 40px;text-align:center">
        <div style="font-size:clamp(32px,7vw,54px);color:#ffd77a;letter-spacing:12px">长 空 · 1951</div>
        <div style="opacity:.65;letter-spacing:3px;font-size:13px;margin:8px 0 4px">J-20 SKIES OVER KOREA · ${Q === 'pc' ? '网页电脑版' : '网页手机版'} · 选择作战方式</div>
        <div style="color:#e7c98e;letter-spacing:4px;font-size:15px;margin-bottom:36px">铭记历史 · 珍爱和平 · 吾辈自强</div>
        <div style="display:flex;gap:22px;justify-content:center;flex-wrap:wrap">
          <a href="?air" style="flex:1 1 280px;max-width:360px;display:block;text-decoration:none;color:inherit;background:rgba(0,0,0,.34);border:1px solid rgba(255,210,140,.32);border-radius:16px;padding:30px 22px">
            <div style="font-size:44px">✈️</div><h2 style="color:#ffd77a;letter-spacing:4px;margin:8px 0">空战 · 歼-20</h2>
            <p style="opacity:.78;font-size:13.5px;line-height:1.9">驾驶歼-20 迎击 F-86 机群与地面高射火力<br>机炮连射 · 追踪导弹 · 波次来袭</p>
            <span style="display:inline-block;margin-top:10px;background:linear-gradient(180deg,#d23b2c,#9c2318);color:#fff;letter-spacing:5px;padding:11px 36px;border-radius:30px">升 空 迎 敌</span>
          </a>
          <a href="?ground" style="flex:1 1 280px;max-width:360px;display:block;text-decoration:none;color:inherit;background:rgba(0,0,0,.34);border:1px solid rgba(255,210,140,.32);border-radius:16px;padding:30px 22px">
            <div style="font-size:44px">🪖</div><h2 style="color:#ffd77a;letter-spacing:4px;margin:8px 0">陆战 · 步兵冲锋</h2>
            <p style="opacity:.78;font-size:13.5px;line-height:1.9">第一人称随志愿军夺取高地<br>步枪/AKM/大刀/手雷 · 战友 AI 协同 · 重新建模的士兵</p>
            <span style="display:inline-block;margin-top:10px;background:linear-gradient(180deg,#d23b2c,#9c2318);color:#fff;letter-spacing:5px;padding:11px 36px;border-radius:30px">冲 锋 夺 旗</span>
          </a>
        </div>
        <div style="margin-top:34px;font-size:12.5px;opacity:.6"><a style="color:#ffd77a" href="index.html">← 返回选版</a>　·　桌面完整版见 GitHub Releases</div>
      </div></div>`;
}

/* ---------------- 空战（原有模式） ---------------- */
function startAir(Q) {
  const cfg = Q === 'pc'
    ? { seg: 200, pr: 2, shadows: true, smoke: 30, trees: 340, fog: .00092, expo: 1.06 }
    : { seg: 110, pr: 1.3, shadows: false, smoke: 14, trees: 160, fog: .00125, expo: 1.0 };

  document.body.innerHTML =
    `<canvas id="cv"></canvas>
     <div id="hud">
       <canvas id="fl1" width="54" height="36" class="flag"></canvas>
       <canvas id="fl2" width="54" height="36" class="flag"></canvas>
       <div id="stats"></div>
       <div id="spd"></div>
       <div id="feed"></div>
       <div id="cross">+</div>
       <div id="banner"></div>
       <div id="ver">${BUILD}</div>
       <div id="stick"><div id="knob"></div></div>
       <div id="btnFire" class="tb">火</div>
       <div id="btnMs" class="tb sm">弹</div>
       <div id="btnPause" class="tb ps">Ⅱ</div>
       <div id="hint"></div>
     </div>
     <div id="ov" class="ov">
       <div class="box">
         <h1>长 空 · 1951</h1>
         <div class="sub">J-20 SKIES OVER KOREA · ${Q === 'pc' ? '电脑版' : '手机版'} · 抗美援朝</div>
         <div class="panel" id="help"></div>
         <button id="go">起 飞</button>
         <div class="tip">铭记历史 · 珍爱和平 · 吾辈自强　·　<a href="index.html">返回选版</a></div>
       </div>
     </div>
     <div id="po" class="ov" style="display:none"><div class="box">
       <h2>已暂停</h2>
       <button id="resume">继续战斗</button><br>
       <button id="restart" class="ghost">重新出击</button><br>
       <a class="gh" href="index.html">返回选版</a>
     </div></div>`;
  const $ = id => document.getElementById(id);
  $('help').innerHTML = Q === 'pc'
    ? `鼠标移动 俯仰/滚转（点击画面锁定鼠标）<br>W/S 油门 · Q/E 方向舵 · <b>按住空格</b>机炮 · F 导弹 · P 暂停`
    : `左摇杆 俯仰/方向舵 · 右半屏滑动 滚转<br>按住<b>「火」</b>连射 · 点<b>「弹」</b>导弹 · 右上 Ⅱ 暂停`;
  if (Q === 'pc') { document.body.classList.add('pc'); $('hint').innerHTML = '点击画面用鼠标操控'; }

  const css = `
    html,body{margin:0;height:100%;overflow:hidden;background:#20232a;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;-webkit-user-select:none;user-select:none;touch-action:none}
    #cv{position:absolute;inset:0}
    #hud{position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;color:#ffe9c0;text-shadow:0 1px 3px #000}
    .flag{position:absolute;top:10px;left:12px;border:1px solid rgba(255,220,150,.6)}
    #fl2{left:74px}
    #stats{position:absolute;top:14px;left:142px;font-size:${Q==='pc'?15:13}px;line-height:1.6}
    #stats b{color:#ffd25e}
    #spd{position:absolute;right:16px;bottom:14px;text-align:right;font-size:${Q==='pc'?15:13}px;line-height:1.6}
    #feed{position:absolute;left:14px;bottom:60px;font-size:13px;line-height:1.7;color:#ffd6c8;max-width:56%}
    #feed div{background:rgba(60,20,16,.42);border-left:3px solid #c8452f;padding:2px 8px;margin-top:4px;border-radius:2px;transition:opacity 1s}
    #cross{position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);font-size:20px;color:rgba(255,240,210,.85)}
    #banner{position:absolute;left:50%;top:24%;transform:translateX(-50%);font-size:${Q==='pc'?30:24}px;font-weight:700;letter-spacing:5px;color:#ffd9a0;opacity:0;transition:opacity .3s;text-shadow:0 2px 8px #000;white-space:nowrap}
    #ver{position:absolute;right:8px;top:6px;font-size:10px;opacity:.45}
    .ov{position:absolute;inset:0;background:radial-gradient(120% 120% at 50% 0%,#3a3f4a 0%,#171a20 72%);display:flex;align-items:center;justify-content:center;z-index:20;text-align:center;color:#f2e6cf}
    .ov h1{font-size:${Q==='pc'?46:34}px;margin:0 0 6px;color:#ffd77a;letter-spacing:10px}
    .ov h2{font-size:30px;color:#ffd77a;letter-spacing:8px}
    .sub{opacity:.8;margin-bottom:22px;font-size:14px}
    .panel{font-size:${Q==='pc'?14:12.5}px;line-height:2;background:rgba(0,0,0,.32);border:1px solid rgba(255,210,140,.35);border-radius:12px;padding:16px 20px;margin-bottom:22px}
    button{border:none;background:linear-gradient(180deg,#d23b2c,#9c2318);color:#fff;font-size:21px;letter-spacing:6px;padding:13px 52px;border-radius:40px;box-shadow:0 8px 26px rgba(0,0,0,.5);cursor:pointer;margin:6px}
    button.ghost{background:linear-gradient(180deg,#555b66,#33373f);letter-spacing:3px;font-size:16px;padding:10px 30px}
    .tip{margin-top:16px;font-size:12px;opacity:.6} .tip a{color:#ffd77a}
    .gh{display:inline-block;margin-top:12px;color:#ffd77a;font-size:14px;opacity:.85}
    #hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);font-size:13px;opacity:.65}
    #cv{width:100vw!important;height:100vh!important;display:block}
    .tb{position:fixed;width:${Q==='pc'?64:76}px;height:${Q==='pc'?64:76}px;border-radius:50%;background:rgba(255,255,255,.10);border:2px solid rgba(255,255,255,.35);
        display:none;align-items:center;justify-content:center;color:#fff;font-size:22px;pointer-events:auto;z-index:6}
    .tb.sm{width:62px;height:62px;font-size:17px} .tb.ps{width:46px;height:46px;font-size:16px;top:12px;right:14px}
    #btnFire{right:26px;bottom:${Q==='pc'?90:120}px} #btnMs{right:110px;bottom:56px}
    #stick{position:fixed;left:34px;bottom:60px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.07);border:2px solid rgba(255,255,255,.3);display:none;z-index:6}
    #knob{position:absolute;left:38px;top:38px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.35)}
    body.mobile .tb{display:flex} body.mobile #stick{display:block}
    body.pc #btnPause,body.pc #hint{display:flex} body.pc #btnPause{display:flex}
    @media (pointer:coarse){body.pc .tb{display:none}}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  document.body.classList.add(Q === 'pc' ? 'pc' : 'mobile');

  /* 国旗 */
  function drawFlag(cv, text) {
    const x = cv.getContext('2d'); x.fillStyle = '#de141a'; x.fillRect(0, 0, 54, 36); x.fillStyle = '#ffee46';
    const star = (cx, cy, r, rot = 0) => { x.save(); x.translate(cx, cy); x.rotate(rot); x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); x.restore(); };
    star(9, 9, 5.2);
    [[10, 2], [12, 4], [12, 7], [10, 9]].forEach(p => { const px = p[0] * 1.8, py = p[1] * 2; star(px, py, 1.9, Math.atan2(9 - py, 9 - px) + Math.PI / 2); });
    if (text) { x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText('八一', 27, 24); }
  };
  drawFlag($('fl1'), false); drawFlag($('fl2'), true);

  /* 渲染器（修：色调映射 + PC 实时阴影 + 抗锯齿） */
  const renderer = new THREE.WebGLRenderer({ canvas: $('cv'), antialias: Q === 'pc', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cfg.pr));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.expo;
  renderer.shadowMap.enabled = cfg.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x8a7d68, cfg.fog);
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, .5, 9000);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  // 硝烟渐变天穹（修：不再是纯色亮背景）
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x5d5a54) }, mid: { value: new THREE.Color(0x7d7468) }, bot: { value: new THREE.Color(0xb59a76) } },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vP; uniform vec3 top,mid,bot;
      void main(){ float t=normalize(vP).y; vec3 c=mix(bot,mid,smoothstep(-.15,.25,t)); c=mix(c,top,smoothstep(.2,.75,t)); gl_FragColor=vec4(c,1.0);} `
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(6200, 24, 14), skyMat));

  const hemi = new THREE.HemisphereLight(0xa89f92, 0x2e2b26, .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xe7cf9e, 1.5);
  if (cfg.shadows) {
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -420; sun.shadow.camera.right = 420; sun.shadow.camera.top = 420; sun.shadow.camera.bottom = -420;
    sun.shadow.camera.far = 1400; sun.shadow.bias = -0.0006;
  }
  scene.add(sun); scene.add(sun.target);

  /* 地形（顶点色：焦草/干土/雪/弹坑） */
  const GS = 5200, SEG = cfg.seg;
  const tg = new THREE.PlaneGeometry(GS, GS, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const pa = tg.attributes.position, cols = [];
  const cA = new THREE.Color(0x444e2d), cB = new THREE.Color(0x3b3126), cS = new THREE.Color(0xe4ebf6), cR = new THREE.Color(0x2c2820);
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), z = pa.getZ(i), y = groundH(x, z); pa.setY(i, y);
    let cc;
    if (y > 150) cc = cS.clone();
    else { const p = fbm(x * .02 + 5, z * .02 + 5); cc = cA.clone().lerp(cB, Math.min(1, .3 + p * .8)); if (p < .045) cc.lerp(cR, .75); }
    cols.push(cc.r, cc.g, cc.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true; scene.add(terrain);

  /* 树林（修：地图光秃秃）+ 实体树干（碰撞采样用） */
  const trees = []; {
    const n = cfg.trees;
    const trGeo = new THREE.CylinderGeometry(.75, 1.05, 7, 6);
    const foGeo = new THREE.ConeGeometry(4.6, 13, 7);
    const foGeo2 = new THREE.ConeGeometry(3.2, 9, 7);
    const trM = new THREE.MeshLambertMaterial({ color: 0x3a2c20 });
    const foM = new THREE.MeshLambertMaterial({ color: 0xffffff });   // 颜色走实例色
    const trI = new THREE.InstancedMesh(trGeo, trM, n), foI1 = new THREE.InstancedMesh(foGeo, foM, n);
    const foI2 = new THREE.InstancedMesh(foGeo2, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
    const C_GREEN1 = new THREE.Color(0x2f4329), C_GREEN2 = new THREE.Color(0x35492f);
    const C_SNOW1 = new THREE.Color(0xdfe8f2), C_SNOW2 = new THREE.Color(0xeaf1f8);
    const d = new THREE.Object3D(); let k = 0;
    for (let gx = -30; gx <= 30 && k < n; gx++) for (let gz = -30; gz <= 30 && k < n; gz++) {
      const th = hash2(gx * 7.13, gz * 3.77);
      if (th < .46) continue;
      const x = gx * 94 + (hash2(gx, gz) - .5) * 60, z = gz * 94 + (hash2(gx + 9, gz - 4) - .5) * 60;
      if (Math.hypot(x, z) < 250) continue;
      const gy = groundH(x, z);
      if (gy > 148) continue;                                   // 雪线以上不生
      const slope = Math.abs(groundH(x + 8, z) - groundH(x - 8, z)) + Math.abs(groundH(x, z + 8) - groundH(x, z - 8));
      if (slope > 26) continue;
      const burned = gy < 90 && hash2(gx + 3, gz + 8) > .8;
      const snowy = gy > 95;
      d.position.set(x, gy + 3.5, z); d.scale.set(1, burned ? 1.7 : 1, 1); d.updateMatrix();
      trI.setMatrixAt(k, d.matrix);
      trees.push({ x, z, r: 1.6 });
      if (!burned) {
        d.scale.set(1, 1, 1); d.position.set(x, gy + 10.5, z); d.updateMatrix();
        foI1.setMatrixAt(k, d.matrix); foI1.setColorAt(k, snowy ? C_SNOW1 : C_GREEN1);
        d.scale.set(.8, 1, .8); d.position.set(x, gy + 16.5, z); d.updateMatrix();
        foI2.setMatrixAt(k, d.matrix); foI2.setColorAt(k, snowy ? C_SNOW2 : C_GREEN2);
      } else { // 焦黑断木：树冠压到地下并染黑
        d.scale.setScalar(.0001); d.position.set(x, gy - 200, z); d.updateMatrix();
        foI1.setMatrixAt(k, d.matrix); foI1.setColorAt(k, new THREE.Color(0x11100e));
        foI2.setMatrixAt(k, d.matrix); foI2.setColorAt(k, new THREE.Color(0x11100e));
      }
      k++;
    }
    trI.count = k; foI1.count = k; foI2.count = k;
    foI1.instanceColor.needsUpdate = true; foI2.instanceColor.needsUpdate = true;
    [trI, foI1, foI2].forEach(m => { m.castShadow = cfg.shadows; m.receiveShadow = true; scene.add(m); });
  }

  /* 烟柱 + 地面火光 */
  const fxSmoke = SMOKE_TEX(), fxFire = FIRE_TEX();
  const plumes = [];
  function addPlume(x, z, big) {
    const n = big ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fxSmoke, transparent: true, opacity: .5, depthWrite: false }));
      s.position.set(x + (Math.random() - .5) * 14, groundH(x, z) + 16 + i * 15, z);
      s.scale.setScalar((big ? 46 : 32) + i * 14); scene.add(s);
      plumes.push({ s, vy: 4 + Math.random() * 4, life: Math.random() * 4 });
    }
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: fxFire, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    f.position.set(x, groundH(x, z) + 5, z); f.scale.setScalar(big ? 26 : 18); scene.add(f);
  }
  for (let i = 0; i < cfg.smoke; i++) addPlume((Math.random() - .5) * 2800, -300 - Math.random() * 2400, i % 6 === 0);

  /* 高射机枪阵地 6 处 */
  const aaas = [];
  for (let i = 0; i < 6; i++) {
    const a = makeAAA(); const x = (i % 2 ? 1 : -1) * (260 + (i * 137) % 500), z = -500 - i * 320;
    a.position.set(x, groundH(x, z), z); a.userData.hp = 60; a.userData.alive = true;
    scene.add(a); aaas.push(a);
  }

  /* 玩家 + 敌机 */
  const player = makeJet(true); scene.add(player);
  player.position.set(0, 320, 260);
  const NE = 9, enemies = [];
  for (let i = 0; i < NE; i++) { const m = makeJet(false); m.visible = false; scene.add(m); enemies.push({ m, alive: false, vel: new THREE.Vector3(), hp: 100, fireCd: 0 }); }

  /* 弹道对象池（修：机炮子弹原来完全看不见） */
  const tracerGeo = new THREE.BoxGeometry(.25, .25, 5);
  const tracerPool = [];
  function tracer(friendly) {
    let t = tracerPool.find(o => !o.mesh.visible);
    if (!t) { const mesh = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: friendly ? 0xffd27a : 0xff5a3c, blending: THREE.AdditiveBlending, transparent: true, opacity: .9 })); mesh.visible = false; scene.add(mesh); t = { mesh }; tracerPool.push(t); }
    return t;
  }
  const bullets = [];
  function spawnBullet(p, dir, friendly) { const t = tracer(friendly); t.mesh.visible = true; bullets.push({ mesh: t.mesh, p: p.clone(), v: dir.clone().multiplyScalar(friendly ? 920 : 720), life: 1.5, friendly }); }

  /* 导弹池 */
  const msPool = []; for (let i = 0; i < 6; i++) { const m = makeMissileMesh(); scene.add(m); msPool.push(m); }
  const missiles = [];

  const bursts = [];
  function boom(p, sc) {
    const n = Q === 'pc' ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: Math.random() < .55 ? fxFire : fxSmoke, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.position.copy(p); s.scale.setScalar((13 + Math.random() * 20) * sc); scene.add(s);
      bursts.push({ s, life: .6 + Math.random() * .5 });
    }
  }

  /* 游戏状态 */
  let running = false, paused = false, last = 0;
  let speed = 185, hp = 100, score = 0, kills = 0, wave = 0, waveLeft = 0, gunCd = 0, msN = 4, msCd = 0;
  const feed = [];
  function addFeed(txt) { feed.push({ t: txt, life: 5.5 }); const el = $('feed'); const d = document.createElement('div'); d.textContent = txt; el.appendChild(d); while (el.children.length > 5) el.removeChild(el.firstChild); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 1000); }, 4600); }
  function flash(t) { const b = $('banner'); b.textContent = t; b.style.opacity = 1; clearTimeout(flash._t); flash._t = setTimeout(() => b.style.opacity = 0, 1700); }
  function spawnWave() {
    wave++; waveLeft = Math.min(3 + wave, 8);
    for (let i = 0; i < waveLeft; i++) {
      const e = enemies.find(q => !q.alive); if (!e) break;
      e.alive = true; e.m.visible = true; e.hp = 100; e.fireCd = 1 + Math.random();
      e.m.position.set((Math.random() - .5) * 900, 380 + Math.random() * 300, -700 - Math.random() * 700);
      e.vel.set((Math.random() - .5) * 30, 0, -150 - Math.random() * 40);
    }
    flash(`第 ${wave} 波敌机来袭`);
  }

  /* ---------------- 操控 ---------------- */
  const keys = {};
  let firing = false, wantMs = false;
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') { firing = true; e.preventDefault(); }
    if (e.code === 'KeyF') wantMs = true;
    if (e.code === 'KeyP') togglePause();
  });
  addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') firing = false; });

  // 鼠标：点击画面锁定，X=滚转 Y=俯仰
  let mx = 0, my = 0;
  $('cv').addEventListener('click', () => { if (Q === 'pc' && running && !paused && document.pointerLockElement !== $('cv')) $('cv').requestPointerLock?.(); });
  document.addEventListener('mousemove', e => { if (document.pointerLockElement === $('cv')) { mx += e.movementY * .0016; my += e.movementX * .0016; } });
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== $('cv')) { mx = 0; my = 0; } });

  // 手机触控
  let sX = 0, sY = 0, lookDX = 0, sId = null, lId = null, lx = 0;
  const stick = $('stick'), knob = $('knob');
  function sp(t) { const r = stick.getBoundingClientRect(); return { x: t.clientX - r.left - r.width / 2, y: t.clientY - r.top - r.height / 2 }; }
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      const r = stick.getBoundingClientRect();
      if (t.clientX < innerWidth * .42 && sId === null) { sId = t.identifier; const p = sp(t); sX = Math.max(-1, Math.min(1, p.x / 46)); sY = Math.max(-1, Math.min(1, -p.y / 46)); knob.style.transform = `translate(${p.x}px,${p.y}px)`; }
      else if (t.clientY > innerHeight - 210 && t.clientX > innerWidth - 260) { /* 按钮区自己处理 */ }
      else if (lId === null) { lId = t.identifier; lx = t.clientX; }
    }
  }, { passive: true });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === sId) { const p = sp(t); sX = Math.max(-1, Math.min(1, p.x / 46)); sY = Math.max(-1, Math.min(1, -p.y / 46)); knob.style.transform = `translate(${Math.max(-38, Math.min(38, p.x))}px,${Math.max(-38, Math.min(38, p.y))}px)`; }
      else if (t.identifier === lId) { lookDX += (t.clientX - lx) * .55; lx = t.clientX; }
    }
  }, { passive: true });
  addEventListener('touchend', e => { for (const t of e.changedTouches) { if (t.identifier === sId) { sId = null; sX = sY = 0; knob.style.transform = ''; } if (t.identifier === lId) lId = null; } }, { passive: true });
  const bindHold = (id, dn, up) => { $(id).addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); dn(); }, { passive: false }); $(id).addEventListener('touchend', e => { e.preventDefault(); if (up) up(); }, { passive: false }); };
  bindHold('btnFire', () => firing = true, () => firing = false);
  $('btnMs').addEventListener('touchstart', e => { e.preventDefault(); wantMs = true; }, { passive: false });
  $('btnPause').addEventListener('click', togglePause);
  $('btnPause').addEventListener('touchstart', e => { e.preventDefault(); togglePause(); }, { passive: false });

  function launchMissile() {
    if (msCd > 0 || msN <= 0) { if (msN <= 0) flash('导弹已用尽'); return; }
    let tgt = null, bd = 1e9;
    enemies.forEach(e => { if (!e.alive) return; const d = e.m.position.distanceTo(player.position); if (d < bd) { bd = d; tgt = e; } });
    aaas.forEach(a => { if (!a.userData.alive) return; const d = a.position.distanceTo(player.position); if (d < bd && d < 1400) { bd = d; tgt = a; } });
    if (!tgt) { flash('没有可锁定目标'); return; }
    msN--; msCd = 1.2;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    const m = msPool.find(o => !o.visible); m.visible = true; m.position.copy(player.position).addScaledVector(f, 7);
    m.quaternion.copy(player.quaternion);
    missiles.push({ mesh: m, v: f.multiplyScalar(speed + 60), tgt, life: 6 });
    addFeed('导弹发射');
  }

  /* 暂停/重开 */
  function togglePause() { if (!running) return; paused = !paused; $('po').style.display = paused ? 'flex' : 'none'; if (!paused) { last = performance.now(); if (document.pointerLockElement === $('cv')) document.exitPointerLock?.(); } }
  function resetGame() {
    hp = 100; score = 0; kills = 0; wave = 0; msN = 4; speed = 185;
    player.position.set(0, 320, 260); player.quaternion.identity();
    enemies.forEach(e => { e.alive = false; e.m.visible = false; });
    bullets.forEach(b => b.mesh.visible = false); bullets.length = 0;
    missiles.forEach(m => m.mesh.visible = false); missiles.length = 0;
    aaas.forEach((a, i) => { a.userData.alive = true; a.userData.hp = 60; a.visible = true; const x = (i % 2 ? 1 : -1) * (260 + (i * 137) % 500), z = -500 - i * 320; a.position.set(x, groundH(x, z), z); });
    spawnWave();
  }
  $('go').addEventListener('click', () => { $('ov').style.display = 'none'; running = true; last = performance.now(); spawnWave(); });
  $('resume').addEventListener('click', togglePause);
  $('restart').addEventListener('click', () => { paused = false; $('po').style.display = 'none'; resetGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) togglePause(); });

  /* 版本轮询：GitHub Pages 更新后提示刷新（实时更新） */
  if (!location.search.includes('autostart')) {
    setInterval(async () => {
      try {
        const r = await fetch('version.txt?ts=' + Date.now(), { cache: 'no-store' });
        const v = (await r.text()).trim();
        if (v && v !== BUILD && !$('#update')) {
          const a = document.createElement('a'); a.id = 'update';
          a.style.cssText = 'position:absolute;left:50%;top:64px;transform:translateX(-50%);z-index:30;background:#9c2318;color:#ffe9c0;padding:8px 18px;border-radius:20px;font-size:14px;pointer-events:auto;text-decoration:none';
          a.textContent = '发现新版本 ' + v + '，点击更新'; a.href = 'javascript:location.reload()';
          $('hud').appendChild(a);
        }
      } catch (e) { /* file:// 或离线时忽略 */ }
    }, 60000);
  }

  /* ---------------- 主循环 ---------------- */
  const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, -1);
  function treeHit(x, z) { for (const t of trees) { const dx = x - t.x, dz = z - t.z; if (dx * dx + dz * dz < t.r * t.r && player.position.y < groundH(t.x, t.z) + 12) return true; } return false; }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.04, (now - last) / 1000); last = now;
    // 烟柱始终飘动
    for (const p of plumes) { if (p.vy > 0) { p.life -= dt; p.s.position.y += p.vy * dt; p.s.material.opacity = .35 + Math.sin(p.life * 3) * .1; } }

    if (running && !paused) {
      /* --- 输入 --- */
      let pitch = 0, roll = 0, yaw = 0, thr = Q === 'mobile' ? .7 : .25;
      if (keys.KeyW) thr += 1; if (keys.KeyS) thr -= 1;
      if (keys.ArrowUp) pitch += 1; if (keys.ArrowDown) pitch -= 1;
      if (keys.KeyA) roll += 1; if (keys.KeyD) roll -= 1;
      if (keys.KeyQ) yaw += 1; if (keys.KeyE) yaw -= 1;
      pitch -= mx * 2.2; roll -= my * 2.6; mx *= .86; my *= .86;       // 鼠标输入衰减
      pitch += sY; yaw -= sX * .7; roll -= lookDX * .06; lookDX = 0;

      speed += thr * 80 * dt; speed = Math.max(118, Math.min(330, speed));
      if (speed < 150) pitch -= .3 * dt;
      player.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch * 1.25 * dt));
      player.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(FWD.clone().applyQuaternion(player.quaternion), roll * 2.3 * dt));
      player.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw * .9 * dt));

      // 地形前瞻防撞（修：高速穿山），近地自动拉杆
      const f0 = FWD.clone().applyQuaternion(player.quaternion);
      const aheadH = groundH(player.position.x + f0.x * 90, player.position.z + f0.z * 90);
      const clr = player.position.y - groundH(player.position.x, player.position.z);
      let pull = 0;
      if (clr < 80) pull += (1 - clr / 80) * 1.5 * dt;
      if (f0.y < 0 && player.position.y + f0.y * 90 < aheadH + 70) pull += 1.2 * dt;
      if (pull > 0) player.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pull));

      const f = FWD.clone().applyQuaternion(player.quaternion);
      player.position.addScaledVector(f, speed * dt);
      player.position.x = Math.max(-2500, Math.min(2500, player.position.x));
      player.position.z = Math.max(-2900, Math.min(1400, player.position.z));

      // 撞地/撞树
      if (player.position.y < groundH(player.position.x, player.position.z) + 6 || treeHit(player.position.x, player.position.z)) {
        boom(player.position, 2.2); running = false;
        setTimeout(() => { $('ov').style.display = 'flex'; $('go').textContent = '重新起飞'; document.querySelector('#ov h1').textContent = '战 机 被 击 落'; $('go').onclick = () => location.reload(); }, 700);
      }
      player.userData.flame.scale.setScalar(2.4 + Math.random() * .8);

      /* --- 机炮（按住连射 + 炮口焰） --- */
      gunCd -= dt; msCd -= dt;
      if (wantMs) { launchMissile(); wantMs = false; }
      const fl = player.userData.flash;
      if (firing && gunCd <= 0) {
        gunCd = .075;
        const dir = FWD.clone().applyQuaternion(player.quaternion);
        spawnBullet(player.position.clone().addScaledVector(dir, 7), dir, true);
        fl.material.opacity = 1;
      }
      fl.material.opacity = Math.max(0, fl.material.opacity - dt * 14);

      /* --- 敌机 AI：朝玩家转向、不撞地、点射 --- */
      let aliveN = 0;
      enemies.forEach(e => {
        if (!e.alive) return; aliveN++;
        const to = player.position.clone().sub(e.m.position);
        const dist = to.length(); to.normalize();
        const desired = to.multiplyScalar(170);
        e.vel.lerp(desired, .8 * dt);
        e.m.position.addScaledVector(e.vel, dt);
        const floor = groundH(e.m.position.x, e.m.position.z) + 120;
        if (e.m.position.y < floor) e.m.position.y += (floor - e.m.position.y) * 2 * dt;
        const aim = player.position.clone().sub(e.m.position).normalize();
        e.m.lookAt(e.m.position.clone().add(aim));
        e.fireCd -= dt;
        const fw = FWD.clone().applyQuaternion(e.m.quaternion);
        const dot = fw.dot(player.position.clone().sub(e.m.position).normalize());
        if (dist < 760 && dot > .92 && e.fireCd <= 0) {
          e.fireCd = .9 + Math.random() * 1.2;
          spawnBullet(e.m.position.clone().addScaledVector(fw, 6), fw, false);
        }
        if (e.m.position.z > 1500 || e.m.position.y < groundH(e.m.position.x, e.m.position.z) + 4) { e.alive = false; e.m.visible = false; }
      });
      if (aliveN === 0) { score += 250; spawnWave(); }

      /* --- 高射机枪阵地：转管、对空射击、可摧毁 --- */
      aaas.forEach(a => {
        if (!a.userData.alive) return;
        const pv = a.userData.pivot;
        const rel = player.position.clone().sub(a.position);
        pv.rotation.y = Math.atan2(rel.x, rel.z) + Math.PI;
        pv.rotation.x = Math.max(-.7, Math.min(.4, Math.atan2(rel.y - 4, Math.hypot(rel.x, rel.z))));
        a.userData.cd -= dt;
        if (Math.hypot(rel.x, rel.z) < 900 && a.userData.cd <= 0) {
          a.userData.cd = 1.6 + Math.random();
          const dir = player.position.clone().sub(a.position).normalize();
          spawnBullet(a.position.clone().setY(a.position.y + 4).addScaledVector(dir, 4), dir, false);
        }
      });

      /* --- 弹道 --- */
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.p.addScaledVector(b.v, dt); b.life -= dt;
        b.mesh.position.copy(b.p); b.mesh.lookAt(b.p.clone().add(b.v));
        let dead = b.life <= 0 || b.p.y < groundH(b.p.x, b.p.z);
        if (!dead && b.friendly) {
          for (const e of enemies) if (e.alive && e.m.position.distanceTo(b.p) < 7) {
            e.hp -= 13; boom(b.p, .5);
            if (e.hp <= 0) { e.alive = false; e.m.visible = false; boom(e.m.position, 1.6); score += 100; kills++; addFeed('机炮击落 F-86'); }
            dead = true; break;
          }
          if (!dead) for (const a of aaas) {
            if (!a.userData.alive) continue;
            const dx = b.p.x - a.position.x, dz = b.p.z - a.position.z, dy = b.p.y - (a.position.y + 3);
            if (dx * dx + dz * dz < 16 && Math.abs(dy) < 10) {
              a.userData.hp -= 13; boom(b.p, .5);
              if (a.userData.hp <= 0) { a.userData.alive = false; a.visible = false; boom(a.position.clone().setY(a.position.y + 4), 1.5); addPlume(a.position.x, a.position.z, true); score += 80; kills++; addFeed('摧毁敌高射机枪阵地'); }
              dead = true; break;
            }
          }
        } else if (!dead) {
          if (b.p.distanceTo(player.position) < 6) { hp -= 7; boom(b.p, .4); dead = true; if (hp <= 0) { boom(player.position, 2.2); running = false; } }
        }
        if (dead) { b.mesh.visible = false; bullets.splice(i, 1); }
      }

      /* --- 导弹追踪 --- */
      for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i]; m.life -= dt;
        const tgt = m.tgt;
        let tp = null;
        if (tgt) tp = tgt.position ? tgt.position.clone() : null;
        if (tgt && tgt.m) tp = tgt.m.position.clone();
        if (tp && ((tgt.alive !== false) || tgt.userData?.alive)) {
          const want = tp.sub(m.mesh.position).normalize().multiplyScalar(320);
          m.v.lerp(want, 1.7 * dt);
        }
        m.mesh.position.addScaledVector(m.v, dt);
        m.mesh.lookAt(m.mesh.position.clone().add(m.v));
        let hit = false;
        if (tgt && tgt.m && tgt.alive && m.mesh.position.distanceTo(tgt.m.position) < 12) {
          boom(tgt.m.position, 2); tgt.alive = false; tgt.m.visible = false; score += 100; kills++; addFeed('导弹击落 F-86'); hit = true;
        }
        if (!hit && tgt && !tgt.m && tgt.userData?.alive && m.mesh.position.distanceTo(tgt.position.clone().setY(tgt.position.y + 3)) < 12) {
          tgt.userData.alive = false; tgt.visible = false; boom(tgt.position.clone().setY(tgt.position.y + 4), 1.8); addPlume(tgt.position.x, tgt.position.z, true); score += 80; kills++; addFeed('导弹摧毁高射阵地'); hit = true;
        }
        if (hit || m.life <= 0 || m.mesh.position.y < groundH(m.mesh.position.x, m.mesh.position.z)) { if (!hit) boom(m.mesh.position, 1); m.mesh.visible = false; missiles.splice(i, 1); }
      }

      /* --- 爆炸 --- */
      for (let i = bursts.length - 1; i >= 0; i--) {
        const z = bursts[i]; z.life -= dt * 1.7; z.s.scale.multiplyScalar(1.02); z.s.material.opacity = Math.max(0, z.life);
        if (z.life <= 0) { scene.remove(z.s); bursts.splice(i, 1); }
      }

      /* --- 相机追尾（修：相机穿进地形） --- */
      const cf = FWD.clone().applyQuaternion(player.quaternion), cu = UP.clone().applyQuaternion(player.quaternion);
      camera.position.copy(player.position).addScaledVector(cf, -23).addScaledVector(cu, 6.5);
      const camFloor = groundH(camera.position.x, camera.position.z) + 3;
      if (camera.position.y < camFloor) camera.position.y = camFloor;
      camera.lookAt(player.position);

      /* --- 灯光/阴影跟随玩家 --- */
      sun.position.set(player.position.x - 500, player.position.y + 650, player.position.z - 300);
      sun.target.position.copy(player.position);

      $('stats').innerHTML = `机炮 <b>${Math.max(0, Math.round(hp))}</b>　敌机 <b>${aliveN}</b>　击落 <b>${kills}</b>　得分 <b>${score}</b>`;
      $('spd').innerHTML = `${Math.round(speed * 3.6)} km/h<br>导弹 ${msN}`;
    }
    renderer.render(scene, camera);
  }

  // 自动开局（无头截图用）
  if (location.search.includes('autostart')) { $('ov').style.display = 'none'; running = true; spawnWave(); }

  last = performance.now();
  requestAnimationFrame(frame);
}
