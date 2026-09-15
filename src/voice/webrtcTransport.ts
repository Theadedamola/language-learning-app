import { Fragment } from '../core/types/models';
import { AudioEnergyMeter } from './audioEnergy';
import { TransportCallbacks } from './webSpeechTransport';

export class WebRTCTransport {
  private callbacks: TransportCallbacks;
  private peer: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private inputMeter: AudioEnergyMeter | null = null;
  private isMuted = false;
  private sessionStartTime = 0;
  private inputLevel = 0;
  private outputLevel = 0;

  constructor(callbacks: TransportCallbacks) {
    this.callbacks = callbacks;
  }

  async start(systemPrompt: string, openaiKey: string) {
    this.sessionStartTime = Date.now();
    this.callbacks.onStateChange('connecting');

    try {
      // 1. Get ephemeral session token from local Next.js route
      const tokenRes = await fetch('/api/realtime-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiKey, instructions: systemPrompt }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json();
        throw new Error(err.error || 'Failed to mint OpenAI Realtime session');
      }

      const sessionData = await tokenRes.json();
      const ephemeralKey = sessionData.client_secret?.value;

      // 2. Request microphone
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      this.inputMeter = new AudioEnergyMeter((level) => {
        this.inputLevel = this.isMuted ? 0 : level;
        this.callbacks.onEnergy(this.inputLevel, this.outputLevel);
      });
      await this.inputMeter.start(this.micStream);

      // 3. Create WebRTC Peer Connection
      const pc = new RTCPeerConnection();
      this.peer = pc;

      // Remote audio output element
      this.remoteAudio = document.createElement('audio');
      this.remoteAudio.autoplay = true;

      pc.ontrack = (event) => {
        if (this.remoteAudio && event.streams[0]) {
          this.remoteAudio.srcObject = event.streams[0];
        }
      };

      // Add local audio track
      const audioTrack = this.micStream.getAudioTracks()[0];
      pc.addTrack(audioTrack, this.micStream);

      // Set up data channel
      const dc = pc.createDataChannel('oai-events');
      this.dataChannel = dc;

      dc.onopen = () => {
        this.callbacks.onStateChange('active');
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          this.handleEvent(event);
        } catch {
          // Ignore parse errors
        }
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP offer to OpenAI Realtime endpoint
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`WebRTC negotiation failed: ${sdpResponse.statusText}`);
      }

      const answerSdp = await sdpResponse.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      };
      await pc.setRemoteDescription(answer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar WebRTC';
      this.callbacks.onError(msg);
      this.callbacks.onStateChange('failed');
      this.stop();
    }
  }

  private handleEvent(event: { type?: string; delta?: string; transcript?: string }) {
    const offset = Date.now() - this.sessionStartTime;

    if (event.type === 'response.audio_transcript.delta' && event.delta) {
      const fragment: Fragment = {
        id: `assistant_${Date.now()}`,
        revision: 0,
        previousTexts: [],
        speaker: 'assistant',
        text: event.delta,
        startMS: offset,
        endMS: offset + 100,
        receivedAt: new Date().toISOString(),
        meaningVisible: true,
        typed: false,
      };
      this.callbacks.onFragment(fragment);
    } else if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
      const fragment: Fragment = {
        id: `user_${Date.now()}`,
        revision: 0,
        previousTexts: [],
        speaker: 'user',
        text: event.transcript,
        startMS: Math.max(0, offset - 2000),
        endMS: offset,
        receivedAt: new Date().toISOString(),
        meaningVisible: true,
        typed: false,
      };
      this.callbacks.onFragment(fragment);
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  sendTyped(text: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    };
    this.dataChannel.send(JSON.stringify(event));
    this.dataChannel.send(JSON.stringify({ type: 'response.create' }));
  }

  stop() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.inputMeter) {
      this.inputMeter.stop();
      this.inputMeter = null;
    }
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      this.remoteAudio = null;
    }
    this.callbacks.onStateChange('ended');
  }
}
