-- Add invitation_code column to groups table
alter table public.groups add column invitation_code text unique;

-- Create function to generate random invitation code
create or replace function generate_invitation_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Create trigger to auto-generate invitation code on group creation
create or replace function set_invitation_code()
returns trigger as $$
begin
  if new.invitation_code is null then
    new.invitation_code := generate_invitation_code();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger groups_invitation_code_trigger
  before insert on public.groups
  for each row
  execute function set_invitation_code();
