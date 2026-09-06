create or replace function public.crm_link_customer_before_order()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_phone text;
  resolved_customer_id text;
  resolved_source text;
begin
  normalized_phone := regexp_replace(coalesce(new."customerPhone", ''), '\D', '', 'g');
  if left(normalized_phone, 2) = '55' and length(normalized_phone) >= 12 then
    normalized_phone := substring(normalized_phone from 3);
  end if;

  if length(normalized_phone) < 10 then
    return new;
  end if;

  resolved_source := coalesce(nullif(new."utmSource", ''), nullif(new."origin", ''), lower(new."channel"::text));

  insert into public."Customer" ("id", "name", "phone", "source", "lastContactAt", "createdAt", "updatedAt")
  values ('cust_' || md5(random()::text || clock_timestamp()::text), new."customerName", normalized_phone, resolved_source, now(), now(), now())
  on conflict ("phone") do update
  set "name" = excluded."name",
      "source" = coalesce(excluded."source", public."Customer"."source"),
      "lastContactAt" = now(),
      "updatedAt" = now()
  returning "id" into resolved_customer_id;

  new."customerId" := resolved_customer_id;
  return new;
end;
$$;

drop trigger if exists crm_link_customer_before_order_trigger on public."Order";
create trigger crm_link_customer_before_order_trigger
before insert or update of "customerName", "customerPhone"
on public."Order"
for each row
execute function public.crm_link_customer_before_order();

create or replace function public.crm_open_lead_after_order()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_lead_id text;
  resolved_source text;
begin
  if new."customerId" is null or new."status" in ('FINALIZADO'::public.order_status, 'CANCELADO'::public.order_status) then
    return new;
  end if;

  resolved_source := coalesce(nullif(new."utmSource", ''), nullif(new."origin", ''), lower(new."channel"::text));

  select l."id" into existing_lead_id
  from public."CrmLead" l
  where l."customerId" = new."customerId"
    and l."stage" in (
      'NOVO'::public.crm_lead_stage,
      'ATENDIMENTO'::public.crm_lead_stage,
      'PRODUTO_INDICADO'::public.crm_lead_stage,
      'AGUARDANDO_PAGAMENTO'::public.crm_lead_stage,
      'RECOMPRA'::public.crm_lead_stage
    )
  order by l."updatedAt" desc
  limit 1;

  if existing_lead_id is null then
    insert into public."CrmLead" (
      "id", "customerId", "stage", "estimatedValue", "source", "lastContactAt", "createdAt", "updatedAt"
    ) values (
      'lead_' || md5(random()::text || clock_timestamp()::text),
      new."customerId",
      'AGUARDANDO_PAGAMENTO'::public.crm_lead_stage,
      new."total",
      resolved_source,
      now(), now(), now()
    );
  else
    update public."CrmLead"
    set "stage" = 'AGUARDANDO_PAGAMENTO'::public.crm_lead_stage,
        "estimatedValue" = new."total",
        "source" = coalesce(public."CrmLead"."source", resolved_source),
        "lastContactAt" = now(),
        "updatedAt" = now()
    where "id" = existing_lead_id;
  end if;

  return new;
end;
$$;

drop trigger if exists crm_open_lead_after_order_trigger on public."Order";
create trigger crm_open_lead_after_order_trigger
after insert
on public."Order"
for each row
execute function public.crm_open_lead_after_order();
