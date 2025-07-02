import { createClient, SupabaseClient } from '@supabase/supabase-js';

// images 테이블 목록 불러오기
export async function fetchImages(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('images')
    .select('id, name, description, date, category, file_name, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// image_details 테이블 목록 (특정 이미지의 상세 이미지들)
export async function fetchImageDetails(supabase: SupabaseClient, image_id: string) {
  const { data, error } = await supabase
    .from('image_details')
    .select('id, image_id, file_name, "order", created_at')
    .eq('image_id', image_id)
    .order('order', { ascending: true });
  if (error) throw error;
  return data;
}

// 이미지 추가
export async function addImage(supabase: SupabaseClient, image: {
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
export async function updateImage(supabase: SupabaseClient, id: string, updates: Partial<{
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
export async function deleteImage(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('images')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// 상세 이미지 추가
export async function addImageDetail(supabase: SupabaseClient, detail: {
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
export async function deleteImageDetail(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('image_details')
    .delete()
    .eq('id', id);
  if (error) throw error;
} 