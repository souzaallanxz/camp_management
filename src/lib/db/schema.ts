import { pgTable, pgEnum, uuid, text, varchar, timestamp, numeric, date, bigint, jsonb, boolean } from 'drizzle-orm/pg-core';

// Enums
export const paymentStatusEnum = pgEnum('payment_status_enum', ['not confirmed', 'confirmed']);
export const paymentMethodEnum = pgEnum('payment_method_enum', ['MB Way', 'Transferência Bancária', 'Dinheiro', 'Desconto', 'Multibanco']);
export const registrationStatusEnum = pgEnum('registration_status', ['unpaid', 'paid', 'partial', 'cancelled']);
export const onboardingStatusTypeEnum = pgEnum('onboarding_status_type', ['Pendente', 'Completo']);

// Tables
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  logo_url: text('logo_url'),
  tier: text('tier').notNull().default('free'),
});

export const user_teams = pgTable('user_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull(),
  team_id: uuid('team_id').notNull().references(() => teams.id),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const camps = pgTable('camps', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  price: numeric('price').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  team_id: uuid('team_id').notNull().references(() => teams.id),
});

export const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  form_id: text('form_id'),
  name: text('name').notNull(),
  email: text('email').notNull(),
  contact: text('contact').notNull(),
  status: registrationStatusEnum('status').default('unpaid'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  user_id: uuid('user_id').references(() => teams.id),
  camp_id: uuid('camp_id').notNull().references(() => camps.id),
  onboarding_status: onboardingStatusTypeEnum('onboarding_status').notNull().default('Pendente'),
  snack_bar_balance: numeric('snack_bar_balance').notNull().default('0.00'),
  total_amount_paid: numeric('total_amount_paid').default('0'),
  id_number: varchar('id_number', { length: 50 }),
  sns_number: varchar('sns_number', { length: 50 }),
  date_of_birth: date('date_of_birth'),
  dietary_restrictions: text('dietary_restrictions'),
  guardian_name: varchar('guardian_name', { length: 255 }),
  guardian_email: varchar('guardian_email', { length: 255 }),
  guardian_phone: varchar('guardian_phone', { length: 50 }),
});

export const campers = pgTable('campers', {
  id: uuid('id').primaryKey().defaultRandom(),
  registration_id: uuid('registration_id').references(() => registrations.id),
  form_id: text('form_id'),
  name: text('name').notNull(),
  email: text('email').notNull(),
  contact: text('contact').notNull(),
  camp: text('camp').notNull(),
  additional_notes: text('additional_notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  snack_bar_balance: numeric('snack_bar_balance').notNull().default('0.00'),
});

// Nova tabela para staff
export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  camp_id: uuid('camp_id').notNull().references(() => camps.id),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  registration_id: uuid('registration_id').notNull().references(() => registrations.id),
  payment_date: timestamp('payment_date', { withTimezone: true }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  amount: numeric('amount').notNull(),
  payment_link: text('payment_link'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  phone_number: text('phone_number'),
  payment_status: paymentStatusEnum('payment_status').notNull().default('not confirmed'),
});

export const snackbar_balance = pgTable('snackbar_balance', {
  id: uuid('id').primaryKey().defaultRandom(),
  registration_id: uuid('registration_id').references(() => registrations.id),
  staff_id: uuid('staff_id').references(() => staff.id),
  amount: numeric('amount').notNull(),
  payment_method: varchar('payment_method', { length: 50 }).notNull(),
  phone_number: varchar('phone_number', { length: 20 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const snack_bar_transactions = pgTable('snack_bar_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  camper_id: uuid('camper_id').references(() => campers.id),
  staff_id: uuid('staff_id').references(() => staff.id),
  amount: numeric('amount').notNull(),
  type: varchar('type', { length: 20 }).notNull().default('deduction'), // 'deduction' or 'refund'
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const webhook_events = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  event_type: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processed_at: timestamp('processed_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const webhook_configs = pgTable('webhook_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  team_id: uuid('team_id').notNull().references(() => teams.id),
  webhook_type: text('webhook_type').notNull(),
  webhook_url: text('webhook_url').notNull(),
  is_enabled: boolean('is_enabled').notNull().default(false),
  hookdeck_data: jsonb('hookdeck_data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}); 