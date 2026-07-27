# Ticketverse Brownlow Draft Comp

Next.js 14 + Supabase + Vercel app for the work Brownlow Medal draft competition.

## Setup

1. **Supabase**: create a new project (or a new schema in an existing one), run `schema.sql`
   in the SQL editor.
2. **Env vars**: copy `.env.example` to `.env.local`, fill in your Supabase URL/keys and
   pick an `ADMIN_PIN` for count-night vote entry.
3. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```
4. **Seed entrants**: once you've got your 12 names + the random draw result, insert them into
   `entrants` — `draft_position` should match the draw order (1 = picks first):
   ```sql
   insert into entrants (name, pin, draft_position) values
     ('Alex', '1234', 1),
     ('Dave', '5678', 2);
     -- etc.
   ```
5. **Sync AFL players**: `npm run sync:players` (see the note in `scripts/syncPlayers.ts` —
   verify the ESPN endpoint shape first, since it hasn't been tested live).
6. **Load the fixture into `brownlow_games`** ahead of count night, so the admin screen has
   games to pick from:
   ```sql
   insert into brownlow_games (round_name, home_team, away_team, match_date) values
     ('Round 1', 'Collingwood', 'Carlton', '2026-03-12');
   ```

## Pages
- `/` — static draft board (public, no PIN)
- `/draft` — pick screen (PIN-gated to whoever's on the clock)
- `/ladder` — live ladder (public, updates as votes are entered)
- `/admin` — count-night vote entry (gated by `ADMIN_PIN`)

## Deploy
Same flow as your other apps: push to GitHub, import into Vercel, set the env vars there,
point Cloudflare DNS at it once you've picked a domain/subdomain.

## Not yet built (next steps)
- Seeding `entrants` (waiting on your list + draft order)
- Verifying/fixing the ESPN AFL sync endpoint shape
- Loading the full season fixture into `brownlow_games`
- Team badge/flag icons next to player names (need a logo source — happy to use ESPN's
  team logo URLs once the sync endpoint is confirmed)
