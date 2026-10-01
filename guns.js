// 真实 PBR 枪械（用户授权 GLB）：莫辛-纳甘 / AKM / 红军大刀
// 全部经离线压缩与校验，仅保留 BaseColor 贴图；几何为原创导入资产。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let _envTex = null;
function ensureEnvironment(renderer, scene) {
  if (!renderer || !scene || scene.environment) return;
  try {
    const pm = new THREE.PMREMGenerator(renderer);
    _envTex = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    scene.environment = _envTex;
  } catch (e) { /* 无环境反射也能运行，只是金属偏暗 */ }
}

const loader = new GLTFLoader();
const cache = {};
function loadGLB(file) {
  if (cache[file]) return Promise.resolve(cache[file]);
  return new Promise((resolve, reject) => {
    loader.load('models/' + file + '.glb', g => {
      g.scene.traverse(o => {
        if (o.isMesh) {
          o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false;
          const mm = o.material;
          if (mm) { mm.envMapIntensity = 0.9; mm.needsUpdate = true; }
        }
      });
      cache[file] = g.scene; resolve(g.scene);
    }, undefined, reject);
  });
}

// kind -> file / 让枪管/刀尖朝 -Z 的旋转 / 目标长度(viewgun 局部单位)
const CFG = {
  mosin: { file: 'rifle', len: 1.72, stock: 0.5, flip: false },
  akm:   { file: 'akm',   len: 1.72, stock: 0.5, flip: false },
  knife: { file: 'knife', len: 1.1, stock: 0.42, flip: false, exclude: 'holster' },
};

// 把 Sketchfab 多层节点变换烘焙进几何体，得到一个扁平、变换为单位的组
function bakeScene(scene, excludeName) {
  scene.updateMatrixWorld(true);
  const root = new THREE.Group();
  scene.traverse(o => {
    if (o.isMesh) {
      let nm = (o.name || '').toLowerCase();
      let p = o.parent;
      while (p && excludeName) { nm += ' ' + (p.name || '').toLowerCase(); p = p.parent; }
      if (excludeName && nm.includes(excludeName)) return;
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      const m = new THREE.Mesh(g, Array.isArray(o.material) ? o.material : o.material);
      m.castShadow = false; m.frustumCulled = false;
      root.add(m);
    }
  });
  return root;
}

// 抗离群点包围盒（刀模型有孤立废顶点）：取 0.5%/99.5% 分位
function robustBox(root) {
  const xs = [], ys = [], zs = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { xs.push(p.getX(i)); ys.push(p.getY(i)); zs.push(p.getZ(i)); }
  });
  const q = (arr, lo) => { const a = arr.slice().sort((u, v) => u - v); const i = Math.min(a.length - 1, Math.max(0, Math.floor(a.length * lo))); return a[i]; };
  const mn = [q(xs, .005), q(ys, .005), q(zs, .005)];
  const mx = [q(xs, .995), q(ys, .995), q(zs, .995)];
  return { mn, mx, ctr: mn.map((v, i) => (v + mx[i]) / 2), size: mn.map((v, i) => mx[i] - v) };
}

// 把指定局部轴转到世界 Z：axis 0/1/2 → 用确定性 90° 旋转（朝 -Z 时 dir=-1）
function axisToZ(pivot, axis, dir) {
  if (axis === 0) pivot.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;   // X→Z
  else if (axis === 1) pivot.rotation.x = dir > 0 ? Math.PI / 2 : -Math.PI / 2; // Y→Z
}

// 构建已转到“枪口朝 -Z、几何中心归零”的模型容器
export async function buildModel(kind) {
  const c = CFG[kind];
  const scene = await loadGLB(c.file);
  const baked = bakeScene(scene, c.exclude);
  const rb = robustBox(baked);
  // 居中
  baked.position.set(-rb.ctr[0], -rb.ctr[1], -rb.ctr[2]);
  // 最长轴
  let la = 0; for (let i = 1; i < 3; i++) if (rb.size[i] > rb.size[la]) la = i;
  const pivot = new THREE.Group();
  pivot.add(baked);
  axisToZ(pivot, la, -1);   // 先让长轴正方向朝 -Z
  if (c.flip) pivot.rotation.y += Math.PI;
  const holder = new THREE.Group(); holder.add(pivot);
  // 缩放使枪长(沿 Z)= len
  const s = c.len / rb.size[la];
  pivot.scale.setScalar(s);
  holder.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(holder);
  // 把枪托(+Z)放到靠近相机目标位
  pivot.position.z += (c.stock ?? 0.5) - box.max.z;
  holder.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(holder);
  holder.userData.muzzleZ = box.min.z + 0.03;
  holder.userData.stockZ = box.max.z - 0.03;
  holder.userData.topY = box.max.y;
  holder.userData.botY = box.min.y;
  holder.userData.gripY = box.min.y + (box.max.y - box.min.y) * 0.42;
  holder.userData.longAxis = la;
  return holder;
}

// 异步把真实枪装入既有第一人称持枪组（保持外部引用与 .userData.flash 接口）
const skin = new THREE.MeshStandardMaterial({ color: 0xd7ad8a, roughness: 0.7 });
const sleeve = new THREE.MeshStandardMaterial({ color: 0x91865a, roughness: 0.9 });
let _flashTex = null;
function flashTex() {
  if (_flashTex) return _flashTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,247,214,1)'); gr.addColorStop(.35, 'rgba(255,190,70,.95)');
  gr.addColorStop(.7, 'rgba(255,110,20,.55)'); gr.addColorStop(1, 'rgba(255,90,10,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  _flashTex = new THREE.CanvasTexture(cv); return _flashTex;
}
function addArms(group, kind, d) {
  // d: {muzzleZ,stockZ,gripY}（holder 局部，枪管朝 -Z）
  const gripZ = d.stockZ - (kind === 'knife' ? 0.12 : 0.34);   // 右手：握把/扳机附近
  const foreZ = d.muzzleZ + (d.stockZ - d.muzzleZ) * 0.42;     // 左手：护木
  const y = d.gripY - 0.02;
  if (kind !== 'knife') {
    const faL = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .34), sleeve);
    faL.position.set(-.02, y - .03, foreZ + .16); faL.rotation.x = -.5; group.add(faL);
    const hL = new THREE.Mesh(new THREE.BoxGeometry(.085, .085, .09), skin);
    hL.position.set(-.02, y - .02, foreZ); group.add(hL);
  }
  const faR = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .3), sleeve);
  faR.position.set(.05, y - .02, gripZ + .14); faR.rotation.x = -.35; group.add(faR);
  const hR = new THREE.Mesh(new THREE.BoxGeometry(.085, .085, .095), skin);
  hR.position.set(.045, y - .01, gripZ); group.add(hR);
}

export async function equipRealGuns(viewGroups, renderer, scene) {
  // viewGroups: { mosin:Group, akm:Group, knife:Group } — 由 makeViewGun 建立
  ensureEnvironment(renderer, scene);
  const jobs = Object.keys(viewGroups).map(async kind => {
    if (!viewGroups[kind]) return;
    let holder;
    try { holder = await buildModel(kind); } catch (e) { console.warn('real gun load fail', kind, e); return; }
    const g = viewGroups[kind];
    for (let i = g.children.length - 1; i >= 0; i--) g.remove(g.children[i]);
    holder.position.set(0, .02, -.06);
    g.add(holder);
    const D = { muzzleZ: holder.userData.muzzleZ, stockZ: holder.userData.stockZ, gripY: holder.userData.gripY };
    addArms(holder, kind, D);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    flash.position.set(0, D.gripY + .03, D.muzzleZ); flash.scale.setScalar(.5); holder.add(flash);
    g.userData.gun = holder;
    g.userData.flash = flash;
    g.userData.muzzleZ = D.muzzleZ;
    g.userData.rec = new THREE.Group(); g.add(g.userData.rec);
    g.userData.real = true;
  });
  await Promise.all(jobs);
}
