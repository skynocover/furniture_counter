'use server';
import supabaseAdmin from './supabase-server';
import { v4 as uuidv4 } from 'uuid';

export const uploadFileToSupabase = async (
  file: File,
  path: string,
  defaultFileName?: string,
): Promise<string> => {
  // 創建唯一的文件名來防止衝突
  const fileExt = file.name.split('.').pop();
  const fileName = defaultFileName || `${uuidv4()}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  // 將文件轉換為 Blob 或 ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type }); // 在建立Blob時明確設定MIME類型

  // 上傳文件到 Supabase 存儲
  const { data, error } = await supabaseAdmin.storage
    .from('furniture-system') // 替換為您的 bucket 名稱
    .upload(filePath, blob, {
      contentType: file.type || getMimeType(fileExt),
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

// 輔助函數：根據文件擴展名獲取 MIME 類型
const getMimeType = (extension?: string): string => {
  if (!extension) return 'application/octet-stream';

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    json: 'application/json',
    // 您可以根據需要添加更多類型
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};
