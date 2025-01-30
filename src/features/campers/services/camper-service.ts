import { supabase } from '@/lib/supabase'
import { type Camper, type InsertCamper } from '../data/schema'

async function findAll() {
  const { data, error } = await supabase.from('campers').select('*')

  if (error) {
    throw error
  }

  return data as Camper[]
}

async function create(camper: InsertCamper) {
  try {
    const { data, error } = await supabase
      .from('campers')
      .insert(camper)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Erro ao criar camper: nenhum dado retornado')
    }

    return data as Camper
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar camper'
    throw new Error(message)
  }
}

export const camperService = {
  findAll,
  create,
} 