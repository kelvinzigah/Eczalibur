/**
 * POST /api/appointment-summary
 * Generates a clinical pre-appointment summary for the dermatologist.
 * Uses Claude Opus 4.6.
 */

import Anthropic from '@anthropic-ai/sdk';
import { APPOINTMENT_SUMMARY_SYSTEM, APPOINTMENT_SUMMARY_USER_TEMPLATE } from '@/lib/prompts';
import type { AppointmentSummaryRequest, AppointmentSummaryResponse, FlareLog } from '@/lib/types';

function computeLogSummary(logs: FlareLog[], appointmentDate: string) {
  if (logs.length === 0) {
    return {
      periodStart: 'N/A',
      periodEnd: 'N/A',
      totalLogs: 0,
      greenCount: 0,
      yellowCount: 0,
      redCount: 0,
      averageMoodScore: 0,
      recentZone: 'unknown',
      notableEvents: [],
    };
  }

  const sorted = [...logs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const greenCount = logs.filter((l) => l.zone === 'green').length;
  const yellowCount = logs.filter((l) => l.zone === 'yellow').length;
  const redCount = logs.filter((l) => l.zone === 'red').length;
  const avgMood = logs.reduce((sum, l) => sum + l.moodScore, 0) / logs.length;

  const notableEvents: string[] = [];

  // Flag red zone events
  logs
    .filter((l) => l.zone === 'red')
    .forEach((l) => {
      const date = new Date(l.timestamp).toLocaleDateString();
      notableEvents.push(`RED zone event on ${date} — areas: ${l.affectedAreas.join(', ')}. Mood: ${l.moodScore}/5.${l.notes ? ` Notes: ${l.notes}` : ''}`);
    });

  // Flag high itch scores
  logs
    .filter((l) => l.moodScore >= 4 && l.zone !== 'red')
    .slice(0, 3)
    .forEach((l) => {
      const date = new Date(l.timestamp).toLocaleDateString();
      notableEvents.push(`High itch score (${l.moodScore}/5) on ${date} — ${l.zone} zone.`);
    });

  return {
    periodStart: new Date(sorted[0].timestamp).toLocaleDateString(),
    periodEnd: new Date(sorted[sorted.length - 1].timestamp).toLocaleDateString(),
    totalLogs: logs.length,
    greenCount,
    yellowCount,
    redCount,
    averageMoodScore: avgMood,
    recentZone: sorted[sorted.length - 1].zone,
    notableEvents: notableEvents.slice(0, 6),
  };
}

export async function POST(request: Request): Promise<Response> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let body: AppointmentSummaryRequest;

  try {
    body = (await request.json()) as AppointmentSummaryRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { profile, logs, appointmentDate } = body;

  if (!profile || !appointmentDate) {
    return Response.json({ error: 'Missing required fields: profile, appointmentDate' }, { status: 400 });
  }

  try {
    const logSummary = computeLogSummary(logs ?? [], appointmentDate);

    const userMessage = APPOINTMENT_SUMMARY_USER_TEMPLATE({
      childName: profile.name,
      age: profile.age,
      diagnosis: profile.diagnosis,
      medications: profile.medications,
      affectedAreas: profile.affectedAreas,
      triggers: profile.triggers,
      appointmentDate,
      logSummary,
    });

    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: APPOINTMENT_SUMMARY_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });

    const finalMessage = await stream.finalMessage();
    const textBlock = finalMessage.content.find((b) => b.type === 'text');
    const summary = textBlock?.type === 'text' ? textBlock.text : '';

    const response: AppointmentSummaryResponse = { summary };
    return Response.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `Anthropic API error: ${err.message}` }, { status: err.status ?? 500 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
