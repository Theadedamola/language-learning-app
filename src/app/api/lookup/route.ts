import { NextRequest, NextResponse } from 'next/server';
import { TeachingPolicy } from '@/core/teaching/policy';
import { callLLM } from '@/core/llmClient';

export async function POST(req: NextRequest) {
  let word = '';
  try {
    const body = await req.json();
    word = body.word || '';
    const { sentence, meaningLanguage = 'English', groqKey, geminiKey, openaiKey } = body;

    const token =
      groqKey ||
      process.env.GROQ_API_KEY ||
      geminiKey ||
      process.env.GEMINI_API_KEY ||
      openaiKey ||
      process.env.OPENAI_API_KEY;

    if (!token) {
      return NextResponse.json({
        gloss: `"${word}" en esta frase. (Configura una clave API en Ajustes para ver explicaciones detalladas).`,
      });
    }

    const response = await callLLM({
      messages: [
        { role: 'system', content: TeachingPolicy.lookup(meaningLanguage) },
        { role: 'user', content: `Word: ${word}\nSentence: ${sentence}` },
      ],
      groqKey,
      geminiKey,
      openaiKey,
      temperature: 0.2,
      maxTokens: 150,
    });

    return NextResponse.json({ gloss: response.text.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ gloss: `Definición no disponible para "${word}".` });
  }
}
