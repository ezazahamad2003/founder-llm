import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Main Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Profile helpers
export interface Profile {
  user_id: string
  full_name: string | null
  role: 'user' | 'admin'
  terms_version: string | null
  accepted_terms_at: string | null
  created_at: string
  updated_at: string
}

export interface UserFile {
  id: string
  user_id: string
  path: string
  original_name: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function acceptTerms(userId: string, version: string) {
  try {
    // First check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single()
    
    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          terms_version: version,
          accepted_terms_at: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      // Update existing profile
      return updateProfile(userId, {
        terms_version: version,
        accepted_terms_at: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Error accepting terms:', error)
    throw error
  }
}

export async function getUserFiles(userId: string): Promise<UserFile[]> {
  const { data, error } = await supabase
    .from('files')
    .select('id, user_id, file_path, filename, mime_type, file_size, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching files:', error)
    throw error
  }
  
  // Map database fields to UserFile interface
  return (data || []).map(file => ({
    id: file.id,
    user_id: file.user_id,
    path: file.file_path,
    original_name: file.filename,
    mime_type: file.mime_type,
    size_bytes: file.file_size,
    created_at: file.created_at
  }))
}

export async function deleteUserFile(fileId: string) {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)
  
  if (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}
