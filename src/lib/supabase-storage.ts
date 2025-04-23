import { db } from './db'
import { v4 as uuidv4 } from 'uuid'

export const storageService = {
  async uploadFile(file: File, bucket: string = 'team-logos') {
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const { error: uploadError } = await db.storage
      .from(bucket)
      .upload(fileName, file)

    if (uploadError) {
      throw uploadError
    }

    const { data: { publicUrl } } = db.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return publicUrl
  },

  async deleteFile(path: string, bucket: string = 'team-logos') {
    const { error } = await db.storage
      .from(bucket)
      .remove([path])

    if (error) {
      throw error
    }
  }
} 