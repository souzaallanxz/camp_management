create type registration_status as enum ('paid', 'partial', 'unpaid');

create table registrations (
  id uuid default gen_random_uuid() primary key,
  form_id text not null,
  name text not null,
  email text not null,
  contact text not null,
  camp text not null,
  payment_link text,
  amount_paid decimal(10,2) default 0,
  status registration_status default 'unpaid',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies as needed 