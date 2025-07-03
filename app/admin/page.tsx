"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";
import { fetchImages, addImage, updateImage, deleteImage, fetchImageDetails, addImageDetail, deleteImageDetail } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ADMIN_PASSWORD = "changeme123"; // 원하는 비밀번호로 변경

// 타입 정의 추가
interface ImageRow {
  id: string;
  name: string;
  description: string;
  date: string | null;
  category: string;
  file_name: string;
  created_at: string;
}

export default function AdminPage() {
  const [isClient, setIsClient] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ImageRow | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any>({ name: "", description: "", date: "", category: "", file: null });
  const [detailFiles, setDetailFiles] = useState<{file: File, status: 'uploading' | 'done' | 'error', url?: string, supabaseName?: string}[]>([]);
  const [detailImages, setDetailImages] = useState<{ id: string; image_id: string; file_name: string; order?: number; created_at: string }[]>([]);
  // 대표 이미지 URL을 관리하는 state 추가
  const [mainImageUrls, setMainImageUrls] = useState<{ [id: string]: string }>({});
  // 상세 이미지 URL을 관리하는 state 추가
  const [detailImageUrls, setDetailImageUrls] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getImageUrl = useCallback((file_name: string) => {
    if (!file_name) return "";
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    return supabase.storage.from("images").getPublicUrl(file_name).data.publicUrl;
  }, []);

  useEffect(() => {
    const urls: { [id: string]: string } = {};
    images.forEach((img) => {
      if (img.file_name) {
        urls[img.id] = getImageUrl(img.file_name);
      }
    });
    setMainImageUrls(urls);
  }, [images, getImageUrl]);

  useEffect(() => {
    const urls: { [id: string]: string } = {};
    detailImages.forEach((d) => {
      if (d.file_name) {
        urls[d.id] = getImageUrl(d.file_name);
      }
    });
    setDetailImageUrls(urls);
  }, [detailImages, getImageUrl]);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    loadImages(supabase);
  }, []);

  // 목록 불러오기
  async function loadImages(supabase: any) {
    setLoading(true);
    const data = await fetchImages(supabase);
    setImages(data);
    setLoading(false);
  }

  // 상세 이미지 불러오기
  async function loadDetailImages(supabase: any, image_id: string) {
    const data = await fetchImageDetails(supabase, image_id);
    setDetailImages(data);
  }

  // SSR에서는 항상 <div></div>만 반환
  if (!isClient) return <div></div>;

  // 조건부 렌더링 (훅 선언 이후에만)
  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="mb-4 text-xl font-bold">관리자 비밀번호 입력</h2>
        <Input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          className="mb-2 w-64"
          placeholder="비밀번호"
        />
        <Button
          className="w-64"
          onClick={() => {
            if (pw === ADMIN_PASSWORD) {
              setAuthed(true);
              setPwError("");
            } else {
              setPwError("비밀번호가 틀렸습니다.");
            }
          }}
        >
          확인
        </Button>
        {pwError && <div className="text-red-500 mt-2">{pwError}</div>}
      </div>
    );
  }

  // 등록/수정 모달 열기
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openModal(image?: any) {
    if (image) {
      setEditTarget(image);
      setForm({
        name: image.name,
        description: image.description,
        date: image.date,
        category: image.category,
        file: null,
      });
      loadDetailImages(createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ), image.id);
    } else {
      setEditTarget(null);
      setForm({ name: "", description: "", date: "", category: "", file: null });
      setDetailImages([]);
    }
    setDetailFiles([]);
    setModalOpen(true);
  }

  // 등록/수정 저장
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSave() {
    setLoading(true);
    try {
      let file_name = editTarget?.file_name;
      // 대표 이미지 업로드
      if (form.file) {
        const filename = `${Date.now()}-${form.file.name}`;
        const { error: uploadError } = await createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ).storage.from("images").upload(filename, form.file);
        if (uploadError) throw uploadError;
        file_name = filename;
      }
      // date가 공란이면 undefined로 변환
      const safeDate = form.date === "" ? undefined : form.date;
      let imageRow;
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      if (editTarget) {
        imageRow = await updateImage(supabase, editTarget.id, { name: form.name, description: form.description, date: safeDate, category: form.category, file_name });
      } else {
        imageRow = await addImage(supabase, { name: form.name, description: form.description, date: safeDate, category: form.category, file_name: file_name ?? "" });
      }
      // 상세 이미지 업로드
      for (const df of detailFiles) {
        if (df.status === 'done' && df.supabaseName) {
          await addImageDetail(supabase, { image_id: imageRow.id, file_name: df.supabaseName as string });
        }
      }
      setModalOpen(false);
      setForm({ name: "", description: "", date: "", category: "", file: null });
      setDetailFiles([]);
      loadImages(supabase);
    } catch (error: any) {
      alert('에러: ' + (error?.message || JSON.stringify(error)));
      console.error('에러:', error);
    }
    setLoading(false);
  }

  // 삭제
  async function handleDelete(image: ImageRow) {
    setLoading(true);
    try {
      await deleteImage(createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ), image.id);
      loadImages(createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ));
    } catch (error: any) {
      alert('에러: ' + (error?.message || JSON.stringify(error)));
      console.error('에러:', error);
    }
    setLoading(false);
  }

  // 상세 이미지 삭제
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleDeleteDetail(id: any) {
    setLoading(true);
    try {
      await deleteImageDetail(createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ), id);
      if (editTarget) loadDetailImages(createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ), editTarget.id);
    } catch (error: any) {
      alert('에러: ' + (error?.message || JSON.stringify(error)));
      console.error('에러:', error);
    }
    setLoading(false);
  }

  // 파일 업로드 함수
  async function uploadDetailFile(f: File) {
    const filename = `${Date.now()}-${f.name}`;
    setDetailFiles(prev => prev.map(df => df.file === f ? { ...df, status: 'uploading' } : df));
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.storage.from("images").upload(filename, f);
    if (error) {
      setDetailFiles(prev => prev.map(df => df.file === f ? { ...df, status: 'error' } : df));
    } else {
      const url = supabase.storage.from("images").getPublicUrl(filename).data.publicUrl;
      setDetailFiles(prev => prev.map(df => df.file === f ? { ...df, status: 'done', url, supabaseName: filename } : df));
    }
  }

  // 파일 선택 시 즉시 업로드
  function handleDetailFilesChange(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    setDetailFiles(prev => [
      ...prev,
      ...arr.map(f => ({ file: f, status: 'uploading' as const }))
    ]);
    arr.forEach(f => uploadDetailFile(f));
  }

  // 삭제 핸들러
  async function handleDeleteUploadedImage(df: {file: File, status: string, url?: string, supabaseName?: string}) {
    if (df.supabaseName) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.storage.from("images").remove([df.supabaseName]);
    }
    setDetailFiles(prev => prev.filter(f => f.file !== df.file));
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="font-bold text-2xl mb-6">이미지 CMS</h1>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => openModal()}>이미지 등록</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>대표 이미지</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>상세설명</TableHead>
            <TableHead>날짜</TableHead>
            <TableHead>카테고리</TableHead>
            <TableHead>상세 이미지</TableHead>
            <TableHead>액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {images.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">이미지가 없습니다.</TableCell>
            </TableRow>
          )}
          {images.map((img) => (
            <TableRow key={img.id}>
              <TableCell>
                {img.file_name && mainImageUrls[img.id] && (
                  <img src={mainImageUrls[img.id]} alt={img.name} className="w-16 h-16 object-cover rounded" />
                )}
              </TableCell>
              <TableCell>{img.name}</TableCell>
              <TableCell>{img.description}</TableCell>
              <TableCell>{img.date}</TableCell>
              <TableCell>{img.category}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => { loadDetailImages(createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                ), img.id); openModal(img); }}>
                  상세 보기
                </Button>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openModal(img)}>수정</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">삭제</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline">취소</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button variant="destructive" onClick={() => handleDelete(img)}>
                            삭제
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableCaption>이미지와 상세 이미지를 자유롭게 관리할 수 있습니다.</TableCaption>
      </Table>
      {/* 등록/수정 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "이미지 수정" : "이미지 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              type="text"
              placeholder="이름"
              value={form.name}
              onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
            />
            <Label htmlFor="description">상세설명</Label>
            <Textarea
              id="description"
              placeholder="상세설명"
              value={form.description}
              onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
            />
            <Label htmlFor="date">날짜</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))}
            />
            <Label htmlFor="category">카테고리</Label>
            <Input
              id="category"
              type="text"
              placeholder="카테고리"
              value={form.category}
              onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}
            />
            <div>
              <Label htmlFor="main-image">대표 이미지</Label>
              <Input
                id="main-image"
                type="file"
                accept="image/*"
                onChange={e => setForm((f: any) => ({ ...f, file: e.target.files?.[0] }))}
              />
              {editTarget?.file_name && mainImageUrls[editTarget.id] && (
                <img src={mainImageUrls[editTarget.id]} alt="대표" className="w-16 h-16 mt-2 object-cover rounded" />
              )}
            </div>
            <div>
              <Label htmlFor="detail-images">상세 이미지 (여러 장)</Label>
              <input
                id="detail-images"
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => handleDetailFilesChange(e.target.files)}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {detailImages.map((d) => (
                  <div key={d.id} className="relative group">
                    {detailImageUrls[d.id] && (
                      <img src={detailImageUrls[d.id]} alt="상세" className="w-16 h-16 object-cover rounded" />
                    )}
                    <Button size="sm" variant="destructive" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition" onClick={() => handleDeleteDetail(d.id)}>×</Button>
                  </div>
                ))}
                {detailFiles.map((df, i) => (
                  <div key={i} className="relative group">
                    {df.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    <img src={df.url || URL.createObjectURL(df.file)} alt="미리보기" className="w-16 h-16 object-cover rounded" />
                    {df.status === 'done' && (
                      <button
                        className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 transition"
                        onClick={() => handleDeleteUploadedImage(df)}
                        tabIndex={0}
                        aria-label="이미지 삭제"
                      >×</button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-gray-300 rounded text-3xl text-gray-400 hover:bg-gray-100 transition"
                  onClick={() => document.getElementById('detail-images')?.click()}
                  tabIndex={0}
                  aria-label="이미지 추가"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 