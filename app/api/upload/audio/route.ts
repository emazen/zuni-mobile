import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { checkUploadRateLimit } from "@/lib/rateLimit"

// Maximum file size: 10MB for audio
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Allowed audio MIME types
// Note: MediaRecorder can produce different types depending on browser:
// - Chrome/Firefox: audio/webm
// - Safari: audio/mp4 or video/mp4
// - Some browsers: empty string (browser-default)
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
  'audio/opus',
  'audio/mp4', // Safari MediaRecorder
  'video/mp4', // Safari MediaRecorder (sometimes returns this for audio)
  'audio/x-m4a', // Alternative M4A format
]

export async function POST(request: NextRequest) {
  try {
    // 0. Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. Get file from FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 4. Validate file type
    // Handle empty/undefined MIME types (browser-default from MediaRecorder)
    const fileType = file.type || ''
    
    // Extract base MIME type (remove codec parameters like "; codecs=opus")
    const baseMimeType = fileType.split(';')[0].trim().toLowerCase()
    
    // If MIME type is empty, allow it (MediaRecorder browser-default)
    // Otherwise check against allowed types (case-insensitive, without codec params)
    if (fileType && !ALLOWED_MIME_TYPES.some(allowed => allowed.toLowerCase() === baseMimeType)) {
      return NextResponse.json(
        { 
          error: `Invalid file type: ${fileType || 'unknown'}. Allowed types: MP3, WAV, WebM, OGG, AAC, Opus, MP4/M4A.`,
          receivedType: fileType,
          baseType: baseMimeType
        },
        { status: 400 }
      )
    }

    // 5. Check rate limits
    const rateLimitCheck = await checkUploadRateLimit(session.user.id, file.size)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitCheck.reason || "Upload limit reached",
          rateLimit: rateLimitCheck.remaining
        },
        { status: 429 } // Too Many Requests
      )
    }

    // 6. Generate unique file path
    const fileExt = file.name.split('.').pop() || 'mp3'
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    
    // Determine folder based on context (optional - can be passed as query param)
    const folder = request.nextUrl.searchParams.get('folder') || 'audio'
    const filePath = `${folder}/${fileName}`

    // 7. Convert File to ArrayBuffer/Uint8Array for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // 8. Determine content type (handle empty/undefined from MediaRecorder)
    let contentType = file.type
    if (!contentType || contentType === '') {
      // Default to audio/webm for browser-default recordings
      contentType = 'audio/webm'
    } else {
      // Extract base MIME type (remove codec parameters)
      const baseMimeType = contentType.split(';')[0].trim().toLowerCase()
      
      if (baseMimeType === 'video/mp4') {
        // Safari sometimes returns video/mp4 for audio, normalize to audio/mp4
        contentType = 'audio/mp4'
      } else {
        // Use base MIME type without codec parameters for Supabase
        contentType = baseMimeType
      }
    }

    // 9. Upload to Supabase using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filePath, uint8Array, {
        contentType: contentType,
        upsert: false // Don't allow overwriting
      })

    if (error) {
      console.error('Supabase upload error:', {
        message: error.message,
        path: filePath
      })
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // 10. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath
    })

  } catch (error: any) {
    console.error('Error in upload API:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
