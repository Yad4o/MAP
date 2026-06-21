import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { BrainModel } from './BrainModel';

function SceneFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1.6, 24, 24]} />
      <meshBasicMaterial color="#1e1e1e" wireframe transparent opacity={0.4} />
    </mesh>
  );
}

export default function BrainScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      {/* Minimal, realistic lighting — soft key + cool rim, no neon glow */}
      <ambientLight intensity={0.22} />
      <directionalLight position={[4, 5, 6]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-5, -1, -5]} intensity={0.4} color="#9a9aa5" />
      <pointLight position={[0, 0.5, 4]} intensity={0.35} color="#ffffff" />

      <Suspense fallback={<SceneFallback />}>
        <BrainModel />
        <ContactShadows
          position={[0, -1.7, 0]}
          opacity={0.45}
          scale={9}
          blur={2.6}
          far={4}
          color="#000000"
        />
      </Suspense>
    </Canvas>
  );
}
