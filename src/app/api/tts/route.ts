import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'aura-2-diana-es', deepgramKey } = body;

    const token = deepgramKey || process.env.DEEPGRAM_API_KEY;
    if (!token) {
      return NextResponse.json(
        { error: 'Deepgram API key not provided.' },
        { status: 400 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }

    // Call Deepgram Aura TTS
    const res = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voice)}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Deepgram TTS error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    // Return the audio stream
    const audioData = await res.arrayBuffer();
    return new Response(audioData, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal TTS error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
