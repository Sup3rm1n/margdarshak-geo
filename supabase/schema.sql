create extension if not exists postgis;

create type verification_status as enum ('verified', 'unverified', 'reported');
create type poi_source as enum (
  'manual',
  'osm',
  'student',
  'coaching_centre',
  'google_fallback'
);

create table poi_categories (
  id text primary key,
  label text not null,
  priority integer not null default 100
);

create table exam_centres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  district text not null,
  state text not null,
  latitude double precision not null,
  longitude double precision not null,
  location geography(point, 4326)
    generated always as (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography) stored,
  landmark text,
  exam_type text not null,
  gate_info text,
  admin_notes text,
  verified_status verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pois (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null references poi_categories(id),
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  location geography(point, 4326)
    generated always as (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography) stored,
  phone text,
  opening_hours text,
  verified_status verification_status not null default 'unverified',
  source poi_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table centre_nearby_pois (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references exam_centres(id) on delete cascade,
  poi_id uuid not null references pois(id) on delete cascade,
  distance_meters integer not null,
  walking_time_minutes integer not null,
  driving_time_minutes integer not null,
  priority_rank integer not null default 100,
  verified_status verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  unique (centre_id, poi_id)
);

create table poi_reports (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid references pois(id) on delete cascade,
  centre_id uuid references exam_centres(id) on delete cascade,
  report_type text not null,
  details text,
  reporter_contact text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table poi_suggestions (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid references exam_centres(id) on delete cascade,
  name text not null,
  category text not null references poi_categories(id),
  address text not null,
  latitude double precision,
  longitude double precision,
  notes text,
  submitter_contact text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index exam_centres_location_idx on exam_centres using gist (location);
create index pois_location_idx on pois using gist (location);
create index pois_category_idx on pois (category);
create index centre_nearby_pois_centre_idx on centre_nearby_pois (centre_id);

insert into poi_categories (id, label, priority) values
  ('railway_station', 'Railway station', 10),
  ('airport', 'Airport', 20),
  ('bus_stop', 'Bus stop', 30),
  ('photocopy', 'Photocopy', 40),
  ('cyber_cafe', 'Cyber cafe', 50),
  ('restaurant', 'Restaurant', 60),
  ('cafe', 'Cafe', 70),
  ('public_toilet', 'Public toilet', 80),
  ('hotel', 'Hotel', 90),
  ('lodge', 'Lodge', 100),
  ('atm', 'ATM', 110),
  ('medical_store', 'Medical store', 120),
  ('parking', 'Parking', 130),
  ('police_station', 'Police station', 140),
  ('hospital', 'Hospital', 150)
on conflict (id) do nothing;
