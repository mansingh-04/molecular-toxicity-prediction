import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { M, liquidFor } from '@/components/lab/materials';
import { VialMesh } from '@/components/lab/Shelf';

export interface AvatarHandle {
  group: THREE.Group | null;
  /** phase: walk cycle radians; blend: 0 idle … 1 walking; t: seconds (idle motion) */
  animate(phase: number, blend: number, t: number): void;
}

type G = THREE.Group | null;

/** Flared lab coat built with a lathe; open at the front to show the shirt and tie. */
function useCoatGeometry() {
  return useMemo(() => {
    const pts = [
      [0.255, 0.0], [0.245, 0.12], [0.225, 0.3], [0.205, 0.42], [0.215, 0.62], [0.225, 0.78], [0.2, 0.88], [0.13, 0.93],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 28, 0.32, Math.PI * 2 - 0.64);
    g.computeVertexNormals();
    return g;
  }, []);
}

const coatMat = (() => {
  const m = M.coat.clone();
  m.side = THREE.DoubleSide;
  return m;
})();

function Limb({ length, radius, material, children, ...props }: { length: number; radius: number; material: THREE.Material } & JSX.IntrinsicElements['group']) {
  // pivot at the top of the limb; the limb hangs along -y
  return (
    <group {...props}>
      <mesh position={[0, -length / 2, 0]} material={material} castShadow>
        <capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 6, 12]} />
      </mesh>
      {children}
    </group>
  );
}

export function Hand({ side }: { side: 1 | -1 }) {
  return (
    <group>
      <mesh position={[0, -0.045, 0.005]} scale={[0.9, 1.1, 0.55]} material={M.glove} castShadow><sphereGeometry args={[0.045, 12, 10]} /></mesh>
      <mesh position={[0, -0.1, 0.012]} rotation-x={-0.25} material={M.glove}><boxGeometry args={[0.07, 0.06, 0.028]} /></mesh>
      <mesh position={[side * -0.035, -0.055, 0.03]} rotation={[0.5, 0, side * 0.6]} material={M.glove}><capsuleGeometry args={[0.012, 0.035, 4, 8]} /></mesh>
    </group>
  );
}

function Head() {
  return (
    <group>
      {/* skull + jaw */}
      <mesh position={[0, 0.11, 0]} scale={[1, 1.12, 1.04]} material={M.skin} castShadow><sphereGeometry args={[0.1, 24, 20]} /></mesh>
      <mesh position={[0, 0.05, 0.025]} scale={[0.82, 0.7, 0.85]} material={M.skin}><sphereGeometry args={[0.1, 20, 16]} /></mesh>
      {/* ears */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1, 0.105, 0]} scale={[0.4, 1, 0.7]} material={M.skin}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
      ))}
      {/* nose */}
      <mesh position={[0, 0.095, 0.105]} rotation-x={Math.PI / 2.4} material={M.skin}><coneGeometry args={[0.017, 0.045, 10]} /></mesh>
      {/* eyes */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.037, 0.125, 0.088]}>
          <mesh scale={[1, 0.8, 0.5]} material={M.eyeWhite}><sphereGeometry args={[0.016, 12, 10]} /></mesh>
          <mesh position={[0, 0, 0.007]} material={M.eye}><sphereGeometry args={[0.009, 10, 8]} /></mesh>
          <mesh position={[0, 0.026, 0.004]} rotation-z={s * -0.12} material={M.hair}><boxGeometry args={[0.04, 0.008, 0.01]} /></mesh>
        </group>
      ))}
      {/* mouth */}
      <mesh position={[0, 0.05, 0.1]} material={M.eye}><boxGeometry args={[0.034, 0.005, 0.005]} /></mesh>
      {/* hair */}
      <mesh position={[0, 0.15, -0.012]} scale={[1.07, 0.85, 1.08]} material={M.hair}><sphereGeometry args={[0.104, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.9]} /></mesh>
      <mesh position={[0.02, 0.215, 0.05]} rotation={[0.5, 0, -0.3]} scale={[1.2, 0.5, 0.9]} material={M.hair}><sphereGeometry args={[0.05, 12, 10]} /></mesh>
      <mesh position={[0, 0.1, -0.06]} scale={[1.02, 1.1, 0.7]} material={M.hair}><sphereGeometry args={[0.1, 16, 12, 0, Math.PI * 2, Math.PI / 3, Math.PI / 2]} /></mesh>
      {/* safety glasses */}
      <group position={[0, 0.126, 0.103]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.038, 0, 0]} material={M.lens}><boxGeometry args={[0.058, 0.036, 0.006]} /></mesh>
        ))}
        <mesh position={[0, 0.02, 0]} material={M.frame}><boxGeometry args={[0.14, 0.008, 0.01]} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.074, 0.01, -0.05]} material={M.frame}><boxGeometry args={[0.006, 0.006, 0.1]} /></mesh>
        ))}
      </group>
    </group>
  );
}

/** Stylised, fully jointed researcher (third-person avatar). Faces +z. */
export const ScientistAvatar = forwardRef<AvatarHandle, { holding?: string }>(function ScientistAvatar({ holding }, ref) {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const thigh = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const shin = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const foot = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const upper = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const fore = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const coat = useCoatGeometry();
  const holdingRef = useRef(holding);
  holdingRef.current = holding;

  useImperativeHandle(ref, () => ({
    get group() {
      return root.current;
    },
    animate(p, b, t) {
      const set = (g: React.RefObject<G>, fn: (o: THREE.Group) => void) => g.current && fn(g.current);
      const breathe = Math.sin(t * 1.8) * 0.012 * (1 - b);
      set(hips, (o) => {
        o.position.y = 0.95 + Math.abs(Math.cos(p)) * 0.035 * b - 0.025 * b;
        o.rotation.y = Math.sin(p) * 0.09 * b;
      });
      set(spine, (o) => {
        o.rotation.y = -Math.sin(p) * 0.12 * b;
        o.rotation.x = 0.07 * b;
      });
      set(chest, (o) => o.scale.set(1 + breathe, 1 + breathe, 1 + breathe));
      set(head, (o) => {
        o.rotation.y = Math.sin(t * 0.4) * 0.25 * (1 - b);
        o.rotation.x = -0.05 * b + Math.sin(t * 0.7) * 0.03 * (1 - b);
      });
      for (const i of [0, 1]) {
        const s = i === 0 ? 1 : -1; // left = +sin
        const swing = Math.sin(p) * s;
        set(thigh[i], (o) => (o.rotation.x = -swing * 0.55 * b));
        set(shin[i], (o) => (o.rotation.x = b * (0.08 + 0.85 * Math.max(0, Math.cos(p) * s))));
        set(foot[i], (o) => (o.rotation.x = -b * 0.25 * Math.max(0, -swing)));
        const holdingArm = i === 1 && !!holdingRef.current;
        set(upper[i], (o) => {
          o.rotation.x = holdingArm ? -0.55 : swing * 0.5 * b + Math.sin(t * 1.8 + i) * 0.02 * (1 - b);
          o.rotation.z = s * (0.08 + 0.02 * (1 - b));
        });
        set(fore[i], (o) => (o.rotation.x = holdingArm ? -1.05 : -0.18 - 0.35 * b * Math.max(0, -swing)));
      }
    },
  }));

  const legs = [0.095, -0.095];
  const arms = [0.215, -0.215];

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.95, 0]}>
        {/* pelvis */}
        <mesh position={[0, -0.02, 0]} scale={[1.25, 0.8, 0.9]} material={M.trousers} castShadow><sphereGeometry args={[0.13, 16, 12]} /></mesh>
        <mesh position={[0, 0.05, 0]} material={M.shoe}><cylinderGeometry args={[0.15, 0.15, 0.035, 20]} /></mesh>
        {/* legs */}
        {legs.map((x, i) => (
          <group key={i} ref={thigh[i]} position={[x, -0.04, 0]}>
            <Limb length={0.44} radius={0.068} material={M.trousers}>
              <group ref={shin[i]} position={[0, -0.44, 0]}>
                <Limb length={0.42} radius={0.056} material={M.trousers}>
                  <group ref={foot[i]} position={[0, -0.42, 0]}>
                    <mesh position={[0, -0.04, 0.045]} rotation-x={Math.PI / 2} scale={[1, 1, 0.75]} material={M.shoe} castShadow><capsuleGeometry args={[0.052, 0.12, 6, 12]} /></mesh>
                    <mesh position={[0, -0.078, 0.045]} material={M.sole}><boxGeometry args={[0.1, 0.018, 0.25]} /></mesh>
                  </group>
                </Limb>
              </group>
            </Limb>
          </group>
        ))}
        {/* coat skirt (from hips down) moves with the hips */}
        <mesh geometry={coat} position={[0, -0.47, 0]} material={coatMat} castShadow />
        {/* torso */}
        <group ref={spine} position={[0, 0.06, 0]}>
          <group ref={chest}>
            <mesh position={[0, 0.24, 0.01]} scale={[1.05, 1, 0.78]} material={M.shirt} castShadow><capsuleGeometry args={[0.15, 0.22, 8, 16]} /></mesh>
            {/* tie */}
            <mesh position={[0, 0.25, 0.128]} rotation-x={-0.08} material={M.accentSoft}><boxGeometry args={[0.035, 0.24, 0.01]} /></mesh>
            {/* lapels */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.07, 0.33, 0.12]} rotation={[-0.15, s * 0.25, s * -0.35]} material={M.coatShade}><boxGeometry args={[0.07, 0.2, 0.012]} /></mesh>
            ))}
            {/* chest pocket, pen and ID badge */}
            <mesh position={[-0.11, 0.3, 0.135]} rotation-y={-0.3} material={M.coatShade}><boxGeometry args={[0.07, 0.07, 0.008]} /></mesh>
            <mesh position={[-0.12, 0.35, 0.14]} material={M.accent}><cylinderGeometry args={[0.006, 0.006, 0.07, 8]} /></mesh>
            <group position={[0.11, 0.27, 0.142]} rotation-y={0.3}>
              <mesh material={M.cabinet}><boxGeometry args={[0.055, 0.075, 0.006]} /></mesh>
              <mesh position={[0, 0.018, 0.004]} material={M.accent}><boxGeometry args={[0.045, 0.012, 0.002]} /></mesh>
            </group>
            {/* shoulders (coat) */}
            <mesh position={[0, 0.39, -0.01]} scale={[1.55, 0.55, 0.95]} material={M.coat} castShadow><sphereGeometry args={[0.135, 18, 12]} /></mesh>
            {/* side pockets on coat */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.17, -0.16, 0.13]} rotation-y={s * 0.6} material={M.coatShade}><boxGeometry args={[0.1, 0.09, 0.01]} /></mesh>
            ))}
            {/* arms */}
            {arms.map((x, i) => (
              <group key={i} ref={upper[i]} position={[x, 0.39, -0.01]}>
                <Limb length={0.3} radius={0.058} material={M.coat}>
                  <group ref={fore[i]} position={[0, -0.3, 0]}>
                    <Limb length={0.26} radius={0.05} material={M.coat}>
                      <mesh position={[0, -0.24, 0]} material={M.coatShade}><cylinderGeometry args={[0.053, 0.05, 0.04, 14]} /></mesh>
                      <group position={[0, -0.26, 0]}>
                        <Hand side={i === 0 ? 1 : -1} />
                        {i === 1 && holding && <VialMesh position={[0, -0.09, 0.05]} color={liquidFor(holding)} />}
                      </group>
                    </Limb>
                  </group>
                </Limb>
              </group>
            ))}
            {/* collar + neck + head */}
            <mesh position={[0, 0.47, -0.01]} material={M.coat}><cylinderGeometry args={[0.075, 0.1, 0.06, 16, 1, true]} /></mesh>
            <mesh position={[0, 0.5, 0]} material={M.skin}><cylinderGeometry args={[0.048, 0.055, 0.08, 14]} /></mesh>
            <group ref={head} position={[0, 0.53, 0.005]}>
              <Head />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});
