import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WALLS, WALL_HEIGHT, type WallDef } from '@/data/labLayout';
import { M } from './materials';
import { CanvasPlane, signDrawer } from './CanvasLabel';

const H = WALL_HEIGHT;

/** Box geometry whose UVs are scaled to world size so one shared material tiles evenly (2.4 m per repeat). */
function worldBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z (4 vertices each)
  const spans: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = spans[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * (su / 2.4), f === 2 || f === 3 ? uv.getY(i) * (sv / 2.4) : uv.getY(i) * (sv / h));
    }
  }
  return g;
}

function Wall({ w }: { w: WallDef }) {
  const geo = useMemo(() => worldBox(w.w, H, w.d), [w.w, w.d]);
  const alongX = w.w > w.d;
  const len = alongX ? w.w : w.d;
  return (
    <group position={[w.x, 0, w.z]}>
      <mesh geometry={geo} position={[0, H / 2, 0]} material={M.wall} receiveShadow castShadow />
      {/* skirting + light strip on both faces */}
      {[-1, 1].map((side) => (
        <group key={side} position={alongX ? [0, 0, side * (w.d / 2 + 0.012)] : [side * (w.w / 2 + 0.012), 0, 0]} rotation-y={alongX ? 0 : Math.PI / 2}>
          <mesh position={[0, 0.07, 0]} material={M.wallLower}><boxGeometry args={[len, 0.14, 0.03]} /></mesh>
          <mesh position={[0, 0.16, 0.012]} material={M.lightStrip}><boxGeometry args={[len - 0.1, 0.018, 0.01]} /></mesh>
          <mesh position={[0, H - 0.12, 0]} material={M.wallLower}><boxGeometry args={[len, 0.24, 0.05]} /></mesh>
        </group>
      ))}
    </group>
  );
}

function GlassWall({ w }: { w: WallDef }) {
  const posts = Math.ceil(w.d / 1.6) + 1;
  return (
    <group>
      <mesh position={[w.x, H / 2, w.z]} material={M.glass}><boxGeometry args={[0.06, H, w.d]} /></mesh>
      <mesh position={[w.x, 0.05, w.z]} material={M.frame}><boxGeometry args={[0.14, 0.1, w.d]} /></mesh>
      <mesh position={[w.x, 1.05, w.z]} material={M.frame}><boxGeometry args={[0.1, 0.05, w.d]} /></mesh>
      <mesh position={[w.x, H - 0.06, w.z]} material={M.frame}><boxGeometry args={[0.16, 0.12, w.d]} /></mesh>
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={i} position={[w.x, H / 2, w.z - w.d / 2 + Math.min(w.d, i * 1.6)]} material={M.frame}>
          <boxGeometry args={[0.12, H, 0.07]} />
        </mesh>
      ))}
    </group>
  );
}

/** Curved structural rib (bulkhead) along a wall at position x, spanning from z0 wall face to z1 wall face. */
function Bulkhead({ x, z0, z1 }: { x: number; z0: number; z1: number }) {
  const r = 0.55;
  const span = z1 - z0;
  return (
    <group position={[x, 0, 0]}>
      {[z0, z1].map((z, i) => (
        <group key={i} position={[0, 0, z]} rotation-y={i ? Math.PI : 0}>
          <mesh position={[0, (H - r) / 2, 0.09]} material={M.rib} castShadow><boxGeometry args={[0.26, H - r, 0.18]} /></mesh>
          <mesh position={[0, H - r, r]} rotation={[0, Math.PI / 2, 0]} material={M.rib}>
            <torusGeometry args={[r - 0.09, 0.09, 8, 12, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 1.4, 0.19]} material={M.lightStrip}><boxGeometry args={[0.05, 0.9, 0.01]} /></mesh>
        </group>
      ))}
      <mesh position={[0, H - 0.09, (z0 + z1) / 2]} material={M.rib}><boxGeometry args={[0.26, 0.18, span - 2 * r]} /></mesh>
    </group>
  );
}

function Pipe({ from, to, r = 0.06, material = M.pipe }: { from: [number, number, number]; to: [number, number, number]; r?: number; material?: THREE.Material }) {
  const ref = useRef<THREE.Mesh>(null);
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  useLayoutEffect(() => {
    const m = ref.current!;
    m.position.copy(a.clone().add(b).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  });
  return (
    <mesh ref={ref} material={material}>
      <cylinderGeometry args={[r, r, len, 12]} />
    </mesh>
  );
}

function Window() {
  // A panoramic window in the Analysis Suite east wall, looking out over the night campus.
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04070d');
    g.addColorStop(0.55, '#0b1d2c');
    g.addColorStop(0.75, '#14394a');
    g.addColorStop(1, '#061018');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(220,240,255,${Math.random() * 0.7})`;
      ctx.fillRect(Math.random() * w, Math.random() * h * 0.5, 1.5, 1.5);
    }
    // skyline
    let x = 0;
    while (x < w) {
      const bw = 20 + Math.random() * 60;
      const bh = h * (0.12 + Math.random() * 0.3);
      ctx.fillStyle = '#060c13';
      ctx.fillRect(x, h * 0.78 - bh, bw, bh + h * 0.3);
      for (let wy = h * 0.78 - bh + 6; wy < h * 0.76; wy += 10)
        for (let wx = x + 4; wx < x + bw - 4; wx += 9)
          if (Math.random() > 0.72) {
            ctx.fillStyle = Math.random() > 0.8 ? 'rgba(127,230,224,0.8)' : 'rgba(255,214,150,0.7)';
            ctx.fillRect(wx, wy, 3, 4);
          }
      x += bw + 4;
    }
  };
  return (
    <group position={[11.88, 1.75, -1.4]} rotation-y={-Math.PI / 2}>
      <CanvasPlane width={5.2} height={1.9} draw={draw} deps={[]} px={512} emissive={1.1} />
      <mesh position={[0, 0, 0.03]} material={M.glass}><planeGeometry args={[5.2, 1.9]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * 1.0, 0.05]} material={M.frame}><boxGeometry args={[5.4, 0.12, 0.12]} /></mesh>
      ))}
      {[-2.65, -0.88, 0.88, 2.65].map((x) => (
        <mesh key={x} position={[x, 0, 0.05]} material={M.frame}><boxGeometry args={[0.1, 2.1, 0.12]} /></mesh>
      ))}
    </group>
  );
}

/** Floor, walls, ceiling structure, pipes and signage, built from the layout data. */
export function Room({ detail = true }: { detail?: boolean }) {
  const panels: [number, number][] = [];
  for (let x = -9; x <= 9; x += 4.5) for (let z = -5.5; z <= 5.5; z += 3.7) panels.push([x, z]);
  panels.push([0, 10.5]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 2.5]} receiveShadow material={M.floor}>
        <planeGeometry args={[24.4, 21.4]} />
      </mesh>
      {/* guide lines on the floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 6]} material={M.lightStrip}><planeGeometry args={[0.05, 9]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 1.6]} material={M.accentSoft}><planeGeometry args={[11.8, 0.05]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-8.8, 0.004, 0]} material={M.accentSoft}><planeGeometry args={[5.6, 0.05]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[8.8, 0.004, 0]} material={M.accentSoft}><planeGeometry args={[5.6, 0.05]} /></mesh>

      {/* ceiling */}
      <mesh rotation-x={Math.PI / 2} position={[0, H, 2.5]} material={M.ceiling}><planeGeometry args={[24.4, 21.4]} /></mesh>
      {panels.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, H - 0.02, z]}>
          <mesh material={M.frame}><boxGeometry args={[2.0, 0.04, 0.8]} /></mesh>
          <mesh position={[0, -0.025, 0]} rotation-x={Math.PI / 2} material={M.lightPanel}><planeGeometry args={[1.8, 0.6]} /></mesh>
        </group>
      ))}

      {WALLS.map((w) => (w.material === 'glass' ? <GlassWall key={w.id} w={w} /> : <Wall key={w.id} w={w} />))}

      {detail && (
        <>
          {/* bulkhead ribs across each room */}
          {[-11.2, -7.9, -4.5, 4.5, 7.5, 10.5].map((x) => <Bulkhead key={x} x={x} z0={-7.9} z1={7.9} />)}
          <Bulkhead x={0} z0={8.1} z1={12.9} />
          {/* overhead service pipes */}
          <Pipe from={[-11.8, 3.12, -7.55]} to={[11.8, 3.12, -7.55]} r={0.07} />
          <Pipe from={[-11.8, 2.96, -7.7]} to={[11.8, 2.96, -7.7]} r={0.05} material={M.pipeAccent} />
          <Pipe from={[-11.8, 3.15, 7.6]} to={[11.8, 3.15, 7.6]} r={0.08} />
          <Pipe from={[-1.6, 3.18, -7.4]} to={[-1.6, 3.18, 7.4]} r={0.05} />
          <Pipe from={[1.6, 3.18, -7.4]} to={[1.6, 3.18, 7.4]} r={0.05} material={M.pipeAccent} />
          <Pipe from={[11.65, 3.1, -7.6]} to={[11.65, 3.1, 7.6]} r={0.09} />
          {/* cable tray */}
          <mesh position={[0, 3.25, 0]} material={M.darkSteel}><boxGeometry args={[0.5, 0.06, 15.6]} /></mesh>
          <Window />
        </>
      )}

      {/* signage */}
      <CanvasPlane width={2.4} height={0.5} position={[0, 2.85, 12.88]} rotation-y={Math.PI} draw={signDrawer('ToxiLab', 'Computational Toxicology Research')} deps={[]} />
      <CanvasPlane width={2.0} height={0.42} position={[0, 2.85, 8.12]} draw={signDrawer('Main Laboratory', 'Authorised researchers')} deps={[]} />
      <CanvasPlane width={1.9} height={0.4} position={[-5.88, 2.7, 0]} rotation-y={Math.PI / 2} draw={signDrawer('Chemical Storage', '1 · Pick a sample vial · West')} deps={[]} />
      <CanvasPlane width={1.9} height={0.4} position={[5.88, 2.7, 0]} rotation-y={-Math.PI / 2} draw={signDrawer('Analysis Suite', '2 · Analyse it · East')} deps={[]} />
    </group>
  );
}

function Spot({ position, target, intensity = 30, color = '#f4f8ff', shadows = false }: { position: [number, number, number]; target: [number, number, number]; intensity?: number; color?: string; shadows?: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  useLayoutEffect(() => {
    const l = light.current!;
    l.target.position.set(...target);
    l.target.updateMatrixWorld();
  }, [target]);
  return <spotLight ref={light} position={position} angle={0.75} penumbra={0.85} intensity={intensity} distance={9} decay={1.6} color={color} castShadow={shadows} shadow-mapSize={[512, 512]} shadow-bias={-0.0004} />;
}

export function Lighting({ quality }: { quality: boolean }) {
  return (
    <>
      <hemisphereLight args={['#cfe3f7', '#1a222c', 0.45]} />
      <ambientLight intensity={0.08} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={0.55}
        castShadow={quality}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight position={[-9, 3.0, -2]} intensity={7} distance={10} color="#e6f0ff" />
      <pointLight position={[9, 3.0, -2]} intensity={7} distance={10} color="#d6f6ff" />
      <pointLight position={[0, 3.0, 2]} intensity={8} distance={11} color="#f4f7fb" />
      <pointLight position={[0, 3.0, 10.5]} intensity={5} distance={7} color="#f4f7fb" />
      {quality && (
        <>
          <Spot position={[-3.9, 3.2, -5.2]} target={[-3.9, 0.9, -7.2]} />
          <Spot position={[3.8, 3.2, -5.2]} target={[3.8, 0.9, -7.2]} />
          <Spot position={[9, 3.2, -4.6]} target={[9, 1.0, -6.6]} intensity={34} color="#dffbff" shadows />
          <pointLight position={[-10.5, 2.4, -1]} intensity={4} distance={6} color="#bfefff" />
          <pointLight position={[10.5, 0.6, 0]} intensity={3} distance={6} color="#3fd3cc" />
        </>
      )}
    </>
  );
}
