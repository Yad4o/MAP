import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows } from '@react-three/drei';
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
      camera={{ position: [0, 0, 6], fov: 32 }}
      dpr={[1, 1.25]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      {/* Minimal, realistic lighting — soft key + cool rim, no neon glow */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 6]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-5, -1, -5]} intensity={0.55} color="#9a9aa5" />
      <pointLight position={[0, 0.5, 4]} intensity={0.4} color="#ffffff" />

      <Suspense fallback={<SceneFallback />}>
        {/* Bounds frames the model to the camera automatically — no manual scale guessing */}
        <Bounds fit clip margin={1.4}>
          <BrainModel />
        </Bounds>
        <ContactShadows
          position={[0, -0.97, 0]}
          opacity={0.4}
          scale={3.2}
          blur={2.4}
          far={2}
          color="#000000"
          frames={1}
          resolution={256}
        />
      </Suspense>
    </Canvas>
  );
}
