// ATENÇÃO: Este módulo não deve ser usado no frontend!
// Todas as operações de banco de dados devem ser feitas via backend Express.
// DEVELOPMENT: http://localhost:3001/api/...
// PRODUCTION: https://api.campy.pt/api/...
// Se precisar de dados no frontend, crie endpoints no backend e consuma via fetch/axios.

import { env } from '@/env'
import { neon } from '@neondatabase/serverless'

// Create a Neon database client
const sqlNeon = neon(env.VITE_NEON_DB_URL)

// Helper function to sanitize parameters that might be UUIDs
function sanitizeParams(params: unknown[]): unknown[] {
  return params.map(param => {
    // Check if parameter might be a JSON object with an ID field that should be a UUID
    if (param && typeof param === 'object' && !Array.isArray(param)) {
      // If it has an 'id' property and looks like a camp or similar object, extract just the ID
      if ('id' in param && typeof (param as Record<string, unknown>).id === 'string') {
        return (param as Record<string, unknown>).id;
      }
    }
    return param;
  });
}

// Create a wrapper around sqlNeon to sanitize template literal parameters
function sanitizedSql(strings: TemplateStringsArray, ...values: unknown[]) {
  const sanitized = sanitizeParams(values);
  return sqlNeon(strings, ...sanitized);
}

export const db = {
  // Original sql template literal function for backward compatibility
  sql: sanitizedSql,
  
  async query(query: string, params?: unknown[]) {
    try {
      // Set search path before each query to ensure it's always correct
      await sanitizedSql`SET search_path TO public`
      
      // Sanitize parameters to ensure UUID fields are properly handled
      const sanitizedParams = params ? sanitizeParams(params) : [];
      
      // Execute the query using SQL template literals
      const result = await sqlNeon.query(query, sanitizedParams)
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  async migrate() {
    try {
      // Set search path
      await sqlNeon`SET search_path TO public`

      // Create teams table
      await sqlNeon`
        CREATE TABLE IF NOT EXISTS teams (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          logo_url TEXT,
          tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create user_teams table to associate users with teams
      await sqlNeon`
        CREATE TABLE IF NOT EXISTS user_teams (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL REFERENCES public.users_sync(id) ON DELETE CASCADE,
          team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, team_id)
        )
      `

      // Create indexes
      await sqlNeon`CREATE INDEX IF NOT EXISTS user_teams_user_id_idx ON user_teams(user_id)`
      await sqlNeon`CREATE INDEX IF NOT EXISTS user_teams_team_id_idx ON user_teams(team_id)`

      // Create updated_at trigger function
      await sqlNeon`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `

      // Create triggers for teams
      await sqlNeon`
        DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
        CREATE TRIGGER update_teams_updated_at
          BEFORE UPDATE ON teams
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
      `

      // Create triggers for user_teams
      await sqlNeon`
        DROP TRIGGER IF EXISTS update_user_teams_updated_at ON user_teams;
        CREATE TRIGGER update_user_teams_updated_at
          BEFORE UPDATE ON user_teams
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
      `

      return { error: null }
    } catch (error) {
      return { error }
    }
  },

  // Supabase-style ORM for tables with parameter sanitization
  from(table: string) {
    let fields = '*';
    const conditions: Array<{field: string; operator: string; value: unknown}> = [];
    let orderByField: string | null = null;
    let orderDirection: 'asc' | 'desc' = 'asc';
    let limitValue: number | null = null;
    let offsetValue: number | null = null;
    
    return {
      select(fieldsArg: string = '*') {
        fields = fieldsArg;
        return this;
      },
      eq(field: string, value: unknown) {
        conditions.push({ field, operator: '=', value });
        return this;
      },
      order(field: string, { ascending = true } = {}) {
        orderByField = field;
        orderDirection = ascending ? 'asc' : 'desc';
        return this;
      },
      limit(value: number) {
        limitValue = value;
        return this;
      },
      offset(value: number) {
        offsetValue = value;
        return this;
      },
      insert(data: unknown) {
        const insertQuery = async () => {
          // If data is array, handle multiple rows
          const rows = Array.isArray(data) ? data : [data];
          
          // No rows to insert
          if (rows.length === 0) {
            return { data: [], error: null }; 
          }
          
          // Get the object to be inserted
          const rowObjects = rows.map(row => row as Record<string, unknown>);
          
          // For users table - remove id and let the database use DEFAULT gen_random_uuid()
          if (table === 'users') {
            rowObjects.forEach(rowObj => {
              if ('id' in rowObj) {
                delete rowObj.id;
              }
            });
          }
          
          // Get keys from first row after potential id removal
          const keys = Object.keys(rowObjects[0]);
          
          // Generate placeholders for each row
          const placeholders: string[] = [];
          const values: unknown[] = [];
          
          rowObjects.forEach((rowObj) => {
            const rowPlaceholders: string[] = [];
            
            keys.forEach((key) => {
              values.push(rowObj[key]);
              rowPlaceholders.push(`$${values.length}`);
            });
            
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
          });
          
          const query = `
            INSERT INTO ${table} (${keys.join(', ')})
            VALUES ${placeholders.join(', ')}
            RETURNING *
          `;
          
          return db.query(query, values);
        };
        
        return {
          async select(fieldsArg: string = '*') {
            fields = fieldsArg;
            const result = await insertQuery();
            return result;
          },
          async single() {
            const result = await insertQuery();
            if (result.error) return result;
            if (result.data && result.data.length > 0) {
              return { data: result.data[0], error: null };
            }
            return { data: null, error: new Error('No data returned from insert') };
          }
        };
      },
      update(data: unknown) {
        return {
          eq(field: string, value: unknown) {
            conditions.push({ field, operator: '=', value });
            return this;
          },
          async select(fieldsArg: string = '*') {
            fields = fieldsArg;
            
            // Build the SET clause
            const dataObj = data as Record<string, unknown>;
            const updates = Object.entries(dataObj).map(([key], i) => `${key} = $${i + 1}`);
            const updateValues = Object.values(dataObj);
            
            // Build the WHERE clause
            const whereConditions = conditions.map((cond, i) => 
              `${cond.field} ${cond.operator} $${i + updateValues.length + 1}`
            );
            const whereValues = conditions.map(cond => cond.value);
            
            // Combine all values
            const allValues = [...updateValues, ...whereValues];
            
            const query = `
              UPDATE ${table}
              SET ${updates.join(', ')}
              ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
              RETURNING ${fields}
            `;
            
            return db.query(query, allValues);
          },
          async single() {
            const result = await this.select();
            if (result.error) return result;
            if (result.data && result.data.length > 0) {
              return { data: result.data[0], error: null };
            }
            return { data: null, error: new Error('No data returned from update') };
          }
        };
      },
      delete() {
        return {
          eq(field: string, value: unknown) {
            conditions.push({ field, operator: '=', value });
            return this;
          },
          async execute() {
            // Build the WHERE clause
            const whereConditions = conditions.map((cond, i) => 
              `${cond.field} ${cond.operator} $${i + 1}`
            );
            const whereValues = conditions.map(cond => cond.value);
            
            const query = `
              DELETE FROM ${table}
              ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
              RETURNING *
            `;
            
            return db.query(query, whereValues);
          }
        };
      },
      async execute() {
        // Build the WHERE clause
        const whereConditions = conditions.map((cond, i) => 
          `${cond.field} ${cond.operator} $${i + 1}`
        );
        const whereValues = conditions.map(cond => cond.value);
        
        // Build the ORDER BY clause
        const orderClause = orderByField 
          ? `ORDER BY ${orderByField} ${orderDirection}` 
          : '';
          
        // Build the LIMIT and OFFSET clauses
        const limitClause = limitValue !== null ? `LIMIT ${limitValue}` : '';
        const offsetClause = offsetValue !== null ? `OFFSET ${offsetValue}` : '';
        
        const query = `
          SELECT ${fields} FROM ${table}
          ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
          ${orderClause}
          ${limitClause}
          ${offsetClause}
        `;
        
        return db.query(query, whereValues);
      },
      async single() {
        limitValue = 1;
        const result = await this.execute();
        if (result.error) return result;
        if (result.data && result.data.length > 0) {
          return { data: result.data[0], error: null };
        }
        return { data: null, error: new Error('No data returned') };
      }
    };
  },
  
  // RPC function call (for stored procedures)
  async rpc(functionName: string, params: Record<string, unknown> = {}) {
    const paramNames = Object.keys(params);
    const paramValues = Object.values(params);
    const sanitizedParams = sanitizeParams(paramValues);

    // Generate named parameter placeholders
    const placeholders = paramNames.map((name, i) => `${name} := $${i + 1}`).join(', ');
    
    const query = `SELECT * FROM ${functionName}(${placeholders})`;
    
    return db.query(query, sanitizedParams);
  }
} 