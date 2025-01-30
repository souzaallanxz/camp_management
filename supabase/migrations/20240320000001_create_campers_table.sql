create table campers (
  id uuid default gen_random_uuid() primary key,
  registration_id uuid references registrations(id) on delete cascade,
  form_id text,
  name text not null,
  email text not null,
  contact text not null,
  camp text not null,
  additional_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table campers enable row level security;

create policy "Enable read access for all users" on campers
  for select using (true);

create policy "Enable insert access for authenticated users" on campers
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on campers
  for update using (auth.role() = 'authenticated');

create policy "Enable delete access for authenticated users" on campers
  for delete using (auth.role() = 'authenticated'); 