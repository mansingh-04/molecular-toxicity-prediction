import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** A plane textured with a 2D canvas drawing (signs, screens). Avoids runtime font downloads. */
export function CanvasPlane({ width, height, draw, deps, px = 256, emissive = 0.9, transparent = false, ...props }: {
  width: number;
  height: number;
  draw: DrawFn;
  deps: unknown[];
  px?: number;
  emissive?: number;
  transparent?: boolean;
} & JSX.IntrinsicElements['mesh']) {
  const { canvas, texture, material } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(px * (width / height));
    canvas.height = px;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: emissive, roughness: 0.4, transparent, depthWrite: !transparent });
    return { canvas, texture, material };
  }, [width, height, px, emissive, transparent]);

  useEffect(() => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(ctx, canvas.width, canvas.height);
    texture.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, texture, ...deps]);

  useEffect(() => () => {
    texture.dispose();
    material.dispose();
  }, [texture, material]);

  return (
    <mesh material={material} {...props}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}

export function signDrawer(title: string, subtitle?: string, accent = '#18b8b3'): DrawFn {
  return (ctx, w, h) => {
    ctx.fillStyle = '#0d141d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, Math.max(8, w * 0.012), h);
    ctx.fillStyle = '#e7edf3';
    ctx.font = `600 ${Math.round(h * 0.34)}px Geist, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(title, h * 0.28, subtitle ? h * 0.38 : h * 0.52);
    if (subtitle) {
      ctx.fillStyle = '#9fb0c2';
      ctx.font = `400 ${Math.round(h * 0.18)}px Geist, system-ui, sans-serif`;
      ctx.fillText(subtitle, h * 0.28, h * 0.72);
    }
  };
}
