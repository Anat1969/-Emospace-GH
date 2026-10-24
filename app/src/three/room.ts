import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { kelvinToHex } from '../lib/color';
import type { SceneParams } from '../lib/types';
import { artTexture, fabricTexture, plasterTexture, rng, shaftMaterial, skyMaterial, stoneTexture, woodTexture } from './textures';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface WorldOptions { hero?: boolean; reducedMotion?: boolean }

/** A furnished room generated from the emotional analysis. */
export class RoomWorld {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private room = new THREE.Group();
  private sun = new THREE.DirectionalLight('#ffffff', 2);
  private hemi = new THREE.HemisphereLight('#dfe8f0', '#806650', 0.4);
  private lamps: { light: THREE.PointLight | THREE.SpotLight; shade?: THREE.MeshStandardMaterial; peak: number }[] = [];
  private sky = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), skyMaterial());
  private shaft = new THREE.Mesh(new THREE.BufferGeometry(), shaftMaterial());
  private dust!: THREE.Points;
  private plants: THREE.Object3D[] = [];
  private water: THREE.Mesh | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private hour = 10;
  private intro = 0;
  private params!: SceneParams;
  private win = { x: 0, z0: 0, z1: 0, sill: 0, head: 0 };
  private running = false;
  private observer: ResizeObserver;
  autoTime = false;

  constructor(private host: HTMLElement, private opts: WorldOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.9;
    this.controls.maxPolarAngle = 1.75;
    this.controls.minAzimuthAngle = -0.75;
    this.controls.maxAzimuthAngle = 0.75;
    this.controls.enabled = !opts.hero;

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -7;
    sc.right = sc.top = 7;
    sc.near = 0.5;
    sc.far = 40;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.sky, this.room, this.shaft);
    this.shaft.renderOrder = 10;

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }

  private resize() {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 68 : 50;
    this.camera.updateProjectionMatrix();
  }

  build(p: SceneParams) {
    this.params = p;
    this.clear();
    const seed = Math.round(p.curvature * 1000 + p.nature * 100 + p.ceiling * 10);
    const r = rng(seed);
    const W = p.width;
    const D = p.depth;
    const H = p.ceiling;
    const rad = Math.max(0, Math.min(W / 2 - 1.4, D / 2 - 0.6, 2.2) * smooth(0.3, 0.9, p.curvature));

    // Window on the left wall
    const ww = Math.min(D - 1.2, 1.2 + p.windowRatio * D * 1.9);
    const zc = -0.25;
    const sill = p.windowRatio > 0.36 ? 0.15 : 0.75;
    const head = Math.min(H - 0.2, 2.25 + (H - 2.6) * 0.75);
    this.win = { x: -W / 2, z0: zc - ww / 2, z1: zc + ww / 2, sill, head };

    // Plan outline: front-left → back → front-right (front side open toward the viewer)
    const pts: THREE.Vector2[] = [];
    const line = (ax: number, az: number, bx: number, bz: number, extra: number[] = []) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.ceil(len / 0.4));
      const ts = new Set<number>();
      for (let i = 0; i < n; i++) ts.add(i / n);
      for (const t of extra) if (t > 0 && t < 1) ts.add(t);
      [...ts].sort((a, b) => a - b).forEach((t) => pts.push(new THREE.Vector2(ax + (bx - ax) * t, az + (bz - az) * t)));
    };
    const arc = (cx: number, cz: number, a0: number, a1: number) => {
      const n = Math.max(2, Math.ceil(rad * 10));
      for (let i = 0; i < n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        pts.push(new THREE.Vector2(cx + rad * Math.cos(a), cz + rad * Math.sin(a)));
      }
    };
    const leftLen = D - rad;
    line(-W / 2, D / 2, -W / 2, -D / 2 + rad, [(D / 2 - this.win.z1) / leftLen, (D / 2 - this.win.z0) / leftLen]);
    if (rad > 0.01) arc(-W / 2 + rad, -D / 2 + rad, Math.PI, Math.PI * 1.5);
    line(-W / 2 + rad, -D / 2, W / 2 - rad, -D / 2);
    if (rad > 0.01) arc(W / 2 - rad, -D / 2 + rad, Math.PI * 1.5, Math.PI * 2);
    line(W / 2, -D / 2 + rad, W / 2, D / 2);
    pts.push(new THREE.Vector2(W / 2, D / 2));

    const wallMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: plasterTexture(p.wall, seed), roughness: 0.92, side: THREE.DoubleSide });
    const walls = new THREE.Mesh(this.wallGeometry(pts, H), wallMat);
    walls.castShadow = walls.receiveShadow = true;
    this.room.add(walls);

    // Thin outer skin so the walls read as solid from outside the window
    const shape = new THREE.Shape(pts.map((v) => new THREE.Vector2(v.x, -v.y)));
    const floorTex =
      p.floorKind === 'wood' ? woodTexture(p.floor, seed) : p.floorKind === 'terrazzo' ? stoneTexture(p.wall, seed, [p.secondary, p.accent, p.floor]) : stoneTexture(p.floor, seed);
    const floor = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 24),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: p.floorKind === 'wood' ? 0.55 : 0.4, envMapIntensity: 0.6 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.room.add(floor);

    const ceilShape = new THREE.Shape(pts.map((v) => new THREE.Vector2(v.x, v.y)));
    const ceil = new THREE.Mesh(new THREE.ShapeGeometry(ceilShape, 24), new THREE.MeshStandardMaterial({ color: p.wall, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    ceil.castShadow = true;
    this.room.add(ceil);

    // Window frame, glass and a ground plane outside
    const frameMat = new THREE.MeshStandardMaterial({ color: p.anchor, roughness: 0.5, metalness: 0.3 });
    const fx = this.win.x;
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      b.castShadow = b.receiveShadow = true;
      this.room.add(b);
      return b;
    };
    const wh = head - sill;
    box(0.25, 0.05, ww + 0.05, fx - 0.08, sill, zc, frameMat);
    box(0.25, 0.05, ww + 0.05, fx - 0.08, head, zc, frameMat);
    box(0.25, wh, 0.05, fx - 0.08, sill + wh / 2, this.win.z0, frameMat);
    box(0.25, wh, 0.05, fx - 0.08, sill + wh / 2, this.win.z1, frameMat);
    const mullions = Math.max(1, Math.round(ww / 1.1));
    for (let i = 1; i < mullions; i++) box(0.06, wh, 0.03, fx - 0.08, sill + wh / 2, this.win.z0 + (ww * i) / mullions, frameMat);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(ww, wh),
      new THREE.MeshPhysicalMaterial({ color: '#dfeef2', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 1.2 }),
    );
    glass.rotation.y = Math.PI / 2;
    glass.position.set(fx - 0.1, sill + wh / 2, zc);
    this.room.add(glass);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: p.nature > 0.45 ? '#7e9466' : '#c9b79a', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.room.add(ground);
    const outside = Math.round(4 + p.nature * 14);
    for (let i = 0; i < outside; i++) {
      const tree = this.tree(r, 2.5 + r() * 4);
      tree.position.set(-W / 2 - 4 - r() * 18, 0, -12 + r() * 22);
      this.room.add(tree);
    }

    this.furnish(p, r, W, D, H, rad);

    // Light shaft and floating dust
    this.dust = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 540 }, () => r()), 3)),
      new THREE.PointsMaterial({ color: '#fff4dc', size: 0.008, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.room.add(this.dust);

    const startZ = D / 2 + (this.opts.hero ? 1.6 : 1.1);
    this.controls.target.set(0.2, this.camera.aspect < 1 ? 0.9 : 1.15, -0.4);
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = D / 2 + 2.6;
    this.camera.position.set(1.2, 1.7, startZ + 1.5);
    this.intro = 0;
    this.setHour(this.hour);
  }

  private wallGeometry(pts: THREE.Vector2[], H: number) {
    const pos: number[] = [];
    const nor: number[] = [];
    const uv: number[] = [];
    const normals = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const n = new THREE.Vector2(-(b.y - a.y), b.x - a.x).normalize();
      if (n.dot(new THREE.Vector2(-p.x, -p.y)) < 0) n.negate();
      return n;
    });
    let u = 0;
    const quad = (i: number, y0: number, y1: number, u0: number, u1: number) => {
      const a = pts[i];
      const b = pts[i + 1];
      const na = normals[i];
      const nb = normals[i + 1];
      const v = [
        [a, na, u0, y0], [b, nb, u1, y0], [b, nb, u1, y1],
        [a, na, u0, y0], [b, nb, u1, y1], [a, na, u0, y1],
      ] as const;
      for (const [p, n, uu, y] of v) {
        pos.push(p.x, y, p.y);
        nor.push(n.x, 0, n.y);
        uv.push(uu / 2, y / 2);
      }
    };
    const { x, z0, z1, sill, head } = this.win;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = a.distanceTo(b);
      const mz = (a.y + b.y) / 2;
      const inWindow = Math.abs(a.x - x) < 1e-3 && Math.abs(b.x - x) < 1e-3 && mz > z0 && mz < z1;
      if (inWindow) {
        quad(i, 0, sill, u, u + len);
        quad(i, head, H, u, u + len);
      } else quad(i, 0, H, u, u + len);
      u += len;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  }

  private furnish(p: SceneParams, r: () => number, W: number, D: number, H: number, rad: number) {
    const fabric = fabricTexture();
    const textile = new THREE.MeshPhysicalMaterial({ color: p.textile, map: fabric, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#ffffff').lerp(new THREE.Color(p.textile), 0.5), sheenRoughness: 0.6 });
    const accentFab = new THREE.MeshPhysicalMaterial({ color: p.accent, map: fabric, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(p.accent), sheenRoughness: 0.5 });
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture(p.floorKind === 'wood' ? p.floor : '#a07650', 9), roughness: 0.5 });
    const anchor = new THREE.MeshStandardMaterial({ color: p.anchor, roughness: 0.6 });
    const brass = new THREE.MeshStandardMaterial({ color: '#b8925a', metalness: 1, roughness: 0.32 });
    const add = (o: THREE.Object3D) => {
      o.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) c.castShadow = c.receiveShadow = true;
      });
      this.room.add(o);
      return o;
    };
    const rbox = (w: number, h: number, d: number, radius: number, m: THREE.Material) =>
      new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, h / 2 - 0.001, w / 2 - 0.001, d / 2 - 0.001)), m);
    const soft = 0.04 + p.curvature * 0.12;
    const backZ = -D / 2;

    // Rug
    const rugMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.secondary).lerp(new THREE.Color(p.wall), 0.35), map: fabric, roughness: 1 });
    const rug = new THREE.Mesh(p.curvature > 0.5 ? new THREE.CircleGeometry(1.6, 64) : new THREE.PlaneGeometry(3.4, 2.4), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0.3, 0.006, -0.2);
    if (p.curvature > 0.5) rug.scale.set(1.25, 0.9, 1);
    rug.receiveShadow = true;
    this.room.add(rug);

    // Sofa: straight or arcing, facing the viewer with its back toward the rear wall
    const sofa = new THREE.Group();
    if (p.curvature > 0.62) {
      const R = 2.1;
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = -0.55 + (1.1 * i) / (n - 1);
        const seg = new THREE.Group();
        const seat = rbox(0.62, 0.42, 0.95, soft, textile);
        seat.position.set(0, 0.21, 0);
        const back = rbox(0.62, 0.55, 0.26, soft, textile);
        back.position.set(0, 0.6, -0.38);
        seg.add(seat, back);
        seg.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R + R);
        seg.rotation.y = -a;
        sofa.add(seg);
      }
      sofa.position.set(0.3, 0, backZ + 0.75);
    } else {
      const base = rbox(2.5, 0.42, 0.95, soft, textile);
      base.position.y = 0.21;
      const back = rbox(2.5, 0.5, 0.25, soft, textile);
      back.position.set(0, 0.62, -0.36);
      sofa.add(base, back);
      for (const s of [-1, 1]) {
        const arm = rbox(0.24, 0.62, 0.95, soft, textile);
        arm.position.set(s * 1.25, 0.31, 0);
        sofa.add(arm);
      }
      for (let i = 0; i < 3; i++) {
        const cush = rbox(0.42, 0.42, 0.14, 0.06, i === 1 ? accentFab : textile);
        cush.position.set(-0.7 + i * 0.7, 0.62, -0.18);
        cush.rotation.x = -0.2;
        cush.rotation.z = (r() - 0.5) * 0.25;
        sofa.add(cush);
      }
      sofa.position.set(0.3, 0, backZ + 0.75);
    }
    add(sofa);

    // Coffee table and vase
    const table = new THREE.Group();
    if (p.curvature > 0.4) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 64), wood);
      top.position.y = 0.38;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.36, 48), anchor);
      leg.position.y = 0.18;
      table.add(top, leg);
    } else {
      const top = rbox(1.2, 0.06, 0.65, 0.01, wood);
      top.position.y = 0.38;
      table.add(top);
      for (const [x, z] of [[-0.55, -0.27], [0.55, -0.27], [-0.55, 0.27], [0.55, 0.27]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.04), anchor);
        leg.position.set(x, 0.18, z);
        table.add(leg);
      }
    }
    const vase = new THREE.Mesh(
      new THREE.LatheGeometry([0, 0.07, 0.1, 0.11, 0.09, 0.05, 0.055, 0.06].map((x, i) => new THREE.Vector2(x, i * 0.04)), 48),
      new THREE.MeshPhysicalMaterial({ color: p.accent, roughness: 0.25, clearcoat: 0.8 }),
    );
    vase.position.set(0.12, 0.41, 0.05);
    table.add(vase);
    table.position.set(0.3, 0, -0.1);
    add(table);

    // Lounge chair by the window: prospect and refuge
    const chair = new THREE.Group();
    const cseat = rbox(0.8, 0.38, 0.8, soft + 0.04, accentFab);
    cseat.position.y = 0.3;
    const cback = rbox(0.8, 0.6, 0.2, soft + 0.04, accentFab);
    cback.position.set(0, 0.72, 0.32);
    cback.rotation.x = 0.18;
    chair.add(cseat, cback);
    for (const [x, z] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.14, 12), brass);
      leg.position.set(x, 0.07, z);
      chair.add(leg);
    }
    chair.position.set(-W / 2 + 1.2, 0, 1.0);
    chair.rotation.y = Math.PI * 0.62;
    add(chair);

    // Art above the sofa, painted with the palette
    const art = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshStandardMaterial({ map: artTexture([p.wall, p.secondary, p.accent, p.anchor], p.curvature), roughness: 0.8 }));
    art.position.set(0.3, Math.min(H - 0.6, 1.75), backZ + 0.03);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.08, 0.03), anchor);
    frame.position.set(0.3, art.position.y, backZ + 0.012);
    add(frame);
    this.room.add(art);

    // Pendant over the table + a floor lamp
    const evening = new THREE.Color(kelvinToHex(p.kelvinEvening));
    const shadeMat = new THREE.MeshStandardMaterial({ color: '#f6efe2', emissive: evening, emissiveIntensity: 0, roughness: 0.6, side: THREE.DoubleSide });
    const pendant = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, H - 1.95, 6), anchor);
    cord.position.y = (H + 1.95) / 2;
    const shadeGeo = p.curvature > 0.45 ? new THREE.SphereGeometry(0.24, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.62) : new THREE.CylinderGeometry(0.08, 0.3, 0.28, 48, 1, true);
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.y = 1.95;
    const bulb = new THREE.PointLight(evening, 0, 0, 2);
    bulb.position.y = 1.85;
    pendant.add(cord, shade, bulb);
    pendant.position.set(0.3, 0, -0.1);
    this.room.add(pendant);
    this.lamps.push({ light: bulb, shade: shadeMat, peak: 6 + p.contrast * 6 });

    const floorLamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.55, 12), brass);
    pole.position.y = 0.78;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 32), anchor);
    const lshade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.3, 40, 1, true), shadeMat);
    lshade.position.y = 1.6;
    const lb = new THREE.PointLight(evening, 0, 0, 2);
    lb.position.y = 1.55;
    floorLamp.add(pole, foot, lshade, lb);
    floorLamp.position.set(1.95, 0, backZ + 0.55);
    add(floorLamp);
    this.lamps.push({ light: lb, peak: 3 + p.contrast * 3 });

    // Accent wash on the art: stronger with a dramatic contrast preference
    const spot = new THREE.SpotLight(evening, 0, 6, 0.45, 0.6, 1.5);
    spot.position.set(0.3, H - 0.1, backZ + 1.2);
    spot.target.position.set(0.3, 1.6, backZ);
    this.room.add(spot, spot.target);
    this.lamps.push({ light: spot, peak: 4 + p.contrast * 14 });

    // Refuge niche: built-in bench under a lowered soffit
    if (p.refuge > 0.55) {
      const nz = D / 2 - 1.5;
      const soffit = new THREE.Mesh(new THREE.BoxGeometry(0.95, H - 2.2, 2.2), new THREE.MeshStandardMaterial({ color: p.wall, roughness: 0.95 }));
      soffit.position.set(W / 2 - 0.475, 2.2 + (H - 2.2) / 2, nz);
      const bench = rbox(0.85, 0.45, 2.1, 0.03, wood);
      bench.position.set(W / 2 - 0.45, 0.225, nz);
      const pad = rbox(0.8, 0.12, 2.0, 0.05, textile);
      pad.position.set(W / 2 - 0.45, 0.51, nz);
      const back = rbox(0.12, 0.5, 2.0, 0.05, accentFab);
      back.position.set(W / 2 - 0.08, 0.8, nz);
      add(soffit);
      add(bench);
      add(pad);
      add(back);
      const nook = new THREE.PointLight(evening, 0, 3, 2);
      nook.position.set(W / 2 - 0.45, 2.1, nz);
      this.room.add(nook);
      this.lamps.push({ light: nook, peak: 2.5 });
    }

    // Shelves with books and objects, density from the layering preference
    if (p.layering > 0.3) {
      const rows = p.layering > 0.65 ? 4 : 3;
      const sx = W / 2 - 0.16;
      const sz = p.refuge > 0.55 ? -D / 2 + rad + 1.0 : 0.1;
      const len = 1.6;
      for (let i = 0; i < rows; i++) {
        const y = 0.9 + i * 0.42;
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, len), wood);
        board.position.set(sx, y, sz);
        add(board);
        let z = sz - len / 2 + 0.06;
        while (z < sz + len / 2 - 0.1) {
          if (r() < 0.25 + p.layering * 0.5) {
            const bh = 0.2 + r() * 0.12;
            const bw = 0.025 + r() * 0.035;
            const col = [p.accent, p.secondary, p.anchor, p.wall, p.floor][Math.floor(r() * 5)];
            const book = new THREE.Mesh(new THREE.BoxGeometry(0.2, bh, bw), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }));
            book.position.set(sx - 0.02, y + bh / 2 + 0.018, z);
            book.rotation.x = r() < 0.1 ? 0.2 : 0;
            add(book);
            z += bw + 0.004;
          } else z += 0.08 + r() * 0.12;
        }
      }
    }

    // Plants: count follows the biophilia score
    const plantCount = Math.round(1 + p.nature * 6);
    const spots: [number, number, number][] = [
      [-W / 2 + 0.5, this.win.z0 - 0.35, 1.3],
      [W / 2 - 0.55, backZ + 0.6, 1.6],
      [-W / 2 + 0.55, backZ + rad * 0.4 + 0.6, 1.0],
      [-1.6, backZ + 0.55, 0.8],
      [-W / 2 + 0.5, this.win.z1 + 0.45, 0.7],
      [W / 2 - 0.5, D / 2 - 0.5, 1.2],
      [1.0, 0.75, 0.35],
    ];
    for (let i = 0; i < plantCount; i++) {
      const [x, z, s] = spots[i];
      const plant = this.plant(r, s, i === 6 ? '#e8e2d8' : i % 2 ? '#b8714c' : p.wall);
      plant.position.set(x, i === 6 ? 0.41 : 0, z);
      add(plant);
      this.plants.push(plant);
    }

    // Still water basin
    if (p.water) {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.3, 64), new THREE.MeshStandardMaterial({ map: stoneTexture('#bdb3a3', 11), roughness: 0.7 }));
      basin.position.set(-W / 2 + 1.0, 0.15, -D / 2 + 1.1 + rad * 0.3);
      const geo = new THREE.CircleGeometry(0.5, 64);
      geo.rotateX(-Math.PI / 2);
      this.water = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#2c5560', roughness: 0.04, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.6 }));
      this.water.position.set(basin.position.x, 0.28, basin.position.z);
      this.water.userData.base = (geo.attributes.position.array as Float32Array).slice();
      add(basin);
      this.room.add(this.water);
    }
  }

  private plant(r: () => number, scale: number, potColor: string) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(
      new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.2, 0.3), new THREE.Vector2(0.21, 0.34), new THREE.Vector2(0.19, 0.34)], 40),
      new THREE.MeshStandardMaterial({ color: potColor, roughness: 0.75 }),
    );
    g.add(pot);
    const leafGeo = new THREE.SphereGeometry(1, 12, 8);
    const count = Math.round(14 + scale * 16);
    for (let i = 0; i < count; i++) {
      const leaf = new THREE.Mesh(
        leafGeo,
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.24 + r() * 0.08, 0.35 + r() * 0.2, 0.22 + r() * 0.14), roughness: 0.6, side: THREE.DoubleSide }),
      );
      const h = 0.3 + r() * 0.75 * scale;
      const a = r() * Math.PI * 2;
      const lean = 0.25 + r() * 0.6;
      leaf.scale.set(0.035 + 0.02 * scale, 0.16 * Math.sqrt(scale), 0.008);
      leaf.position.set(Math.cos(a) * lean * 0.3 * scale, h + 0.34, Math.sin(a) * lean * 0.3 * scale);
      leaf.rotation.set(0, -a, lean);
      g.add(leaf);
    }
    g.userData.phase = r() * 10;
    return g;
  }

  private tree(r: () => number, h: number) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, h * 0.45, 8), new THREE.MeshStandardMaterial({ color: '#5b4636' }));
    trunk.position.y = h * 0.22;
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(h * 0.32, 1),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.25 + r() * 0.06, 0.3, 0.28 + r() * 0.1), roughness: 1, flatShading: true }),
    );
    crown.position.y = h * 0.62;
    crown.scale.y = 1.2;
    g.add(trunk, crown);
    g.traverse((c) => (c.castShadow = true));
    return g;
  }

  /** 0..24. Drives the sun, sky, lamps and exposure together. */
  setHour(hour: number) {
    this.hour = hour;
    if (!this.params) return;
    const p = this.params;
    const day = Math.sin(Math.PI * Math.min(1, Math.max(0, (hour - 6) / 13)));
    const el = Math.max(0.04, day) * 1.05;
    const az = ((hour - 12.5) / 7) * 0.9;
    const dir = new THREE.Vector3(Math.cos(el), -Math.sin(el), Math.sin(az) * 0.9).normalize();
    this.sun.target.position.set(-p.width / 2 + 1.5, 0, -0.25);
    this.sun.position.copy(this.sun.target.position).addScaledVector(dir, -18);
    const sunK = 2000 + 3800 * Math.pow(day, 0.6);
    this.sun.color.set(kelvinToHex(sunK));
    const light = 0.35 + p.windowRatio * 1.6;
    this.sun.intensity = day > 0.02 ? (0.4 + 3.6 * day) * light : 0;
    const night = 1 - smooth(0.0, 0.25, day);

    const sky = this.sky.material as THREE.ShaderMaterial;
    const dayTop = new THREE.Color('#78aee2');
    const nightTop = new THREE.Color('#0d1530');
    const dusk = new THREE.Color('#f2a66d');
    sky.uniforms.top.value.copy(nightTop).lerp(dayTop, smooth(0, 0.35, day));
    sky.uniforms.horizon.value.copy(new THREE.Color('#1c2440')).lerp(dusk, smooth(0, 0.15, day)).lerp(new THREE.Color('#eef0ea'), smooth(0.25, 0.7, day));
    this.hemi.color.copy(sky.uniforms.top.value).lerp(new THREE.Color('#f3e6d3'), 0.6);
    this.hemi.intensity = 0.12 + 0.55 * day;
    this.scene.environmentIntensity = 0.12 + 0.5 * day;

    // Interior lamps follow the circadian plan: on in the evening, low at night
    const lampsOn = Math.max(1 - smooth(6.5, 8.5, hour), smooth(16.5, 19.5, hour));
    const late = smooth(21, 23.5, hour) + (hour < 5 ? 1 : 0);
    const k = THREE.MathUtils.lerp(p.kelvinEvening, Math.max(1900, p.kelvinEvening - 600), Math.min(1, late));
    for (const l of this.lamps) {
      l.light.color.set(kelvinToHex(k));
      l.light.intensity = l.peak * lampsOn * (1 - 0.45 * Math.min(1, late));
      if (l.shade) {
        l.shade.emissive.set(kelvinToHex(k));
        l.shade.emissiveIntensity = 1.6 * lampsOn;
      }
    }
    this.renderer.toneMappingExposure = 0.95 + night * 0.55;

    // Light shaft through the window, following the sun
    const { x, z0, z1, sill, head } = this.win;
    const len = 4.5;
    const corners = [
      [x, sill, z0], [x, sill, z1], [x, head, z1], [x, head, z0],
    ].map(([a, b, c]) => new THREE.Vector3(a, b, c));
    const far = corners.map((c) => c.clone().addScaledVector(dir, len));
    const pos: number[] = [];
    const fade: number[] = [];
    const faces = [[0, 1], [1, 2], [2, 3], [3, 0]];
    for (const [i, j] of faces) {
      for (const [v, f] of [[corners[i], 1], [corners[j], 1], [far[j], 0], [corners[i], 1], [far[j], 0], [far[i], 0]] as const) {
        pos.push(v.x, v.y, v.z);
        fade.push(f);
      }
    }
    this.shaft.geometry.dispose();
    this.shaft.geometry = new THREE.BufferGeometry()
      .setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      .setAttribute('fade', new THREE.Float32BufferAttribute(fade, 1));
    const sm = this.shaft.material as THREE.ShaderMaterial;
    sm.uniforms.color.value.set(kelvinToHex(sunK));
    sm.uniforms.strength.value = day > 0.02 ? 0.05 + 0.1 * p.windowRatio * (1.2 - day * 0.6) : 0;
    this.dust.visible = day > 0.05;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tick() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const still = this.opts.reducedMotion;
    if (this.intro < 1) {
      this.intro = still ? 1 : Math.min(1, this.intro + dt / 2.6);
      const e = 1 - Math.pow(1 - this.intro, 3);
      const D = this.params?.depth ?? 5;
      const endZ = D / 2 + (this.opts.hero ? 1.6 : 1.1);
      this.camera.position.set(THREE.MathUtils.lerp(1.6, 0.35, e), THREE.MathUtils.lerp(2.4, 1.6, e), THREE.MathUtils.lerp(endZ + 3, endZ, e));
    } else if (this.opts.hero && !still) {
      const D = this.params?.depth ?? 5;
      const a = Math.sin(t * 0.12) * 0.42;
      const dist = D / 2 + 1.6 + 0.4;
      this.camera.position.set(0.2 + Math.sin(a) * dist, (this.camera.aspect < 1 ? 1.3 : 1.6) + Math.sin(t * 0.2) * 0.08, -0.4 + Math.cos(a) * dist);
    }
    if (this.autoTime && !still) this.setHour(6.5 + ((t * 0.55) % 17));
    if (!still) {
      for (const pl of this.plants) {
        pl.rotation.z = Math.sin(t * 0.6 + pl.userData.phase) * 0.012;
        pl.rotation.x = Math.cos(t * 0.45 + pl.userData.phase) * 0.01;
      }
      if (this.dust) {
        const { x, z0, z1, sill, head } = this.win;
        const arr = this.dust.geometry.attributes.position.array as Float32Array;
        this.dust.position.set(x + 0.2, sill, z0);
        this.dust.scale.set(2.2, head - sill, z1 - z0);
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] = (arr[i + 1] + dt * 0.012 * (0.5 + ((i * 7) % 5) / 5)) % 1;
          arr[i] = (arr[i] + Math.sin(t * 0.3 + i) * 0.0004 + 1) % 1;
        }
        this.dust.geometry.attributes.position.needsUpdate = true;
      }
      if (this.water) {
        const base = this.water.userData.base as Float32Array;
        const pos = this.water.geometry.attributes.position;
        const arr = pos.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const d = Math.hypot(base[i], base[i + 2]);
          arr[i + 1] = Math.sin(d * 26 - t * 2.4) * 0.004 * (0.5 - d);
        }
        pos.needsUpdate = true;
        this.water.geometry.computeVertexNormals();
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private clear() {
    this.lamps = [];
    this.plants = [];
    this.water = null;
    this.room.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
        mat.dispose();
      }
    });
    this.room.clear();
  }

  dispose() {
    this.stop();
    this.observer.disconnect();
    this.clear();
    this.controls.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
