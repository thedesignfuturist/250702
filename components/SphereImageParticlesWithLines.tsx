"use client";
import { Canvas, useLoader } from "@react-three/fiber";
import { SpriteMaterial, TextureLoader, AdditiveBlending } from "three";
import { useEffect, useState, useMemo, Suspense, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Swiper, SwiperSlide } from "swiper/react";
import 'swiper/css';
import { createPortal } from "react-dom";

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

function useProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    async function fetchProjects() {
      const { data } = await supabase
        .from("images")
        .select("id, name, description, date, category, file_name, created_at")
        .order("created_at", { ascending: false });
      setProjects(data || []);
    }
    fetchProjects();
  }, []);
  return projects;
}

function ImageParticle({ url, position, size, onClick }: { url: string, position: [number, number, number], size: number, onClick?: () => void }) {
  const texture = useLoader(TextureLoader, url);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    if (texture.image) {
      setAspect(texture.image.width / texture.image.height);
    }
  }, [texture]);

  return (
    <sprite
      position={position}
      scale={[size * aspect, size, 1]}
      onClick={onClick}
      onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={e => { e.stopPropagation(); document.body.style.cursor = 'default'; }}
    >
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
}

function getPlaneNormal(point: [number, number, number]): [number, number, number] {
  // 구 중심(0,0,0)에서 point로 향하는 단위 벡터 (plane의 normal)
  const [x, y, z] = point;
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
}

export default function SphereImageParticlesWithLinesContainer() {
  const [isClient, setIsClient] = useState(false);
  const projects = useProjects();
  const [height, setHeight] = useState(600);
  const [selectedProject, setSelectedProject] = useState<any|null>(null);
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    function handleResize() {
      setHeight(window.innerHeight);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    async function fetchDetails() {
      const { data } = await supabase
        .from("image_details")
        .select("file_name")
        .eq("image_id", selectedProject.id)
        .order("order", { ascending: true });
      setDetailImages(
        (data || []).map((d: any) =>
          supabase.storage.from("images").getPublicUrl(d.file_name).data.publicUrl
        )
      );
    }
    fetchDetails();
  }, [selectedProject]);

  // 모달 오픈/클로즈 핸들러
  useEffect(() => {
    if (selectedProject) setModalOpen(true);
    else setModalOpen(false);
  }, [selectedProject]);

  // esc로 닫기
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen]);

  // 스와이프/드래그 지원
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    let isDown = false, startX = 0, scrollLeft = 0;
    const onDown = (e: MouseEvent | TouchEvent) => {
      isDown = true;
      startX = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
      scrollLeft = el.scrollLeft;
      el.classList.add('dragging');
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDown) return;
      const x = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
      el.scrollLeft = scrollLeft - (x - startX);
    };
    const onUp = () => { isDown = false; el.classList.remove('dragging'); };
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('touchmove', onMove);
    el.addEventListener('mouseleave', onUp);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('touchend', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('mouseleave', onUp);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('touchend', onUp);
    };
  }, [modalOpen]);

  if (!isClient) return <div></div>;

  const radius = 2;
  const points = getSpherePoints(projects.length, radius);
  const size = Math.max(0.2, Math.min(0.5, 2 / Math.sqrt(projects.length || 1)));

  // 라인 시작점: Sprite 중심 좌표에서 바로 시작 (추가 이동 없이)
  const lines: [number, number, number][][] = [];
  for (let i = 0; i < points.length; i++) {
    lines.push([points[i], points[(i + 1) % points.length]]);
  }

  // 대표+상세 이미지 배열
  const allImages = [selectedProject?.file_name ? createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).storage.from("images").getPublicUrl(selectedProject.file_name).data.publicUrl : '', ...detailImages];

  return (
    <div className="bg-midgray" style={{ width: '100vw', height: height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: height }}
        onCreated={({ gl }) => {
          gl.setClearColor('#b0b0b0');
        }}
        gl={{ alpha: false }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        {/* 초록색 광선(라인, sprite 중심에서 바로 시작) */}
        {lines.map((pair, idx) => (
          <Line
            key={idx}
            points={pair}
            color="#A8FF9E"
            lineWidth={1}
            dashed={false}
            transparent
            opacity={0.7}
          />
        ))}
        <Suspense fallback={null}>
          {projects.map((proj, i) => (
            <ImageParticle
              key={proj.id}
              url={proj.file_name ? createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
              ).storage.from("images").getPublicUrl(proj.file_name).data.publicUrl : ''}
              position={points[i]}
              size={size}
              onClick={() => setSelectedProject(proj)}
            />
          ))}
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
      {/* 커스텀 모달 */}
      {modalOpen && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'transparent', backdropFilter: 'none' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            className="relative w-[90vw] h-[90vh] rounded-none flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 이미지 슬라이더 */}
            <div className="flex-1 flex flex-col items-center justify-center w-full relative">
              <div className="flex items-center justify-center w-full relative">
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-thin text-black focus:outline-none z-10 bg-transparent border-none shadow-none hover:bg-transparent hover:text-gray-500"
                  style={{ background: 'none', boxShadow: 'none', border: 'none', fontWeight: 300, lineHeight: 1 }}
                  onClick={() => setCurrent(c => Math.max(0, c - 1))}
                  disabled={current === 0}
                >&#8592;</button>
                <div className="flex-1 flex items-center justify-center">
                  <img
                    src={allImages[current]}
                    alt={`상세이미지${current+1}`}
                    className="object-contain h-[60vh] w-auto mx-auto"
                    draggable={false}
                    style={{ userSelect: 'none', maxWidth: '70vw' }}
                  />
                </div>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-thin text-black focus:outline-none z-10 bg-transparent border-none shadow-none hover:bg-transparent hover:text-gray-500"
                  style={{ background: 'none', boxShadow: 'none', border: 'none', fontWeight: 300, lineHeight: 1 }}
                  onClick={() => setCurrent(c => Math.min(allImages.length-1, c + 1))}
                  disabled={current === allImages.length-1}
                >&#8594;</button>
              </div>
              {/* 썸네일 바: 슬라이드 바로 아래, 중앙 정렬, margin-top: 24px, margin-bottom: 0 */}
              <div ref={galleryRef} className="flex gap-2 mt-6 mb-0 justify-center items-center overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory select-none" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0, cursor: 'grab' }}>
                {allImages.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`썸네일${idx+1}`}
                    className={`h-12 w-auto rounded cursor-pointer border-[1.5px] ${idx === current ? 'border-black' : 'border-neutral-400'}`}
                    onClick={() => setCurrent(idx)}
                    draggable={false}
                    style={{ userSelect: 'none' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 