import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Test GET handler to verify route is working
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[GET /api/files/[id]] Route is accessible, file ID:', params.id)
  return NextResponse.json({ message: 'Route is working', fileId: params.id })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[DELETE /api/files/[id]] Request received for file:', params.id)
    
    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fileId = params.id

    // Get file details to check ownership and get path
    console.log('[DELETE] Querying file with ID:', fileId)
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    console.log('[DELETE] File query result:', { file, error: fetchError })

    if (fetchError || !file) {
      console.error('[DELETE] File not found or error:', {
        fileId,
        error: fetchError,
        errorCode: fetchError?.code,
        errorMessage: fetchError?.message,
        errorDetails: fetchError?.details
      })
      return NextResponse.json({ 
        error: 'File not found',
        details: fetchError?.message || 'No file with this ID exists'
      }, { status: 404 })
    }

    // Check if user is owner or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isOwner = file.user_id === user.id
    const isAdmin = profile?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete from storage (use correct bucket name)
    const { error: storageError } = await supabase.storage
      .from('legal-docs')
      .remove([file.file_path])

    if (storageError) {
      console.error('Error deleting from storage:', storageError)
      // Continue even if storage deletion fails
    }

    // Delete from database (RLS will handle permissions)
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      console.error('Error deleting file record:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
