-- Evolution of the existing Favorita schema. Apply after 202609090001_initial.sql.
alter table public.products add column is_combo boolean not null default false;
alter table public.product_sizes add column promotional_price integer check(promotional_price>=0 and promotional_price<=price);
alter table public.orders drop constraint orders_payment_check;
alter table public.orders add constraint orders_payment_check check(payment in ('pix','cash','card','credit','debit'));
create table public.promotions(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null references public.restaurants on delete cascade,title text not null check(length(title) between 1 and 150),description text not null default '' check(length(description)<=300),product_id uuid,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(product_id,restaurant_id) references public.products(id,restaurant_id));
alter table public.promotions enable row level security;
create trigger touch before update on public.promotions for each row execute function public.touch_updated();
create policy promotion_read on public.promotions for select using((active and exists(select 1 from public.restaurants r where r.id=restaurant_id and r.active)) or public.staff_access(restaurant_id));
create policy promotion_admin on public.promotions for all to authenticated using(public.staff_access(restaurant_id,array['admin']::public.staff_role[])) with check(public.staff_access(restaurant_id,array['admin']::public.staff_role[]));
create index promotions_restaurant on public.promotions(restaurant_id);

create or replace function public.quote_order(r uuid, payload jsonb, consume boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare it jsonb;p public.products;sp public.products;s public.product_sizes;ss public.product_sizes;a public.addons;c public.coupons;cfg public.restaurant_settings;co jsonb=payload->'checkout';line jsonb;lines jsonb='[]';adds jsonb;aid text;qty int;unit int;sub int=0;fee int=0;disc int=0;crust int;begin
 if auth.uid() is null then raise exception 'Entre na sessão para continuar.';end if;
 if not public.restaurant_open(r) then raise exception 'Restaurante fechado.';end if;
 select * into cfg from public.restaurant_settings where restaurant_id=r;
 if jsonb_typeof(payload->'items')<>'array' or jsonb_array_length(payload->'items') not between 1 and 50 then raise exception 'Carrinho inválido.';end if;
 -- Lock products deterministically; serialize stock validation and avoid overselling.
 perform id from public.products where restaurant_id=r and id in (select (value->>'product_id')::uuid from jsonb_array_elements(payload->'items') union select nullif(value->>'second_flavor_id','')::uuid from jsonb_array_elements(payload->'items')) order by id for update;
 for it in select value from jsonb_array_elements(payload->'items') loop
  select * into p from public.products where id=(it->>'product_id')::uuid and restaurant_id=r and active;
  if not found or not exists(select 1 from public.categories where id=p.category_id and restaurant_id=r and active) then raise exception 'Produto indisponível.';end if;
  qty=(it->>'quantity')::int;if qty is null or qty not between 1 and 50 or length(coalesce(it->>'notes',''))>500 then raise exception 'Item inválido.';end if;
  s=null;ss=null;sp=null;unit=coalesce(p.promotional_price,p.price);
  if p.is_pizza then
   select * into s from public.product_sizes where id=(it->>'size_id')::uuid and product_id=p.id and active;if not found then raise exception 'Tamanho indisponível.';end if;unit=coalesce(s.promotional_price,s.price);
   if nullif(it->>'second_flavor_id','') is not null then select * into sp from public.products where id=(it->>'second_flavor_id')::uuid and restaurant_id=r and is_pizza and active;if not found then raise exception 'Sabor indisponível.';end if;select * into ss from public.product_sizes where product_id=sp.id and name=s.name and active;if not found then raise exception 'Tamanho do segundo sabor indisponível.';end if;unit=greatest(unit,coalesce(ss.promotional_price,ss.price));end if;
  elsif nullif(it->>'size_id','') is not null or nullif(it->>'second_flavor_id','') is not null then raise exception 'Opções inválidas.';end if;
  if jsonb_typeof(it->'addon_ids')<>'array' or jsonb_array_length(it->'addon_ids')>20 then raise exception 'Adicionais inválidos.';end if;
  if (select count(*)<>count(distinct value) from jsonb_array_elements_text(it->'addon_ids')) then raise exception 'Adicional duplicado.';end if;
  adds='[]';crust=0;for aid in select value from jsonb_array_elements_text(it->'addon_ids') loop select * into a from public.addons where id=aid::uuid and restaurant_id=r and active;if not found then raise exception 'Adicional indisponível.';end if;if not p.is_pizza then raise exception 'Adicionais não disponíveis para este produto.';end if;if a.kind='crust' then crust=crust+1;if not p.is_pizza or crust>1 then raise exception 'Borda inválida.';end if;end if;unit=unit+a.price;adds=adds||jsonb_build_array(jsonb_build_object('name',a.name,'price',a.price));end loop;
  if p.stock_quantity is not null and p.stock_quantity<qty then raise exception 'Estoque insuficiente: %',p.name;end if;
  if sp.id is not null and sp.id<>p.id and sp.stock_quantity is not null and sp.stock_quantity<qty then raise exception 'Estoque insuficiente: %',sp.name;end if;
  -- Even quotes temporarily decrement in their transaction; restore below when consume=false.
  update public.products set stock_quantity=stock_quantity-qty where id=p.id and stock_quantity is not null;
  if sp.id is not null and sp.id<>p.id then update public.products set stock_quantity=stock_quantity-qty where id=sp.id and stock_quantity is not null;end if;
  sub=sub+unit*qty;
  lines=lines||jsonb_build_array(jsonb_build_object('product_id',p.id,'second_flavor_id',case when sp.id<>p.id then sp.id else null end,'product_name',p.name,'size_name',s.name,'flavor_name',sp.name,'quantity',qty,'unit_price',unit,'notes',coalesce(it->>'notes',''),'addons',adds));
 end loop;
 if sub<cfg.minimum_order then raise exception 'Pedido abaixo do valor mínimo.';end if;
 if co->>'fulfillment'='delivery' then select z.fee into fee from public.delivery_zones z where z.restaurant_id=r and z.active and z.name=co->>'neighborhood';if not found then raise exception 'Bairro fora da área de entrega.';end if;elsif co->>'fulfillment' not in ('pickup','table') or co->>'fulfillment' is null then raise exception 'Recebimento inválido.';end if;
 if coalesce(co->>'coupon','')<>'' then select * into c from public.coupons where restaurant_id=r and code=upper(trim(co->>'coupon')) for update;if not found or not c.active or now()<c.starts_at or now()>c.expires_at or (c.usage_limit is not null and c.used_count>=c.usage_limit) or sub<c.minimum_order then raise exception 'Cupom inválido, esgotado ou mínimo não atingido.';end if;disc=least(sub,case when c.kind='percent' then (sub::bigint*c.value/100)::int else c.value end);if consume then update public.coupons set used_count=used_count+1 where id=c.id;end if;end if;
 if not consume then for line in select value from jsonb_array_elements(lines) loop update public.products set stock_quantity=stock_quantity+(line->>'quantity')::int where id=(line->>'product_id')::uuid and stock_quantity is not null;update public.products set stock_quantity=stock_quantity+(line->>'quantity')::int where id=(line->>'second_flavor_id')::uuid and stock_quantity is not null;end loop;end if;
 return jsonb_build_object('items',lines,'subtotal',sub,'delivery_fee',fee,'discount',disc,'total',sub+fee-disc,'coupon_id',c.id);
end$$;
create or replace function public.create_order(r uuid,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare existing uuid;uid uuid=auth.uid();co jsonb=payload->'checkout';q jsonb;cust uuid;oid uuid;ln jsonb;addr jsonb;changeval int;k uuid=(payload->>'idempotency_key')::uuid;begin
 if uid is null or k is null then raise exception 'Sessão inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select id into existing from public.orders where owner_id=uid and idempotency_key=k;if found then return existing;end if;
 if (select count(*) from public.orders where owner_id=uid and created_at>now()-interval '10 minutes')>=5 then raise exception 'Aguarde antes de criar outro pedido.';end if;
 if length(trim(co->>'name')) not between 3 and 120 or co->>'name' is null or co->>'phone' is null or co->>'phone' !~ '^\d{10,13}$' or co->>'payment' is null or co->>'payment' not in ('pix','cash','card','credit','debit') then raise exception 'Dados do cliente inválidos.';end if;
 if co->>'fulfillment'='delivery' then
  if co->>'cep' is null or co->>'cep' !~ '^\d{5}-?\d{3}$' or co->>'state' is null or co->>'state' !~ '^[A-Z]{2}$' then raise exception 'CEP ou estado inválido.';end if;
  if exists(select 1 from unnest(array['street','number','neighborhood','city']) field where length(trim(coalesce(co->>field,''))) not between 1 and 200) then raise exception 'Endereço incompleto.';end if;
  addr=jsonb_build_object('CEP',co->>'cep','Rua',co->>'street','Número',co->>'number','Bairro',co->>'neighborhood','Complemento',co->>'complement','Cidade',co->>'city','UF',co->>'state','Referência',co->>'reference');
 end if;
 if co->>'fulfillment'='table' and (co->>'table_number' is null or co->>'table_number' !~ '^\d{1,4}$') then raise exception 'Mesa inválida.';end if;
 q=public.quote_order(r,payload,true);
 if payload->'expected_quote' is null or jsonb_typeof(payload->'expected_quote')<>'object' or exists(select 1 from unnest(array['subtotal','delivery_fee','discount','total']) field where (payload->'expected_quote'->>field) is distinct from (q->>field)) then raise exception 'Os valores mudaram. Revise o pedido novamente.';end if;
 if co->>'payment'='cash' and coalesce(co->>'change_for','')<>'' then changeval=round(replace(co->>'change_for',',','.')::numeric*100);if changeval<(q->>'total')::int then raise exception 'Troco menor que o total.';end if;end if;
 insert into public.customers(restaurant_id,name,phone) values(r,trim(co->>'name'),co->>'phone') on conflict(restaurant_id,phone) do update set name=excluded.name returning id into cust;
 if addr is not null then insert into public.customer_addresses(restaurant_id,customer_id,address) values(r,cust,addr);end if;
 insert into public.orders(restaurant_id,customer_id,owner_id,idempotency_key,customer_name,customer_phone,address,fulfillment,table_number,payment,change_for,subtotal,delivery_fee,discount,total,coupon_id) values(r,cust,uid,k,trim(co->>'name'),co->>'phone',addr,co->>'fulfillment',case when co->>'fulfillment'='table' then co->>'table_number' end,co->>'payment',changeval,(q->>'subtotal')::int,(q->>'delivery_fee')::int,(q->>'discount')::int,(q->>'total')::int,(q->>'coupon_id')::uuid) returning id into oid;
 for ln in select value from jsonb_array_elements(q->'items') loop insert into public.order_items(order_id,restaurant_id,product_id,second_flavor_id,product_name,size_name,flavor_name,quantity,unit_price,notes,addons) values(oid,r,(ln->>'product_id')::uuid,(ln->>'second_flavor_id')::uuid,ln->>'product_name',ln->>'size_name',ln->>'flavor_name',(ln->>'quantity')::int,(ln->>'unit_price')::int,ln->>'notes',ln->'addons');end loop;
 insert into public.notifications(restaurant_id,order_id,message) values(r,oid,'Novo pedido recebido');insert into public.order_events(restaurant_id,order_id,status,actor_id) values(r,oid,'new',uid);return oid;
end$$;
