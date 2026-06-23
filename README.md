# Margdarshak Geo

Independent map-based exam centre and nearby POI system for Margdarshak.

## Stack

- Next.js App Router with TypeScript
- Vercel hosting
- Supabase PostgreSQL with PostGIS
- Leaflet and OpenStreetMap tiles for the MVP map
- Future routing provider: OSRM, GraphHopper, or Valhalla

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app works with local seed data until Supabase environment variables are added.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## MVP Scope

- Select an exam centre
- Show centre and nearby POIs on a map
- Filter nearby places by student-focused categories
- Display distance, walking time, driving time, and verification status
- Fall back to seed data when Supabase is not configured

## Next Needed Pieces

- Admin CRUD screens for centres and POIs
- Supabase Auth and role-based admin access
- Routing API integration for live route lines and travel time
- Suggest-place and report-wrong-info forms
- Production tile provider instead of direct public OSM tiles
