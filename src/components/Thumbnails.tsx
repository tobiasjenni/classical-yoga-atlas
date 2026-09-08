import { useEffect, useLayoutEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { View, OrthographicCamera } from '@react-three/drei';
import type { Texture } from 'three';
import { useAppearance } from '../core/appearance';

import type { Asana, Pose } from '../core/schema';
import { SceneBoundary } from './Stage';
import { cachedThumbnail, disposeThumbnailCache } from '../core/thumbnail-cache';
function InvalidateOnScroll() {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  useEffect(() => () => disposeThumbnailCache(gl), [gl]);
  useEffect(() => {
    const update = () => invalidate();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [invalidate]);
  return null;
}
export function Thumbnail({ asana, hero = false }: { asana: Asana; hero?: boolean }) {
  return (
    <View
      className={hero ? 'thumbnail hero-thumbnail' : 'thumbnail'}
      frames={Infinity}
      aria-label={`Static 3D reconstruction of ${asana.iast}`}
    >
      <CachedPose
        id={asana.id}
        pose={asana.keyframes.find((f) => f.phase === 'final')!.pose}
        hero={hero}
      />
    </View>
  );
}
export function PoseThumbnail({ id, name, pose }: { id: string; name: string; pose: Pose }) {
  return (
    <View className="thumbnail" frames={Infinity} aria-label={`3D study of ${name}`}>
      <CachedPose id={id} pose={pose} hero={false} />
    </View>
  );
}
function CachedPose({ id, pose, hero }: { id: string; pose: Pose; hero: boolean }) {
  const style = useAppearance((s) => s.style);
  const { gl, size, invalidate } = useThree();
  const [texture, setTexture] = useState<Texture | null>(null);
  const aspect = size.width / Math.max(1, size.height);
  useLayoutEffect(() => {
    setTexture(cachedThumbnail(gl, id, pose, size.width, size.height, hero, style));
    invalidate();
  }, [gl, id, pose, size.width, size.height, hero, invalidate, style]);
  return (
    <>
      <OrthographicCamera
        makeDefault
        manual
        left={-aspect}
        right={aspect}
        top={1}
        bottom={-1}
        near={0.1}
        far={10}
        position={[0, 0, 2]}
      />
      {texture && (
        <mesh>
          <planeGeometry args={[2 * aspect, 2]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
      )}
    </>
  );
}
export function ThumbnailCanvas() {
  return (
    <div className="thumbnail-canvas" aria-hidden="true">
      <SceneBoundary>
        <Canvas
          frameloop="demand"
          dpr={[1, 1.3]}
          gl={{ alpha: true, antialias: true }}
          eventSource={document.getElementById('root')!}
        >
          <View.Port />
          <InvalidateOnScroll />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
