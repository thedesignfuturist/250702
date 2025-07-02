/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { useState, useEffect } from "react";
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  // 모든 훅 선언 (최상단)
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ImageRow | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any>({ name: "", description: "", date: "", category: "", file: null });
  const [detailFiles, setDetailFiles] = useState<File[]>([]);
  const [detailImages, setDetailImages] = useState<{ id: string; image_id: string; file_name: string; order?: number; created_at: string }[]>([]);

  // 목록 불러오기
  async function loadImages() {
    setLoading(true);
    const data = await fetchImages();
    setImages(data);
    setLoading(false);
  }

  // 상세 이미지 불러오기
  async function loadDetailImages(image_id: string) {
    const data = await fetchImageDetails(image_id);
    setDetailImages(data);
  }

  useEffect(() => {
    loadImages();
  }, []);

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
      loadDetailImages(image.id);
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
        const { error: uploadError } = await supabase.storage.from("images").upload(filename, form.file);
        if (uploadError) throw uploadError;
        file_name = filename;
      }
      // date가 공란이면 undefined로 변환
      const safeDate = form.date === "" ? undefined : form.date;
      let imageRow;
      if (editTarget) {
        imageRow = await updateImage(editTarget.id, { name: form.name, description: form.description, date: safeDate, category: form.category, file_name });
      } else {
        imageRow = await addImage({ name: form.name, description: form.description, date: safeDate, category: form.category, file_name: file_name ?? "" });
      }
      // 상세 이미지 업로드
      for (const f of detailFiles) {
        const filename = `${Date.now()}-${f.name}`;
        const { error: uploadError } = await supabase.storage.from("images").upload(filename, f);
        if (uploadError) throw uploadError;
        await addImageDetail({ image_id: imageRow.id, file_name: filename });
      }
      setModalOpen(false);
      setForm({ name: "", description: "", date: "", category: "", file: null });
      setDetailFiles([]);
      loadImages();
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
      await deleteImage(image.id);
      loadImages();
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
      await deleteImageDetail(id);
      if (editTarget) loadDetailImages(editTarget.id);
    } catch (error: any) {
      alert('에러: ' + (error?.message || JSON.stringify(error)));
      console.error('에러:', error);
    }
    setLoading(false);
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
                {img.file_name && (
                  <img src={supabase.storage.from("images").getPublicUrl(img.file_name).data.publicUrl} alt={img.name} className="w-16 h-16 object-cover rounded" />
                )}
              </TableCell>
              <TableCell>{img.name}</TableCell>
              <TableCell>{img.description}</TableCell>
              <TableCell>{img.date}</TableCell>
              <TableCell>{img.category}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => { loadDetailImages(img.id); openModal(img); }}>
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
              {editTarget?.file_name && (
                <img src={supabase.storage.from("images").getPublicUrl(editTarget.file_name).data.publicUrl} alt="대표" className="w-16 h-16 mt-2 object-cover rounded" />
              )}
            </div>
            <div>
              <Label htmlFor="detail-images">상세 이미지 (여러 장)</Label>
              <Input
                id="detail-images"
                type="file"
                accept="image/*"
                multiple
                onChange={e => setDetailFiles(Array.from(e.target.files || []))}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {detailImages.map((d) => (
                  <div key={d.id} className="relative">
                    <img src={supabase.storage.from("images").getPublicUrl(d.file_name).data.publicUrl} alt="상세" className="w-16 h-16 object-cover rounded" />
                    <Button size="sm" variant="destructive" className="absolute top-0 right-0" onClick={() => handleDeleteDetail(d.id)}>×</Button>
                  </div>
                ))}
                {detailFiles.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} alt="미리보기" className="w-16 h-16 object-cover rounded opacity-50" />
                  </div>
                ))}
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