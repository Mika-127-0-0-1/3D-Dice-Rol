import { usePlane } from '@react-three/cannon';
import * as THREE from "three";
import React, { useRef } from 'react';

const Floor: React.FC = () => {
  // Create a reference for the Three.js mesh
  const meshRef = useRef<THREE.Mesh>(null!);

  // Use a physics plane body
  usePlane(() => ({
    type: 'Static',
    position: [0, -7, 0],
    rotation: [-Math.PI / 2, 0, 0], // Rotate to be a floor
  }));

  return (
    <mesh
      ref={meshRef}
      receiveShadow
      position={[0, -7, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[1000, 1000]} />
      <shadowMaterial opacity={0.1} />
    </mesh>
  );
};

export default Floor;
