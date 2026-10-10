-- Save meal and items in one transaction: failed items never leave an empty meal.
create or replace function public.save_racha_meal(
 p_items jsonb,
 p_meal_id uuid default null,
 p_meal_type public.meal_type default null,
 p_eaten_at timestamptz default null,
 p_image_url text default null,
 p_shared_with_partner boolean default false,
 p_shared_group_id uuid default null,
 p_scan_status public.scan_status default 'edited'
) returns public.meals
language plpgsql security invoker set search_path=public as $$
declare m public.meals; item jsonb; total_kcal numeric; total_p numeric; total_c numeric; total_f numeric;
begin
 if auth.uid() is null then raise exception 'Unauthenticated'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid items'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'Add between 1 and 50 foods'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if coalesce(length(trim(item->>'name')),0)=0 or length(item->>'name')>120
   or (item->>'grams')::numeric is null or (item->>'grams')::numeric<=0
   or (item->>'calories')::numeric is null or (item->>'calories')::numeric<0
   or (item->>'protein')::numeric is null or (item->>'protein')::numeric<0
   or (item->>'carbs')::numeric is null or (item->>'carbs')::numeric<0
   or (item->>'fat')::numeric is null or (item->>'fat')::numeric<0
  then raise exception 'Invalid food values'; end if;
 end loop;
 select sum((value->>'calories')::numeric),sum((value->>'protein')::numeric),sum((value->>'carbs')::numeric),sum((value->>'fat')::numeric)
 into total_kcal,total_p,total_c,total_f from jsonb_array_elements(p_items);
 if p_meal_id is null then
  insert into meals(user_id,image_url,meal_type,eaten_at,total_calories,total_protein,total_carbs,total_fat,scan_status,shared_with_partner,shared_group_id)
  values(auth.uid(),p_image_url,coalesce(p_meal_type,'other'),coalesce(p_eaten_at,now()),round(total_kcal,1),round(total_p,1),round(total_c,1),round(total_f,1),p_scan_status,p_shared_with_partner,p_shared_group_id) returning * into m;
 else
  update meals set meal_type=coalesce(p_meal_type,meal_type),eaten_at=coalesce(p_eaten_at,eaten_at),total_calories=round(total_kcal,1),total_protein=round(total_p,1),total_carbs=round(total_c,1),total_fat=round(total_f,1),scan_status='edited'
  where id=p_meal_id and user_id=auth.uid() returning * into m;
  if m.id is null then raise exception 'Meal unavailable'; end if;
  delete from meal_items where meal_id=m.id;
 end if;
 for item in select value from jsonb_array_elements(p_items) loop
  insert into meal_items(meal_id,food_name,quantity,unit,grams,calories,protein,carbs,fat,confidence,source)
  values(m.id,item->>'name',(item->>'grams')::numeric,'g',(item->>'grams')::numeric,(item->>'calories')::numeric,(item->>'protein')::numeric,(item->>'carbs')::numeric,(item->>'fat')::numeric,(item->>'confidence')::numeric,coalesce((item->>'source')::public.meal_item_source,'edited'));
 end loop;
 return m;
end $$;
revoke all on function public.save_racha_meal(jsonb,uuid,public.meal_type,timestamptz,text,boolean,uuid,public.scan_status) from public,anon;
grant execute on function public.save_racha_meal(jsonb,uuid,public.meal_type,timestamptz,text,boolean,uuid,public.scan_status) to authenticated;
