import { NextRequest, NextResponse } from 'next/server';
import { TeachingPolicy } from '@/core/teaching/policy';
import { callLLM } from '@/core/llmClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { context, groqKey, geminiKey, openaiKey } = body;

    const activeGroqKey = groqKey || process.env.GROQ_API_KEY;
    const activeGeminiKey = geminiKey || process.env.GEMINI_API_KEY;
    const activeOpenaiKey = openaiKey || process.env.OPENAI_API_KEY;

    if (!activeGroqKey && !activeGeminiKey && !activeOpenaiKey) {
      return NextResponse.json({
        outcome: 'uncertain',
        suggestedLevel: 0,
        nextGoal: 'Configure an API key to evaluate your progress.',
        capability: '',
        words: [],
      });
    }

    const systemPrompt = `${TeachingPolicy.assessment()}\n\nYou MUST respond with valid JSON matching this structure:
{
  "outcome": "success" | "partial" | "breakdown" | "uncertain",
  "suggestedLevel": 0-5,
  "nextGoal": "compact action in Spanish",
  "capability": "can-do statement in English or empty",
  "words": [
    // Include 2 to 4 key observed words from the user's speech
    {
      "lemma": "noun with article or verb infinitive",
      "meaning": "English sense",
      "form": "exact observed form",
      "quote": "exact substring from passage",
      "language": "es",
      "kind": "independent" | "assisted" | "understanding" | "exposure" | "lapse",
      "confidence": 0.8-1.0,
      "sourceIDs": ["fragment_id"]
    }
  ]
}`;

    let response;
    try {
      response = await callLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
        groqKey,
        geminiKey,
        openaiKey,
        temperature: 0.1,
        maxTokens: 1200,
        responseFormatJson: true,
      });
    } catch (llmErr: unknown) {
      const msg = llmErr instanceof Error ? llmErr.message : String(llmErr);
      // If strict JSON validation failed (e.g. Groq 400 json_validate_failed), retry without responseFormatJson
      if (msg.includes('json_validate_failed') || msg.includes('Failed to generate JSON') || msg.includes('400')) {
        console.warn('[Assessment] Retrying without strict json_object format...');
        response = await callLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context },
          ],
          groqKey,
          geminiKey,
          openaiKey,
          temperature: 0.1,
          maxTokens: 1200,
          responseFormatJson: false,
        });
      } else {
        throw llmErr;
      }
    }

    let parsed = {
      outcome: 'uncertain',
      suggestedLevel: 1,
      nextGoal: 'Continúa practicando.',
      capability: '',
      words: [],
    };

    try {
      let raw = (response.text || '').trim();
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      const first = raw.indexOf('{');
      const last = raw.lastIndexOf('}');
      if (first !== -1 && last > first) {
        parsed = JSON.parse(raw.slice(first, last + 1));
      } else {
        parsed = JSON.parse(raw);
      }
    } catch (parseErr) {
      console.warn('[Assessment] JSON parse warning, using fallback:', parseErr);
    }

    return NextResponse.json({
      assessment: parsed,
      usage: {
        input: response.usage?.input_tokens ?? 0,
        output: response.usage?.output_tokens ?? 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[Assessment] Error:', message);
    // Return graceful fallback assessment rather than crashing client with 500
    return NextResponse.json({
      assessment: {
        outcome: 'uncertain',
        suggestedLevel: 1,
        nextGoal: 'Continúa hablando en español.',
        capability: '',
        words: [],
      },
      warning: message,
    });
  }
}
