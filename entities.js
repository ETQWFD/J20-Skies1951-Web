// 长空·1951 网页版 — 战场实体：军车 / 坦克 / 阵地 / 补给箱 / 医疗帐篷 / 地雷 / 冰面 (Three.js)
import * as THREE from 'three';

function M(color, opt = {}) { return new THREE.MeshLambertMaterial({ color, ...opt }); }
function box(w, h, d, color, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color)); m.position.set(x, y, z); m.castShadow = true; return m; }

/* 军用卡车（我方可驾驶）。车头朝 -Z，尺寸约 4.8 长 */
export function makeTruck() {
  const g = new THREE.Group();
  g.add(box(2.1, .3, 4.6, 0x2f3326, 0, .75, 0));            // 底盘
  g.add(box(2.0, 1.15, 2.5, 0x5a6142, 0, 1.35, .75));        // 后篷布货厢
  const cov = box(1.96, .9, 2.44, 0x6b7350, 0, 1.32, .78); cov.material = M(0x6b7350, { transparent: true, opacity: .92 }); g.add(cov);
  g.add(box(1.9, 1.0, 1.5, 0x474d34, 0, 1.2, -1.55));        // 车头
  g.add(box(1.4, .5, .1, 0x20241c, 0, 1.35, -2.32));         // 前格栅
  // 玻璃
  g.add(box(1.5, .42, .06, 0x9fb0b2, 0, 1.45, -2.28));
  const wheels = [];
  for (const [x, z] of [[-1.02, -1.5], [1.02, -1.5], [-1.02, 1.45], [1.02, 1.45]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .34, 12), M(0x1d1d1f));
    w.rotation.z = Math.PI / 2; w.position.set(x, .52, z); w.castShadow = true; g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;
  g.userData.seat = new THREE.Vector3(0, 1.5, -0.4);
  return g;
}

/* 坦克（敌方 M26 风格 / 可击毁后抢占）。炮塔可转，炮管朝 -Z */
export function makeTank(team = 'us') {
  const g = new THREE.Group();
  const hullC = team === 'us' ? 0x4c5138 : 0x5a5640;
  g.add(box(2.7, .7, 4.6, 0x26251f, 0, .5, 0));              // 履带底
  g.add(box(2.35, .8, 4.1, hullC, 0, 1.0, 0));               // 车体
  g.add(box(2.0, .5, 1.2, hullC, 0, 1.55, -1.5));            // 车体前坡
  const turret = new THREE.Group(); turret.position.set(0, 1.65, .2); g.add(turret);
  turret.add((() => { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, .7, 12), M(hullC)); t.castShadow = true; return t; })());
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 3.0, 8), M(0x202024));
  barrel.rotation.x = -Math.PI / 2; barrel.position.set(0, .05, -1.85); barrel.castShadow = true; turret.add(barrel);
  const hatch = box(.5, .18, .5, 0x393d2a, 0, .42, .35); turret.add(hatch);
  for (const [x, z] of [[-1.32, -1.4], [1.32, -1.4], [-1.32, 1.4], [1.32, 1.4]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .4, 12), M(0x19181a));
    w.rotation.z = Math.PI / 2; w.position.set(x, .55, z); g.add(w);
  }
  g.userData.turret = turret;
  g.userData.seat = new THREE.Vector3(0, 2.3, .2);
  return g;
}

/* 重机枪 / 迫击炮阵地（沙袋 + 武器） */
export function makeGunEmplacement(kind) {
  const g = new THREE.Group();
  const sand = 0x85775b;
  for (let i = 0; i < 5; i++) { const a = -0.7 + i * .35; g.add(box(1.0, .5, .5, sand, Math.cos(a) * 1.5, .25, Math.sin(a) * 1.5)); }
  if (kind === 'mg') {
    const tri = box(.12, .7, .12, 0x2b2924, 0, .55, 0); g.add(tri);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 1.1, 8), M(0x19191c));
    body.rotation.x = -Math.PI / 2; body.position.set(0, .95, -.4); body.castShadow = true; g.add(body);
    g.add(box(.3, .18, .2, 0x19191c, 0, .9, .1));           // 机匣
  } else { // 迫击炮：朝斜前的粗管
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.1, .13, 1.2, 10), M(0x232326));
    tube.rotation.x = -Math.PI / 2 + .55; tube.position.set(0, .7, -.2); tube.castShadow = true; g.add(tube);
    g.add(box(.5, .08, .5, 0x2b2924, 0, .12, 0));
  }
  return g;
}

/* 补给箱：ammo 弹药 / med 医疗 */
export function makeCrate(kind) {
  const g = new THREE.Group();
  g.add(box(.8, .6, .8, 0x7a5f34, 0, .3, 0));
  g.add(box(.84, .08, .84, 0x5f4826, 0, .62, 0));
  if (kind === 'med') {
    g.add(box(.5, .12, .12, 0xd8d6cf, 0, .68, 0));
    g.add(box(.12, .12, .5, 0xd8d6cf, 0, .68, 0));
    g.add(box(.34, .08, .08, 0xc22, 0, .71, 0));
    g.add(box(.08, .08, .34, 0xc22, 0, .71, 0));
  } else {
    for (let i = -1; i <= 1; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .34, 6), M(0xc9a23a)); b.rotation.x = Math.PI / 2; b.position.set(i * .18, .72, -.1); g.add(b); }
  }
  g.userData.kind = kind;
  return g;
}

/* 后方医疗营地帐篷（红十字），靠近持续回血 */
export function makeMedTent() {
  const g = new THREE.Group();
  const tent = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.6, 4), M(0xb7ad92)); tent.position.y = 1.3; tent.rotation.y = Math.PI / 4; tent.scale.z = 1.5; tent.castShadow = true; g.add(tent);
  g.add(box(.1, 2.0, 3.4, 0x6e6755, 0, 1.0, 0));          // 中柱
  const crossV = box(.18, 1.0, .05, 0xc22, 0, 1.7, 1.42);
  const crossH = box(.6, .18, .05, 0xc22, 0, 1.85, 1.42);
  g.add(crossV, crossH);
  return g;
}

/* 地雷：低矮暗色圆盘，接近/碾过触发，可被子弹打爆 */
export function makeMine() {
  const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.CylinderGeometry(.26, .3, .12, 10), M(0x2e2c26)); d.position.y = .07; d.castShadow = true; g.add(d);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .1, 6), M(0x5a1410)); n.position.y = .16; g.add(n);
  g.userData.radius = 1.7;
  return g;
}

/* 冰面（长津湖夜战）：反光浅蓝湖 */
export function makeIceLake(radius) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 40),
    new THREE.MeshLambertMaterial({ color: 0x9fb6cc, transparent: true, opacity: .82 }));
  m.rotation.x = -Math.PI / 2; m.position.y = .12; m.receiveShadow = true;
  return m;
}
