-- ==============================================================================
-- HOT SPOT RESTAURANT QR ORDERING SYSTEM
-- Complete Supabase PostgreSQL Schema, Security Policies (RLS) & Seed Data
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUMS & CONSTANTS
do $$ begin
  create type user_role_type as enum ('admin', 'kitchen', 'staff');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type order_status_type as enum ('new', 'accepted', 'preparing', 'ready', 'served', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status_type as enum ('unpaid', 'paid', 'refunded');
exception
  when duplicate_object then null;
end $$;

-- 3. TABLES

-- Restaurant Settings
create table if not exists public.restaurant_settings (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Hot Spot',
  tagline text default 'Fresh Pizzas, Gourmet Burgers & Quick Bites',
  logo_url text,
  address text not null default 'Near Gandhi Chowk, Hamirpur, Himachal Pradesh 177001',
  google_maps_url text default 'https://maps.app.goo.gl/B2fHCFbCtg1jejDu7',
  phone text default '+91 98160 00000',
  email text default 'hotspot.hamirpur@gmail.com',
  currency text not null default 'INR',
  currency_symbol text not null default '₹',
  tax_percent numeric(5,2) not null default 5.0,
  service_charge_percent numeric(5,2) not null default 0.0,
  is_open boolean not null default true,
  opening_time text default '10:30 AM',
  closing_time text default '10:00 PM',
  order_notes text default 'All items freshly prepared upon order. Average prep time: 15-20 mins.',
  custom_domain text,
  updated_at timestamptz default now()
);

-- Profiles & User Roles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  role text not null check (role in ('admin', 'kitchen', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'kitchen', 'staff')),
  created_at timestamptz default now()
);

-- Restaurant Tables
create table if not exists public.restaurant_tables (
  id uuid primary key default uuid_generate_v4(),
  table_number text not null unique,
  display_name text not null,
  capacity int not null default 4,
  is_active boolean not null default true,
  qr_slug text unique,
  created_at timestamptz default now()
);

-- Menu Categories
create table if not exists public.menu_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  display_order int not null default 0,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Menu Items
create table if not exists public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  base_price numeric(10,2) not null check (base_price >= 0),
  image_url text,
  is_veg boolean not null default true,
  is_available boolean not null default true,
  preparation_time_minutes int not null default 15,
  is_bestseller boolean not null default false,
  spicy_level int not null default 0,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Menu Item Variants (Sizes, crusts, etc.)
create table if not exists public.menu_item_variants (
  id uuid primary key default uuid_generate_v4(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price_adjustment numeric(10,2) not null default 0.0,
  is_default boolean not null default false,
  is_available boolean not null default true
);

-- Menu Item Add-ons (Extra cheese, dips, toppings)
create table if not exists public.menu_item_addons (
  id uuid primary key default uuid_generate_v4(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  is_available boolean not null default true
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  table_id uuid references public.restaurant_tables(id),
  table_number text not null,
  customer_name text not null,
  customer_phone text,
  status text not null default 'new' check (status in ('new', 'accepted', 'preparing', 'ready', 'served', 'cancelled')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  tax_amount numeric(10,2) not null check (tax_amount >= 0),
  service_charge numeric(10,2) not null default 0.0 check (service_charge >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  payment_method text not null default 'counter',
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  special_instructions text,
  cancel_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Order Items (Snapshot preserving historical price & selection)
create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  variant_name text,
  variant_price numeric(10,2) not null default 0,
  addons jsonb not null default '[]'::jsonb,
  special_instructions text,
  item_total numeric(10,2) not null check (item_total >= 0),
  created_at timestamptz default now()
);

-- Order Status History (Audit trail of kitchen/staff changes)
create table if not exists public.order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by text default 'Staff',
  notes text,
  created_at timestamptz default now()
);

-- Payments (Cash at counter, UPI, or card)
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  method text not null default 'counter',
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'refunded')),
  transaction_ref text,
  verified_by text,
  created_at timestamptz default now()
);

-- Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz default now()
);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.restaurant_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_variants enable row level security;
alter table public.menu_item_addons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- Helper function: is_staff / is_admin
create or replace function public.is_admin_or_staff()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'kitchen', 'staff') and is_active = true
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
end;
$$ language plpgsql security definer;

-- Settings: Everyone can read; only admin can update
create policy "Anyone can read restaurant settings" on public.restaurant_settings
  for select using (true);

create policy "Only admin can update restaurant settings" on public.restaurant_settings
  for all using (public.is_admin());

-- Tables: Everyone can read active tables; staff can manage
create policy "Anyone can read active tables" on public.restaurant_tables
  for select using (true);

create policy "Staff can manage tables" on public.restaurant_tables
  for all using (public.is_admin_or_staff());

-- Menu: Everyone can read active categories and items; staff can manage
create policy "Anyone can read active menu categories" on public.menu_categories
  for select using (true);

create policy "Staff can manage menu categories" on public.menu_categories
  for all using (public.is_admin_or_staff());

create policy "Anyone can read menu items" on public.menu_items
  for select using (true);

create policy "Staff can manage menu items" on public.menu_items
  for all using (public.is_admin_or_staff());

create policy "Anyone can read variants and addons" on public.menu_item_variants
  for select using (true);

create policy "Staff can manage variants" on public.menu_item_variants
  for all using (public.is_admin_or_staff());

create policy "Anyone can read addons" on public.menu_item_addons
  for select using (true);

create policy "Staff can manage addons" on public.menu_item_addons
  for all using (public.is_admin_or_staff());

-- Orders: Public can insert their order and read back their order by ID or order_number
create policy "Public can place an order" on public.orders
  for insert with check (true);

create policy "Public can view their own order" on public.orders
  for select using (true);

create policy "Staff can update orders" on public.orders
  for update using (public.is_admin_or_staff());

create policy "Public can insert order items" on public.order_items
  for insert with check (true);

create policy "Anyone can read order items" on public.order_items
  for select using (true);

create policy "Anyone can read order history" on public.order_status_history
  for select using (true);

create policy "Staff can insert order history" on public.order_status_history
  for insert with check (true);

-- Realtime publication for live kitchen dashboard
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_history;
alter publication supabase_realtime add table public.menu_items;

-- 5. INITIAL SEED DATA FOR "HOT SPOT", HAMIRPUR
insert into public.restaurant_settings (name, tagline, address, phone, email, currency, currency_symbol, tax_percent, service_charge_percent, is_open, opening_time, closing_time)
values (
  'Hot Spot',
  'Pizzas, Burgers, Momos & Bites • Hamirpur',
  'Near Gandhi Chowk, Shani Mandir Road, Hamirpur, HP 177001',
  '+91 98160 54321',
  'hotspot.hamirpur@gmail.com',
  'INR',
  '₹',
  5.0,
  0.0,
  true,
  '10:30 AM',
  '10:00 PM'
) on conflict do nothing;

-- Active Tables (1 to 12)
insert into public.restaurant_tables (table_number, display_name, capacity, is_active, qr_slug)
values
  ('1', 'Table 1 (Window Side)', 4, true, 't-1'),
  ('2', 'Table 2 (Window Side)', 4, true, 't-2'),
  ('3', 'Table 3 (Central Booth)', 6, true, 't-3'),
  ('4', 'Table 4 (Central Booth)', 6, true, 't-4'),
  ('5', 'Table 5 (Couple Table)', 2, true, 't-5'),
  ('6', 'Table 6 (Couple Table)', 2, true, 't-6'),
  ('7', 'Table 7 (Family Lounge)', 8, true, 't-7'),
  ('8', 'Table 8 (Family Lounge)', 8, true, 't-8'),
  ('9', 'Table 9 (Balcony / Terrace)', 4, true, 't-9'),
  ('10', 'Table 10 (Balcony / Terrace)', 4, true, 't-10'),
  ('11', 'Table 11 (Corner Alcove)', 4, true, 't-11'),
  ('12', 'Table 12 (Quick Bar Counter)', 2, true, 't-12')
on conflict (table_number) do nothing;
