'use server';
import supabaseAdmin from './supabase-server';
import { v4 as uuidv4 } from 'uuid';

export const uploadFileToSupabase = async (file: File, path: string): Promise<string> => {
  // 創建唯一的文件名來防止衝突
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  // 將文件轉換為 Blob 或 ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer]);

  // 上傳文件到 Supabase 存儲
  const { data, error } = await supabaseAdmin.storage
    .from('furniture-system') // 替換為您的 bucket 名稱
    .upload(filePath, blob, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw error;
  }

  // 獲取公共 URL
  const { data: urlData } = supabaseAdmin.storage.from('furniture-system').getPublicUrl(filePath);

  return urlData.publicUrl;
};
