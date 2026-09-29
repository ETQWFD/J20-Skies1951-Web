// 长空·1951 网页版 — 共享核心：噪声地形 / 硝烟光影 / 程序化士兵与枪械 (Three.js r160)
import * as THREE from 'three';

export const BUILD = '1.9.6-web';

/* ---------------- 确定性柏林/fBm ---------------- */
export function hash2(x, z) { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
export function fbm(x, z) { let f = 0, a = .5, fr = 1; for (let i = 0; i < 5; i++) { f += a * vnoise(x * fr, z * fr); fr *= 2; a *= .5; } return f; }
export function groundH(x, z) {
  let h = (fbm(x * .0016 + 11, z * .0016 - 7) - .5) * 120;
  const r = Math.pow(fbm(x * .0028 - 30, z * .0028 + 12), 1.6);
  h += r * 260 * Math.max(0, (-z - 200) / 1600) * Math.min(1, Math.abs(x) / 900 + .25);
  const d = Math.hypot(x, z);
  if (d < 200) h = h * Math.min(1, (d - 120) / 80) + 2 * Math.max(0, (200 - d) / 80);
  return h;
}

/* ---------------- 程序化贴图 ---------------- */
export function radialTex(stops, size = 64) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size * .47);
  stops.forEach(s => gr.addColorStop(s[0], s[1]));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const smokeTex = () => radialTex([[0, 'rgba(62,58,55,.95)'], [1, 'rgba(62,58,55,0)']]);
export const fireTex = () => radialTex([[0, 'rgba(255,216,132,1)'], [.5, 'rgba(232,110,38,.75)'], [1, 'rgba(232,110,38,0)']]);
export const blobTex = () => radialTex([[0, 'rgba(0,0,0,.55)'], [.7, 'rgba(0,0,0,.28)'], [1, 'rgba(0,0,0,0)']]);
export const bloodTex = () => radialTex([[0, 'rgba(120,14,12,.85)'], [.6, 'rgba(90,12,10,.5)'], [1, 'rgba(90,12,10,0)']]);
export function starTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = '#ffde3c'; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
  x.closePath(); x.fill(); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- 世界构建：渲染器/天穹/光影/地形/树林/烟柱 ---------------- */
export function buildWorld(Q, opts = {}) {
  const ground = opts.ground === true;
  const themeName = opts.theme || 'dusk';
  const cfg = ground
    ? (Q === 'pc'
      ? { seg: 150, pr: 2, shadows: true, smoke: 16, trees: 240, fog: .0018, expo: 1.14 }
      : { seg: 90, pr: 1.3, shadows: false, smoke: 9, trees: 130, fog: .0022, expo: 1.08 })
    : (Q === 'pc'
      ? { seg: 200, pr: 2, shadows: true, smoke: 30, trees: 340, fog: .00092, expo: 1.06 }
      : { seg: 110, pr: 1.3, shadows: false, smoke: 14, trees: 160, fog: .00125, expo: 1.0 });

  /* 战役光照/天气主题：黄昏硝烟 / 白昼 / 长津湖月夜 / 雪原 */
  const TH = {
    dusk: { sky: [0x56534e, 0x7c7367, 0xb0946e], fog: 0x8c806d, fogM: 1.0, sun: 0xeccfa0, sunI: ground ? 1.85 : 1.5, hemiSky: 0xa89f92, hemiGnd: 0x35312a, hemiI: ground ? 1.12 : .9, amb: 0x6a6258, ambI: ground ? .5 : .25, glow: 0xffe1aa, glowS: 900, mul: 1.0, tint: null, mix: 0, stars: false, fillI: 0 },
    day:  { sky: [0x7088aa, 0xa6b7c6, 0xddcba8], fog: 0xaab7c1, fogM: .92, sun: 0xfff2d6, sunI: 2.15, hemiSky: 0xc6d0dd, hemiGnd: 0x4a463c, hemiI: 1.05, amb: 0x8b8d86, ambI: .44, glow: 0xfff4d2, glowS: 760, mul: 1.07, tint: null, mix: 0, stars: false, fillI: 0 },
    night:{ sky: [0x0a1020, 0x1c2740, 0x453b52], fog: 0x181f30, fogM: 1.12, sun: 0xbcd2f5, sunI: 1.15, hemiSky: 0x4a5a82, hemiGnd: 0x1a2030, hemiI: .82, amb: 0x3b4763, ambI: .42, glow: 0xcddbff, glowS: 380, mul: .72, tint: 0x33405f, mix: .36, stars: true, fillI: 16, snow: true },
    snow: { sky: [0x8895a9, 0xb7c3d1, 0xe6e4dc], fog: 0xcbd5e0, fogM: 1.06, sun: 0xf5f7ff, sunI: 1.75, hemiSky: 0xcdd7e5, hemiGnd: 0x6f7480, hemiI: 1.18, amb: 0xb9c2cf, ambI: .6, glow: 0xf6f9ff, glowS: 700, mul: 1.04, tint: 0xe8eff8, mix: .78, stars: false, fillI: 0, snow: true },
  }[themeName];

  const canvas = document.createElement('canvas'); canvas.id = 'cv';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw!important;height:100vh!important;display:block';
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q === 'pc', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cfg.pr));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.expo;
  renderer.shadowMap.enabled = cfg.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(TH.fog, cfg.fog * TH.fogM);
  const camera = new THREE.PerspectiveCamera(ground ? 72 : 68, innerWidth / innerHeight, .1, 9000);
  scene.add(camera);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  // 天穹（三段渐变，颜色随战役主题）
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(TH.sky[0]) }, mid: { value: new THREE.Color(TH.sky[1]) }, bot: { value: new THREE.Color(TH.sky[2]) } },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vP; uniform vec3 top,mid,bot;
      void main(){ float t=normalize(vP).y; vec3 c=mix(bot,mid,smoothstep(-.18,.25,t)); c=mix(c,top,smoothstep(.18,.75,t)); gl_FragColor=vec4(c,1.0);} `
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(6200, 24, 14), skyMat));

  // 星空（夜战，圆形柔和星点）
  if (TH.stars) {
    const PN = 800, pg = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < PN; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * .48 + .08, r = 5600; sp.push(Math.cos(e) * Math.cos(a) * r, Math.sin(e) * r, Math.cos(e) * Math.sin(a) * r); }
    pg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const starDot = radialTex([[0, 'rgba(255,255,255,1)'], [.4, 'rgba(225,235,255,.8)'], [1, 'rgba(225,235,255,0)']], 32);
    scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ map: starDot, color: 0xdfe8ff, size: 3.4, sizeAttenuation: false, transparent: true, depthWrite: false, opacity: .95, fog: false })));
  }

  // 太阳 / 月亮盘
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, themeName === 'night' ? 'rgba(205,220,255,.7)' : 'rgba(255,225,170,.55)'], [1, 'rgba(255,225,170,0)']], 128), transparent: true, depthWrite: false, fog: false }));
  sunGlow.scale.setScalar(TH.glowS); scene.add(sunGlow);

  const hemi = new THREE.HemisphereLight(TH.hemiSky, TH.hemiGnd, TH.hemiI); scene.add(hemi);
  const amb = new THREE.AmbientLight(TH.amb, TH.ambI); scene.add(amb);
  const sun = new THREE.DirectionalLight(TH.sun, TH.sunI);
  if (cfg.shadows) {
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const R = ground ? 90 : 420;
    sun.shadow.camera.left = -R; sun.shadow.camera.right = R; sun.shadow.camera.top = R; sun.shadow.camera.bottom = -R;
    sun.shadow.camera.far = ground ? 320 : 1400; sun.shadow.camera.bias = -0.0007; sun.shadow.normalBias = .02;
  }
  scene.add(sun); scene.add(sun.target);

  // 夜战：跟随玩家的暖色环境补光（阵地火光映在身边，避免死黑）
  const fillLight = new THREE.PointLight(0xffb074, TH.fillI, 72, 2);
  if (TH.fillI > 0) scene.add(fillLight);

  // 动态点光源池：爆炸 / 炮口焰真实照亮周围
  const POOLN = Q === 'pc' ? 8 : 4, lpool = [];
  for (let i = 0; i < POOLN; i++) { const l = new THREE.PointLight(0xffc58a, 0, 30, 2); l.visible = false; scene.add(l); lpool.push({ l, life: 0, dur: 1, max: 0 }); }
  let li = 0;
  function flashLight(p, color = 0xffc58a, intensity = 3, dist = 28, life = .2) {
    const s = lpool[li % POOLN]; li++;
    s.l.position.copy(p); s.l.color.set(color); s.l.distance = dist; s.max = intensity; s.l.intensity = intensity; s.life = life; s.dur = life; s.l.visible = true;
  }

  // 飘雪（夜战/雪原）：跟随玩家移动的局部降雪盒
  let snowArr = null, snowPts = null, SN = 0;
  if (TH.snow) {
    SN = Q === 'pc' ? 700 : 360;
    snowArr = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) { snowArr[i * 3] = (Math.random() - .5) * 120; snowArr[i * 3 + 1] = Math.random() * 46; snowArr[i * 3 + 2] = (Math.random() - .5) * 120; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(snowArr, 3));
    snowPts = new THREE.Points(sg, new THREE.PointsMaterial({ map: radialTex([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']], 16), color: 0xeef3ff, size: .55, transparent: true, depthWrite: false, opacity: .9 }));
    snowPts.frustumCulled = false; scene.add(snowPts);
  }

  /* 地形 */
  const GS = 5200, SEG = cfg.seg;
  const tg = new THREE.PlaneGeometry(GS, GS, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const pa = tg.attributes.position, cols = [];
  const cA = new THREE.Color(0x464f2e), cB = new THREE.Color(0x3c3226), cS = new THREE.Color(0xe4ebf6), cR = new THREE.Color(0x2b271f);
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), z = pa.getZ(i), y = groundH(x, z); pa.setY(i, y);
    let cc;
    if (y > 150) cc = cS.clone();
    else { const p = fbm(x * .02 + 5, z * .02 + 5); cc = cA.clone().lerp(cB, Math.min(1, .3 + p * .8)); if (p < .045) cc.lerp(cR, .78); }
    if (TH.mul !== 1.0) cc.multiplyScalar(TH.mul);
    if (TH.tint !== null) cc.lerp(new THREE.Color(TH.tint), TH.mix);
    cols.push(cc.r, cc.g, cc.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true; scene.add(terrain);

  /* 树林（实例化）+ 实体碰撞表 */
  const trees = []; {
    const n = cfg.trees;
    const trGeo = new THREE.CylinderGeometry(.5, .8, 6, 6);
    const foGeo = new THREE.ConeGeometry(3.6, 11, 7), foGeo2 = new THREE.ConeGeometry(2.5, 7.5, 7);
    const trI = new THREE.InstancedMesh(trGeo, new THREE.MeshLambertMaterial({ color: 0x3a2c20 }), n);
    const foI1 = new THREE.InstancedMesh(foGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
    const foI2 = new THREE.InstancedMesh(foGeo2, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
    const G1 = new THREE.Color(0x30442a), G2 = new THREE.Color(0x374b30), SN1 = new THREE.Color(0xdfe8f2), SN2 = new THREE.Color(0xeaf1f8), CB = new THREE.Color(0x11100e);
    const dm = new THREE.Object3D(); let k = 0;
    const noTreeR = ground ? 60 : 250;
    for (let gx = -30; gx <= 30 && k < n; gx++) for (let gz = -30; gz <= 30 && k < n; gz++) {
      if (hash2(gx * 7.13, gz * 3.77) < .46) continue;
      const x = gx * 94 + (hash2(gx, gz) - .5) * 60, z = gz * 94 + (hash2(gx + 9, gz - 4) - .5) * 60;
      if (Math.hypot(x, z) < noTreeR) continue;
      const gy = groundH(x, z); if (gy > 148) continue;
      const slope = Math.abs(groundH(x + 8, z) - groundH(x - 8, z)) + Math.abs(groundH(x, z + 8) - groundH(x, z - 8));
      if (slope > 26) continue;
      const snowLine = themeName === 'snow' ? 36 : themeName === 'night' ? 58 : 95;
      const burned = themeName === 'snow' ? (gy < 56 && hash2(gx + 3, gz + 8) > .9) : (gy < 90 && hash2(gx + 3, gz + 8) > .8), snowy = gy > snowLine;
      dm.position.set(x, gy + 3, z); dm.scale.set(1, burned ? 1.7 : 1, 1); dm.rotation.y = hash2(gx, gz) * 3; dm.updateMatrix(); trI.setMatrixAt(k, dm.matrix);
      trees.push({ x, z, r: 1.2 });
      if (!burned) {
        dm.scale.set(1, 1, 1); dm.position.set(x, gy + 8.6, z); dm.updateMatrix(); foI1.setMatrixAt(k, dm.matrix); foI1.setColorAt(k, snowy ? SN1 : G1);
        dm.scale.set(.8, 1, .8); dm.position.set(x, gy + 13.6, z); dm.updateMatrix(); foI2.setMatrixAt(k, dm.matrix); foI2.setColorAt(k, snowy ? SN2 : G2);
      } else {
        dm.scale.setScalar(.0001); dm.position.set(x, gy - 200, z); dm.updateMatrix();
        foI1.setMatrixAt(k, dm.matrix); foI1.setColorAt(k, CB); foI2.setMatrixAt(k, dm.matrix); foI2.setColorAt(k, CB);
      }
      k++;
    }
    trI.count = foI1.count = foI2.count = k;
    foI1.instanceColor.needsUpdate = true; foI2.instanceColor.needsUpdate = true;
    [trI, foI1, foI2].forEach(m => { m.castShadow = cfg.shadows; m.receiveShadow = true; scene.add(m); });
  }

  /* 烟柱 + 火光 + 爆炸 */
  const fxSmoke = smokeTex(), fxFire = fireTex();
  const plumes = [], bursts = [];
  function addPlume(x, z, big) {
    const n = big ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fxSmoke, transparent: true, opacity: .5, depthWrite: false }));
      s.position.set(x + (Math.random() - .5) * 12, groundH(x, z) + 14 + i * 13, z);
      s.scale.setScalar((big ? 42 : 28) + i * 12); scene.add(s);
      plumes.push({ s, vy: 3.5 + Math.random() * 4, life: Math.random() * 4 });
    }
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: fxFire, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    f.position.set(x, groundH(x, z) + 4, z); f.scale.setScalar(big ? 24 : 16); scene.add(f);
  }
  function boom(p, sc = 1) {
    const n = Q === 'pc' ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: Math.random() < .55 ? fxFire : fxSmoke, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.position.copy(p); s.scale.setScalar((11 + Math.random() * 18) * sc); scene.add(s);
      bursts.push({ s, life: .55 + Math.random() * .45 });
    }
    flashLight(p, 0xff9a4a, (Q === 'pc' ? 3.8 : 2.5) * Math.min(2.2, sc), 30 * sc, .22);
  }
  const smokeCount = ground ? cfg.smoke : cfg.smoke;
  for (let i = 0; i < smokeCount; i++) addPlume((Math.random() - .5) * (ground ? 900 : 2800), -(ground ? 120 : 300) - Math.random() * (ground ? 520 : 2400), i % 6 === 0);

  let updateFn = null;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.045, (now - last) / 1000); last = now;
    for (const p of plumes) { if (p.vy > 0) { p.life -= dt; p.s.position.y += p.vy * dt; p.s.material.opacity = .32 + Math.sin(p.life * 3) * .1; } }
    for (let i = bursts.length - 1; i >= 0; i--) { const z = bursts[i]; z.life -= dt * 1.7; z.s.scale.multiplyScalar(1.02); z.s.material.opacity = Math.max(0, z.life); if (z.life <= 0) { scene.remove(z.s); bursts.splice(i, 1); } }
    for (const s of lpool) { if (s.life > 0) { s.life -= dt; s.l.intensity = s.max * Math.max(0, s.life / s.dur); if (s.life <= 0) s.l.visible = false; } }
    if (snowPts) {
      const pa2 = snowPts.geometry.attributes.position;
      for (let i = 0; i < SN; i++) { let y = pa2.getY(i) - 3.4 * dt, x = pa2.getX(i) + .5 * dt; if (y < -2) { y = 44; x = (Math.random() - .5) * 120; } pa2.setY(i, y); pa2.setX(i, x); }
      pa2.needsUpdate = true; snowPts.position.set(camera.position.x, camera.position.y - 2, camera.position.z);
    }
    sunGlow.position.copy(camera.position).add(new THREE.Vector3(-0.5, .45, -1).normalize().multiplyScalar(4000));
    if (updateFn) updateFn(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return { Q, cfg, renderer, scene, camera, groundH, trees, addPlume, boom, fxSmoke, fxFire, flashLight,
    theme: themeName,
    followLight(x, y, z) {
      // 太阳/月亮置于玩家侧后方（玩家朝 -z 进攻），照亮迎面山坡
      sun.position.set(x + 70, y + 230, z + 150); sun.target.position.set(x, y, z - 120);
      if (themeName === 'night') sunGlow.position.set(x - 520, y + 1500, z - 950);
      else sunGlow.position.set(x + 240, y + 360, z + 480);
      if (TH.fillI > 0) fillLight.position.set(x + 5, y + 11, z + 9);
    },
    setUpdate(fn) { updateFn = fn; } };
}

/* ---------------- 士兵（重新建模：比例 1:7.5，可动关节，行进动画） ---------------- */
const MAT = {};
function mat(color) { return new THREE.MeshLambertMaterial({ color }); }
function M(team, key, color) { MAT[team + key] = MAT[team + key] || mat(color); return MAT[team + key]; }

export function makeSoldier(team) {
  // team: 'vol' 志愿军（土黄棉布军装） | 'us' 美军（橄榄绿 + M1 钢盔）
  const T = team === 'vol';
  const skin = M(team, 'skin', 0xd7ad8a), boot = M(team, 'boot', T ? 0x33291c : 0x3f3527);
  const jacket = M(team, 'jk', T ? 0xaea26c : 0x5f674a), trouser = M(team, 'tr', T ? 0x8d7f53 : 0x545b42);
  const gear = M(team, 'gear', T ? 0x6a5c3c : 0x494f3a), dark = M(team, 'dark', 0x26262a);

  const root = new THREE.Group();
  const P = new THREE.Group(); P.position.y = 0.92; root.add(P);   // 髋/倒地质心

  const hips = new THREE.Mesh(new THREE.BoxGeometry(.34, .2, .22), trouser); hips.position.y = -.04; P.add(hips);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(.44, .54, .26), jacket); torso.position.y = .26; P.add(torso);
  // 装具/弹带
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.46, .07, .28), gear); belt.position.y = .02; P.add(belt);
  if (!T) { const pack = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .16), gear); pack.position.set(0, .3, .2); P.add(pack); }
  else { const band = new THREE.Mesh(new THREE.BoxGeometry(.4, .12, .04), gear); band.position.set(0, .22, -.15); P.add(band); }

  // 头（带脸：眼/鼻朝 -Z）
  const headG = new THREE.Group(); headG.position.y = .66; P.add(headG);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.21, .23, .2), skin); headG.add(head);
  for (const sx of [-.05, .05]) { const eye = new THREE.Mesh(new THREE.BoxGeometry(.034, .03, .012), dark); eye.position.set(sx, .03, -.102); headG.add(eye); }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(.03, .05, .03), skin); nose.position.set(0, -.02, -.11); headG.add(nose);
  if (T) { // 棉帽 + 红星
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.135, .145, .1, 12), jacket); cap.position.y = .13; headG.add(cap);
    const capB = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .06, 12, 1, true, Math.PI, Math.PI), jacket); headG.add(capB);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(.07, .07), new THREE.MeshBasicMaterial({ map: starTex(), transparent: true, side: THREE.DoubleSide }));
    st.position.set(0, .13, -.12); headG.add(st);
  } else { // M1 钢盔
    const helm = new THREE.Mesh(new THREE.SphereGeometry(.165, 14, 9, 0, Math.PI * 2, 0, Math.PI * .62), M(team, 'helm', 0x6d7356));
    helm.scale.y = .78; helm.position.y = .1; headG.add(helm);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.16, .018, 6, 16), M(team, 'helm2', 0x5c6247)); rim.rotation.x = Math.PI / 2; rim.position.y = .02; headG.add(rim);
  }

  // 手臂（肩→肘→腕）
  function arm(side) {
    const s = new THREE.Group(); s.position.set(side * .3, .46, 0); P.add(s);
    const up = new THREE.Mesh(new THREE.BoxGeometry(.11, .36, .13), jacket); up.position.y = -.19; s.add(up);
    const e = new THREE.Group(); e.position.y = -.38; s.add(e);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(.1, .32, .11), jacket); fore.position.y = -.16; e.add(fore);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .12), skin); hand.position.y = -.34; e.add(hand);
    return { s, e, hand };
  }
  const armL = arm(-1), armR = arm(1);

  // 腿（髋→膝→踝，两段，绑腿/军靴）
  function leg(side) {
    const t = new THREE.Group(); t.position.set(side * .12, -.13, 0); P.add(t);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(.15, .46, .17), trouser); thigh.position.y = -.23; t.add(thigh);
    const k = new THREE.Group(); k.position.y = -.46; t.add(k);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(.13, .42, .15), T ? M(team, 'put', 0x7c6e47) : trouser); shin.position.y = -.21; k.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.14, .09, .27), boot); foot.position.set(0, -.44, -.05); k.add(foot);
    return { t, k };
  }
  const legL = leg(-1), legR = leg(1);

  // 手中的枪（端在胸前）
  const rifle = makeRifle(T ? 'rifle' : 'mcarbine');
  rifle.position.set(.16, .4, -.42); P.add(rifle);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  const rig = { P, headG, armL, armR, legL, legR, rifle };
  root.userData.rig = rig;
  root.scale.setScalar(1.02);
  return root;
}

/* 行进行走 / 瞄准 / 倒地动画 */
export function poseSoldier(root, phase, moveAmt, aimAmt, deadT) {
  const r = root.userData.rig;
  if (deadT >= 0) { // 倒地
    const f = Math.min(1, deadT / .45);
    r.P.rotation.x = -Math.PI / 2 * f * (root.userData.face || 1);
    r.P.position.y = .92 * (1 - f) + .08;
    return;
  }
  r.P.rotation.x = 0; r.P.position.y = .92 + (moveAmt > .05 ? Math.abs(Math.sin(phase)) * .04 * moveAmt : Math.sin(performance.now() * .002) * .006);
  const sw = Math.sin(phase) * .75 * moveAmt, sw2 = Math.sin(phase + Math.PI) * .75 * moveAmt;
  r.legL.t.rotation.x = sw; r.legR.t.rotation.x = sw2;
  r.legL.k.rotation.x = Math.max(0, -Math.sin(phase)) * .9 * moveAmt;
  r.legR.k.rotation.x = Math.max(0, -Math.sin(phase + Math.PI)) * .9 * moveAmt;
  // 瞄准：双臂前伸端枪；行进：摆臂
  const a = aimAmt;
  r.armR.s.rotation.x = -1.45 * a + sw2 * .5 * (1 - a);
  r.armL.s.rotation.x = -1.35 * a + sw * .5 * (1 - a);
  r.armR.s.rotation.z = -.15; r.armL.s.rotation.z = .15;
  r.rifle.visible = true;
  r.rifle.position.y = .4 - .12 * (1 - a);
  r.headG.rotation.y = Math.sin(phase * .5) * .12 * (1 - a);
}

/* ---------------- 枪械模型 ---------------- */
export function makeRifle(kind) {
  const g = new THREE.Group();
  const steel = mat(0x33363b), wood = mat(0x6e4f2e), woodD = mat(0x573c22);
  const add = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };
  const BAR = -Math.PI / 2;   // 圆柱默认沿 Y，转到朝 -Z（枪口朝前）
  if (kind === 'akm') {
    add(new THREE.BoxGeometry(.07, .1, .5), woodD, 0, 0, .02);            // 机匣/木托
    add(new THREE.BoxGeometry(.06, .13, .2), wood, 0, -.01, .24);
    add(new THREE.CylinderGeometry(.018, .018, .62, 8), steel, 0, .025, -.5, BAR); // 枪管
    const mag = add(new THREE.BoxGeometry(.07, .2, .1), steel, 0, -.14, -.06); mag.rotation.x = .35; // 弯弹匣
    add(new THREE.BoxGeometry(.02, .05, .16), wood, 0, -.04, -.3);        // 护木
    add(new THREE.BoxGeometry(.02, .04, .1), steel, 0, .08, .02);         // 照门
  } else if (kind === 'sniper') {
    add(new THREE.BoxGeometry(.06, .09, .42), wood, 0, 0, .12);
    add(new THREE.CylinderGeometry(.016, .016, .9, 8), steel, 0, .03, -.6, BAR);
    add(new THREE.CylinderGeometry(.035, .035, .2, 10), steel, 0, .1, -.06, BAR); // 瞄准镜
    add(new THREE.BoxGeometry(.05, .1, .16), wood, 0, -.05, -.34);
    add(new THREE.CylinderGeometry(.01, .01, .14, 6), steel, 0, .03, -.95, BAR);
  } else if (kind === 'mcarbine') { // 美军卡宾
    add(new THREE.BoxGeometry(.06, .1, .4), woodD, 0, 0, .05);
    add(new THREE.CylinderGeometry(.017, .017, .46, 8), steel, 0, .02, -.38, BAR);
    add(new THREE.BoxGeometry(.02, .07, .18), wood, 0, -.02, -.24);
    add(new THREE.BoxGeometry(.06, .14, .05), steel, 0, -.1, .12);
  } else {
    add(new THREE.BoxGeometry(.05, .05, .4), wood, 0, 0, .1);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* 第一人称持枪视角模型（双臂 + 枪 + 枪口） */
export function makeViewGun(kind) {
  const g = new THREE.Group();
  const skin = mat(0xd7ad8a), sleeve = mat(0xaea26c);
  let gun;
  if (kind === 'knife') {
    gun = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.02, .05, .5), mat(0xcfd2d6)); blade.position.z = -.3; gun.add(blade);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.04, .04, .16), mat(0x573c22)); grip.position.z = .02; gun.add(grip);
  } else if (kind === 'grenade') {
    gun = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), mat(0x4a5140)); gun.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .05, 8), mat(0x33363b)); cap.position.y = .07; gun.add(cap);
  } else if (kind === 'fist') {
    gun = new THREE.Group();
  } else {
    gun = makeRifle(kind);
  }
  gun.position.set(0, -.02, -.2); g.add(gun);
  // 两只手/小臂
  const faL = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .34), sleeve); faL.position.set(-.07, -.03, -.12); faL.rotation.x = -.3; g.add(faL);
  const faR = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .3), sleeve); faR.position.set(.06, -.05, -.1); faR.rotation.x = -.2; g.add(faR);
  const hL = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .1), skin); hL.position.set(-.07, -.03, -.28); g.add(hL);
  const hR = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .1), skin); hR.position.set(.06, -.05, -.24); g.add(hR);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  const mzZ = kind === 'sniper' ? -1.05 : -.78;
  flash.position.set(0, 0, mzZ); flash.scale.setScalar(.6); g.add(flash);
  g.userData = { gun, flash, rec: new THREE.Group() };
  g.userData.rec.position.z = 0; g.add(g.userData.rec);
  g.scale.setScalar(.62);
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}

/* 红旗（胜利插旗用） */
export function makeRedFlag() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 4.2, 8), mat(0x8a8a8a)); pole.position.y = 2.1; g.add(pole);
  const cv = document.createElement('canvas'); cv.width = 120; cv.height = 80; const x = cv.getContext('2d');
  x.fillStyle = '#de141a'; x.fillRect(0, 0, 120, 80); x.fillStyle = '#ffee46';
  const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
  star(20, 20, 11); [[36, 9], [43, 16], [43, 26], [36, 33]].forEach(p => star(p[0], p[1], 4));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(1.5, 1, 12, 2);
  const flag = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  flag.position.set(.78, 3.5, 0); g.add(flag);
  g.userData.flag = flag;
  return g;
}
