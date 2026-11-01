import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER_START, zoneAt } from '@/data/labLayout';
import { useGame } from '@/store/gameStore';
import { keys, look } from './input';
import { isWall, raycast, resolveCircle } from './collision';
import { interactables } from './interactables';
import { Hand, ScientistAvatar, type AvatarHandle } from './ScientistAvatar';
import { VialMesh } from '@/components/lab/Shelf';
import { M, liquidFor } from '@/components/lab/materials';

const RADIUS = 0.32;
const EYE = 1.62;
const WALK = 3.0;
const SPRINT = 5.2;
const TP_DIST = 3.0;
const FP_REACH = 2.6;
const TP_REACH = 1.7;

/** Shared, mutable player pose (read by the minimap/HUD without re-rendering). */
export const playerPose = { x: PLAYER_START.x, z: PLAYER_START.z, yaw: PLAYER_START.yaw };

export function PlayerController() {
  const { camera } = useThree();
  const pos = useRef({ x: PLAYER_START.x, z: PLAYER_START.z });
  const vel = useRef({ x: 0, z: 0 });
  const yaw = useRef(PLAYER_START.yaw);
  const pitch = useRef(-0.05);
  const camDist = useRef(0);
  const phase = useRef(0);
  const facing = useRef(Math.PI);
  const avatar = useRef<AvatarHandle>(null);
  const held = useRef<THREE.Group>(null);
  const tmp = useRef({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), cam: new THREE.Vector3() }).current;

  // A typed-in molecule sits in the analyzer, so only shelf vials are carried.
  const heldCategory = useGame((s) => (s.customSample ? undefined : s.heldCompound()?.category));

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useGame.getState();
    const active = !st.panel && !st.paused;
    const third = st.cameraMode === 'third';

    // ---- look ----
    if (active) {
      const k = 0.0022 * st.settings.mouseSensitivity;
      yaw.current -= look.dx * k;
      pitch.current -= look.dy * k * (st.settings.invertY ? -1 : 1);
      const [lo, hi] = third ? [-1.0, 0.75] : [-1.45, 1.45];
      pitch.current = Math.max(lo, Math.min(hi, pitch.current));
    }
    look.dx = 0;
    look.dy = 0;

    // ---- move ----
    let ix = 0;
    let iz = 0;
    if (active) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    }
    const sy = Math.sin(yaw.current);
    const cy = Math.cos(yaw.current);
    // forward (-sin, -cos), right (cos, -sin)
    let wx = -iz * -sy + ix * cy;
    let wz = -iz * -cy + ix * -sy;
    const len = Math.hypot(wx, wz);
    if (len > 0) {
      wx /= len;
      wz /= len;
    }
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT : WALK;
    const accel = len > 0 ? 12 : 10;
    vel.current.x += (wx * speed - vel.current.x) * Math.min(1, dt * accel);
    vel.current.z += (wz * speed - vel.current.z) * Math.min(1, dt * accel);
    const before = { x: pos.current.x, z: pos.current.z };
    pos.current.x += vel.current.x * dt;
    pos.current.z += vel.current.z * dt;
    resolveCircle(pos.current, RADIUS);
    const moved = Math.hypot(pos.current.x - before.x, pos.current.z - before.z);
    const planar = moved / Math.max(dt, 1e-4);
    phase.current += dt * planar * 2.6;
    playerPose.x = pos.current.x;
    playerPose.z = pos.current.z;
    playerPose.yaw = yaw.current;

    // ---- zone ----
    const zone = zoneAt(pos.current.x, pos.current.z);
    if (zone && st.screen === 'lab') st.setZone(zone.id);

    // ---- camera ----
    camDist.current += ((third ? TP_DIST : 0) - camDist.current) * Math.min(1, dt * 7);
    const cp = Math.cos(pitch.current);
    tmp.fwd.set(-sy * cp, Math.sin(pitch.current), -cy * cp);
    tmp.right.set(cy, 0, -sy);
    const bob = st.settings.reducedMotion ? 0 : Math.sin(phase.current * 2) * 0.025 * Math.min(1, planar / WALK);
    if (camDist.current > 0.05) {
      const t = camDist.current / TP_DIST;
      const pivot = [pos.current.x + tmp.right.x * 0.4 * t, 1.55, pos.current.z + tmp.right.z * 0.4 * t];
      const back = [-tmp.fwd.x, -tmp.fwd.y, -tmp.fwd.z];
      const hit = raycast(pivot, back, camDist.current + 0.3);
      const d = Math.max(0.2, Math.min(camDist.current, hit - 0.3));
      tmp.cam.set(pivot[0] + back[0] * d, Math.max(0.3, pivot[1] + back[1] * d), pivot[2] + back[2] * d);
    } else {
      tmp.cam.set(pos.current.x, EYE + bob, pos.current.z);
    }
    camera.position.copy(tmp.cam);
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');

    // ---- avatar ----
    const showAvatar = camDist.current > 0.7;
    const g = avatar.current?.group;
    if (g) {
      g.visible = showAvatar;
      g.position.set(pos.current.x, 0, pos.current.z);
      if (planar > 0.3) {
        const target = Math.atan2(vel.current.x, vel.current.z);
        let diff = target - facing.current;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        facing.current += diff * Math.min(1, dt * 10);
      }
      g.rotation.y = facing.current;
      avatar.current!.animate(phase.current, Math.min(1, planar / WALK), clock.elapsedTime);
    }
    if (held.current) {
      held.current.visible = !showAvatar && !!heldCategory && !st.panel;
      if (held.current.visible) {
        const sway = st.settings.reducedMotion ? 0 : Math.sin(phase.current) * 0.012 * Math.min(1, planar / WALK);
        const offset = new THREE.Vector3(0.24 + sway, -0.27 + Math.abs(sway) * 0.5, -0.46).applyQuaternion(camera.quaternion);
        held.current.position.copy(camera.position).add(offset);
        held.current.quaternion.copy(camera.quaternion);
      }
    }

    // ---- focus ----
    if (!active) {
      st.setFocused(undefined);
      return;
    }
    let best: { id: string; score: number } | undefined;
    if (!showAvatar) {
      const o = [tmp.cam.x, tmp.cam.y, tmp.cam.z];
      const d = [tmp.fwd.x, tmp.fwd.y, tmp.fwd.z];
      for (const it of interactables.values()) {
        const tx = it.position[0] - o[0], ty = it.position[1] - o[1], tz = it.position[2] - o[2];
        const tt = tx * d[0] + ty * d[1] + tz * d[2];
        if (tt < 0 || tt > FP_REACH + it.radius) continue;
        const perp2 = tx * tx + ty * ty + tz * tz - tt * tt;
        if (perp2 > it.radius * it.radius) continue;
        if (raycast(o, d, tt, isWall) < tt - it.radius) continue;
        if (!best || tt < best.score) best = { id: it.id, score: tt };
      }
    } else {
      const fx = -sy, fz = -cy;
      for (const it of interactables.values()) {
        const dx = it.position[0] - pos.current.x, dz = it.position[2] - pos.current.z;
        const dh = Math.hypot(dx, dz);
        if (dh > TP_REACH + it.radius) continue;
        const cos = dh > 1e-3 ? (dx * fx + dz * fz) / dh : 1;
        if (cos < 0.45) continue;
        const o = [pos.current.x, 1.5, pos.current.z];
        const dir = [dx / (dh || 1), 0, dz / (dh || 1)];
        if (raycast(o, dir, dh, isWall) < dh - it.radius) continue;
        const score = dh - it.radius - cos * 0.6;
        if (!best || score < best.score) best = { id: it.id, score };
      }
    }
    if (best) {
      const it = interactables.get(best.id)!;
      const p = it.prompt();
      st.setFocused(p ? { id: it.id, ...p } : undefined);
    } else st.setFocused(undefined);
  });

  return (
    <>
      <ScientistAvatar ref={avatar} holding={heldCategory} />
      <group ref={held}>
        {/* first-person view model: sleeve, gloved hand and the held vial */}
        <group rotation={[0.25, -0.2, 0.15]}>
          <mesh position={[0.02, -0.12, 0.22]} rotation-x={Math.PI / 2.3} material={M.coat}>
            <cylinderGeometry args={[0.055, 0.06, 0.4, 14]} />
          </mesh>
          <mesh position={[0.02, -0.07, 0.04]} rotation-x={Math.PI / 2.3} material={M.coatShade}>
            <cylinderGeometry args={[0.058, 0.055, 0.04, 14]} />
          </mesh>
          <group position={[0.01, -0.02, -0.02]} rotation-x={Math.PI / 2.6}>
            <Hand side={-1} />
          </group>
          <group position={[0, 0.03, -0.08]} scale={1.3}>
            <VialMesh color={liquidFor(heldCategory)} />
          </group>
        </group>
      </group>
    </>
  );
}
