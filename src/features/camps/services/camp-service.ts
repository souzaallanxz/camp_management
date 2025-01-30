import { supabase } from '@/lib/supabase'
import { type Camp, type InsertCamp, type UpdateCamp } from '../data/schema'

async function findAll() {
  const { data, error } = await supabase.from('camps').select('*')

  if (error) {
    throw error
  }

  return data as Camp[]
}

async function create(camp: InsertCamp) {
  const { data, error } = await supabase.from('camps').insert(camp).select()

  if (error) {
    throw error
  }

  return data[0] as Camp
}

async function update(id: string, camp: UpdateCamp) {
  const { data, error } = await supabase
    .from('camps')
    .update(camp)
    .eq('id', id)
    .select()

  if (error) {
    throw error
  }

  return data[0] as Camp
}

async function remove(id: string) {
  const { error } = await supabase.from('camps').delete().eq('id', id)

  if (error) {
    throw error
  }
}

export const campService = {
  findAll,
  create,
  update,
  remove,
} 