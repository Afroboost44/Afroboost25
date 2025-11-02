import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_CLOUDINARY_API_SECRET,
  secure: true,
});

interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  url: string;
  secure_url: string;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert buffer to base64
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataURI,
        {
          folder: 'afroboosteur',
          resource_type: 'auto',
        },
        (error: Error | undefined, result?: CloudinaryUploadResult) => {
          if (error || !result) reject(error || new Error('No result from Cloudinary'));
          else resolve(result);
        }
      );
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error);
    window.alert('Error uploading image: ' + (error.message || 'Unknown error'));
    return NextResponse.json({ error: error.message || 'Error uploading image' }, { status: 500 });
  }
}

// Increase payload size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '150mb',
    },
  },
}; 