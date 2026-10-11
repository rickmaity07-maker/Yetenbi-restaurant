"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Shape samplers - each returns `count` xyz points                   */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Spiral galaxy of "beans" with three arms. */
function galaxy(count: number) {
  const r = rng(11);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = Math.pow(r(), 1.6) * 6.5;
    const arm = (Math.floor(r() * 3) / 3) * Math.PI * 2;
    const angle = arm + radius * 0.75;
    const spread = (1 - radius / 7) * 0.12 + 0.08;
    out[i * 3] = Math.cos(angle) * radius + (r() - 0.5) * spread * radius;
    out[i * 3 + 1] = (r() - 0.5) * 0.5 * (1.2 - radius / 6.5);
    out[i * 3 + 2] = Math.sin(angle) * radius + (r() - 0.5) * spread * radius;
  }
  return out;
}

/** One giant coffee bean, crease and all. */
function bean(count: number) {
  const r = rng(23);
  const out = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    if (r() < 0.14) {
      const y = r() * 1.84 - 0.92;
      const x = 0.09 * Math.sin(y * 2.6);
      const z = Math.sqrt(Math.max(0, 1 - y * y - x * x)) * 0.4;
      out[i * 3] = x * 2.0;
      out[i * 3 + 1] = y * 3.0;
      out[i * 3 + 2] = z * 1.5;
      continue;
    }
    v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
    if (v.z > 0) {
      const c = 0.09 * Math.sin(v.y * 2.6);
      const d = (v.x - c) / 0.13;
      v.z -= 0.6 * Math.exp(-d * d) * v.z;
    }
    const shell = 0.99 + r() * 0.02;
    out[i * 3] = v.x * 2.0 * shell;
    out[i * 3 + 1] = v.y * 3.0 * shell;
    out[i * 3 + 2] = v.z * 1.5 * shell;
  }
  return out;
}

/** Jebena silhouette: lathe body, neck, spout and handle. */
function jebena(count: number) {
  const r = rng(37);
  const out = new Float32Array(count * 3);
  const profile = new THREE.SplineCurve([
    new THREE.Vector2(0.42, 0.02),
    new THREE.Vector2(0.95, 0.45),
    new THREE.Vector2(1.08, 0.85),
    new THREE.Vector2(0.95, 1.25),
    new THREE.Vector2(0.55, 1.6),
    new THREE.Vector2(0.24, 1.85),
    new THREE.Vector2(0.18, 2.3),
    new THREE.Vector2(0.17, 2.75),
    new THREE.Vector2(0.33, 3.05),
  ]);
  const spout = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.82, 1.1, 0),
    new THREE.Vector3(1.15, 1.45, 0),
    new THREE.Vector3(1.32, 1.95, 0),
    new THREE.Vector3(1.48, 2.3, 0),
  ]);
  const handle = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.17, 2.45, 0),
    new THREE.Vector3(-0.7, 2.35, 0),
    new THREE.Vector3(-1.05, 1.75, 0),
    new THREE.Vector3(-0.98, 1.15, 0),
  ]);
  const rings: [number, number][] = [
    [0.43, 0.03],
    [1.08, 0.85],
    [0.8, 1.42],
    [0.18, 2.6],
    [0.33, 3.05],
  ];
  const scale = 1.7;
  for (let i = 0; i < count; i++) {
    const pick = r();
    let x: number, y: number, z: number;
    if (pick < 0.16) {
      const [ringR, ringY] = rings[Math.floor(r() * rings.length)];
      const a = r() * Math.PI * 2;
      x = Math.cos(a) * ringR;
      z = Math.sin(a) * ringR;
      y = ringY;
    } else if (pick < 0.84) {
      const p = profile.getPoint(r());
      const a = r() * Math.PI * 2;
      x = Math.cos(a) * p.x;
      z = Math.sin(a) * p.x;
      y = p.y;
    } else {
      const curve = pick < 0.93 ? spout : handle;
      const p = curve.getPoint(r());
      const a = r() * Math.PI * 2;
      const rad = pick < 0.93 ? 0.09 : 0.07;
      x = p.x + Math.cos(a) * rad;
      y = p.y + Math.sin(a) * rad;
      z = p.z + Math.sin(a + 1.3) * rad;
    }
    out[i * 3] = x * scale;
    out[i * 3 + 1] = (y - 1.5) * scale;
    out[i * 3 + 2] = z * scale;
  }
  return out;
}

/** The word YETENBI, sampled from canvas pixels and given a little depth. */
function word(count: number, family: string) {
  const r = rng(53);
  const W = 1400;
  const H = 360;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 280px ${family}`;
  ctx.fillText("YETENBI", W / 2, H / 2 + 10);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  const out = new Float32Array(count * 3);
  const n = pts.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(r() * n) * 2;
    out[i * 3] = ((pts[k] + r() * 2) / W - 0.5) * 12.5;
    out[i * 3 + 1] = (-((pts[k + 1] + r() * 2) / H - 0.5) * (12.5 * H)) / W;
    out[i * 3 + 2] = (r() - 0.5) * 0.1;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Shader                                                              */
/* ------------------------------------------------------------------ */

const vertex = /* glsl */ `
  uniform float uStage;
  uniform float uTime;
  uniform float uScatter;
  uniform float uPixel;
  uniform float uFit;
  uniform vec3 uMouse;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec4 aRand;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;

  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  void main() {
    // Galaxy spins faster toward its core.
    vec3 p0 = position;
    p0.xz = rot(uTime * (0.08 + 0.35 / (1.0 + length(position.xz)))) * p0.xz;
    p0.yz = rot(1.05) * p0.yz;

    float l = clamp(uStage + (aRand.x - 0.5) * 0.22, 0.0, 3.0);
    float k1 = smoothstep(0.0, 1.0, clamp(l, 0.0, 1.0));
    float k2 = smoothstep(0.0, 1.0, clamp(l - 1.0, 0.0, 1.0));
    float k3 = smoothstep(0.0, 1.0, clamp(l - 2.0, 0.0, 1.0));
    vec3 pos = mix(mix(mix(p0, aP1, k1), aP2, k2), aP3, k3);

    // Turbulence peaks mid-morph so shapes dissolve into swirling smoke.
    float mid = sin(fract(l) * 3.14159) * step(0.001, l) * step(l, 2.999);
    vec3 swirl = vec3(
      sin(pos.y * 1.7 + uTime * 1.3 + aRand.y * 6.28),
      cos(pos.x * 1.3 + uTime * 1.1 + aRand.z * 6.28),
      sin(pos.x * 1.1 + pos.y * 0.7 + uTime)
    );
    pos += swirl * mid * 0.55;

    // Idle shimmer.
    pos += 0.01 * vec3(sin(uTime * 2.0 + aRand.w * 40.0), cos(uTime * 1.7 + aRand.y * 40.0), 0.0);

    pos *= uFit;

    // Final explosion outward.
    vec3 dir = normalize(vec3(aRand.y - 0.5, aRand.z - 0.5, aRand.w - 0.5) + 0.0001);
    pos += dir * uScatter * (6.0 + aRand.x * 10.0);

    // Push particles away from the pointer.
    vec2 d = pos.xy - uMouse.xy;
    float f = exp(-dot(d, d) * 0.9) * 1.1;
    pos.xy += normalize(d + 0.0001) * f;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.55 + aRand.y * 1.05) * (1.0 + mid * 0.9 + f * 1.5);
    gl_PointSize = size * uPixel * (14.0 / -mv.z);

    vec3 gold = vec3(0.91, 0.76, 0.42);
    vec3 cream = vec3(1.0, 0.94, 0.82);
    vec3 ember = vec3(0.95, 0.42, 0.14);
    vColor = mix(gold, aRand.z > 0.82 ? ember : cream, smoothstep(0.35, 1.0, aRand.z));
    vColor = mix(vColor, ember, f * 0.8);
    vAlpha = (0.85 + aRand.w * 0.4) * (1.0 - uScatter * 0.9);
    // Points on the far side of a shape fade, so its volume and outline read clearly.
    vDepth = smoothstep(-15.0, -8.5, mv.z);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.12, d);
    gl_FragColor = vec4(vColor * mix(0.55, 1.15, vDepth), a * vAlpha * mix(0.25, 1.0, vDepth));
  }
`;

/* ------------------------------------------------------------------ */

function Particles({
  progress,
  count,
  family,
  onReady,
}: {
  progress: MotionValue<number>;
  count: number;
  family: string;
  onReady?: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { size, viewport, gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(galaxy(count), 3));
    g.setAttribute("aP1", new THREE.BufferAttribute(bean(count), 3));
    g.setAttribute("aP2", new THREE.BufferAttribute(jebena(count), 3));
    g.setAttribute("aP3", new THREE.BufferAttribute(word(count, family), 3));
    const r = rng(71);
    const rand = new Float32Array(count * 4).map(() => r());
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    return g;
  }, [count, family]);

  const uniforms = useMemo(
    () => ({
      uStage: { value: 0 },
      uTime: { value: 0 },
      uScatter: { value: 0 },
      uPixel: { value: 1 },
      uFit: { value: 1 },
      uMouse: { value: new THREE.Vector3(99, 99, 0) },
    }),
    [],
  );

  const material = useRef<THREE.ShaderMaterial>(null);
  const announced = useRef(false);
  const mouse = useRef(new THREE.Vector3(99, 99, 0));
  const pointer = useRef<THREE.Vector2 | null>(null);
  const spin = useRef(0);

  // Track the pointer on the window: captions sit above the canvas and would swallow canvas events.
  useEffect(() => {
    const on = (e: PointerEvent) => {
      pointer.current ??= new THREE.Vector2();
      pointer.current.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    window.addEventListener("pointermove", on);
    return () => window.removeEventListener("pointermove", on);
  }, []);

  useFrame((_, delta) => {
    // R3F copies the uniforms prop onto the material, so update the material's own copy.
    const u = material.current!.uniforms;
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }
    const p = progress.get();
    // galaxy → bean (.1-.2) hold → jebena (.34-.44) hold → word (.58-.68) hold → explode after .86
    const stage =
      p < 0.1
        ? 0
        : p < 0.2
          ? (p - 0.1) / 0.1
          : p < 0.34
            ? 1
            : p < 0.44
              ? 1 + (p - 0.34) / 0.1
              : p < 0.58
                ? 2
                : Math.min(3, 2 + (p - 0.58) / 0.1);
    u.uStage.value = THREE.MathUtils.lerp(u.uStage.value, stage, 0.11);
    u.uScatter.value = THREE.MathUtils.lerp(u.uScatter.value, Math.max(0, (p - 0.86) / 0.14), 0.1);
    u.uTime.value += delta;
    u.uPixel.value = gl.getPixelRatio();
    u.uFit.value = Math.min(1, size.width / size.height / 1.45) * 0.95 + 0.05;

    // Pointer in world units on the z=0 plane; parked off-screen until the visitor moves the mouse.
    const pt = pointer.current;
    if (pt) mouse.current.set((pt.x * viewport.width) / 2, (pt.y * viewport.height) / 2, 0);
    u.uMouse.value.lerp(mouse.current, 0.15);

    // Shapes turn slowly, then ease to face the camera for the word.
    const facing = THREE.MathUtils.smoothstep(u.uStage.value, 2.2, 2.9);
    spin.current += delta * 0.3 * (1 - facing);
    const front = Math.round(spin.current / (Math.PI * 2)) * Math.PI * 2;
    const g = group.current!;
    g.rotation.y = THREE.MathUtils.lerp(spin.current, front, facing) + (pt?.x ?? 0) * 0.15;
    g.rotation.x = -(pt?.y ?? 0) * 0.1;
  });

  return (
    <group ref={group}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={material}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default function ParticleJourney({
  progress,
  active,
  onReady,
}: {
  progress: MotionValue<number>;
  active: boolean;
  onReady?: () => void;
}) {
  const [family, setFamily] = useState<string | null>(null);
  const [count, setCount] = useState(16000);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement).getPropertyValue("--font-cormorant").trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(window.innerWidth < 768 ? 6500 : 16000);
    document.fonts.ready.then(() => setFamily(cs || "Georgia, serif"));
  }, []);

  if (!family) return null;

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 11], fov: 45 }}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
    >
      <Particles progress={progress} count={count} family={family} onReady={onReady} />
    </Canvas>
  );
}
