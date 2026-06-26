import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, LanguageModel, convertToModelMessages } from 'ai';

export const runtime = 'edge';
export const maxDuration = 30;

// Simple in-memory rate limiter for Edge isolates with pruning and cap (DoS protection)
const rateLimitMap = new Map<string, number[]>();
const LIMIT = 60; // 60 requests per minute
const WINDOW = 60 * 1000; // 1 minute

function sanitizeSecrets(str: string): string {
  if (!str) return '';
  // Mask OpenAI/Anthropic/Google keys
  let sanitized = str
    .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***')
    .replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, 'sk-ant-***')
    .replace(/AIza[a-zA-Z0-9_-]{30,}/g, 'AIza***');
  
  // Filter out sensitive keywords in key-value contexts (Rule 4)
  const sensitivePatterns = [
    /(key|token|secret|authorization|password|cookie)([\s:=]+)(["']?)[a-zA-Z0-9_\-.*]{4,}(["']?)/gi
  ];
  
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '$1$2$3***$4');
  }
  
  return sanitized;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider immediately (Rule 2)
  if (!['openai', 'anthropic', 'google'].includes(provider)) {
    return new Response(JSON.stringify({ error: 'Unsupported provider' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Rate limiting check with secure IP resolution and memory leak protection (Rule 5 / Threat Detection)
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for') || 'anonymous';
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const activeTimestamps = timestamps.filter(t => now - t < WINDOW);
  
  // Memory protection under high-load/DoS
  if (rateLimitMap.size > 5000) {
    for (const [key, value] of rateLimitMap.entries()) {
      const active = value.filter(t => now - t < WINDOW);
      if (active.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, active);
      }
    }
    if (rateLimitMap.size > 5000 && !rateLimitMap.has(ip)) {
      return new Response(JSON.stringify({ error: 'System busy. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (activeTimestamps.length >= LIMIT) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  activeTimestamps.push(now);
  rateLimitMap.set(ip, activeTimestamps);

  let body;
  try {
    // Limit payload size to 1MB to prevent memory exhaustion/DoS (Rule 2)
    const bodyText = await req.text();
    if (bodyText.length > 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    body = JSON.parse(bodyText);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { messages, modelId, apiKey, systemPrompt, temperature, maxTokens } = body;

  console.log(`[Chat API] Request received for provider: ${provider}, model: ${modelId}`);

  // Schema and boundary input validation (Rule 2 / AppSec)
  if (!modelId || typeof modelId !== 'string') {
    return new Response(JSON.stringify({ error: 'Model ID is required and must be a string' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return new Response(JSON.stringify({ error: 'API Key is required and must be a string' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Messages must be a valid array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate elements of messages array (Rule 2 / Penetration Testing)
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      return new Response(JSON.stringify({ error: 'Each message must be an object' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (typeof msg.role !== 'string' || !['user', 'assistant', 'system', 'tool'].includes(msg.role)) {
      return new Response(JSON.stringify({ error: 'Message role must be user, assistant, system, or tool' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (typeof msg.content !== 'string') {
      return new Response(JSON.stringify({ error: 'Message content must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (systemPrompt !== undefined && typeof systemPrompt !== 'string') {
    return new Response(JSON.stringify({ error: 'systemPrompt must be a string' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
    return new Response(JSON.stringify({ error: 'Temperature must be a number between 0 and 2' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 16384)) {
    return new Response(JSON.stringify({ error: 'maxTokens must be a positive integer within allowed limits' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let model;

  try {
    switch (provider) {
      case 'openai':
        model = createOpenAI({ apiKey })(modelId);
        break;
      case 'anthropic':
        model = createAnthropic({ apiKey })(modelId);
        break;
      case 'google':
        model = createGoogleGenerativeAI({ apiKey })(modelId);
        break;
      default:
        // Already validated above, but keep as fallback
        return new Response(JSON.stringify({ error: 'Unsupported provider' }), { status: 400 });
    }

    console.log(`[Chat API] Initializing stream for ${modelId}...`);
    const result = streamText({
      model: model as LanguageModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      temperature: temperature !== undefined ? Number(temperature) : undefined,
      maxOutputTokens: maxTokens !== undefined ? Number(maxTokens) : undefined,
    });

    const response = result.toUIMessageStreamResponse();
    console.log(`[Chat API] Stream initialized for ${modelId}, returning response.`);
    return response;
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : 'Internal Server Error';
    const sanitizedErrorMsg = sanitizeSecrets(rawMessage);
    // Secure server-side logging (Rule 4/6)
    console.error(`[Chat API] Error in ${provider} route: ${sanitizedErrorMsg}`);

    // Return generic, safe error message to client in production (Rule 6)
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing your request.'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
