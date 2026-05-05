create table if not exists public.promoter_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.users(id) on delete cascade,
  approver_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  password text not null,
  full_name text not null,
  shop_name text not null,
  phone_number text not null,
  gpay_number text not null,
  upi_id text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  rejection_reason text
);

create index if not exists idx_promoter_requests_status on public.promoter_requests(status);
create index if not exists idx_promoter_requests_approver on public.promoter_requests(approver_id);

alter table public.promoter_requests enable row level security;

drop policy if exists "Approvers can manage own promoter requests" on public.promoter_requests;
create policy "Approvers can manage own promoter requests"
on public.promoter_requests
for all
to authenticated
using (approver_id = auth.uid())
with check (approver_id = auth.uid());

drop policy if exists "Admins can manage all promoter requests" on public.promoter_requests;
create policy "Admins can manage all promoter requests"
on public.promoter_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

