/**
 * POST /api/generate-plan
 * Generates a 3-zone Written Action Plan using Claude Opus 4.6.
 * Runs server-side so ANTHROPIC_API_KEY never reaches the client bundle.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GENERATE_PLAN_SYSTEM, GENERATE_PLAN_USER_TEMPLATE } from '@/lib/prompts';
import type { ActionPlan, GeneratePlanRequest, GeneratePlanResponse } from '@/lib/types';

export async function POST(request: Request): Promise<Response> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let body: GeneratePlanRequest;

  try {
    body = (await request.json()) as GeneratePlanRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { profile, temperature, humidity } = body;

  if (!profile || typeof temperature !== 'number' || typeof humidity !== 'number') {
    return Response.json({ error: 'Missing required fields: profile, temperature, humidity' }, { status: 400 });
  }

  try {
    const userMessage = GENERATE_PLAN_USER_TEMPLATE({
      childName: profile.name,
      age: profile.age,
      diagnosis: profile.diagnosis,
      medications: profile.medications,
      triggers: profile.triggers,
      affectedAreas: profile.affectedAreas,
      temperature,
      humidity,
      location: profile.location,
    });

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: GENERATE_PLAN_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'No text response from Claude' }, { status: 500 });
    }

    const raw = textBlock.text.trim();
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'Claude returned invalid JSON', raw }, { status: 500 });
    }

    const zones = parsed as { green: ActionPlan['green']; yellow: ActionPlan['yellow']; red: ActionPlan['red'] };

    const plan: ActionPlan = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      green: zones.green,
      yellow: zones.yellow,
      red: zones.red,
      raw,
    };

    const response: GeneratePlanResponse = { plan };
    return Response.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `Anthropic API error: ${err.message}` }, { status: err.status ?? 500 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
