import { db } from './index';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    // Drop all tables in reverse order of dependencies
    await db.execute(sql`DROP TABLE IF EXISTS webhook_events CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS snackbar_balance CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS snack_bar_transactions CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS staff CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS payments CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS campers CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS registrations CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS camps CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS user_teams CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS teams CASCADE`);
    
    // Drop enums
    await db.execute(sql`DROP TYPE IF EXISTS payment_status_enum CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS payment_method_enum CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS registration_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS onboarding_status_type CASCADE`);

    // Create enums
    await db.execute(sql`
      CREATE TYPE payment_status_enum AS ENUM ('not confirmed', 'confirmed');
      CREATE TYPE payment_method_enum AS ENUM ('MB Way', 'Transferência Bancária', 'Dinheiro', 'Desconto', 'Multibanco');
      CREATE TYPE registration_status AS ENUM ('unpaid', 'paid', 'cancelled');
      CREATE TYPE onboarding_status_type AS ENUM ('Pendente', 'Completo');
    `);

    // Create tables in order of dependencies
    await db.execute(sql`
      CREATE TABLE teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        logo_url TEXT,
        tier TEXT NOT NULL DEFAULT 'free'
      );

      CREATE TABLE user_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        team_id UUID NOT NULL REFERENCES teams(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
      );

      CREATE TABLE camps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        price NUMERIC NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        team_id UUID NOT NULL REFERENCES teams(id)
      );

      CREATE TABLE registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id TEXT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        contact TEXT NOT NULL,
        status registration_status DEFAULT 'unpaid',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        user_id UUID REFERENCES teams(id),
        camp_id UUID NOT NULL REFERENCES camps(id),
        onboarding_status onboarding_status_type NOT NULL DEFAULT 'Pendente',
        snack_bar_balance NUMERIC NOT NULL DEFAULT 0.00,
        total_amount_paid NUMERIC DEFAULT 0,
        id_number VARCHAR(50),
        sns_number VARCHAR(50),
        date_of_birth DATE,
        dietary_restrictions TEXT,
        guardian_name VARCHAR(255),
        guardian_email VARCHAR(255),
        guardian_phone VARCHAR(50)
      );

      CREATE TABLE campers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        registration_id UUID REFERENCES registrations(id),
        form_id TEXT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        contact TEXT,
        camp TEXT NOT NULL,
        additional_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        snack_bar_balance NUMERIC NOT NULL DEFAULT 0.00
      );

      CREATE TABLE staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        camp_id UUID NOT NULL REFERENCES camps(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
      );

      CREATE TABLE payments (
        id BIGINT PRIMARY KEY,
        registration_id UUID NOT NULL REFERENCES registrations(id),
        payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
        payment_method payment_method_enum NOT NULL,
        amount NUMERIC NOT NULL,
        payment_link TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        phone_number TEXT,
        payment_status payment_status_enum NOT NULL DEFAULT 'not confirmed'
      );

      CREATE TABLE snackbar_balance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        registration_id UUID REFERENCES registrations(id),
        staff_id UUID REFERENCES staff(id),
        amount NUMERIC NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        phone_number VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE snack_bar_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        camper_id UUID REFERENCES campers(id),
        staff_id UUID REFERENCES staff(id),
        amount NUMERIC NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'deduction',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
      );
    `);

  } catch {
    process.exit(1);
  }
}

main(); 