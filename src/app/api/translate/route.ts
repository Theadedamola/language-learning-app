import { NextRequest, NextResponse } from 'next/server';
import { TeachingPolicy } from '@/core/teaching/policy';
import { callLLM } from '@/core/llmClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, meaningLanguage = 'English', groqKey, geminiKey, openaiKey } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ translation: '' });
    }

    const token =
      groqKey ||
      process.env.GROQ_API_KEY ||
      geminiKey ||
      process.env.GEMINI_API_KEY ||
      openaiKey ||
      process.env.OPENAI_API_KEY;

    if (!token) {
      return NextResponse.json({ translation: '' });
    }

    const response = await callLLM({
      messages: [
        { role: 'system', content: TeachingPolicy.translation(meaningLanguage) },
        { role: 'user', content: text },
      ],
      groqKey,
      geminiKey,
      openaiKey,
      temperature: 0.1,
      maxTokens: 120,
    });

    return NextResponse.json({ translation: response.text.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
