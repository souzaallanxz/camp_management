-- Create the function to update team name
create or replace function update_team_name(team_id uuid, new_name text)
returns void
security definer
set search_path = public
language plpgsql
as $$
declare
  user_team_id uuid;
begin
  -- Get the user's team_id from the users table
  select u.team_id
  into user_team_id
  from auth.users u 
  where u.id = auth.uid();

  -- Raise notice for debugging
  raise notice 'User team ID: %, Requested team ID: %', user_team_id, team_id;

  -- Check if the user has access to the team
  if user_team_id is null or user_team_id != team_id then
    raise exception 'User does not have access to this team. User team: %, Requested team: %', user_team_id, team_id;
  end if;

  -- Update the team name
  update teams 
  set name = new_name 
  where id = team_id;
end;
$$; 