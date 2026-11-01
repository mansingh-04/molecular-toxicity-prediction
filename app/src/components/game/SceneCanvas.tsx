import { useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useGame } from '@/store/gameStore';

/**
 * Shared WebGL canvas with the lab's rendering pipeline:
 * - Quality: HiDPI, soft shadows, image-based reflections, ambient occlusion, bloom, vignette, MSAA.
 * - Performance: 1x pixel ratio, no shadows/post-processing.
 * Quality steps down automatically if the frame rate drops (PerformanceMonitor).
 * The render loop pauses (frameloop "demand") while the view is covered by UI.
 */
export function SceneCanvas({ children, suspended = false, onCanvas, camera }: {
  children: ReactNode;
  suspended?: boolean;
  onCanvas?: (c: HTMLCanvasElement) => void;
  camera?: { fov?: number; position?: [number, number, number] };
}) {
  const quality = useGame((s) => s.settings.graphics) === 'quality';
  const [degraded, setDegraded] = useState(false);
  const hi = quality && !degraded;

  return (
    <Canvas
      key={quality ? 'q' : 'p'}
      frameloop={suspended ? 'demand' : 'always'}
      shadows={quality ? 'soft' : false}
      dpr={hi ? [1, 1.75] : quality ? 1.25 : 1}
      camera={{ fov: camera?.fov ?? 70, near: 0.05, far: 80, position: camera?.position ?? [0, 1.62, 11.6] }}
      gl={{ antialias: false, powerPreference: quality ? 'high-performance' : 'low-power', stencil: false }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        scene.background = new THREE.Color('#081018');
        scene.fog = new THREE.Fog('#081018', 16, 38);
        onCanvas?.(gl.domElement);
      }}
    >
      {quality && (
        <PerformanceMonitor onDecline={() => setDegraded(true)} onIncline={() => setDegraded(false)} flipflops={3} onFallback={() => setDegraded(true)} />
      )}
      {quality && (
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
          <Lightformer form="rect" intensity={1} color="#7fe6e0" position={[-7, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 1.5, 1]} />
          <Lightformer form="rect" intensity={0.7} position={[7, 2, 0]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} />
          <Lightformer form="ring" intensity={1.5} color="#bfefff" position={[0, 3, -8]} scale={3} />
        </Environment>
      )}
      {children}
      {quality &&
        (hi ? (
          <EffectComposer multisampling={4} enableNormalPass={false}>
            <N8AO aoRadius={0.7} intensity={2.4} distanceFalloff={0.6} quality="performance" halfRes />
            <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={0.85} radius={0.72} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.22} darkness={0.6} />
          </EffectComposer>
        ) : (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom mipmapBlur luminanceThreshold={0.9} intensity={0.7} radius={0.6} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.25} darkness={0.5} />
          </EffectComposer>
        ))}
    </Canvas>
  );
}
