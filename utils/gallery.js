// Scroll-driven 3D gallery. One progress value p in [0, 1] drives the camera.
// Lenis owns the scroll; this module only reads it. Camera keys and dwell easing are unchanged.
import * as THREE from 'three'

export async function mountGallery({ canvas, cta, track, names = {}, images = {} }) {
  await document.fonts.load('400 40px Farhang')
  await document.fonts.load('300 40px Farhang')
  const nameOf = (slug, fallback) => names[slug] || fallback

const C = { slate: 0x2f3a45, tan: 0xa88a6a, brass: 0xbe9c68 };
const H = 4.6;           // wall height (m)

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8e4de);
const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 120);

// ---------- textures ----------
const loader = new THREE.TextureLoader();
function tex(url, rx = 1, ry = 1) {
  const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}
const mats = {};
function wallMat(name, tint = 0xffffff) {
  return new THREE.MeshStandardMaterial({ map: tex(`/gallery/tex/${name}.jpg`), color: tint, roughness: 0.95 });
}
// smooth matte museum plaster; rooms differ only by a faint greige tint
mats.sand = wallMat('plaster', 0xf2ede6); mats.grey = wallMat('plaster', 0xe6e4e0); mats.slate = wallMat('plaster', 0xebe6df);
mats.accent = new THREE.MeshStandardMaterial({ color: C.slate, roughness: 0.95 });
mats.floor = new THREE.MeshStandardMaterial({ map: tex('/gallery/tex/concrete.jpg', 1, 1), roughness: 0.38, metalness: 0.02 });
mats.stone = new THREE.MeshStandardMaterial({ map: tex('/gallery/tex/concrete.jpg'), color: 0xf3eee4, roughness: 0.8 });
mats.ceiling = new THREE.MeshStandardMaterial({ color: 0xd9d5cf, roughness: 1 });
mats.brass = new THREE.MeshStandardMaterial({ color: C.brass, metalness: 0.85, roughness: 0.35 });

function radialTexture(inner = 'rgba(255,226,180,0.55)') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, inner); r.addColorStop(0.5, inner.replace(/[\d.]+\)$/, '0.18)')); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const poolTex = radialTexture();
const shadowTex = radialTexture('rgba(0,0,0,0.9)');

// ---------- architecture ----------
// Rooms run along -z. Each partition wall has a door opening at doorX.
const W = 9; // room width
const rooms = [
  { z0: 0,   z1: -10, mat: 'slate', doorX: 2.6 },  // 0 entrance
  { z0: -10, z1: -20, mat: 'sand',  doorX: -2.6 }, // 1 plinth
  { z0: -20, z1: -30, mat: 'grey',  doorX: 2.6 },  // 2 plate wall
  { z0: -30, z1: -40, mat: 'sand',  doorX: -2.6 }, // 3 niche
  { z0: -40, z1: -52, mat: 'grey',  doorX: 2.6 },  // 4 long plinth
  { z0: -52, z1: -62, mat: 'slate', doorX: -2.6 }, // 5 dark room
  { z0: -62, z1: -74, mat: 'sand',  doorX: null }, // 6 exit
];
function plane(w, h, mat, pos, rotY = 0, repeat = true) {
  const m = mat.clone(); if (m.map && repeat) { m.map = m.map.clone(); m.map.repeat.set(w / 3, h / 3); m.map.needsUpdate = true; }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.position.copy(pos); mesh.rotation.y = rotY; mesh.receiveShadow = true; scene.add(mesh); return mesh;
}
function partition(z, doorX, matA, matB) {
  // wall facing +z (seen from room before) built around a 2.2 x 3.2 door
  const dw = 2.2, dh = 3.2, half = W / 2;
  const segs = doorX === null ? [[-half, half]] : [[-half, doorX - dw / 2], [doorX + dw / 2, half]];
  for (const [a, b] of segs) {
    plane(b - a, H, mats[matA], new THREE.Vector3((a + b) / 2, H / 2, z + 0.01));
    plane(b - a, H, mats[matB], new THREE.Vector3((a + b) / 2, H / 2, z - 0.01), Math.PI);
  }
  if (doorX !== null) {
    plane(dw, H - dh, mats[matA], new THREE.Vector3(doorX, dh + (H - dh) / 2, z + 0.01));
    plane(dw, H - dh, mats[matB], new THREE.Vector3(doorX, dh + (H - dh) / 2, z - 0.01), Math.PI);
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.08, 0.04, 0.08), mats.brass); jamb.position.set(doorX, dh, z); scene.add(jamb);
  }
}
rooms.forEach((r, i) => {
  const d = r.z0 - r.z1, zc = (r.z0 + r.z1) / 2;
  if (i === 3) { // left wall of the niche room leaves space for the niche face
    plane(2.6, H, mats[r.mat], new THREE.Vector3(-W / 2, H / 2, -31.3), Math.PI / 2);
    plane(2.6, H, mats[r.mat], new THREE.Vector3(-W / 2, H / 2, -38.7), Math.PI / 2);
  } else plane(d, H, mats[r.mat], new THREE.Vector3(-W / 2, H / 2, zc), Math.PI / 2);
  plane(d, H, mats[r.mat], new THREE.Vector3(W / 2, H / 2, zc), -Math.PI / 2);
  const f = plane(W, d, mats.floor, new THREE.Vector3(0, 0, zc)); f.rotation.x = -Math.PI / 2; f.rotation.y = 0;
  f.material.map.repeat.set(W / 2.5, d / 2.5);
  const c = plane(W, d, mats.ceiling, new THREE.Vector3(0, H, zc)); c.rotation.x = Math.PI / 2;
  // brass skirting
  for (const sx of [-1, 1]) { // shadow gap + light baseboard
    const gap = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.018, d), new THREE.MeshBasicMaterial({ color: 0x2a2622 })); gap.position.set(sx * (W / 2 - 0.004), 0.009, zc); scene.add(gap);
    const bb = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, d), new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.8 })); bb.position.set(sx * (W / 2 - 0.012), 0.018 + 0.035, zc); scene.add(bb);
  }
  const next = rooms[i + 1];
  partition(r.z1, r.doorX, r.mat, next ? next.mat : r.mat);
  if (i === 0) plane(W, H, mats.slate, new THREE.Vector3(0, H / 2, r.z0 + 0.0), Math.PI);
});

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xfff6ec, 0x8a8278, 0.55); scene.add(hemi);
function spot(x, y, z, tx, ty, tz, intensity = 60, angle = 0.38, shadow = false) {
  const s = new THREE.SpotLight(0xffd9a8, intensity, 14, angle, 0.65, 1.6);
  s.position.set(x, y, z); s.target.position.set(tx, ty, tz); scene.add(s, s.target);
  if (shadow) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.radius = 6; s.shadow.bias = -0.0005; }
  return s;
}
function pool(pos, rotY, size = 2.4, opacity = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 1.3),
    new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: opacity * 0.35, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  m.position.copy(pos); m.rotation.y = rotY; scene.add(m); return m;
}

// ---------- labels (canvas, Persian RTL) ----------
const fa = n => String(n).padStart(2, '0').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
function label(name, no, dark = false) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 300;
  const g = c.getContext('2d'); g.direction = 'rtl'; g.textAlign = 'right';
  const ink = dark ? '#ece6da' : '#2c343c', sub = dark ? '#d0b48a' : '#6f5134';
  g.fillStyle = '#be9c68'; g.fillRect(768 - 150, 18, 130, 3);
  g.fillStyle = ink; let size = 64; g.font = '400 ' + size + 'px Farhang';
  while (size > 30 && g.measureText(name).width > 700) { size -= 2; g.font = '400 ' + size + 'px Farhang'; }
  g.fillText(name, 748, 104);
  g.fillStyle = sub; g.font = '400 44px Farhang'; g.fillText('سرامیک دست‌ساز • پیله پاتری', 748, 182);
  g.fillStyle = ink; g.font = '300 44px Farhang'; g.fillText(`شماره ${fa(no)}`, 748, 254);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.28), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, opacity: 0.92 }));
}
function placeLabel(mesh, pos, rotY) { // lift labels 4cm off the wall so they never z-fight with light pools
  mesh.position.copy(pos).add(new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).multiplyScalar(0.04));
  mesh.rotation.y = rotY; mesh.renderOrder = 2; scene.add(mesh); }

// ---------- products ----------
const billboards = [];
function cutout(file, height, pos, { billboard = true, rotY = 0, wall = false, shadow = true } = {}) {
  const t = loader.load(`/gallery/img/${file}`, tt => {
    const a = tt.image.width / tt.image.height; mesh.scale.set(height * a, height, 1);
    if (shadowMesh) shadowMesh.scale.set(height * a * 1.25, height * a * 0.32, 1);
  });
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, wall ? 0 : 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.6, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.position.copy(pos); mesh.rotation.y = rotY; scene.add(mesh);
  let shadowMesh = null;
  if (shadow && !wall) {
    shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    shadowMesh.rotation.x = -Math.PI / 2; shadowMesh.position.set(pos.x, pos.y + 0.003, pos.z); scene.add(shadowMesh);
  }
  if (billboard && !wall) billboards.push({ mesh, base: rotY });
  return mesh;
}
function plinth(w, h, d, x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.stone.clone());
  m.material.map = m.material.map.clone(); m.material.map.repeat.set(Math.max(w, d) / 1.5, h / 1.5); m.material.map.needsUpdate = true;
  m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Room 0: entrance signage on partition at z=-10 (left of door)
{
  const t = loader.load('/gallery/img/logo.png'); t.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.62), new THREE.MeshStandardMaterial({ map: t, transparent: true, metalness: 0.7, roughness: 0.35, color: 0xffffff, emissive: 0x3a2a14 }));
  logo.position.set(-1.2, 2.55, -9.97); scene.add(logo);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 300; const g = c.getContext('2d');
  g.direction = 'rtl'; g.textAlign = 'center'; g.fillStyle = '#2f3a45'; g.font = '300 130px Farhang'; g.fillText('پیله پاتری', 512, 140);
  g.fillStyle = '#be9c68'; g.fillRect(412, 180, 200, 3); g.fillStyle = '#7a5c3c'; g.font = '300 56px Farhang'; g.fillText('سرامیک', 512, 262);
  const tt = new THREE.CanvasTexture(c); tt.colorSpace = THREE.SRGBColorSpace;
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.5), new THREE.MeshBasicMaterial({ map: tt, transparent: true, toneMapped: false }));
  txt.position.set(-1.2, 1.35, -9.96); scene.add(txt);
  spot(-1.2, H - 0.05, -9.2, -1.2, 2.3, -10, 45, 0.45);
  pool(V(-1.2, 2.6, -9.95), 0, 3.2, 0.7);
}
// Room 1: cube plinth + hero mug
plinth(1.0, 1.0, 1.0, 0, -15);
cutout('c07.png', 0.36, V(0, 1.0, -15));
placeLabel(label(nameOf('mug-marble', 'ماگ'), 7), V(-3.0, 1.55, -19.97), 0);
spot(0, H - 0.05, -14.2, 0, 1.0, -15, 70, 0.32, true);
pool(V(0, 2.8, -19.97), 0, 3.4, 0.3);

// Room 2: plate wall on right wall (x=+4.5), viewer faces +x
const plateZ = [-22.4, -24.4, -26.6, -28.4];
const plates = [['c15.png', 15, nameOf('wall-sunflower', 'دیوارکوب')], ['c16.png', 16, nameOf('wall-crow', 'بشقاب دیوارکوب کلاغ')], ['p10', 10, nameOf('clock-butterfly', 'ساعت دیواری پروانه')], ['c13.png', 13, nameOf('wall-rose', 'دیوارکوب')]];
plates.forEach(([f, no, name], i) => {
  const z = plateZ[i], wx = W / 2 - 0.02;
  if (f === 'p10') { // framed photo
    const t = loader.load(images['clock-butterfly'] || '/gallery/img/p10.jpg'); t.colorSpace = THREE.SRGBColorSpace;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.16, 0.92), mats.brass);
    frame.position.set(wx - 0.025, 2.0, z); scene.add(frame);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.1), new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.9 }));
    mat.position.set(wx - 0.055, 2.0, z); mat.rotation.y = -Math.PI / 2; scene.add(mat);
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.9), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }));
    ph.position.set(wx - 0.058, 2.0, z); ph.rotation.y = -Math.PI / 2; scene.add(ph);
  } else {
    cutout(f, 0.8, V(wx - 0.03, 2.0, z), { wall: true, rotY: -Math.PI / 2 });
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    sh.position.set(wx - 0.01, 1.93, z + 0.05); sh.rotation.y = -Math.PI / 2; scene.add(sh);
  }
  placeLabel(label(name, no), V(wx - 0.01, 1.15, z), -Math.PI / 2);
  spot(wx - 2.2, H - 0.05, z, wx, 2.0, z, 38, 0.3);
  pool(V(wx - 0.005, 2.3, z), -Math.PI / 2, 1.7, 0.28);
});

// Room 3: arched niche in left wall (x=-4.5), viewer faces -x
{
  const nz = -35, nx = -W / 2, nw = 1.9, nh = 2.6, nd = 0.6, y0 = 0.9;
  const inner = mats.sand.clone(); inner.side = THREE.BackSide; inner.color = new THREE.Color(0xe4ddd2);
  const recess = new THREE.Mesh(new THREE.BoxGeometry(nd, nh, nw), inner);
  recess.position.set(nx - nd / 2 + 0.01, y0 + nh / 2, nz); recess.receiveShadow = true; scene.add(recess);
  const shape = new THREE.Shape(); shape.moveTo(-2.4, -y0); shape.lineTo(2.4, -y0); shape.lineTo(2.4, H - y0); shape.lineTo(-2.4, H - y0); shape.lineTo(-2.4, -y0);
  const hole = new THREE.Path(); hole.moveTo(-nw / 2, 0); hole.lineTo(nw / 2, 0); hole.lineTo(nw / 2, nh - nw / 2); hole.absarc(0, nh - nw / 2, nw / 2, 0, Math.PI, false); hole.lineTo(-nw / 2, 0);
  shape.holes.push(hole);
  const sm = mats.sand.clone(); sm.map = sm.map.clone(); sm.map.repeat.set(1 / 3, 1 / 3); sm.map.needsUpdate = true;
  const face = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), sm);
  face.position.set(nx + 0.02, y0, nz); face.rotation.y = Math.PI / 2; face.receiveShadow = true; scene.add(face);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(nd + 0.04, 0.08, nw), mats.stone); shelf.position.set(nx - nd / 2 + 0.03, y0 + 0.04, nz); shelf.receiveShadow = true; scene.add(shelf);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(nw / 2 + 0.02, 0.012, 8, 48, Math.PI), mats.brass); trim.position.set(nx + 0.03, y0 + nh - nw / 2, nz); trim.rotation.y = Math.PI / 2; scene.add(trim);
  [['c03.png', 0.46, -0.55], ['c04.png', 0.33, 0], ['c05.png', 0.33, 0.55]].forEach(([f, h, dz]) => cutout(f, h, V(nx - 0.3, y0 + 0.08, nz + dz), { rotY: Math.PI / 2 }));
  spot(nx - 0.3, y0 + nh - 0.05, nz, nx - 0.3, y0, nz, 18, 0.7, true);
  placeLabel(label(nameOf('shot-trio-ridged', 'شات‌های شیاردار'), 3), V(nx + 0.03, 1.6, nz + 1.8), Math.PI / 2);
}

// Room 4: long plinth along right wall
plinth(0.9, 0.55, 7.0, 3.3, -46);
[['c11.png', 0.5, -43.8, 11, nameOf('ashtray-bloom', 'زیرسیگاری')], ['c12.png', 0.28, -46, 12, nameOf('shot-tray-set', 'ست شات با سینی')], ['c09.png', 0.32, -48.2, 9, nameOf('gift-floral-set', 'ست هدیه')]].forEach(([f, h, z, no, name]) => {
  cutout(f, h, V(3.3, 0.55, z), { rotY: -Math.PI / 2 });
  spot(1.5, H - 0.05, z, 3.3, 0.55, z, 45, 0.3, z === -46);
  pool(V(W / 2 - 0.01, 2.0, z), -Math.PI / 2, 1.9, 0.3);
  placeLabel(label(name, no), V(W / 2 - 0.01, 1.55, z), -Math.PI / 2);
});

// Room 5: dark room, crow plate on left wall in front of a slate accent wall
{
  const z = -57, wx = -W / 2 + 0.02;
  const acc = new THREE.Mesh(new THREE.PlaneGeometry(3.4, H), mats.accent); acc.position.set(-W / 2 + 0.008, H / 2, z); acc.rotation.y = Math.PI / 2; acc.receiveShadow = true; scene.add(acc);
  cutout('c16.png', 1.25, V(wx + 0.03, 2.1, z), { wall: true, rotY: Math.PI / 2 }).material.color.set(0xc9c4bc);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.66, 48), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.7 }));
  sh.position.set(wx + 0.01, 2.0, z - 0.06); sh.rotation.y = Math.PI / 2; scene.add(sh);
  spot(wx + 2.4, H - 0.05, z, wx, 2.1, z, 11, 0.24);
  pool(V(wx + 0.005, 2.4, z), Math.PI / 2, 3.0, 0.5);
  placeLabel(label(nameOf('wall-crow', 'بشقاب دیوارکوب کلاغ'), 16, true), V(wx + 0.01, 1.05, z + 1.1), Math.PI / 2);
}

// Slogans on the walls along the walk
function slogan(text, pos, rotY, width = 3.2) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 256; const g = c.getContext('2d');
  g.direction = 'rtl'; g.textAlign = 'center'; g.fillStyle = '#2f3a45'; g.font = '300 120px Farhang'; g.fillText(text, 1024, 150);
  g.fillStyle = '#be9c68'; g.fillRect(944, 212, 160, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
  m.position.copy(pos); m.rotation.y = rotY; m.renderOrder = 2; scene.add(m);
}
slogan('هر قطعه یک قصه و هر قصه برای شماست', V(1.4, 2.75, -19.95), 0, 4.2);
slogan('نبوغ در سادگی‌ست', V(0, 3.85, -73.95), 0, 6.0);

// Room 6: exit — bright doorway on far wall
{
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ color: 0xfff6e8 }));
  glow.position.set(0, 1.6, -73.98); scene.add(glow);
  const pl = new THREE.PointLight(0xfff0dc, 30, 16, 1.5); pl.position.set(0, 3.4, -70); scene.add(pl);
}
// general fill lights per room
rooms.forEach((r, i) => { const l = new THREE.PointLight(0xffe2c0, r.mat === 'slate' ? 5 : 6, 12, 1.6); l.position.set(0, H - 0.4, (r.z0 + r.z1) / 2); scene.add(l); });

// ---------- camera path ----------
// Keys: [pos, target, fov, weight] — the camera eases into each key (velocity → 0), creating a dwell.
// Keys: [pos, target, fov, dwell]. Dwell keys ease to a stop (the eye lands on a piece);
// pass-through keys (door openings) keep walking speed, so motion stays C1-continuous.
const D = true, P = false;
const keys = [
  [V(1.6, 1.62, -1.0),  V(-0.4, 2.0, -10),  52, D], // entrance hall
  [V(-0.4, 1.6, -5.8),  V(-1.2, 2.3, -10),  40, D], // brass signage
  [V(2.6, 1.62, -8.6),  V(2.6, 1.5, -14),   50, P], // door 1
  [V(2.4, 1.62, -11.4), V(0, 1.1, -15),     48, P],
  [V(1.2, 1.5, -13.0),  V(0, 1.15, -15),    36, D], // hero mug
  [V(-1.6, 1.62, -17.0),V(-2.6, 1.6, -21),  50, P],
  [V(-2.6, 1.62, -20.0),V(-1, 1.7, -24),    50, P], // door 2
  [V(-0.6, 1.62, -23.4),V(4.5, 2.0, -24.6), 46, D], // plate wall
  [V(1.8, 1.62, -26.4), V(4.5, 1.9, -26.6), 36, D], // framed clock
  [V(2.6, 1.62, -28.8), V(2.6, 1.5, -34),   50, P], // door 3
  [V(2.4, 1.62, -31.4), V(-4.5, 1.4, -35),  50, P],
  [V(-1.4, 1.45, -34.6),V(-4.8, 1.25, -35), 38, D], // niche
  [V(-2.6, 1.62, -38.6),V(-2.6, 1.5, -42),  50, P], // door 4
  [V(-2.4, 1.62, -41.6),V(3.3, 0.8, -44),   50, P],
  [V(0.6, 1.35, -41.6), V(3.3, 0.8, -44.4), 38, D], // long plinth
  [V(1.6, 1.25, -47.6), V(3.3, 0.72, -48.2),34, D],
  [V(2.6, 1.62, -50.6), V(2.6, 1.5, -55),   50, P], // door 5
  [V(2.2, 1.62, -53.6), V(-4.5, 2.0, -57),  50, P],
  [V(-1.4, 1.62, -56.2),V(-4.5, 2.1, -57),  36, D], // crow plate
  [V(-2.6, 1.62, -61.2),V(-2.6, 1.6, -66),  50, P], // door 6
  [V(-2.0, 1.62, -63.6),V(0, 1.7, -74),     50, P],
  [V(0, 1.62, -66.5),   V(0, 1.7, -74),     46, D], // exit
];
const posCurve = new THREE.CatmullRomCurve3(keys.map(k => k[0]), false, 'centripetal');
const tgtCurve = new THREE.CatmullRomCurve3(keys.map(k => k[1]), false, 'centripetal');
const N = keys.length - 1;
// Segment profiles with matched end slopes (0 at dwell keys, 1 at pass-through keys).
function segEase(t, startDwell, endDwell) {
  if (startDwell && endDwell) return t * t * t * (t * (t * 6 - 15) + 10);
  if (startDwell) return 2 * t * t - t * t * t;
  if (endDwell) return t + t * t - t * t * t;
  return t;
}
function applyProgress(p) {
  const s = Math.min(N - 1e-6, Math.max(0, p * N)), i = Math.floor(s), f = segEase(s - i, keys[i][3], keys[i + 1][3]), u = (i + f) / N;
  camera.position.copy(posCurve.getPoint(u));
  camera.lookAt(tgtCurve.getPoint(u));
  camera.fov = THREE.MathUtils.lerp(keys[i][2], keys[i + 1][2], THREE.MathUtils.smootherstep(s - i, 0, 1)); camera.updateProjectionMatrix();
  for (const b of billboards) { // slow partial turn toward the viewer
    const a = Math.atan2(camera.position.x - b.mesh.position.x, camera.position.z - b.mesh.position.z);
    let d = a - b.base; d = Math.atan2(Math.sin(d), Math.cos(d)); b.mesh.rotation.y = b.base + THREE.MathUtils.clamp(d, -0.6, 0.6) * 0.7;
  }
  if (cta) {
    const shown = THREE.MathUtils.smoothstep(p, 0.94, 0.995)
    cta.style.opacity = String(shown)
    cta.style.pointerEvents = shown > 0.35 ? 'auto' : 'none'
  }
}


function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
resize()

let raf = 0
function frame() {
  const max = Math.max(1, track.offsetHeight - innerHeight)
  const top = track.getBoundingClientRect().top + window.scrollY
  const p = Math.min(1, Math.max(0, (window.scrollY - top) / max))
  applyProgress(p)
  if (window.scrollY > top + max + 12 && cta) { cta.style.opacity = '0'; cta.style.pointerEvents = 'none' }
  renderer.render(scene, camera)
  raf = requestAnimationFrame(frame)
}
raf = requestAnimationFrame(frame)

return () => {
  cancelAnimationFrame(raf)
  removeEventListener('resize', resize)
  scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose()
    const material = obj.material
    if (!material) return
    for (const m of [].concat(material)) {
      if (m.map) m.map.dispose()
      m.dispose?.()
    }
  })
  renderer.dispose()
}
}
