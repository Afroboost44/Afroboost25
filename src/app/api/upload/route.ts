import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.NEXT_CLOUDINARY_API_SECRET,
    secure: true,
  });
export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'emoji' or 'chat'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    


    // Convert the file to a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a base64 string from the buffer
    const base64String = buffer.toString('base64');
    const base64Image = `data:${file.type};base64,${base64String}`;
    
    // Set the folder based on the type
    const folder = type === 'emoji' ? 'afroboost/emojis' : 'afroboost/chat';
    
    // Set max file size based on type
    const maxSize = type === 'emoji' ? 200 * 1024 : 2 * 1024 * 1024; // 200KB for emojis, 2MB for chat
    
    if (buffer.length > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / 1024}KB` 
      }, { status: 400 });
    }
    
    // Upload the image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64Image,
        {
          folder,
          resource_type: 'image',
          // For emojis, we want to optimize for small size and fast loading
          transformation: type === 'emoji' 
            ? [
                { width: 64, height: 64, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ]
            : [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });
    
    // Return the URL of the uploaded image
    return NextResponse.json({
      success: true,
      url: (uploadResult as any).secure_url
    });
    
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to upload image' 
    }, { status: 500 });
  }
} 