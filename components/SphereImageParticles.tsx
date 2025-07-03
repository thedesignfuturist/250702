"use client";
import { Canvas, useLoader } from "@react-three/fiber";
import { SpriteMaterial, TextureLoader, AdditiveBlending } from "three";
import { useEffect, useState, useMemo, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { OrbitControls } from "@react-three/drei";

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

function ImageParticle({ url, position, size }: { url: string, position: [number, number, number], size: number }) {
  const texture = useLoader(TextureLoader, url);
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent blending={AdditiveBlending} />
    </sprite>
  );
}

export default function SphereImageParticlesContainer() {
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
  const size = Math.max(0.2, Math.min(0.5, 2 / Math.sqrt(imageFiles.length || 1)));

  return (
    <div style={{ width: '100vw', height: height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: height }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <Suspense fallback={null}>
          {imageFiles.map((url, i) => (
            <ImageParticle key={url + '-' + i} url={url} position={points[i]} size={size} />
          ))}
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
} 