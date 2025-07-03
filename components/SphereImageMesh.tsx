"use client";
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { createClient } from "@supabase/supabase-js";

// Supabase에서 이미지 목록 불러오기
function useSupabaseImages() {
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
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

// Sphere의 세로 조각(경도 방향) 분할 및 각 조각에 이미지 맵핑
function SphereImageMesh({ imageUrls, radius = 2 }: { imageUrls: string[]; radius?: number }) {
  const count = imageUrls.length;
  const angleStep = (2 * Math.PI) / count;
  const offset = 0.05; // Sphere 표면에서 살짝 띄우기

  return (
    <group>
      {/* 구 자체 (wireframe, 투명) */}
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.1} wireframe />
      </mesh>
      {/* 각 조각에 이미지 맵핑 */}
      {imageUrls.map((url, i) => (
        <ImageSlice
          key={url + '-' + i}
          url={url}
          radius={radius + offset}
          thetaStart={i * angleStep}
          thetaLength={angleStep}
        />
      ))}
    </group>
  );
}

// Sphere의 한 조각(세로 방향 slice)에 이미지를 맵핑
function ImageSlice({ url, radius, thetaStart, thetaLength }: { url: string; radius: number; thetaStart: number; thetaLength: number }) {
  // slice를 위한 geometry 생성
  const geometry = useMemo(() => {
    // SphereGeometry(반지름, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
    // 여기서는 phi(위도)는 전체, theta(경도)는 slice만큼
    return new THREE.SphereGeometry(radius, 64, 64, thetaStart, thetaLength);
  }, [radius, thetaStart, thetaLength]);
  const texture = useLoader(THREE.TextureLoader, url);

  // 이미지 비율 유지: Sphere의 세로 slice에 맞게 plane에 맵핑
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent />
    </mesh>
  );
}

export default function SphereImageMeshContainer() {
  const imageFiles = useSupabaseImages();
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
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <Suspense fallback={null}>
          <SphereImageMesh imageUrls={imageFiles} />
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
} 