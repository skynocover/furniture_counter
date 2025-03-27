'use server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set');
}
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Define interfaces for type safety
interface GeminiFile {
  name: string;
  displayName?: string;
  mimeType: string;
  uri: string;
  state: 'PROCESSING' | 'ACTIVE' | 'ERROR' | string;
}

interface FurnitureItem {
  type: string;
  count: number;
}

interface FurnitureResponse {
  furniture: FurnitureItem[];
}

/**
 * Uploads the given file to Gemini from a URL.
 *
 * See https://ai.google.dev/gemini-api/docs/prompting_with_media
 */
async function uploadToGeminiFromUrl(
  url: string,
  mimeType: string,
  displayName?: string,
): Promise<GeminiFile> {
  // 從 URL 獲取檔案內容
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${url}, status: ${response.status}`);
  }

  // 將內容轉換為 Buffer
  const fileBuffer = await response.arrayBuffer().then((buffer) => Buffer.from(buffer));

  const uploadResult = await fileManager.uploadFile(fileBuffer, {
    mimeType,
    displayName: displayName || url,
  });
  const file = uploadResult.file;

  return file;
}

/**
 * Waits for the given files to be active.
 *
 * Some files uploaded to the Gemini API need to be processed before they can
 * be used as prompt inputs. The status can be seen by querying the file's
 * "state" field.
 *
 * This implementation uses a simple blocking polling loop. Production code
 * should probably employ a more sophisticated approach.
 */
async function waitForFilesActive(files: GeminiFile[]): Promise<void> {
  console.log('Waiting for file processing...');
  for (const name of files.map((file: GeminiFile) => file.name)) {
    let file = await fileManager.getFile(name);
    while (file.state === 'PROCESSING') {
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      file = await fileManager.getFile(name);
    }
    if (file.state !== 'ACTIVE') {
      throw Error(`File ${file.name} failed to process`);
    }
  }
  console.log('...all files ready\n');
}

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-pro-exp-02-05',
});

// Fix the schema definition to use the correct type format
const generationConfig: any = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseModalities: [],
  responseMimeType: 'application/json',
  responseSchema: {
    type: 'object',
    properties: {
      furniture: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
            },
            count: {
              type: 'integer',
            },
          },
          required: ['type', 'count'],
        },
      },
    },
  },
};

export const ParseFurniture = async ({
  fileUrl,
  fileName,
}: {
  fileUrl: string;
  fileName: string;
}) => {
  try {
    // 使用URL上傳檔案
    const files = [await uploadToGeminiFromUrl(fileUrl, 'application/pdf', fileName)];

    // Some files have a processing delay. Wait for them to be ready.
    await waitForFilesActive(files);

    const chatSession = model.startChat({
      generationConfig,
    });

    // Add the prompt and file to the chat session
    const result = await chatSession.sendMessage([
      {
        fileData: {
          mimeType: files[0].mimeType,
          fileUri: files[0].uri,
        },
      },
      {
        text: '這是一個房間的平面設計圖\n當中的 CT-11 CT-12等都是家具的編號\n統計有幾種家具 及他們的數量給我\n\n注意需要列出所有的家具編號跟他們的數量\n\n左上角的表格內容為備註 不需要統計\n\n使用JSON格式回應，格式為 {"furniture": [{"type": "家具編號", "count": 數量}, ...]}',
      },
    ]);

    const responseText = result.response.text();

    // Extract the JSON part from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const jsonResponse = JSON.parse(jsonMatch[0]) as FurnitureResponse;
    console.log('Parsed furniture:', jsonResponse);

    if (!jsonResponse.furniture || !Array.isArray(jsonResponse.furniture)) {
      throw new Error('Invalid furniture data structure');
    }

    return jsonResponse.furniture;
  } catch (error) {
    console.error('Error in ParseFurniture:', error);
    throw error;
  }
};

/// 樓層 mapping
const generationConfigFloorMapping: any = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: [],
  responseMimeType: 'application/json',
  responseSchema: {
    type: 'object',
    properties: {
      room: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            total: {
              type: 'integer',
            },
            floors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  count: {
                    type: 'integer',
                  },
                },
                required: ['name', 'count'],
              },
            },
          },
          required: ['name', 'total', 'floors'],
        },
      },
    },
    required: ['room'],
  },
};

const modelFloorMapping = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
});

export const ParseFloorMapping = async ({
  fileUrl,
  fileName,
}: {
  fileUrl: string;
  fileName: string;
}) => {
  try {
    const extension = fileUrl.split('.').pop() || '';
    const mimeType = `image/${extension}`;
    // 使用URL上傳檔案
    const files = [await uploadToGeminiFromUrl(fileUrl, mimeType, fileName)];
    console.log('🚀 ~ files:', files);

    // Some files have a processing delay. Wait for them to be ready.
    await waitForFilesActive(files);

    const chatSession = modelFloorMapping.startChat({
      generationConfig: generationConfigFloorMapping,
    });

    // Add the prompt and file to the chat session
    const result = await chatSession.sendMessage([
      {
        fileData: {
          mimeType: files[0].mimeType,
          fileUri: files[0].uri,
        },
      },
      { text: '這是一個房型與樓層的對照表\n使用JSON格式讀取出來' },
    ]);

    const responseText = result.response.text();

    // Extract the JSON part from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const jsonResponse = JSON.parse(jsonMatch[0]);
    console.log('Parsed furniture:', jsonResponse);

    if (!jsonResponse.room || !Array.isArray(jsonResponse.room)) {
      throw new Error('Invalid furniture data structure');
    }

    return jsonResponse.room;
  } catch (error) {
    console.error('Error in ParseFurniture:', error);
    throw error;
  }
};
