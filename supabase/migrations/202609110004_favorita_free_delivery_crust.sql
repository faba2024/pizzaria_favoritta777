-- Regra comercial confirmada: somente para A Favorita.
update public.delivery_zones set fee=0 where restaurant_id in (select id from public.restaurants where slug='favorita');
update public.addons set price=0 where kind='crust' and restaurant_id in (select id from public.restaurants where slug='favorita');
