/**
 * POST /api/chat
 * Parent chat grounded in flare log data. Never diagnoses or prescribes.
 * Uses Claude Opus 4.6.
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildChatLogContext } from '@/lib/logContext';
import { CHAT_SYSTEM } from '@/lib/prompts';
import type { ChatRequest, ChatResponse } from '@/lib/types';

export async function POST(request: Request): Promise<Response> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages, recentLogs, profile } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages array is required and must not be empty' }, { status: 400 });
  }

  try {
    const logContext = buildChatLogContext(recentLogs ?? []);
    const systemWithContext = `${CHAT_SYSTEM}\n\n---\nCHILD PROFILE:\nName: ${profile.name}, Age: ${profile.age}, Diagnosis: ${profile.diagnosis}\nMedications: ${profile.medications.map((m) => m.name).join(', ')}\nKnown triggers: ${profile.triggers.join(', ') || 'none'}\n\n${logContext}`;

    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemWithContext,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const finalMessage = await stream.finalMessage();
    const textBlock = finalMessage.content.find((b) => b.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text : '';

    const response: ChatResponse = { message: text };
    return Response.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `Anthropic API error: ${err.message}` }, { status: err.status ?? 500 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
