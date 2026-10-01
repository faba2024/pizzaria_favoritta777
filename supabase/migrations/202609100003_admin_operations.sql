-- The original UI referenced these RPCs, but migration 001 did not implement them.
create function public.save_settings(rid uuid,restaurant_data jsonb,settings_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare h record;
begin
 if not public.staff_access(rid,array['admin']::public.staff_role[]) then raise exception 'Acesso negado.';end if;
 if length(trim(coalesce(restaurant_data->>'name',''))) not between 1 and 150 or coalesce(restaurant_data->>'whatsapp','') !~ '^\d{10,15}$' then raise exception 'Nome ou WhatsApp inválidos.';end if;
 if not exists(select 1 from pg_timezone_names where name=restaurant_data->>'timezone') then raise exception 'Fuso horário inválido.';end if;
 if length(coalesce(restaurant_data->>'phone',''))>30 or length(coalesce(restaurant_data->>'address',''))>500 or length(coalesce(settings_data->>'pix_key',''))>200 or length(coalesce(settings_data->>'instagram',''))>300 then raise exception 'Configuração muito longa.';end if;
 if coalesce(restaurant_data->>'logo_url','')<>'' and not ((restaurant_data->>'logo_url') like 'https://%' or (restaurant_data->>'logo_url') ~ '^/[^/]') then raise exception 'Logo inválida.';end if;
 if coalesce(settings_data->>'brand_color','') !~ '^#[0-9A-Fa-f]{6}$' or coalesce(settings_data->>'minimum_order','') !~ '^\d+$' then raise exception 'Valores inválidos.';end if;
 if jsonb_typeof(settings_data->'hours') is distinct from 'object' then raise exception 'Horários inválidos.';end if;
 for h in select * from jsonb_each(settings_data->'hours') loop
  if h.key !~ '^[0-6]$' or jsonb_typeof(h.value->'enabled') is distinct from 'boolean' or coalesce(h.value->>'open','') !~ '^([01]\d|2[0-3]):[0-5]\d$' or coalesce(h.value->>'close','') !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise exception 'Horários inválidos.';end if;
 end loop;
 update public.restaurants set name=trim(restaurant_data->>'name'),logo_url=nullif(restaurant_data->>'logo_url',''),phone=coalesce(restaurant_data->>'phone',''),whatsapp=restaurant_data->>'whatsapp',address=coalesce(restaurant_data->>'address',''),timezone=restaurant_data->>'timezone',active=coalesce((restaurant_data->>'active')::boolean,false) where id=rid;
 insert into public.restaurant_settings(restaurant_id,minimum_order,pix_key,brand_color,instagram,hours) values(rid,(settings_data->>'minimum_order')::integer,coalesce(settings_data->>'pix_key',''),settings_data->>'brand_color',coalesce(settings_data->>'instagram',''),settings_data->'hours')
 on conflict(restaurant_id) do update set minimum_order=excluded.minimum_order,pix_key=excluded.pix_key,brand_color=excluded.brand_color,instagram=excluded.instagram,hours=excluded.hours;
end$$;

create function public.customer_stats(rid uuid)
returns table(id uuid,name text,phone text,order_count bigint,spent bigint,last_order timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if not public.staff_access(rid,array['admin','attendant']::public.staff_role[]) then raise exception 'Acesso negado.';end if;
 return query select c.id,c.name,c.phone,count(o.id),coalesce(sum(o.total),0)::bigint,max(o.created_at)
 from public.customers c left join public.orders o on o.customer_id=c.id and o.restaurant_id=rid and o.status<>'cancelled'
 where c.restaurant_id=rid group by c.id,c.name,c.phone order by max(o.created_at) desc nulls last;
end$$;
revoke all on function public.save_settings(uuid,jsonb,jsonb),public.customer_stats(uuid) from public,anon;
grant execute on function public.save_settings(uuid,jsonb,jsonb),public.customer_stats(uuid) to authenticated;
