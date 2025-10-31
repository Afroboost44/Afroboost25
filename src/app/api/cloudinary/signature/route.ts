import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.NEXT_CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
    try {
        const { timestamp, upload_preset } = await request.json();

        // Validate that required environment variables are set
        if (
            !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
            !process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
            !process.env.NEXT_CLOUDINARY_API_SECRET
        ) {
            return NextResponse.json(
                { error: 'Cloudinary configuration missing' },
                { status: 500 }
            );
        }

        // Generate signature for secure upload
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                upload_preset: upload_preset,
                resource_type: 'video',
            },
            process.env.NEXT_CLOUDINARY_API_SECRET as string
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        });
    } catch (error) {
        console.error('Error generating Cloudinary signature:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload signature' },
            { status: 500 }
        );
    }
}
