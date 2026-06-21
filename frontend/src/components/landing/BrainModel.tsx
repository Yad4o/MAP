import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';
import type { Group } from 'three';

const MODEL_PATH = '/models/brain.glb';

export function BrainModel() {
  const { scene } = useGLTF(MODEL_PATH);
  const groupRef = useRef<Group>(null);

  // Slow, continuous rotation — premium product-shot feel, never sci-fi spin.
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.09;
    }
  });

  return (
    <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.5}>
      <group ref={groupRef} scale={2.5} dispose={null}>
        <primitive object={scene} />
      </group>
    </Float>
  );
}

useGLTF.preload(MODEL_PATH);
