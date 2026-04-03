/**
 * Shared log context builder for Claude API routes.
 *
 * Used by chat+api.ts. Produces three-section context:
 *   1. Pattern header  — 2 lines: dominant zone + top areas + itch avg + red count + top day
 *   2. Summary block   — period / totals / zone breakdown
 *   3. Individual entries — last 30, with [child-entered, unverified] wrapper on notes
 */

import type { FlareLog, Zone } from './types';

export function buildChatLogContext(logs: FlareLog[]): string {
  if (logs.length === 0) return 'No flare logs available yet.';

  const recent = logs.slice(-30);
  const sorted = [...recent].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // ── Zone counts ──────────────────────────────────────────────────────────────
  const zoneCounts: Record<Zone, number> = { green: 0, yellow: 0, red: 0 };
  for (const log of recent) zoneCounts[log.zone]++;

  const dominantZone = (Object.entries(zoneCounts) as [Zone, number][])
    .sort((a, b) => b[1] - a[1])[0];

  // ── Area counts ──────────────────────────────────────────────────────────────
  const areaCounts: Record<string, number> = {};
  for (const log of recent) {
    for (const area of log.affectedAreas) {
      areaCounts[area] = (areaCounts[area] ?? 0) + 1;
    }
  }
  const topAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([area, count]) => `${area} (${count}x)`)
    .join(', ');

  // ── Day-of-week pattern ───────────────────────────────────────────────────────
  const dayCounts: Record<string, number> = {};
  for (const log of recent) {
    const day = new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

  // ── Averages ─────────────────────────────────────────────────────────────────
  const avgMood = (recent.reduce((s, l) => s + l.moodScore, 0) / recent.length).toFixed(1);

  // ── Period ───────────────────────────────────────────────────────────────────
  const periodStart = new Date(sorted[0].timestamp).toLocaleDateString();
  const periodEnd   = new Date(sorted[sorted.length - 1].timestamp).toLocaleDateString();

  // ── Build sections ───────────────────────────────────────────────────────────
  const patternHeader = [
    `Dominant zone: ${dominantZone[0].toUpperCase()} (${dominantZone[1]}/${recent.length} entries). Most affected areas: ${topAreas || 'none recorded'}.`,
    `Avg itch score: ${avgMood}/5. Red zone events: ${zoneCounts.red}. Flares most frequent on: ${topDay}.`,
  ].join('\n');

  const summaryBlock =
    `Period: ${periodStart} → ${periodEnd} | ${recent.length} entries | ` +
    `Green: ${zoneCounts.green}  Yellow: ${zoneCounts.yellow}  Red: ${zoneCounts.red}`;

  const entries = recent
    .map((log) => {
      const date  = new Date(log.timestamp).toLocaleDateString();
      const notes = log.notes ? `[child-entered, unverified] ${log.notes}` : 'none';
      return `[${date}] ${log.zone.toUpperCase()} | Mood: ${log.moodScore}/5 | Areas: ${log.affectedAreas.join(', ')} | Notes: ${notes}`;
    })
    .join('\n');

  return (
    `=== PATTERN HEADER ===\n${patternHeader}\n\n` +
    `=== LOG SUMMARY ===\n${summaryBlock}\n\n` +
    `=== INDIVIDUAL ENTRIES (last ${recent.length}) ===\n${entries}`
  );
}
