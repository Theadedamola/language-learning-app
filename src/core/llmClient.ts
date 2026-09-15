export interface LLMRequestOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  provider?: 'free' | 'deepgram' | 'openai';
  groqKey?: string;
  geminiKey?: string;
  openaiKey?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
}

export interface LLMResponse {
  text: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

const GROQ_CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
];

const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

export async function callLLM(options: LLMRequestOptions): Promise<LLMResponse> {
  const {
    messages,
    provider = 'free',
    groqKey,
    geminiKey,
    openaiKey,
    temperature = 0.7,
    maxTokens = 200,
    responseFormatJson = false,
  } = options;

  const activeGroqKey = groqKey || process.env.GROQ_API_KEY;
  const activeGeminiKey = geminiKey || process.env.GEMINI_API_KEY;
  const activeOpenaiKey = openaiKey || process.env.OPENAI_API_KEY;

  if (provider === 'openai' && activeOpenaiKey) {
    return callEndpoint(
      'https://api.openai.com/v1/chat/completions',
      activeOpenaiKey,
      'gpt-4o-mini',
      messages,
      temperature,
      maxTokens,
      responseFormatJson
    );
  }

  if (activeGroqKey) {
    return callWithModelFallback(
      'https://api.groq.com/openai/v1/chat/completions',
      activeGroqKey,
      GROQ_CANDIDATE_MODELS,
      messages,
      temperature,
      maxTokens,
      responseFormatJson
    );
  }

  if (activeGeminiKey) {
    return callWithModelFallback(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      activeGeminiKey,
      GEMINI_CANDIDATE_MODELS,
      messages,
      temperature,
      maxTokens,
      responseFormatJson
    );
  }

  if (activeOpenaiKey) {
    return callEndpoint(
      'https://api.openai.com/v1/chat/completions',
      activeOpenaiKey,
      'gpt-4o-mini',
      messages,
      temperature,
      maxTokens,
      responseFormatJson
    );
  }

  throw new Error('No API key provided. Please configure a Groq, Gemini, or OpenAI API key in Settings.');
}

async function callWithModelFallback(
  endpoint: string,
  token: string,
  candidateModels: string[],
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number,
  responseFormatJson: boolean
): Promise<LLMResponse> {
  let lastError = '';

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      return await callEndpoint(
        endpoint,
        token,
        model,
        messages,
        temperature,
        maxTokens,
        responseFormatJson
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;

      // Check if the error indicates a missing or deprecated model (404 / model_not_found)
      const isModelNotFound =
        msg.includes('404') ||
        msg.includes('model_not_found') ||
        msg.includes('does not exist') ||
        msg.includes('not available') ||
        msg.includes('NOT_FOUND');

      if (!isModelNotFound || i === candidateModels.length - 1) {
        // If it's another error (e.g. invalid API key or rate limit) or no more models to try, rethrow
        throw err;
      }
      // Continue to next fallback model
    }
  }

  throw new Error(lastError || 'All fallback models failed.');
}

async function callEndpoint(
  endpoint: string,
  token: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number,
  responseFormatJson: boolean
): Promise<LLMResponse> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Provider error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';

  return {
    text,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
  };
}
