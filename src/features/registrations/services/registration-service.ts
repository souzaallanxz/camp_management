import { db } from '@/lib/db'
import { sqlNeon } from '@/lib/sql-neon'
import type { Registration, InsertRegistration, UpdateRegistration } from '../data/schema'
import { getCurrentUserTeam } from '@/features/auth/auth-service'

export const registrationService = {
  async findAll() {
    const { data, error } = await db
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data as Registration[]
  },

  async findById(id: string) {
    const { data, error } = await db
      .from('registrations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    return data as Registration
  },

  async create(registration: InsertRegistration) {
    // Ensure that camp_id is a string, not an object
    if (registration.camp_id !== undefined) {
      let campId: string;
      
      if (typeof registration.camp_id === 'string') {
        campId = registration.camp_id;
      } else if (typeof registration.camp_id === 'object' && registration.camp_id !== null) {
        // Handle case where camp_id is an object with an id property
        try {
          const campObject = JSON.parse(JSON.stringify(registration.camp_id));
          if (campObject && typeof campObject.id === 'string') {
            campId = campObject.id;
            // Update the registration object with the corrected camp_id
            registration = { ...registration, camp_id: campId };
          } else {
            throw new Error('Invalid camp_id format');
          }
        } catch (error) {
          throw new Error(`Invalid camp_id format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('Invalid camp_id format');
      }
    }

    const { data, error } = await db
      .query(`
        INSERT INTO registrations (
          name, email, contact, camp_id, form_id, status, onboarding_status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *
      `, [
        registration.name,
        registration.email,
        registration.contact,
        registration.camp_id,
        registration.form_id || null,
        'unpaid', // Initial status
        'Pendente', // Initial onboarding status
        new Date().toISOString(),
        new Date().toISOString()
      ]);

    if (error) {
      throw error;
    }

    // Verificar se data existe e é um array
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data returned from insert operation');
    }

    // Retornar o primeiro item do array
    return data[0] as Registration;
  },

  async update(id: string, registration: UpdateRegistration) {
    const { data, error } = await db
      .from('registrations')
      .update(registration)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data as Registration
  },

  async delete(id: string) {
    const { error } = await db
      .from('registrations')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
  }
}

export async function getRegistrations() {
  try {
    // Get team ID
    let teamId;
    try {
      const team = await getCurrentUserTeam();
      teamId = team.id;
    } catch (teamError) {
      console.error('Error fetching team:', teamError);
      return []; // Return empty array if no team (prevents app breaking)
    }
    
    // Usar diretamente o sqlNeon para executar a query
    // sqlNeon é um template literal tag que permite queries SQL seguras
    try {
      const registrationsData = await sqlNeon`
        SELECT 
          r.*,
          c.id as "camp.id",
          c.name as "camp.name",
          c.price as "camp.price",
          c.team_id as "camp.team_id",
          COALESCE(SUM(p.amount), 0) as total_amount_paid
        FROM 
          registrations r
          JOIN camps c ON r.camp_id = c.id
          LEFT JOIN payments p ON r.id = p.registration_id
        WHERE 
          c.team_id = ${teamId}
          AND r.camp_id IS NOT NULL
        GROUP BY
          r.id, r.name, r.email, r.contact, r.status, r.onboarding_status,
          r.form_id, r.created_at, r.updated_at, r.camp_id,
          c.id, c.name, c.price, c.team_id
      `;
      
      if (!registrationsData || !Array.isArray(registrationsData) || registrationsData.length === 0) {
        return [];
      }
      
      // Formatar registros no formato esperado
      const formattedRegistrations = registrationsData.map(row => {
        // Construir objeto camp
        const camp = {
          id: row['camp.id'],
          name: row['camp.name'],
          price: row['camp.price'],
          team_id: row['camp.team_id']
        };
        
        // Remover propriedades camp.* do objeto principal
        const { 
          ['camp.id']: campId,
          ['camp.name']: campName,
          ['camp.price']: campPrice,
          ['camp.team_id']: campTeamId,
          ...regData 
        } = row;
        
        // Retornar registro formatado com o total de pagamentos calculado
        return {
          ...regData,
          camp,
          status: regData.status || 'unpaid',
          total_amount_paid: Number(row.total_amount_paid || 0)
        };
      });
      
      return formattedRegistrations;
    } catch (dbError) {
      console.error('Database error:', dbError);
      return [];
    }
  } catch (error) {
    console.error('General error in getRegistrations:', error);
    return [];
  }
}

export async function getRegistrationById(id: string): Promise<Registration> {
  const teamId = await getCurrentUserTeam()

  const { data, error } = await db
    .from('registrations')
    .select(`
      id,
      name,
      email,
      contact,
      status,
      onboarding_status,
      form_id,
      created_at,
      updated_at,
      camp_id,
      camp:camps!registrations_camp_id_fkey (
        id,
        name,
        price,
        start_date,
        end_date,
        created_at,
        updated_at,
        team_id
      ),
      camper:campers (
        id,
        name,
        email,
        contact,
        created_at,
        updated_at
      )
    `)
    .eq('id', id)
    .eq('camp.team_id', teamId)
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Registration not found')
  }

  // Get total using the secure function
  const { data: totalData, error: totalError } = await db
    .rpc('get_registration_total', { registration_id: data.id })

  if (totalError) {
    throw totalError
  }

  const camper = Array.isArray(data.camper) ? data.camper[0] : data.camper
  const camp = Array.isArray(data.camp) ? data.camp[0] : data.camp

  const { id: registrationId, name, email, contact, status, onboarding_status, created_at, updated_at, camp_id, form_id } = data

  return {
    id: registrationId,
    name,
    email,
    contact,
    status,
    onboarding_status,
    form_id,
    created_at,
    updated_at,
    camp_id,
    camp: camp ? {
      id: camp.id,
      name: camp.name,
      price: camp.price,
      start_date: camp.start_date,
      end_date: camp.end_date,
      created_at: camp.created_at,
      updated_at: camp.updated_at
    } : null,
    camper: camper ? {
      id: camper.id,
      name: camper.name,
      email: camper.email,
      contact: camper.contact,
      created_at: camper.created_at,
      updated_at: camper.updated_at
    } : null,
    total_amount_paid: totalData || 0
  }
}

export async function updateRegistration(id: string, registration: UpdateRegistration) {
  const teamId = await getCurrentUserTeam()

  // Check if camp_id is present and ensure it's a string UUID
  if (registration.camp_id !== undefined) {
    let campId: string;
    
    if (typeof registration.camp_id === 'string') {
      campId = registration.camp_id;
    } else if (typeof registration.camp_id === 'object' && registration.camp_id !== null) {
      // Handle case where camp_id is an object with an id property
      try {
        const campObject = JSON.parse(JSON.stringify(registration.camp_id));
        if (campObject && typeof campObject.id === 'string') {
          campId = campObject.id;
          // Update the registration object with the corrected camp_id
          registration = { ...registration, camp_id: campId };
        } else {
          throw new Error('Invalid camp_id format');
        }
      } catch (error) {
        throw new Error(`Invalid camp_id format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('Invalid camp_id format');
    }
  }

  const { data, error } = await db
    .from('registrations')
    .update(registration)
    .eq('id', id)
    .eq('camp.team_id', teamId)
    .select()
    .single()

  if (error) {
    throw new Error(`Error updating registration: ${error.message}`)
  }

  return data
}

export async function deleteRegistration(id: string) {
  const teamId = await getCurrentUserTeam()

  const { error } = await db
    .from('registrations')
    .delete()
    .eq('id', id)
    .eq('camp.team_id', teamId)

  if (error) {
    throw new Error(`Error deleting registration: ${error.message}`)
  }
}

export async function updateOnboardingStatus(id: string, status: 'Pendente' | 'Onboarded') {
  try {
    // Update only the onboarding_status without filtering by team_id
    // This ensures the update works correctly
    const { data, error } = await db
      .from('registrations')
      .update({ 
        onboarding_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating onboarding status:', error);
      throw new Error(`Erro ao atualizar status de onboarding: ${error.message}`)
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Erro ao atualizar status de onboarding: inscrição não encontrada')
    }

    return data[0]
  } catch (error) {
    console.error('Unexpected error in updateOnboardingStatus:', error);
    throw error;
  }
}

export async function createRegistration(registration: InsertRegistration) {
  const teamId = await getCurrentUserTeam()

  // Ensure that camp_id is a string, not an object
  let campId: string;
  
  if (typeof registration.camp_id === 'string') {
    campId = registration.camp_id;
  } else if (typeof registration.camp_id === 'object' && registration.camp_id !== null) {
    // Handle case where camp_id is an object with an id property
    try {
      const campObject = JSON.parse(JSON.stringify(registration.camp_id));
      if (campObject && typeof campObject.id === 'string') {
        campId = campObject.id;
      } else {
        throw new Error('Invalid camp_id format');
      }
    } catch (error) {
      throw new Error(`Invalid camp_id format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    throw new Error('Invalid camp_id format');
  }

  // First verify if the camp belongs to the user's team
  const { data: camp, error: campError } = await db
    .from('camps')
    .select('id')
    .eq('id', campId)
    .eq('team_id', teamId)
    .single()

  if (campError || !camp) {
    throw new Error('Camp not found or does not belong to your team')
  }

  const { data, error } = await db
    .from('registrations')
    .insert({
      ...registration,
      camp_id: campId, // Use the validated camp ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) {
    throw new Error(`Erro ao criar inscrição: ${error.message}`)
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Erro ao criar inscrição: nenhum dado retornado')
  }

  return data[0]
}
