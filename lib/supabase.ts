import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// images 테이블 목록 불러오기
export async function fetchImages() {
  const { data, error } = await supabase
    .from('images')
    .select('id, name, description, date, category, file_name, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// image_details 테이블 목록 (특정 이미지의 상세 이미지들)
export async function fetchImageDetails(image_id: string) {
  const { data, error } = await supabase
    .from('image_details')
    .select('id, image_id, file_name, "order", created_at')
    .eq('image_id', image_id)
    .order('order', { ascending: true });
  if (error) throw error;
  return data;
}

// 이미지 추가
export async function addImage(image: {
  file_name: string;
  name: string;
  description: string;
  date: string;
  category: string;
}) {
  const { data, error } = await supabase
    .from('images')
    .insert([image])
    .select();
  if (error) throw error;
  return data?.[0];
}

// 이미지 수정
export async function updateImage(id: string, updates: Partial<{
  file_name: string;
  name: string;
  description: string;
  date: string;
  category: string;
}>) {
  const { data, error } = await supabase
    .from('images')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0];
}

// 이미지 삭제
export async function deleteImage(id: string) {
  const { error } = await supabase
    .from('images')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// 상세 이미지 추가
export async function addImageDetail(detail: {
  image_id: string;
  file_name: string;
  order?: number;
}) {
  const { data, error } = await supabase
    .from('image_details')
    .insert([detail])
    .select();
  if (error) throw error;
  return data?.[0];
}

// 상세 이미지 삭제
export async function deleteImageDetail(id: string) {
  const { error } = await supabase
    .from('image_details')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export default supabase; 