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

// Sphere의 vertex에 맞춰 plane을 만들고, 각 plane에 이미지를 맵핑
function SphereStickerMesh({ imageUrls, radius = 2 }: { imageUrls: string[]; radius?: number }) {
  // SphereGeometry 생성
  const segments = Math.max(4, Math.ceil(Math.sqrt(imageUrls.length)));
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, segments, segments), [radius, segments]);
  // vertex 좌표 추출
  const vertices = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const x = geometry.attributes.position.getX(i);
      const y = geometry.attributes.position.getY(i);
      const z = geometry.attributes.position.getZ(i);
      arr.push([x, y, z]);
    }
    return arr;
  }, [geometry]);
  // face(삼각형) 인덱스 추출
  const faces = useMemo(() => {
    const arr: [number, number, number][] = [];
    const pos = geometry.index ? geometry.index.array : undefined;
    if (pos) {
      for (let i = 0; i < pos.length; i += 3) {
        arr.push([pos[i], pos[i + 1], pos[i + 2]]);
      }
    }
    return arr;
  }, [geometry]);

  // 이미지 개수만큼 face 그룹핑 (3개 vertex씩 삼각형 plane)
  const faceGroups = useMemo(() => {
    const n = imageUrls.length;
    const step = Math.floor(faces.length / n);
    const groups: [number, number, number][][] = [];
    for (let i = 0; i < n; i++) {
      const group: [number, number, number][] = [];
      for (let j = i * step; j < (i + 1) * step && j < faces.length; j++) {
        group.push(faces[j]);
      }
      groups.push(group);
    }
    return groups;
  }, [faces, imageUrls.length]);

  return (
    <group>
      {/* 구 자체 (wireframe, 투명) */}
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#cccccc" transparent opacity={0.1} wireframe />
      </mesh>
      {/* 각 그룹(face)에 이미지 맵핑 */}
      {imageUrls.map((url, i) => (
        <FaceImageMesh
          key={url + '-' + i}
          url={url}
          vertices={vertices}
          faces={faceGroups[i]}
        />
      ))}
    </group>
  );
}

// 여러 face(삼각형)로 이루어진 영역에 이미지를 맵핑
function FaceImageMesh({ url, vertices, faces }: { url: string; vertices: [number, number, number][]; faces: [number, number, number][] }) {
  // 해당 영역의 geometry 생성
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const posArr: number[] = [];
    faces.forEach(([a, b, c]) => {
      posArr.push(...vertices[a], ...vertices[b], ...vertices[c]);
    });
    geom.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
    return geom;
  }, [vertices, faces]);
  const texture = useLoader(THREE.TextureLoader, url);
  // UV 자동 생성 (삼각형 영역에 이미지 fit)
  // 간단하게 각 삼각형을 (0,0)-(1,0)-(0,1)로 맵핑 (비율 유지 X, 개선 가능)
  const uvArr = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < faces.length; i++) {
      arr.push(0, 0, 1, 0, 0, 1);
    }
    return arr;
  }, [faces.length]);
  useEffect(() => {
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
  }, [geometry, uvArr]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent />
    </mesh>
  );
}

export default function SphereStickerMeshContainer() {
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
          <SphereStickerMesh imageUrls={imageFiles} />
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
} 