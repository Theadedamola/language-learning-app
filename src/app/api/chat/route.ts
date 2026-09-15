import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/core/llmClient';

interface ChatRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  provider?: 'free' | 'deepgram' | 'openai';
  apiKey?: string;
  groqKey?: string;
  geminiKey?: string;
  openaiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;
    const { messages, provider = 'free', temperature = 0.7, maxTokens = 400 } = body;

    const groqKey = body.groqKey || process.env.GROQ_API_KEY;
    const geminiKey = body.geminiKey || process.env.GEMINI_API_KEY;
    const openaiKey = body.openaiKey || process.env.OPENAI_API_KEY;

    if (!groqKey && !geminiKey && !openaiKey) {
      return NextResponse.json({
        text: 'Hello! Welcome to Sóró. Please add your free Groq or Gemini API key in Settings to enable full conversation.',
        usage: { input_tokens: 0, output_tokens: 0 },
      });
    }

    const response = await callLLM({
      messages,
      provider,
      groqKey,
      geminiKey,
      openaiKey,
      temperature,
      maxTokens,
    });

    return NextResponse.json({
      text: response.text,
      usage: response.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
