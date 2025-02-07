import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export const supabaseStorage = {
  async uploadFile(file: File, bucket: string = 'team-logos') {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  },

  async deleteFile(path: string, bucket: string = 'team-logos') {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  }
} 