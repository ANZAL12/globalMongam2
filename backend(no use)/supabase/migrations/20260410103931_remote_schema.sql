drop extension if exists "pg_net";


  create table "public"."announcement_targets" (
    "announcement_id" uuid not null,
    "user_id" uuid not null
      );



  create table "public"."announcements" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "title" text not null,
    "description" text not null,
    "image_url" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );



  create table "public"."sales" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "promoter_id" uuid not null,
    "product_name" text not null,
    "model_no" text,
    "serial_no" text,
    "bill_amount" numeric(10,2) not null,
    "bill_no" text not null,
    "bill_image_url" text not null,
    "status" text default 'pending'::text,
    "incentive_amount" numeric(10,2),
    "payment_status" text default 'unpaid'::text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "is_active" boolean default true,
    "transaction_id" text
      );



  create table "public"."system_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "action" text not null,
    "details" text,
    "user_email" text not null
      );


alter table "public"."system_logs" enable row level security;


  create table "public"."users" (
    "id" uuid not null,
    "email" text not null,
    "role" text default 'promoter'::text,
    "must_change_password" boolean default false,
    "google_id" text,
    "expo_push_token" text,
    "shop_name" text,
    "full_name" text,
    "phone_number" text,
    "gpay_number" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "is_active" boolean default true
      );


CREATE UNIQUE INDEX announcement_targets_pkey ON public.announcement_targets USING btree (announcement_id, user_id);

CREATE UNIQUE INDEX announcements_pkey ON public.announcements USING btree (id);

CREATE UNIQUE INDEX sales_bill_no_key ON public.sales USING btree (bill_no);

CREATE UNIQUE INDEX sales_pkey ON public.sales USING btree (id);

CREATE UNIQUE INDEX system_logs_pkey ON public.system_logs USING btree (id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."announcement_targets" add constraint "announcement_targets_pkey" PRIMARY KEY using index "announcement_targets_pkey";

alter table "public"."announcements" add constraint "announcements_pkey" PRIMARY KEY using index "announcements_pkey";

alter table "public"."sales" add constraint "sales_pkey" PRIMARY KEY using index "sales_pkey";

alter table "public"."system_logs" add constraint "system_logs_pkey" PRIMARY KEY using index "system_logs_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."announcement_targets" add constraint "announcement_targets_announcement_id_fkey" FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE not valid;

alter table "public"."announcement_targets" validate constraint "announcement_targets_announcement_id_fkey";

alter table "public"."announcement_targets" add constraint "announcement_targets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."announcement_targets" validate constraint "announcement_targets_user_id_fkey";

alter table "public"."sales" add constraint "sales_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."sales" validate constraint "sales_approved_by_fkey";

alter table "public"."sales" add constraint "sales_bill_no_key" UNIQUE using index "sales_bill_no_key";

alter table "public"."sales" add constraint "sales_payment_status_check" CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text]))) not valid;

alter table "public"."sales" validate constraint "sales_payment_status_check";

alter table "public"."sales" add constraint "sales_promoter_id_fkey" FOREIGN KEY (promoter_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."sales" validate constraint "sales_promoter_id_fkey";

alter table "public"."sales" add constraint "sales_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."sales" validate constraint "sales_status_check";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_id_fkey";

alter table "public"."users" add constraint "users_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'promoter'::text]))) not valid;

alter table "public"."users" validate constraint "users_role_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_create_promoter(p_email text, p_password text, p_full_name text, p_shop_name text, p_phone_number text, p_gpay_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- 1. Create a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- 2. Hash the password using GoTrue's expected blowfish scheme
  encrypted_pw := crypt(p_password, gen_salt('bf'));
  
  -- 3. Insert into auth.users (Managed by Supabase GoTrue)
  BEGIN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      p_email,
      encrypted_pw,
      now(),
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed during auth.users insert: ' || SQLERRM);
  END;

  -- 4. Insert into auth.identities
  BEGIN
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      new_user_id::text,
      format('{"sub":"%s","email":"%s"}', new_user_id::text, p_email)::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed during auth.identities insert: ' || SQLERRM);
  END;

  -- 5. Insert directly into public.users
  -- Disable user triggers temporarily to bypass ANY rogue old triggers connected to this!
  BEGIN
    ALTER TABLE public.users DISABLE TRIGGER USER;
    
    INSERT INTO public.users (
      id,
      email,
      role,
      full_name,
      shop_name,
      phone_number,
      gpay_number,
      is_active
    ) VALUES (
      new_user_id,
      p_email,
      'promoter',
      p_full_name,
      p_shop_name,
      p_phone_number,
      p_gpay_number,
      true
    );
    
    ALTER TABLE public.users ENABLE TRIGGER USER;
  EXCEPTION WHEN OTHERS THEN
    -- Ensure we re-enable user triggers even if the insert fails
    ALTER TABLE public.users ENABLE TRIGGER USER;
    RETURN jsonb_build_object('error', 'Failed during public.users insert: ' || SQLERRM);
  END;

  -- 6. Return success with the new user_id
  RETURN jsonb_build_object('success', true, 'user_id', new_user_id);

END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_confirm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE auth.users 
  SET email_confirmed_at = NOW(), 
      confirmed_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$function$
;

grant delete on table "public"."announcement_targets" to "anon";

grant insert on table "public"."announcement_targets" to "anon";

grant references on table "public"."announcement_targets" to "anon";

grant select on table "public"."announcement_targets" to "anon";

grant trigger on table "public"."announcement_targets" to "anon";

grant truncate on table "public"."announcement_targets" to "anon";

grant update on table "public"."announcement_targets" to "anon";

grant delete on table "public"."announcement_targets" to "authenticated";

grant insert on table "public"."announcement_targets" to "authenticated";

grant references on table "public"."announcement_targets" to "authenticated";

grant select on table "public"."announcement_targets" to "authenticated";

grant trigger on table "public"."announcement_targets" to "authenticated";

grant truncate on table "public"."announcement_targets" to "authenticated";

grant update on table "public"."announcement_targets" to "authenticated";

grant delete on table "public"."announcement_targets" to "service_role";

grant insert on table "public"."announcement_targets" to "service_role";

grant references on table "public"."announcement_targets" to "service_role";

grant select on table "public"."announcement_targets" to "service_role";

grant trigger on table "public"."announcement_targets" to "service_role";

grant truncate on table "public"."announcement_targets" to "service_role";

grant update on table "public"."announcement_targets" to "service_role";

grant delete on table "public"."announcements" to "anon";

grant insert on table "public"."announcements" to "anon";

grant references on table "public"."announcements" to "anon";

grant select on table "public"."announcements" to "anon";

grant trigger on table "public"."announcements" to "anon";

grant truncate on table "public"."announcements" to "anon";

grant update on table "public"."announcements" to "anon";

grant delete on table "public"."announcements" to "authenticated";

grant insert on table "public"."announcements" to "authenticated";

grant references on table "public"."announcements" to "authenticated";

grant select on table "public"."announcements" to "authenticated";

grant trigger on table "public"."announcements" to "authenticated";

grant truncate on table "public"."announcements" to "authenticated";

grant update on table "public"."announcements" to "authenticated";

grant delete on table "public"."announcements" to "service_role";

grant insert on table "public"."announcements" to "service_role";

grant references on table "public"."announcements" to "service_role";

grant select on table "public"."announcements" to "service_role";

grant trigger on table "public"."announcements" to "service_role";

grant truncate on table "public"."announcements" to "service_role";

grant update on table "public"."announcements" to "service_role";

grant delete on table "public"."sales" to "anon";

grant insert on table "public"."sales" to "anon";

grant references on table "public"."sales" to "anon";

grant select on table "public"."sales" to "anon";

grant trigger on table "public"."sales" to "anon";

grant truncate on table "public"."sales" to "anon";

grant update on table "public"."sales" to "anon";

grant delete on table "public"."sales" to "authenticated";

grant insert on table "public"."sales" to "authenticated";

grant references on table "public"."sales" to "authenticated";

grant select on table "public"."sales" to "authenticated";

grant trigger on table "public"."sales" to "authenticated";

grant truncate on table "public"."sales" to "authenticated";

grant update on table "public"."sales" to "authenticated";

grant delete on table "public"."sales" to "service_role";

grant insert on table "public"."sales" to "service_role";

grant references on table "public"."sales" to "service_role";

grant select on table "public"."sales" to "service_role";

grant trigger on table "public"."sales" to "service_role";

grant truncate on table "public"."sales" to "service_role";

grant update on table "public"."sales" to "service_role";

grant delete on table "public"."system_logs" to "anon";

grant insert on table "public"."system_logs" to "anon";

grant references on table "public"."system_logs" to "anon";

grant select on table "public"."system_logs" to "anon";

grant trigger on table "public"."system_logs" to "anon";

grant truncate on table "public"."system_logs" to "anon";

grant update on table "public"."system_logs" to "anon";

grant delete on table "public"."system_logs" to "authenticated";

grant insert on table "public"."system_logs" to "authenticated";

grant references on table "public"."system_logs" to "authenticated";

grant select on table "public"."system_logs" to "authenticated";

grant trigger on table "public"."system_logs" to "authenticated";

grant truncate on table "public"."system_logs" to "authenticated";

grant update on table "public"."system_logs" to "authenticated";

grant delete on table "public"."system_logs" to "service_role";

grant insert on table "public"."system_logs" to "service_role";

grant references on table "public"."system_logs" to "service_role";

grant select on table "public"."system_logs" to "service_role";

grant trigger on table "public"."system_logs" to "service_role";

grant truncate on table "public"."system_logs" to "service_role";

grant update on table "public"."system_logs" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "Admins can view all sales"
  on "public"."sales"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "Users can view own sales"
  on "public"."sales"
  as permissive
  for select
  to authenticated
using ((promoter_id = auth.uid()));



  create policy "Allow authenticated users to insert logs"
  on "public"."system_logs"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to view logs"
  on "public"."system_logs"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Admins can view all users"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (public.is_admin());


CREATE TRIGGER tr_handle_new_user_confirm AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_confirm();


  create policy "Allow authenticated users to upload announcements"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'announcements'::text));



  create policy "Allow authenticated users to upload sales_bills"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'sales_bills'::text));



  create policy "Allow public full view of announcements"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'announcements'::text));



  create policy "Allow public full view of sales_bills"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'sales_bills'::text));



  create policy "Authenticated users can upload announcements"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'announcements'::text));



  create policy "Authenticated users can upload sales bills"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'sales_bills'::text));



  create policy "Give users authenticated access to folder 9cjqbw_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'announcements'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Give users authenticated access to folder sesjmh_0"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'sales_bills'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Give users authenticated access to folder sesjmh_1"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'sales_bills'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Give users authenticated access to folder sesjmh_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'sales_bills'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Give users authenticated access to folder sesjmh_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'sales_bills'::text) AND ((storage.foldername(name))[1] = 'private'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Public Access for announcements"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'announcements'::text));



  create policy "Public Access for sales_bills"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'sales_bills'::text));



