"use client";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useState, useMemo, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";

// 구 표면에 균등 분포 좌표 구하는 함수 (Fibonacci sphere)
function getSpherePoints(N: number, radius: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  const offset = 2 / N;
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = ((i * offset) - 1) + (offset / 2);
    const r = Math.sqrt(1 - y * y);
    const phi = i * increment;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    points.push([x * radius, y * radius, z * radius]);
  }
  return points;
}

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

function SphereImagePatch({ url, center, radius, baseAngle }: {
  url: string,
  center: [number, number, number],
  radius: number,
  baseAngle: number // patch의 기준 각도(라디안)
}) {
  const [aspect, setAspect] = useState(1);
  const texture = useLoader(THREE.TextureLoader, url);
  useEffect(() => {
    if (texture.image) {
      setAspect(texture.image.width / texture.image.height);
    }
  }, [texture]);
  // 중심점의 위도/경도 계산
  const [x, y, z] = center;
  const phi = Math.acos(y / radius); // 위도 (0~PI)
  const theta = Math.atan2(z, x);    // 경도 (-PI~PI)
  // 비율에 따라 가로/세로 각도 조정
  const thetaLength = baseAngle * aspect;
  const phiLength = baseAngle;
  const phiStart = Math.max(0, phi - phiLength / 2);
  const thetaStart = theta - thetaLength / 2;
  // 곡면 패치 geometry 생성
  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, 32, 32, thetaStart, thetaLength, phiStart, phiLength),
    [radius, thetaStart, thetaLength, phiStart, phiLength]
  );
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent />
    </mesh>
  );
}

export default function SphereImageBillboardsContainer() {
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

  const radius = 2;
  const points = getSpherePoints(imageFiles.length, radius);
  // patchAngle: 이미지 개수에 따라 자동 조정 (더 작게, 겹침 방지)
  const baseAngle = Math.max(0.15, Math.min(0.5, 2 / Math.sqrt(imageFiles.length || 1)));

  return (
    <div style={{ width: '100vw', height: height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: height }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <mesh>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial color="#cccccc" transparent opacity={0.1} wireframe />
        </mesh>
        <Suspense fallback={null}>
          {imageFiles.map((url, i) => (
            <SphereImagePatch key={url + '-' + i} url={url} center={points[i]} radius={radius} baseAngle={baseAngle} />
          ))}
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
} 