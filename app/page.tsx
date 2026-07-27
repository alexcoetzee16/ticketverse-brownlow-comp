import { supabase } from "@/lib/supabase";

export const revalidate = 30; // static-ish, refreshes every 30s during the draft itself

interface DraftBoardRow {
  pick_number: number;
  round: number;
  draft_position: number;
  entrant_name: string;
  player_name: string;
  team: string;
  multiplier: number;
}

export default async function HomePage() {
  const { data: entrants } = await supabase
    .from("entrants")
    .select("id, name, draft_position")
    .order("draft_position", { ascending: true });

  const { data: picks } = await supabase
    .from("draft_board")
    .select("*")
    .returns<DraftBoardRow[]>();

  const { data: config } = await supabase.from("draft_config").select("*").eq("id", 1).single();

  if (!entrants || entrants.length === 0) {
    return (
      <div className="text-center py-24">
        <h1 className="font-display text-4xl text-tv-gold mb-2">DRAFT BOARD</h1>
        <p className="text-tv-muted">
          Entrants haven&apos;t been loaded yet — check back once the draft order is set.
        </p>
      </div>
    );
  }

  const totalRounds = config?.total_rounds ?? 10;
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);
  const multipliers = config?.round_multipliers ?? {};

  // Build a lookup: [draft_position][round] -> pick
  const grid: Record<number, Record<number, DraftBoardRow>> = {};
  (picks ?? []).forEach((p) => {
    grid[p.draft_position] ??= {};
    grid[p.draft_position][p.round] = p;
  });

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-4xl text-tv-gold tracking-wide">DRAFT BOARD</h1>
        <span className="text-sm uppercase tracking-wider text-tv-muted">
          Status: <span className="text-tv-purpleLight">{config?.draft_status ?? "not started"}</span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-tv-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-tv-surface2">
              <th className="sticky left-0 bg-tv-surface2 px-3 py-2 text-left font-semibold z-10">
                Entrant
              </th>
              {rounds.map((r) => (
                <th key={r} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Round {r}{" "}
                  <span className="text-tv-gold font-mono text-xs">x{multipliers[String(r)] ?? 1}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entrants.map((e, idx) => (
              <tr key={e.id} className={idx % 2 === 0 ? "bg-tv-surface" : "bg-tv-surface/60"}>
                <td className="sticky left-0 bg-inherit px-3 py-2 font-semibold whitespace-nowrap">
                  <span className="pick-chip mr-2">{e.draft_position}</span>
                  {e.name}
                </td>
                {rounds.map((r) => {
                  const cell = grid[e.draft_position]?.[r];
                  return (
                    <td key={r} className="px-3 py-2 whitespace-nowrap">
                      {cell ? (
                        <div>
                          <div className="font-medium">{cell.player_name}</div>
                          <div className="text-xs text-tv-muted">{cell.team}</div>
                        </div>
                      ) : (
                        <span className="text-tv-muted/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
