import { Result } from "better-result";

import { geoAlbersUsa, type GeoProjection } from "d3-geo";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { describeAtlasError, loadUsStates } from "./atlas";
import type { StateName } from "./states";

type Props = {
  guesses: Record<string, StateName>;
  selectedId: string | null;
  scored: Record<string, boolean> | null;
  onSelect: (id: string, trueName: StateName) => void;
};

type Ring = number[][];

type MeshEntry = {
  id: string;
  name: StateName;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  lines: THREE.Line[];
  targetLift: number;
  liftVel: number;
  labelAnchor: THREE.Vector3;
  inradius: number;
  decal: THREE.Mesh | null;
  decalKey: string;
};

const COLORS = {
  idle: 0x1c5542,
  hover: 0x2a7a5c,
  selected: 0x3ecf8e,
  guessed: 0xc9a227,
  right: 0x3ecf8e,
  wrong: 0xc45c4a,
  edgeIdle: 0x8fd9a8,
  edgeSelected: 0xf4f0dc,
  edgeGuessed: 0xffd56a,
  edgeRight: 0x7dffc4,
  edgeWrong: 0xff8a78,
};

const WIDTH = 960;
const HEIGHT = 600;
const SCALE = 42;
const ExtrudeProfile = THREE["Shape"];

type LandPoly = {
  outer: THREE.Vector2[];
  holes: THREE.Vector2[][];
};

function offsetLand(polys: LandPoly[], dx: number, dz: number) {
  for (const poly of polys) {
    for (const p of poly.outer) {
      p.x -= dx;
      p.y -= dz;
    }
    for (const hole of poly.holes) {
      for (const p of hole) {
        p.x -= dx;
        p.y -= dz;
      }
    }
  }
}

function traceRing(
  ctx: CanvasRenderingContext2D,
  ring: THREE.Vector2[],
  extent: number,
  res: number,
) {
  const s = res / (extent * 2);
  const first = ring[0];
  if (!first) return;
  ctx.moveTo((first.x + extent) * s, (extent - first.y) * s);
  for (let i = 1; i < ring.length; i++) {
    const p = ring[i];
    ctx.lineTo((p.x + extent) * s, (extent - p.y) * s);
  }
  ctx.closePath();
}

function fillLand(ctx: CanvasRenderingContext2D, polys: LandPoly[], extent: number, res: number) {
  for (const poly of polys) {
    if (poly.outer.length < 3) continue;
    ctx.beginPath();
    traceRing(ctx, poly.outer, extent, res);
    for (const hole of poly.holes) {
      if (hole.length < 3) continue;
      traceRing(ctx, hole, extent, res);
    }
    ctx.fill("evenodd");
  }
}

function paintLandMask(polys: LandPoly[], extent: number, res: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  if (!ctx) return tex;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, res, res);
  ctx.fillStyle = "#fff";
  ctx.filter = "blur(8px)";
  fillLand(ctx, polys, extent, res);
  ctx.filter = "none";
  fillLand(ctx, polys, extent, res);
  tex.needsUpdate = true;
  return tex;
}

function makeOcean(span: number, land: LandPoly[]) {
  const extent = span * 0.72;
  const landTex = paintLandMask(land, extent, 1024);
  const geom = new THREE.PlaneGeometry(span * 10, span * 10, 1, 1);
  geom.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uExtent: { value: extent },
      uFade: { value: span * 1.2 },
      uLand: { value: landTex },
      uDeep: { value: new THREE.Color(0x08151c) },
      uMid: { value: new THREE.Color(0x1a4a56) },
      uFog: { value: new THREE.Color(0x06080a) },
    },
    vertexShader: `
      varying vec3 vWorld;

      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uExtent;
      uniform float uFade;
      uniform sampler2D uLand;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uFog;
      varying vec3 vWorld;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 xz = vWorld.xz;
        vec2 uv = (xz + uExtent) / (uExtent * 2.0);
        float land = 0.0;
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
          land = texture2D(uLand, uv).r;
        }
        float shimmer = hash(floor(xz * 18.0 + uTime * 0.4)) * 0.04;
        vec3 col = mix(uDeep, uMid, 0.28 + shimmer);
        float fog = smoothstep(uFade * 0.9, uFade * 1.9, length(xz));
        col = mix(col, uFog, fog);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = -0.2;
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, mat, landTex };
}

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 < 1e-12 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  return Math.hypot(apx - abx * t, apy - aby * t);
}

function minEdgeDist(px: number, py: number, rings: THREE.Vector2[][]): number {
  let d = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j];
      const b = ring[i];
      d = Math.min(d, distToSegment(px, py, a.x, a.y, b.x, b.y));
    }
  }
  return d;
}

function pointInRing(px: number, py: number, ring: THREE.Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j];
    const b = ring[i];
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(px: number, py: number, rings: THREE.Vector2[][]): boolean {
  const outer = rings[0];
  if (!outer || !pointInRing(px, py, outer)) return false;
  for (let h = 1; h < rings.length; h++) {
    const hole = rings[h];
    if (hole && pointInRing(px, py, hole)) return false;
  }
  return true;
}

function interiorLabel(rings: THREE.Vector2[][]): { x: number; y: number; r: number } | null {
  const outer = rings[0];
  if (!outer || outer.length < 3) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of outer) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  let bestX = (minX + maxX) * 0.5;
  let bestY = (minY + maxY) * 0.5;
  let bestR = -1;
  const steps = 20;
  for (let iy = 0; iy <= steps; iy++) {
    const y = minY + ((maxY - minY) * iy) / steps;
    for (let ix = 0; ix <= steps; ix++) {
      const x = minX + ((maxX - minX) * ix) / steps;
      if (!pointInPolygon(x, y, rings)) continue;
      const r = minEdgeDist(x, y, rings);
      if (r > bestR) {
        bestR = r;
        bestX = x;
        bestY = y;
      }
    }
  }
  if (bestR <= 0) return null;
  return { x: bestX, y: bestY, r: bestR };
}

function projectRing(ring: Ring, projection: GeoProjection): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (const coord of ring) {
    // SAFETY: GeoJSON ring positions are [longitude, latitude] pairs.
    const p = projection(coord as [number, number]);
    if (!p) continue;
    const pt = new THREE.Vector2((p[0] - WIDTH / 2) / SCALE, (HEIGHT / 2 - p[1]) / SCALE);
    const prev = pts[pts.length - 1];
    if (prev && prev.distanceToSquared(pt) < 1e-12) continue;
    pts.push(pt);
  }
  if (pts.length > 3 && pts[0].distanceToSquared(pts[pts.length - 1]) < 1e-12) {
    pts.pop();
  }
  return pts;
}

function extrudeProfileFromPolygon(
  polygon: Ring[],
  projection: GeoProjection,
): InstanceType<typeof ExtrudeProfile> | null {
  const [outer, ...holes] = polygon;
  if (!outer) return null;
  const outerPts = projectRing(outer, projection);
  if (outerPts.length < 3) return null;
  const profile = new ExtrudeProfile(outerPts);
  for (const hole of holes) {
    const holePts = projectRing(hole, projection);
    if (holePts.length < 3) continue;
    profile.holes.push(new THREE.Path(holePts));
  }
  return profile;
}

function polygonsOf(geometry: { type: string; coordinates?: unknown }): Ring[][] {
  if (geometry.type === "Polygon") {
    // SAFETY: GeoJSON Polygon coordinates are rings of positions.
    return [geometry.coordinates as Ring[]];
  }
  if (geometry.type === "MultiPolygon") {
    // SAFETY: GeoJSON MultiPolygon coordinates are arrays of rings.
    return geometry.coordinates as Ring[][];
  }
  return [];
}

function outlineFromPolygon(polygon: Ring[], projection: GeoProjection, y: number): THREE.Line[] {
  const lines: THREE.Line[] = [];
  for (const ring of polygon) {
    const pts = projectRing(ring, projection);
    if (pts.length < 3) continue;
    const positions: number[] = [];
    for (const p of pts) {
      positions.push(p.x, y, -p.y);
    }
    positions.push(pts[0].x, y, -pts[0].y);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    lines.push(
      new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({
          color: COLORS.edgeIdle,
          transparent: true,
          opacity: 0.9,
        }),
      ),
    );
  }
  return lines;
}

function palette(
  id: string,
  guesses: Record<string, StateName>,
  selectedId: string | null,
  scored: Record<string, boolean> | null,
  hoveredId: string | null,
) {
  if (scored?.[id] === true)
    return { fill: COLORS.right, edge: COLORS.edgeRight, lift: 0.28, glow: 0.45, opacity: 1 };
  if (scored?.[id] === false)
    return { fill: COLORS.wrong, edge: COLORS.edgeWrong, lift: 0.28, glow: 0.4, opacity: 1 };
  const dimmed = Boolean(selectedId && selectedId !== id);
  if (selectedId === id)
    return { fill: COLORS.selected, edge: COLORS.edgeSelected, lift: 0.34, glow: 0.42, opacity: 1 };
  if (guesses[id])
    return {
      fill: COLORS.guessed,
      edge: COLORS.edgeGuessed,
      lift: 0.38,
      glow: dimmed ? 0.08 : 0.38,
      opacity: dimmed ? 0.5 : 1,
    };
  if (hoveredId === id)
    return { fill: COLORS.hover, edge: COLORS.edgeIdle, lift: 0.34, glow: 0.42, opacity: 1 };
  return {
    fill: dimmed ? 0x123028 : COLORS.idle,
    edge: dimmed ? 0x2a4a3c : COLORS.edgeIdle,
    lift: 0,
    glow: dimmed ? 0.04 : 0.06,
    opacity: dimmed ? 0.5 : 1,
  };
}

function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function trackedWidth(ctx: CanvasRenderingContext2D, chars: string[], tracking: number): number {
  let w = tracking * Math.max(0, chars.length - 1);
  for (const c of chars) w += ctx.measureText(c).width;
  return w;
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  chars: string[],
  tracking: number,
  cx: number,
  cy: number,
) {
  const total = trackedWidth(ctx, chars, tracking);
  let x = cx - total / 2;
  for (const c of chars) {
    const w = ctx.measureText(c).width;
    const px = x + w / 2;
    ctx.strokeText(c, px, cy);
    ctx.fillText(c, px, cy);
    x += w + tracking;
  }
}

function disposeDecal(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  // SAFETY: decals use a single MeshBasicMaterial with an optional canvas map.
  const mat = mesh.material as THREE.MeshBasicMaterial;
  mat.map?.dispose();
  mat.dispose();
}

function makeNameDecal(text: string, color: number, inradius: number): THREE.Mesh {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01));
  }
  const label = text.toUpperCase();
  const chars = [...label];
  let size = 70;
  const family = 'Instrument Serif, "Iowan Old Style", Palatino, serif';
  const trackingOf = (s: number) => s * 0.18;
  ctx.font = `${size}px ${family}`;
  let tw = trackedWidth(ctx, chars, trackingOf(size));
  while (size > 16 && tw > 900) {
    size -= 3;
    ctx.font = `${size}px ${family}`;
    tw = trackedWidth(ctx, chars, trackingOf(size));
  }
  canvas.width = Math.min(1024, Math.max(64, Math.ceil(tw + 56)));
  canvas.height = Math.min(256, Math.max(32, Math.ceil(size * 1.85)));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(4, size * 0.14);
  ctx.strokeStyle = "rgba(6, 17, 13, 0.72)";
  ctx.fillStyle = hexCss(color);
  drawTracked(ctx, chars, trackingOf(size), canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  const aspect = canvas.width / Math.max(canvas.height, 1);
  const r = Math.max(inradius, 0.35);
  const width = (2 * r * 0.78) / Math.hypot(1, 1 / aspect);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / aspect),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      alphaTest: 0.08,
    }),
  );
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  mesh.renderOrder = 3;
  mesh.raycast = () => {};
  return mesh;
}

export function UsMap({ guesses, selectedId, scored, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const guessesRef = useRef(guesses);
  const selectedRef = useRef(selectedId);
  const scoredRef = useRef(scored);
  const onSelectRef = useRef(onSelect);
  guessesRef.current = guesses;
  selectedRef.current = selectedId;
  scoredRef.current = scored;
  onSelectRef.current = onSelect;

  const applyRef = useRef<(hoveredId: string | null) => void>(() => {});

  useEffect(() => {
    applyRef.current(null);
  }, [guesses, selectedId, scored]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let raf = 0;
    const entries = new Map<string, MeshEntry>();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080a);
    let oceanMat: THREE.ShaderMaterial | undefined;
    let oceanLand: THREE.Texture | undefined;

    const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.05, 400);
    camera.position.set(0, 18, 0.01);
    let viewSize = 18;
    let mapSpan = 18;

    const root = new THREE.Group();
    scene.add(root);

    const hemi = new THREE.HemisphereLight(0xc8d4c8, 0x0a0c18, 0.68);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff3d0, 1.35);
    key.position.set(-16, 18, 14);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6ea8ff, 0.4);
    rim.position.set(12, 10, -12);
    scene.add(rim);
    const lockLight = new THREE.SpotLight(0x7dffc4, 0, 22, 0.22, 0.45, 1.1);
    lockLight.position.set(0, 10, 0);
    scene.add(lockLight);
    scene.add(lockLight.target);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredId: string | null = null;
    let down: { x: number; y: number } | null = null;
    const camTarget = new THREE.Vector3(0, 0.4, 0);
    const desiredTarget = new THREE.Vector3(0, 0.4, 0);

    function apply(nextHover: string | null) {
      hoveredId = nextHover;
      for (const entry of entries.values()) {
        const pal = palette(
          entry.id,
          guessesRef.current,
          selectedRef.current,
          scoredRef.current,
          hoveredId,
        );
        entry.targetLift = pal.lift;
        for (const mesh of entry.meshes) {
          // SAFETY: state meshes are constructed with MeshStandardMaterial only.
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.setHex(pal.fill);
          mat.emissive.setHex(pal.fill);
          mat.emissiveIntensity = pal.glow;
          mat.opacity = pal.opacity;
          mat.transparent = pal.opacity < 1;
        }
        for (const line of entry.lines) {
          // SAFETY: outlines are constructed with LineBasicMaterial only.
          const lm = line.material as THREE.LineBasicMaterial;
          lm.color.setHex(pal.edge);
          lm.opacity = Math.max(0.12, pal.opacity);
          lm.transparent = true;
        }
        const guessName = guessesRef.current[entry.id];
        if (!guessName) {
          if (entry.decal) {
            entry.group.remove(entry.decal);
            disposeDecal(entry.decal);
            entry.decal = null;
            entry.decalKey = "";
          }
        } else {
          const tone =
            scoredRef.current?.[entry.id] === true
              ? COLORS.right
              : scoredRef.current?.[entry.id] === false
                ? COLORS.wrong
                : 0xf4ead0;
          const key = `${guessName}|${tone}|h`;
          if (entry.decalKey !== key) {
            if (entry.decal) {
              entry.group.remove(entry.decal);
              disposeDecal(entry.decal);
            }
            const decal = makeNameDecal(guessName, tone, entry.inradius);
            decal.position.copy(entry.labelAnchor);
            entry.group.add(decal);
            entry.decal = decal;
            entry.decalKey = key;
          }
          if (entry.decal) {
            // SAFETY: decals use a single MeshStandardMaterial.
            const dm = entry.decal.material as THREE.MeshBasicMaterial;
            dm.opacity = pal.opacity;
          }
        }
      }
      const focusId = selectedRef.current;
      const focus = focusId ? entries.get(focusId) : undefined;
      if (focus) {
        desiredTarget.copy(focus.labelAnchor);
        focus.group.localToWorld(desiredTarget);
      } else {
        desiredTarget.set(0, 0.4, 0);
      }
    }
    applyRef.current = apply;

    function pick(clientX: number, clientY: number): MeshEntry | null {
      if (!renderer) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = [...entries.values()].flatMap((e) => e.meshes);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (!hit) return null;
      // SAFETY: each mesh sets userData.id to the state's string id on construction.
      return entries.get(hit.object.userData.id as string) ?? null;
    }

    function onMove(ev: PointerEvent) {
      const hit = pick(ev.clientX, ev.clientY);
      const next = hit?.id ?? null;
      if (next !== hoveredId) apply(next);
      if (!renderer) return;
      renderer.domElement.style.cursor = down ? "grabbing" : next ? "pointer" : "grab";
    }

    function onDown(ev: PointerEvent) {
      down = { x: ev.clientX, y: ev.clientY };
      if (renderer) renderer.domElement.style.cursor = "grabbing";
    }

    function onUp(ev: PointerEvent) {
      if (!down) return;
      const dx = ev.clientX - down.x;
      const dy = ev.clientY - down.y;
      down = null;
      if (renderer) renderer.domElement.style.cursor = hoveredId ? "pointer" : "grab";
      if (dx * dx + dy * dy > 25) return;
      if (scoredRef.current) return;
      const hit = pick(ev.clientX, ev.clientY);
      if (!hit) return;
      onSelectRef.current(hit.id, hit.name);
    }

    const resize = () => {
      if (!renderer || !host) return;
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      const short = h < 540;
      const narrow = w < 720;
      const phone = w < 480 && !short;
      const pad = mapSpan * (phone ? 0.72 : narrow && !short ? 0.6 : 0.52);
      viewSize = pad / Math.min(Math.max(aspect, 0.42), 1);
      const panX = short && aspect > 1.2 ? viewSize * 0.2 : 0;
      const panY = phone ? viewSize * 0.32 : narrow && !short ? viewSize * 0.18 : 0;
      camera.left = -viewSize * aspect - panX;
      camera.right = viewSize * aspect - panX;
      camera.top = viewSize - panY;
      camera.bottom = -viewSize - panY;
      camera.updateProjectionMatrix();
    };

    const abort = new AbortController();
    void loadUsStates(abort.signal).then((loaded) => {
      if (disposed) return;
      if (Result.isError(loaded)) {
        setLoadError(describeAtlasError(loaded.error));
        return;
      }
      const states = loaded.value;
      const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], {
        type: "FeatureCollection",
        features: states,
      });

      const extrude = {
        depth: 0.22,
        bevelEnabled: false,
        steps: 1,
        curveSegments: 1,
      };

      const landPolys: LandPoly[] = [];

      for (const f of states) {
        const name = f.properties.name;
        const id = String(f.id ?? name);
        const group = new THREE.Group();
        group.userData = { id, name };
        const meshes: THREE.Mesh[] = [];
        const lines: THREE.Line[] = [];
        const labelAnchor = new THREE.Vector3();
        let inradius = 0.2;
        let bestR = -1;

        for (const polygon of polygonsOf(f.geometry)) {
          const rings = polygon
            .map((ring) => projectRing(ring, projection))
            .filter((ring) => ring.length >= 3);
          const interior = interiorLabel(rings);
          if (interior && interior.r > bestR) {
            bestR = interior.r;
            inradius = interior.r;
            labelAnchor.set(interior.x, extrude.depth + 0.04, -interior.y);
          }
          const xzRings = rings.map((ring) => ring.map((p) => new THREE.Vector2(p.x, -p.y)));
          const outer = xzRings[0];
          if (outer) landPolys.push({ outer, holes: xzRings.slice(1) });
          const profile = extrudeProfileFromPolygon(polygon, projection);
          if (!profile) continue;
          const geom = new THREE.ExtrudeGeometry(profile, extrude);
          geom.rotateX(-Math.PI / 2);
          const mat = new THREE.MeshStandardMaterial({
            color: COLORS.idle,
            metalness: 0.08,
            roughness: 0.86,
            emissive: COLORS.idle,
            emissiveIntensity: 0.04,
            transparent: true,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.userData = { id, name };
          group.add(mesh);
          meshes.push(mesh);
          for (const line of outlineFromPolygon(polygon, projection, extrude.depth + 0.012)) {
            group.add(line);
            lines.push(line);
          }
        }

        if (!meshes.length) continue;
        root.add(group);
        entries.set(id, {
          id,
          name,
          group,
          meshes,
          lines,
          targetLift: 0,
          liftVel: 0,
          labelAnchor,
          inradius,
          decal: null,
          decalKey: "",
        });
      }

      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      root.position.sub(center);
      const span = Math.max(size.x, size.z);

      offsetLand(landPolys, center.x, center.z);
      const ocean = makeOcean(span, landPolys);
      scene.add(ocean.mesh);
      oceanMat = ocean.mat;
      oceanLand = ocean.landTex;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x06080a, 1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement);
      renderer.domElement.className = "map-canvas";
      renderer.domElement.style.touchAction = "none";

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enableRotate = false;
      controls.enablePan = true;
      controls.panSpeed = 1.5;
      controls.screenSpacePanning = true;
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.touches.ONE = THREE.TOUCH.PAN;
      controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      controls.minDistance = span * 0.08;
      controls.maxDistance = span * 2.2;
      controls.minZoom = 0.55;
      controls.maxZoom = 12;
      const polar = 0.18;
      controls.minPolarAngle = polar;
      controls.maxPolarAngle = polar;
      controls.minAzimuthAngle = 0;
      controls.maxAzimuthAngle = 0;
      controls.autoRotate = false;
      controls.target.set(0, 0, 0);
      camTarget.set(0, 0, 0);
      const dist = span * 1.35;
      camera.position.set(0, Math.cos(polar) * dist, Math.sin(polar) * dist);
      mapSpan = span;
      controls.update();

      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointerup", onUp);
      resize();
      apply(null);

      const tick = () => {
        if (disposed || !renderer || !controls) return;
        const locked = Boolean(selectedRef.current);
        lockLight.intensity += ((locked ? 6 : 0) - lockLight.intensity) * 0.08;
        lockLight.target.position.copy(desiredTarget);
        lockLight.position.set(desiredTarget.x, desiredTarget.y + 8, desiredTarget.z);
        controls.minDistance = locked ? span * 0.08 : span * 0.12;

        const now = performance.now() * 0.001;
        if (oceanMat) oceanMat.uniforms.uTime.value = now;

        for (const entry of entries.values()) {
          const dy = entry.targetLift - entry.group.position.y;
          entry.liftVel = entry.liftVel * 0.68 + dy * 0.24;
          entry.group.position.y += entry.liftVel;
        }

        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();
    });

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(raf);
      ro.disconnect();
      applyRef.current = () => {};
      oceanLand?.dispose();
      controls?.dispose();
      if (renderer) {
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("pointerup", onUp);
        renderer.dispose();
        renderer.domElement.remove();
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else {
            // SAFETY: non-array materials are a single THREE.Material instance.
            (mat as THREE.Material).dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="map-host"
      role="img"
      aria-label="Interactive map of the fifty United States"
    >
      {loadError ? <p className="map-fail">Map failed: {loadError}</p> : null}
    </div>
  );
}
