import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  HalfFloatType,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  NearestFilter,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  Shape,
  ExtrudeGeometry,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GuitarVoice } from './guitar-sound';

/**
 * The home page's night hill (WebGL, three.js without React): a long meadow of grass that
 * sways and bends away from the pointer, leaving a lit trail that startled fireflies rise from;
 * small flowers that show their colour in that light; a lone tree with a small campfire far up
 * on the crest; fireflies; stars; and a guitar hidden in the grass that plays a tune note by
 * note (click or wheel). The sky, the moon and the clouds are CSS behind the transparent canvas
 * (HomeScenery), which also says where the tree and the guitar go (`setLayout`).
 */

export interface SceneLayout {
  /** CSS px from the left: where the tree and the camp stand, and how wide that space is. */
  focusX: number;
  focusWidth: number;
  /** CSS px: the moon's centre (the moonlight comes from there). */
  moonX: number;
  moonY: number;
  /** CSS px: where the hidden guitar lies in the grass (a free spot under the page's text). */
  guitarX?: number;
  guitarY?: number;
}

export interface GrassScene {
  setLayout(layout: SceneLayout): void;
  dispose(): void;
}

// The pointer trail lives in a texture over the ground: [X0, X0 + XS] × [Z0, Z0 + ZS].
const X0 = -18;
const XS = 36;
const Z0 = -20;
const ZS = 27;
/** Seconds for the trail to fade to about a third. */
const TRAIL_LIFE_S = 0.9;
const BRUSH = 0.8;
const MAX_STAMPS = 12;

// Far up on the crest: small, alone.
/** Where the meadow tops out, far away (the tree stands there). */
const CREST_Z = -17;

const TREE_Z = CREST_Z + 0.3;
const CAMP_Z = CREST_Z + 0.75;

const C = {
  grassBase: '#06180f',
  grassTip: '#2f6b4a',
  moonTint: '#9fb8e0',
  trail: '#b9ffd9',
  fire: '#ff8a3d',
  ground: '#071a10',
  fog: '#0d2c3a',
  bark: '#2a2018',
};

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The hill: a long meadow rising gently from the viewer to a far crest, with soft swells
 * across it, then falling away behind.
 */
function hill(x: number, z: number): number {
  const d = -z;
  const rise = 2.3 * smooth(-6, -CREST_Z, d);
  const behind = -1.8 * smooth(-CREST_Z, -CREST_Z + 8, d);
  const swell = (0.22 * Math.sin(x * 0.19 + z * 0.11) + 0.12 * Math.sin(x * 0.07 - z * 0.27)) * smooth(-4, 6, d);
  // The far skyline rolls gently instead of a straight line.
  const skyline = (0.45 * Math.sin(x * 0.085 + 0.7) + 0.2 * Math.sin(x * 0.21 + 2.1)) * smooth(8, -CREST_Z, d);
  return rise + behind + swell + skyline - 0.15;
}

/** A repeatable 0–1 noise from a position (same point, same value: no cracks in meshes). */
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function bladeGeometry(segments: number): BufferGeometry {
  // A tapered strip, y 0 → 1 (scaled per blade), x across.
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const w = 0.0065 * (1 - t) ** 0.9;
    pos.push(-w, t, 0, w, t, 0);
  }
  pos.push(0, 1, 0);
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (segments - 1) * 2;
  idx.push(last, last + 1, last + 2);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// Shared GLSL: wind and the trail (bend away from it, flatten, glow).
const COMMON = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uTrailTex;
  uniform vec4 uTrailBox; // x0, z0, xs, zs
  uniform vec3 uFirePos;
  uniform float uFire;
  float trailAt(vec2 xz) {
    vec2 uv = (xz - uTrailBox.xy) / uTrailBox.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
    return texture2D(uTrailTex, uv).r;
  }
  // Pushes a point at xz (height share t, 0 at the root) by the wind and the trail.
  vec3 sway(vec3 w, vec2 xz, float bend, float phase, out float glow) {
    float gust = sin(uTime * 1.4 + xz.x * 0.55 + xz.y * 0.35 + phase) * 0.6
      + sin(uTime * 0.6 + xz.x * 0.18) * 0.4;
    w.x += gust * 0.22 * bend;
    w.z += gust * 0.08 * bend;
    float f = trailAt(xz);
    glow = f;
    if (f > 0.002) {
      float e = 0.18;
      vec2 grad = vec2(trailAt(xz + vec2(e, 0.0)) - trailAt(xz - vec2(e, 0.0)),
                       trailAt(xz + vec2(0.0, e)) - trailAt(xz - vec2(0.0, e)));
      vec2 dir = length(grad) > 0.0001 ? -normalize(grad) : vec2(0.0, 1.0);
      w.xz += dir * f * 0.75 * bend;
      w.y -= f * 0.5 * bend;
    }
    return w;
  }
  vec3 fireLight(vec3 p) {
    vec3 d = p - uFirePos;
    return vec3(1.0, 0.45, 0.15) * uFire / (1.0 + dot(d, d) * 9.0);
  }
`;

const GRASS_VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute float aHeight;
  attribute float aAngle;
  attribute float aPhase;
  attribute float aShade;
  uniform vec3 uClear; // a clearing around the camp: x, z, radius
  uniform vec3 uClearG; // thinner grass over the guitar
  ${COMMON}
  varying float vT;
  varying float vGlow;
  varying float vShade;
  varying float vFog;
  varying vec3 vFire;
  void main() {
    vec3 p = position;
    float t = p.y;
    float h = aHeight * mix(0.25, 1.0, smoothstep(uClear.z * 0.6, uClear.z, distance(aOffset.xz, uClear.xy)))
      * mix(0.45, 1.0, smoothstep(uClearG.z * 0.5, uClearG.z, distance(aOffset.xz, uClearG.xy)));
    p.y *= h;
    // Smaller blades far away are thinner too.
    p.x *= clamp(aHeight / 0.13, 0.45, 1.15);
    float c = cos(aAngle), s = sin(aAngle);
    p = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
    vec3 w = aOffset + p;
    float bend = t * t * h;
    w.x += sin(aPhase * 3.0) * 0.35 * bend;
    w.z += cos(aPhase * 2.0) * 0.2 * bend;
    float glow;
    w = sway(w, aOffset.xz, bend, aPhase, glow);
    vT = t;
    vGlow = glow;
    vShade = aShade;
    vFire = fireLight(w);
    vec4 mv = modelViewMatrix * vec4(w, 1.0);
    vFog = smoothstep(9.0, 34.0, -mv.z) * 0.85;
    gl_Position = projectionMatrix * mv;
  }
`;

const GRASS_FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform vec3 uMoon;
  uniform vec3 uGlow;
  uniform vec3 uFog;
  varying float vT;
  varying float vGlow;
  varying float vShade;
  varying float vFog;
  varying vec3 vFire;
  void main() {
    vec3 col = mix(uBase, uTip, vT * vT) * (0.7 + 0.6 * vShade);
    col += uMoon * pow(vT, 3.0) * 0.12;
    col += vFire * (0.1 + vT) * 0.22;
    col += uGlow * vGlow * (0.3 + vT) * 1.5;
    col = mix(col, uFog, vFog);
    // Linear colours on screen as they are: the dark night grass.
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FLOWER_VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute float aHeight;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uSize;
  uniform vec3 uClear;
  ${COMMON}
  varying vec3 vColor;
  varying vec3 vTrue;
  varying float vGlow;
  void main() {
    float cleared = smoothstep(uClear.z * 0.8, uClear.z, distance(aOffset.xz, uClear.xy));
    vec3 w = aOffset + vec3(0.0, aHeight, 0.0);
    float glow;
    w = sway(w, aOffset.xz, aHeight, aPhase, glow);
    vColor = aColor * 0.32 + fireLight(w) * 0.3;
    vTrue = aColor;
    vGlow = glow;
    vec4 mv = modelViewMatrix * vec4(w, 1.0);
    // In the light a flower opens up a little.
    gl_PointSize = uSize * cleared * (0.8 + 0.4 * fract(aPhase * 7.0)) * (1.0 + glow * 0.8) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FLOWER_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vTrue;
  varying float vGlow;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);
    float petals = 0.5 + 0.5 * cos(5.0 * atan(p.y, p.x));
    float edge = 0.28 + 0.2 * petals;
    if (r > edge) discard;
    // Lit by the trail: its own colour, clear and bright.
    vec3 petal = mix(vColor, vTrue * 1.5, vGlow);
    vec3 col = mix(petal, vec3(0.95, 0.82, 0.4) * mix(0.6, 1.0, vGlow), smoothstep(0.1, 0.0, r));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FLY_VERT = /* glsl */ `
  attribute vec3 aBase;
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  varying float vLight;
  void main() {
    float ph = aPhase;
    vec3 p = aBase + vec3(
      sin(uTime * 0.31 + ph) * 0.7,
      sin(uTime * 0.53 + ph * 2.0) * 0.22,
      cos(uTime * 0.27 + ph * 1.3) * 0.6
    );
    float blink = 0.2 + 0.8 * pow(max(0.0, sin(uTime * 1.1 + ph * 5.0)), 3.0);
    vLight = blink;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + blink) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vLight;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a * vLight;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/** Fireflies rising from the trail: each born at a point and time, gone after its life. */
const SPARK_VERT = /* glsl */ `
  attribute vec3 aStart;
  attribute float aBorn;
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vLight;
  void main() {
    float life = 5.5;
    float age = uTime - aBorn;
    if (age < 0.0 || age > life) {
      gl_PointSize = 0.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vLight = 0.0;
      return;
    }
    // A startled firefly: a quick jump out of the grass, then a wandering climb.
    float climb = 1.5 * (1.0 - exp(-age * 0.42));
    vec3 p = aStart + vec3(
      sin(aSeed * 6.0 + age * 2.2) * 0.12 + sin(aSeed * 3.0) * age * 0.12,
      0.04 + climb + sin(age * 2.6 + aSeed) * 0.04,
      cos(aSeed * 4.0 + age * 1.8) * 0.1 + cos(aSeed * 2.0) * age * 0.1
    );
    float fade = smoothstep(0.0, 0.15, age) * (1.0 - smoothstep(life * 0.5, life, age));
    // A bright flash as it jumps out, then the slow firefly blink.
    float flash = 1.0 - smoothstep(0.0, 1.0, age);
    vLight = fade * (0.45 + 0.55 * pow(max(0.0, sin(age * 6.0 + aSeed * 9.0)), 2.0) + flash * 0.9);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const EMBER_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uOrigin;
  uniform float uSize;
  varying float vLight;
  void main() {
    float life = 1.6 + fract(aSeed * 3.1) * 1.2;
    float age = mod(uTime + aSeed * 10.0, life);
    vec3 p = uOrigin + vec3(
      sin(aSeed * 12.0 + age * 3.0) * 0.06 * (0.4 + age),
      0.05 + age * 0.42,
      cos(aSeed * 8.0 + age * 2.4) * 0.05 * (0.4 + age)
    );
    vLight = 1.0 - age / life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.5 + vLight * 0.5) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FLAME_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Always faces the camera (billboard around its own centre).
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
    mv.xy += position.xy * scale;
    gl_Position = projectionMatrix * mv;
  }
`;

const FLAME_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  float n(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(n(i), n(i + vec2(1, 0)), u.x), mix(n(i + vec2(0, 1)), n(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    vec2 p = vUv;
    float flick = noise(vec2(p.x * 4.0, p.y * 3.0 - uTime * 3.2)) * 0.5
      + noise(vec2(p.x * 9.0, p.y * 6.0 - uTime * 5.0)) * 0.25;
    float width = (1.0 - p.y) * 0.42 + 0.02;
    float d = abs(p.x - 0.5 + (flick - 0.4) * 0.18 * p.y);
    float body = smoothstep(width, width * 0.25, d) * smoothstep(1.0, 0.25, p.y + flick * 0.35);
    vec3 col = mix(vec3(1.0, 0.25, 0.05), vec3(1.0, 0.85, 0.45), smoothstep(0.1, 0.7, body));
    gl_FragColor = vec4(col * body * 1.6, body);
  }
`;

const HALO_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float flick = 0.85 + 0.1 * sin(uTime * 11.0) + 0.05 * sin(uTime * 6.3);
    float a = pow(max(0.0, 1.0 - d), 2.6) * 0.8 * flick;
    gl_FragColor = vec4(vec3(1.0, 0.55, 0.2) * a, a);
  }
`;

/** The hidden guitar: as dark as the ground, until the pointer's light (or a click) finds it. */
const REVEAL_VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const REVEAL_FRAG = /* glsl */ `
  ${COMMON}
  uniform vec3 uColor;
  uniform float uPulse;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    float f = clamp(trailAt(vWorld.xz) * 1.8 + uPulse, 0.0, 1.0);
    float light = 0.4 + 0.6 * max(0.0, dot(normalize(vNormal), normalize(vec3(0.3, 1.0, 0.4))));
    vec3 lit = uColor * light * 1.3 + vec3(0.45, 1.0, 0.75) * 0.06 * f;
    gl_FragColor = vec4(mix(vec3(0.012, 0.035, 0.022), lit, f), 1.0);
  }
`;

const STAR_VERT = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  varying float vLight;
  void main() {
    vLight = 0.45 + 0.55 * sin(uTime * 1.7 + aPhase * 6.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (0.6 + fract(aPhase * 13.0) * 0.8);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */ `
  varying float vLight;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vLight;
    gl_FragColor = vec4(vec3(0.92, 0.95, 1.0) * a, a);
  }
`;

// The trail texture: last frame faded, plus soft stamps where the pointer went.
const TRAIL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const TRAIL_FRAG = /* glsl */ `
  #define STAMPS ${MAX_STAMPS}
  uniform sampler2D uPrev;
  uniform float uDecay;
  uniform vec3 uStamps[STAMPS];
  uniform int uCount;
  uniform vec2 uWorld;
  varying vec2 vUv;
  void main() {
    float v = texture2D(uPrev, vUv).r * uDecay;
    for (int i = 0; i < STAMPS; i++) {
      if (i >= uCount) break;
      float d = length((vUv - uStamps[i].xy) * uWorld);
      v = max(v, smoothstep(${BRUSH.toFixed(2)}, 0.0, d) * uStamps[i].z);
    }
    gl_FragColor = vec4(v, 0.0, 0.0, 1.0);
  }
`;

/** Organic low-poly clumps: an icosahedron pushed in and out by a repeatable noise. */
function clumpGeometry(radius: number, detail: number): BufferGeometry {
  // Shared vertices: smooth shading, and the noise moves each corner once.
  const g = mergeVertices(new IcosahedronGeometry(radius, detail));
  const p = g.attributes.position as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 0.78 + hash3(x * 3, y * 3, z * 3) * 0.44;
    p.setXYZ(i, x * k, y * k * 0.85, z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** A branch from `a` to `b`, tapering from r0 to r1. */
function branch(geos: BufferGeometry[], a: Vector3, b: Vector3, r0: number, r1: number) {
  const len = a.distanceTo(b);
  const g = new CylinderGeometry(r1, r0, len, 6, 3);
  g.translate(0, len / 2, 0);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyMatrix4(new Matrix4().compose(a, q, new Vector3(1, 1, 1)));
  geos.push(g);
}

function mergeGeometries(geos: BufferGeometry[]): BufferGeometry {
  // Small merge (positions + normals, indexed) so the tree is one draw call.
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const idx = new Uint32Array(iCount);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    g.computeVertexNormals();
    pos.set(g.attributes.position.array as Float32Array, vo * 3);
    nor.set(g.attributes.normal.array as Float32Array, vo * 3);
    const n = g.attributes.position.count;
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.getX(i) + vo;
    else for (let i = 0; i < n; i++) idx[io++] = i + vo;
    vo += n;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  out.setIndex(new BufferAttribute(idx, 1));
  return out;
}

/** A broad, wind-shaped tree: a leaning trunk, a few limbs, many leaf clumps. */
function makeTree(disposables: { dispose(): void }[]): Group {
  const tree = new Group();
  const wood: BufferGeometry[] = [];
  const base = new Vector3(0, -0.05, 0);
  const fork = new Vector3(0.08, 0.95, 0.02);
  branch(wood, base, fork, 0.12, 0.07);
  // Roots spreading at the foot.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    branch(wood, new Vector3(0, 0.18, 0), new Vector3(Math.cos(a) * 0.22, -0.04, Math.sin(a) * 0.22), 0.06, 0.02);
  }
  const limbs: [Vector3, number][] = [];
  const ends = [
    new Vector3(-0.75, 1.55, 0.1),
    new Vector3(-0.35, 1.85, -0.2),
    new Vector3(0.25, 1.95, 0.15),
    new Vector3(0.8, 1.6, -0.05),
    new Vector3(0.45, 1.35, 0.35),
    new Vector3(-0.2, 1.4, 0.4),
  ];
  for (const e of ends) {
    const mid = fork.clone().lerp(e, 0.5).add(new Vector3(0, 0.12, 0));
    branch(wood, fork, mid, 0.06, 0.04);
    branch(wood, mid, e, 0.04, 0.015);
    limbs.push([e, 1], [mid, 0.7]);
  }
  const woodGeo = mergeGeometries(wood);
  const woodMat = new MeshLambertMaterial({ color: C.bark });
  tree.add(new Mesh(woodGeo, woodMat));

  const leafGeo = clumpGeometry(1, 2);
  const leafMat = new MeshLambertMaterial();
  const CLUMPS = 170;
  const leaves = new InstancedMesh(leafGeo, leafMat, CLUMPS);
  const m = new Matrix4();
  const q = new Quaternion();
  const col = new Color();
  for (let i = 0; i < CLUMPS; i++) {
    const [anchor, weight] = limbs[i % limbs.length];
    // Around the limb ends, flattened like a wind-shaped crown.
    const a = hash3(i, 1, 2) * Math.PI * 2;
    const r = Math.sqrt(hash3(i, 3, 4)) * 0.42 * (0.6 + weight * 0.5);
    const p = anchor
      .clone()
      .add(new Vector3(Math.cos(a) * r, (hash3(i, 5, 6) - 0.35) * 0.5, Math.sin(a) * r * 0.8));
    const s = 0.1 + hash3(i, 7, 8) * 0.12;
    q.setFromAxisAngle(new Vector3(0, 1, 0), hash3(i, 9, 1) * Math.PI);
    m.compose(p, q, new Vector3(s * 1.25, s * 0.9, s));
    leaves.setMatrixAt(i, m);
    // Darker inside and below, lighter on top where the moon reaches.
    const top = Math.min(1, Math.max(0, (p.y - 1.2) / 0.8));
    leaves.setColorAt(i, col.setHSL(0.36 + hash3(i, 2, 9) * 0.05, 0.35, 0.05 + top * 0.06 + hash3(i, 4, 4) * 0.03));
  }
  tree.add(leaves);
  disposables.push(woodGeo, woodMat, leafGeo, leafMat, leaves);
  return tree;
}

/** A lone campfire: logs, a ring of stones, the flame and its glow. */
function makeCamp(disposables: { dispose(): void }[]): { camp: Group; flameMat: ShaderMaterial } {
  const camp = new Group();
  const logGeo = new CylinderGeometry(0.022, 0.026, 0.26, 6);
  const logMat = new MeshLambertMaterial({ color: '#3b2717' });
  for (let i = 0; i < 3; i++) {
    const log = new Mesh(logGeo, logMat);
    log.rotation.set(Math.PI / 2 - 0.25, (i / 3) * Math.PI, 0);
    log.position.y = 0.04;
    camp.add(log);
  }
  const stoneGeo = new DodecahedronGeometry(0.035, 0);
  const stoneMat = new MeshLambertMaterial({ color: '#4d4d52' });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const st = new Mesh(stoneGeo, stoneMat);
    st.position.set(Math.cos(a) * 0.16, 0.015, Math.sin(a) * 0.16);
    st.rotation.set(a, a * 2, 0);
    camp.add(st);
  }

  // The flame: a camera-facing card with an animated shader; a soft glow around it, so the
  // small far fire still reads.
  const flameGeo = new PlaneGeometry(1, 1);
  flameGeo.translate(0, 0.5, 0);
  const flameMat = new ShaderMaterial({
    vertexShader: FLAME_VERT,
    fragmentShader: FLAME_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
  });
  const flame = new Mesh(flameGeo, flameMat);
  flame.scale.set(0.3, 0.46, 1);
  flame.position.y = 0.03;
  const haloGeo = new PlaneGeometry(1, 1);
  const haloMat = new ShaderMaterial({
    vertexShader: FLAME_VERT,
    fragmentShader: HALO_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: flameMat.uniforms.uTime },
  });
  const halo = new Mesh(haloGeo, haloMat);
  halo.scale.set(2.2, 2.2, 1);
  halo.position.y = 0.12;
  camp.add(flame, halo);
  disposables.push(logGeo, logMat, stoneGeo, stoneMat, flameGeo, flameMat, haloGeo, haloMat);
  return { camp, flameMat };
}

/**
 * An acoustic guitar lying in the grass: a figure-of-eight body with its sound hole, the neck,
 * the head, the bridge and six strings. Built along +y (the neck) with its face towards +z,
 * then laid on its back. Every part only shows in the light (REVEAL_*).
 */
function makeGuitar(
  uniforms: Record<string, { value: unknown }>,
  disposables: { dispose(): void }[],
): { guitar: Group; hitbox: Mesh } {
  const mat = (color: string) => {
    const m = new ShaderMaterial({
      vertexShader: REVEAL_VERT,
      fragmentShader: REVEAL_FRAG,
      uniforms: { ...uniforms, uColor: { value: new Color(color) } },
    });
    disposables.push(m);
    return m;
  };
  const part = (geo: BufferGeometry, m: ShaderMaterial, x: number, y: number, z: number) => {
    disposables.push(geo);
    const mesh = new Mesh(geo, m);
    mesh.position.set(x, y, z);
    return mesh;
  };

  // The body's outline: two round bouts joined at the waist.
  const half = (y: number) => {
    const low = 0.1 ** 2 - y ** 2;
    const up = 0.078 ** 2 - (y - 0.135) ** 2;
    return Math.sqrt(Math.max(0, low, up));
  };
  const outline = new Shape();
  const ys: number[] = [];
  for (let i = 0; i <= 48; i++) ys.push(-0.1 + (0.313 * i) / 48);
  outline.moveTo(0, -0.1);
  for (const y of ys) outline.lineTo(half(y), y);
  for (const y of [...ys].reverse()) outline.lineTo(-half(y), y);
  const DEPTH = 0.04;
  const bodyGeo = new ExtrudeGeometry(outline, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  const top = DEPTH + 0.006;
  const g = new Group();
  g.add(
    part(bodyGeo, mat('#b07035'), 0, 0, 0),
    part(new CircleGeometry(0.03, 24), mat('#120a05'), 0, 0.105, top + 0.001),
    part(new BoxGeometry(0.064, 0.012, 0.01), mat('#3a2415'), 0, -0.045, top + 0.005),
    part(new BoxGeometry(0.032, 0.27, 0.02), mat('#4a2f1a'), 0, 0.33, top - 0.006),
    part(new BoxGeometry(0.05, 0.075, 0.016), mat('#2e1d10'), 0, 0.5, top - 0.008),
  );
  const stringMat = mat('#e6dfcf');
  const stringGeo = new BoxGeometry(0.0014, 0.5, 0.0014);
  disposables.push(stringGeo);
  for (let i = 0; i < 6; i++) {
    const s = new Mesh(stringGeo, stringMat);
    s.position.set(-0.0115 + i * 0.0046, 0.205, top + 0.012);
    g.add(s);
  }
  // On its back in the grass.
  g.rotation.x = -Math.PI / 2;
  const guitar = new Group();
  guitar.add(g);
  // What a click has to hit: the whole instrument, a little generous.
  const hitGeo = new BoxGeometry(0.26, 0.62, 0.12);
  hitGeo.translate(0, 0.2, 0.03);
  disposables.push(hitGeo);
  const hitbox = new Mesh(hitGeo);
  hitbox.visible = false;
  g.add(hitbox);
  return { guitar, hitbox };
}

export function createGrassScene(canvas: HTMLCanvasElement, opts: { onSlow?: () => void }): GrassScene {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 70);
  const disposables: { dispose(): void }[] = [];
  const add = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o);

  const small = canvas.clientWidth < 720;
  const BLADES = small ? 30000 : 100000;

  // ------------------------------------------------------------------ light
  scene.add(new AmbientLight('#1c2840', 0.6));
  const moon = new DirectionalLight('#bcd0f5', 1.1);
  scene.add(moon, moon.target);
  const fireLight = new PointLight(C.fire, 1.6, 1.6, 1.8);
  scene.add(fireLight);

  // ------------------------------------------------------------------ trail texture
  const TW = small ? 160 : 256;
  const TH = Math.round((TW * ZS) / XS);
  const rtOpts = { type: HalfFloatType, depthBuffer: false, magFilter: NearestFilter } as const;
  let rtA = add(new WebGLRenderTarget(TW, TH, rtOpts));
  let rtB = add(new WebGLRenderTarget(TW, TH, rtOpts));
  const stamps = Array.from({ length: MAX_STAMPS }, () => new Vector3());
  const trailMat = add(
    new ShaderMaterial({
      vertexShader: TRAIL_VERT,
      fragmentShader: TRAIL_FRAG,
      uniforms: {
        uPrev: { value: rtA.texture },
        uDecay: { value: 1 },
        uStamps: { value: stamps },
        uCount: { value: 0 },
        uWorld: { value: new Vector2(XS, ZS) },
      },
      depthTest: false,
      depthWrite: false,
    }),
  );
  const trailScene = new Scene();
  const trailQuad = new Mesh(add(new PlaneGeometry(2, 2)), trailMat);
  trailScene.add(trailQuad);
  const trailCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const shared = {
    uTime: { value: 0 },
    uTrailTex: { value: rtA.texture },
    uTrailBox: { value: [X0, Z0, XS, ZS] },
    uFirePos: { value: new Vector3() },
    uFire: { value: 1 },
    uClear: { value: new Vector3(0, 0, 0.6) },
    uClearG: { value: new Vector3(0, 0, 0.0001) },
    /** The guitar's glow after a click, 1 → 0. */
    uPulse: { value: 0 },
  };

  // ------------------------------------------------------------------ ground
  const groundGeo = add(new PlaneGeometry(80, 46, 160, 110));
  groundGeo.rotateX(-Math.PI / 2);
  groundGeo.translate(0, 0, -14);
  const gp = groundGeo.attributes.position as BufferAttribute;
  for (let i = 0; i < gp.count; i++) gp.setY(i, hill(gp.getX(i), gp.getZ(i)));
  groundGeo.computeVertexNormals();
  const ground = new Mesh(groundGeo, add(new MeshLambertMaterial({ color: C.ground })));
  scene.add(ground);

  // ------------------------------------------------------------------ grass
  const blade = add(bladeGeometry(5));
  const grassGeo = add(new InstancedBufferGeometry());
  grassGeo.index = blade.index;
  grassGeo.setAttribute('position', blade.attributes.position);
  const offsets = new Float32Array(BLADES * 3);
  const heights = new Float32Array(BLADES);
  const angles = new Float32Array(BLADES);
  const phases = new Float32Array(BLADES);
  const shades = new Float32Array(BLADES);
  for (let i = 0; i < BLADES; i++) {
    // From the viewer's feet up to the crest: denser in front, and the farther up the hill
    // the smaller the blades (more than the distance alone makes them), so the way to the
    // tree looks long.
    const z = 5 - Math.pow(Math.random(), 1.45) * (5 - CREST_Z + 0.5);
    const x = (Math.random() * 2 - 1) * ((8.5 - z) * 0.62 + 1);
    offsets.set([x, hill(x, z), z], i * 3);
    const far = smooth(4, -CREST_Z, -z + 1);
    heights[i] = (0.1 + Math.random() * 0.08) * (1.15 - far * 0.75);
    angles[i] = Math.random() * Math.PI;
    phases[i] = Math.random() * Math.PI * 2;
    shades[i] = Math.random();
  }
  grassGeo.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3));
  grassGeo.setAttribute('aHeight', new InstancedBufferAttribute(heights, 1));
  grassGeo.setAttribute('aAngle', new InstancedBufferAttribute(angles, 1));
  grassGeo.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1));
  grassGeo.setAttribute('aShade', new InstancedBufferAttribute(shades, 1));
  grassGeo.instanceCount = BLADES;
  const grassMat = add(
    new ShaderMaterial({
      vertexShader: GRASS_VERT,
      fragmentShader: GRASS_FRAG,
      side: DoubleSide,
      uniforms: {
        ...shared,
        uBase: { value: new Color(C.grassBase) },
        uTip: { value: new Color(C.grassTip) },
        uMoon: { value: new Color(C.moonTint) },
        uGlow: { value: new Color(C.trail) },
        uFog: { value: new Color(C.fog) },
      },
    }),
  );
  const grass = new Mesh(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  // ------------------------------------------------------------------ flowers
  const FLOWERS = small ? 110 : 300;
  const PALETTE = ['#f4efe4', '#c9d8ff', '#f4bfd1', '#f5dc86', '#d8c4ff'].map((h) => new Color(h));
  const flowerGeo = add(new BufferGeometry());
  const fOff = new Float32Array(FLOWERS * 3);
  const fH = new Float32Array(FLOWERS);
  const fPh = new Float32Array(FLOWERS);
  const fCol = new Float32Array(FLOWERS * 3);
  for (let i = 0; i < FLOWERS; i++) {
    const z = 4.5 - Math.pow(Math.random(), 1.3) * 12;
    const x = (Math.random() * 2 - 1) * ((8.5 - z) * 0.62);
    fOff.set([x, hill(x, z), z], i * 3);
    // Just above the grass tops.
    fH[i] = (0.13 + Math.random() * 0.07) * (1.1 - smooth(4, 12, -z) * 0.5);
    fPh[i] = Math.random() * Math.PI * 2;
    const c = PALETTE[i % PALETTE.length];
    fCol.set([c.r, c.g, c.b], i * 3);
  }
  flowerGeo.setAttribute('position', new Float32BufferAttribute(fOff, 3));
  flowerGeo.setAttribute('aOffset', new Float32BufferAttribute(fOff, 3));
  flowerGeo.setAttribute('aHeight', new Float32BufferAttribute(fH, 1));
  flowerGeo.setAttribute('aPhase', new Float32BufferAttribute(fPh, 1));
  flowerGeo.setAttribute('aColor', new Float32BufferAttribute(fCol, 3));
  const flowerMat = add(
    new ShaderMaterial({
      vertexShader: FLOWER_VERT,
      fragmentShader: FLOWER_FRAG,
      uniforms: { ...shared, uSize: { value: 0 } },
    }),
  );
  const flowers = new Points(flowerGeo, flowerMat);
  flowers.frustumCulled = false;
  scene.add(flowers);

  // ------------------------------------------------------------------ tree and camp
  const tree = makeTree(disposables);
  scene.add(tree);
  const { camp, flameMat } = makeCamp(disposables);
  scene.add(camp);
  const { guitar, hitbox } = makeGuitar(shared, disposables);
  scene.add(guitar);
  const voice = new GuitarVoice();

  const EMBERS = 28;
  const emberGeo = add(new BufferGeometry());
  emberGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(EMBERS * 3), 3));
  emberGeo.setAttribute('aSeed', new Float32BufferAttribute(Float32Array.from({ length: EMBERS }, () => Math.random()), 1));
  const emberMat = add(
    new ShaderMaterial({
      vertexShader: EMBER_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: shared.uTime, uOrigin: { value: new Vector3() }, uSize: { value: 0 }, uColor: { value: new Color('#ffb15c') } },
    }),
  );
  const embers = new Points(emberGeo, emberMat);
  embers.frustumCulled = false;
  scene.add(embers);

  // ------------------------------------------------------------------ fireflies
  const FLIES = small ? 110 : 320;
  const flyGeo = add(new BufferGeometry());
  const flyBase = new Float32Array(FLIES * 3);
  const flyPhase = new Float32Array(FLIES);
  for (let i = 0; i < FLIES; i++) {
    const z = 4 - Math.pow(Math.random(), 1.2) * 16;
    const x = (Math.random() * 2 - 1) * ((8.5 - z) * 0.6);
    flyBase.set([x, hill(x, z) + 0.12 + Math.random() * 0.8, z], i * 3);
    flyPhase[i] = Math.random() * 100;
  }
  flyGeo.setAttribute('position', new Float32BufferAttribute(flyBase, 3));
  flyGeo.setAttribute('aBase', new Float32BufferAttribute(flyBase, 3));
  flyGeo.setAttribute('aPhase', new Float32BufferAttribute(flyPhase, 1));
  const flyMat = add(
    new ShaderMaterial({
      vertexShader: FLY_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: shared.uTime,
        uSize: { value: 0 },
        uColor: { value: new Color('#e9ff8f') },
      },
    }),
  );
  const flies = new Points(flyGeo, flyMat);
  flies.frustumCulled = false;
  scene.add(flies);

  // Fireflies rising from the trail (a ring of particles, each written once when born).
  const SPARKS = 260;
  const sparkGeo = add(new BufferGeometry());
  const sparkStart = new Float32BufferAttribute(new Float32Array(SPARKS * 3), 3);
  const sparkBorn = new Float32BufferAttribute(new Float32Array(SPARKS).fill(-100), 1);
  sparkGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(SPARKS * 3), 3));
  sparkGeo.setAttribute('aStart', sparkStart);
  sparkGeo.setAttribute('aBorn', sparkBorn);
  sparkGeo.setAttribute('aSeed', new Float32BufferAttribute(Float32Array.from({ length: SPARKS }, () => Math.random() * 10), 1));
  const sparkMat = add(
    new ShaderMaterial({
      vertexShader: SPARK_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: shared.uTime, uSize: { value: 0 }, uColor: { value: new Color('#e9ff8f') } },
    }),
  );
  const sparks = new Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkAt = 0;
  let sparkCredit = 0;
  const spark = (x: number, z: number, time: number) => {
    // From the grass around the light, not only under it.
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.7;
    const sx = x + Math.cos(a) * r;
    const sz = z + Math.sin(a) * r;
    sparkStart.setXYZ(sparkAt, sx, hill(sx, sz) + 0.05, sz);
    sparkBorn.setX(sparkAt, time);
    sparkAt = (sparkAt + 1) % SPARKS;
    sparkStart.needsUpdate = true;
    sparkBorn.needsUpdate = true;
  };

  // ------------------------------------------------------------------ stars
  const STARS = small ? 110 : 260;
  const starGeo = add(new BufferGeometry());
  const starPos = new Float32Array(STARS * 3);
  const starPhase = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    starPos.set([(Math.random() * 2 - 1) * 42, 3 + Math.random() * 24, -32], i * 3);
    starPhase[i] = Math.random();
  }
  starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('aPhase', new Float32BufferAttribute(starPhase, 1));
  const starMat = add(
    new ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: shared.uTime, uSize: { value: 2 } },
    }),
  );
  const stars = new Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  // ------------------------------------------------------------------ layout
  let layout: SceneLayout | null = null;
  const ndc = new Vector2();
  const ray = new Raycaster();
  /** The world x seen at screen x (CSS px) at depth z, near the horizon. */
  const worldX = (px: number, z: number) => {
    ndc.set((px / canvas.clientWidth) * 2 - 1, -0.1);
    ray.setFromCamera(ndc, camera);
    const t = (z - ray.ray.origin.z) / ray.ray.direction.z;
    return ray.ray.origin.x + ray.ray.direction.x * t;
  };
  const place = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const l = layout ?? { focusX: w * 0.75, focusWidth: w * 0.3, moonX: w * 0.8, moonY: h * 0.12 };
    const tx = worldX(l.focusX, TREE_Z);
    tree.position.set(tx + 0.1, hill(tx + 0.1, TREE_Z), TREE_Z);
    // Narrow spaces get a smaller tree (`unit`: px per world unit at the tree's depth).
    const unit = 100 / Math.max(0.001, worldX(l.focusX + 100, TREE_Z) - tx);
    const fit = Math.max(0.6, Math.min(0.85, l.focusWidth / (1.6 * unit)));
    tree.scale.setScalar(fit);
    // The fire a few steps left of the trunk (the form is often close on the right).
    const cx = tree.position.x - 0.55 * fit;
    camp.position.set(cx, hill(cx, CAMP_Z), CAMP_Z);
    camp.scale.setScalar(0.9);
    const fire = camp.position.clone().add(new Vector3(0, 0.12, 0));
    fireLight.position.copy(fire);
    (shared.uFirePos.value as Vector3).copy(fire);
    (shared.uClear.value as Vector3).set(cx, CAMP_Z, 0.45);
    (emberMat.uniforms.uOrigin.value as Vector3).copy(camp.position).add(new Vector3(0, 0.05, 0));
    // The moonlight comes from where the moon is drawn.
    ndc.set((l.moonX / w) * 2 - 1, -(l.moonY / h) * 2 + 1);
    const far = new Vector3(ndc.x, ndc.y, 0.98).unproject(camera);
    moon.position.copy(far);
    moon.target.position.copy(tree.position);
    // The guitar: where the page says there is room, on the ground (lying across the slope).
    ndc.set(((l.guitarX ?? w * 0.3) / w) * 2 - 1, -((l.guitarY ?? h * 0.88) / h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const spot = ray.intersectObject(ground, false)[0]?.point;
    if (spot) {
      guitar.position.set(spot.x, spot.y + 0.012, spot.z);
      guitar.rotation.y = 0.75;
      guitar.scale.setScalar(1.3);
      (shared.uClearG.value as Vector3).set(spot.x, spot.z, 0.42);
    }
  };

  // ------------------------------------------------------------------ size
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Portrait screens: a wider view so the hill still spans the width.
    camera.fov = camera.aspect < 1 ? 58 : 38;
    camera.position.set(0, 1.35, 8.5);
    // The crest a little below the middle of the screen, the meadow below it.
    camera.lookAt(0, camera.aspect < 1 ? 2.6 : 2.15, -10);
    camera.updateProjectionMatrix();
    const k = dpr * (h / 900);
    flyMat.uniforms.uSize.value = 70 * k;
    sparkMat.uniforms.uSize.value = 95 * k;
    emberMat.uniforms.uSize.value = 26 * k;
    flowerMat.uniforms.uSize.value = 28 * k;
    starMat.uniforms.uSize.value = 2.2 * dpr;
    place();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // ------------------------------------------------------------------ pointer
  const raycaster = new Raycaster();
  const pndc = new Vector2();
  let pointer: { x: number; y: number } | null = null;
  let last: { x: number; z: number } | null = null;
  /** Over the page's own controls: the guitar is not what is being pointed at. */
  let overUi = false;
  const isUi = (t: EventTarget | null) =>
    t instanceof Element &&
    Boolean(t.closest('a, button, input, textarea, select, label, [role="button"], [role="tab"], [data-scenery="panel"]'));
  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
    overUi = isUi(e.target);
  };
  const onGuitar = () => {
    if (!pointer || overUi) return false;
    pndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(pndc, camera);
    return raycaster.intersectObject(hitbox, false).length > 0;
  };
  // A click on the guitar: the next note of its tune, a glow, a few fireflies.
  const onDown = (e: PointerEvent) => {
    onPointer(e);
    if (onGuitar()) playGuitar();
  };
  function playGuitar() {
    voice.playNext();
    shared.uPulse.value = 1;
    for (let i = 0; i < 6; i++) spark(guitar.position.x, guitar.position.z, time + i * 0.05);
  }
  // Rolling the wheel over the guitar plays too: a note per notch (trackpads send many small
  // deltas: they add up), never two notes closer than NOTE_GAP_MS.
  const NOTE_GAP_MS = 130;
  let wheelSum = 0;
  let lastNote = 0;
  const onWheel = (e: WheelEvent) => {
    onPointer(e as unknown as PointerEvent);
    if (!onGuitar()) {
      wheelSum = 0;
      return;
    }
    // Over the guitar the wheel plays it instead of scrolling the page.
    e.preventDefault();
    wheelSum += Math.abs(e.deltaY || e.deltaX) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    const now = performance.now();
    if (wheelSum < 60 || now - lastNote < NOTE_GAP_MS) return;
    wheelSum = 0;
    lastNote = now;
    playGuitar();
  };
  let hovering = false;
  const onLeave = () => {
    pointer = null;
    last = null;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('pointerleave', onLeave);
  const touch = () => {
    if (!pointer) return null;
    pndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(pndc, camera);
    const hit = raycaster.intersectObject(ground, false)[0];
    return hit ? { x: hit.point.x, z: hit.point.z } : null;
  };

  // ------------------------------------------------------------------ loop
  let frame = 0;
  let prev = performance.now();
  let time = 0;
  let slowFrames = 0;
  let measured = 0;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    time += dt;

    // A slow device: fewer blades, then tell the caller (it may stop the scene).
    if (measured < 240) {
      measured++;
      if (dt > 0.034) slowFrames++;
      if (measured === 120 && slowFrames > 60) grassGeo.instanceCount = Math.floor(BLADES / 2);
      if (measured === 240 && slowFrames > 150) opts.onSlow?.();
    }

    // The trail: stamps along the pointer's path since the last frame, then fade.
    let count = 0;
    const at = touch();
    if (at) {
      const from = last ?? at;
      const dist = Math.hypot(at.x - from.x, at.z - from.z);
      const steps = Math.min(MAX_STAMPS, Math.max(1, Math.ceil(dist / 0.15)));
      // The light stays where the pointer rests, and follows it when it moves.
      for (let i = 1; i <= steps; i++) {
        const x = from.x + ((at.x - from.x) * i) / steps;
        const z = from.z + ((at.z - from.z) * i) / steps;
        stamps[count++].set((x - X0) / XS, (z - Z0) / ZS, 1);
      }
      if (dist > 0.01) {
        // Fireflies startled out of the grass as the light passes, a few at a time.
        sparkCredit += Math.min(2, dist * 3);
        while (sparkCredit >= 1) {
          sparkCredit -= 1;
          for (let i = 0; i < 3; i++) spark(at.x, at.z, time + i * 0.06);
        }
      }
      last = at;
    }
    trailMat.uniforms.uCount.value = count;
    trailMat.uniforms.uDecay.value = Math.exp(-dt / TRAIL_LIFE_S);
    trailMat.uniforms.uPrev.value = rtA.texture;
    renderer.setRenderTarget(rtB);
    renderer.render(trailScene, trailCam);
    renderer.setRenderTarget(null);
    [rtA, rtB] = [rtB, rtA];
    shared.uTrailTex.value = rtA.texture;


    // The fire flickers.
    const flick = 0.82 + 0.1 * Math.sin(time * 13.0) + 0.08 * Math.sin(time * 7.3 + 1.7);
    fireLight.intensity = 1.6 * flick;
    shared.uFire.value = flick;
    shared.uTime.value = time;
    shared.uPulse.value = Math.max(0, shared.uPulse.value - dt / 1.4);
    // A hand over the guitar (the pointer's light shows it there).
    const over = onGuitar();
    if (over !== hovering) {
      hovering = over;
      document.body.style.cursor = over ? 'pointer' : '';
    }
    flameMat.uniforms.uTime.value = time;
    renderer.render(scene, camera);
  };

  // Hidden tab: nothing to draw.
  const onVisibility = () => {
    cancelAnimationFrame(frame);
    if (document.visibilityState === 'visible') {
      prev = performance.now();
      frame = requestAnimationFrame(loop);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  frame = requestAnimationFrame(loop);

  return {
    setLayout(l) {
      layout = l;
      place();
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('wheel', onWheel);
      if (hovering) document.body.style.cursor = '';
      voice.dispose();
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const o of disposables) o.dispose();
      scene.traverse((o: Object3D) => {
        if (o instanceof Mesh && o.geometry !== blade) o.geometry?.dispose?.();
      });
      renderer.dispose();
    },
  };
}
