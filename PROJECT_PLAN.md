# Ticketverse AFL Brownlow Draft Comp — Build Plan

Stack: Next.js 14, Supabase, Vercel, Cloudflare (matches Major Golf Picks / Punt Club).

## Snake draft logic (confirmed)
- N entrants, R rounds (e.g. 12 entrants x 10 rounds = 120 total picks).
- Round order alternates: Round 1 = position 1→N, Round 2 = N→1, Round 3 = 1→N, etc.
- `pick_number` (global 1..N*R) is the source of truth for "whose turn is it" —
  derived as: odd rounds go position ascending, even rounds descending.
- A player can only ever be picked once (enforced by `unique` on `afl_player_id` in `picks`).
- One pick per entrant per round (enforced by `unique(entrant_id, round)`).
- Multiplier baked onto the pick row at pick-time from `draft_config.round_multipliers`,
  so changing the config later never rewrites history.

## Screens
1. **Draft board / picks screen** (`/draft`)
   - Shows whose turn it is (name + round + pick number).
   - PIN entry gate: only the entrant whose turn it is can submit — PIN checked server-side
     against `entrants.pin`, matched to the current `entrant_id` for this pick slot.
   - Player selector: searchable dropdown, all `afl_players` where `active = true`,
     already-picked players shown greyed out / disabled (join against `picks`).
   - Confirms pick, advances `draft_config.current_round` / `current_pick_in_round`.

2. **Home / live draft table** (`/`)
   - Static grid: rows = draft position 1..N, columns = round 1..10 (same shape as your
     Excel screenshot). Pulls from `draft_board` view. Public, no PIN needed to view.

3. **Live ladder** (`/ladder`)
   - Pulls from `entrant_totals` view, sorted descending.
   - Banner: "Updated through {live_count_state.updated_through_round}" +
     live/not-live indicator.

4. **Admin vote entry** (`/admin`, PIN-gated to you)
   - Pick a game → pick 3 players from that game's rosters → assign 3/2/1.
   - Writes to `brownlow_games` + `brownlow_votes`, updates `live_count_state`.
   - Built for speed: keyboard-first, big touch targets, so you can keep pace with the
     broadcast reading out votes game by game.

## Data sources
- **AFL player master list**: sync from ESPN AFL endpoint (same pattern as your golf
  ESPN sync) — team, name, id. Filtered to players with ≥1 game this season.
- **Brownlow votes**: NOT available via any API — entered live by admin (see above),
  since the AFL keeps them secret until the count night broadcast.

## Theme
- Ticketverse purple base (matching Punt Club) + AFL accent: team-colour flags/badges
  next to player names in the picks table and player selector.

## Build order (proposed)
1. Supabase schema (done — `schema.sql`) + seed `entrants` with your 12 names + draft order.
2. AFL player sync script (ESPN) → populate `afl_players`.
3. Draft board + PIN pick screen (this is the core mechanic — build & test first).
4. Home static table + live ladder views.
5. Admin vote-entry screen for count night.
6. Theme pass (purple/AFL styling).

## Open questions for you
- Do you have the 12 entrant names + confirmed draft order (pick 1–12) yet, or should the
  app include a "random draw" tool to generate that order live in front of everyone?
- Round 2–3 in your screenshot are 1x — confirmed same as Round 1, and only Round 1 itself
  is "1x" per your brief? (Screenshot suggests R1-3 = 1x, R4-7 = 2x, R8-10 = 3x — I've set
  the schema to that 3/4/3 split; flag if you meant something else.)
