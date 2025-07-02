"use client";
import React, { useRef, useEffect, useMemo, useState, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';

// Fibonacci lattice로 구 표면에 균일 분포 좌표 생성 useMemo로 고정
const useSpherePositions = (count: number, radius: number) => useMemo(() => {
  const positions: [number, number, number][] = [];
  const offset = 2 / count;
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = ((i * offset) - 1) + (offset / 2);
    const r = Math.sqrt(1 - y * y);
    const phi = i * increment;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    positions.push([x * radius, y * radius, z * radius]);
  }
  return positions;
}, [count, radius]);

// 스티커(이미지) 컴포넌트: 작은 구 패치(조각)에 이미지를 맵핑
function Sticker({ url, position, size }: { url: string; position: [number, number, number]; size: number }) {
  const texture = useLoader(THREE.TextureLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);

  // 이미지 비율 계산 (기본값 1:1)
  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = size * aspect;
  const height = size;

  useEffect(() => {
    if (meshRef.current) {
      const offset = 0.05;
      const r = Math.sqrt(position[0]**2 + position[1]**2 + position[2]**2);
      const pos = new THREE.Vector3(...position).multiplyScalar((r + offset) / r);
      meshRef.current.position.set(pos.x, pos.y, pos.z);
      meshRef.current.lookAt(pos.clone().multiplyScalar(2));
    }
  }, [position]);

  if (!texture.image) {
    // 투명한 plane으로 자리만 잡기
    return (
      <mesh ref={meshRef}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}

export default function SphereStickers() {
  const radius = 2;
  const imageFiles = useSupabaseImages();
  const count = imageFiles.length;
  const stickerSize = Math.max(0.3, Math.min(1, 4 / Math.sqrt(count || 1)));
  const positions = useSpherePositions(count, radius);

  // window height에 맞추기 위한 상태
  const [height, setHeight] = useState(600);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    function handleResize() {
      setHeight(window.innerHeight);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isClient) return null;

  return (
    <div style={{ width: '100vw', height: height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: height }}
      >
        {/* 구(완전 투명) */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial color="#cccccc" transparent opacity={0} />
        </mesh>
        {/* 스티커 이미지 */}
        <Suspense fallback={null}>
          {imageFiles.map((url, i) => (
            <Sticker key={url + '-' + i} url={url} position={positions[i]} size={stickerSize} />
          ))}
        </Suspense>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}

function useSupabaseImages() {
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    // 클라이언트에서만 supabase 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    async function fetchImages() {
      const { data } = await supabase.storage.from("images").list();
      if (data) {
        setImages(
          data
            .filter((f) => f.name)
            .map((f) =>
              supabase.storage.from("images").getPublicUrl(f.name).data.publicUrl
            )
        );
      }
    }
    fetchImages();
  }, []);
  return images;
} 