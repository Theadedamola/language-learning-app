/**
 * Measures real-time audio volume (RMS energy) using Web Audio API
 * to animate the liquid glass orb.
 */
export class AudioEnergyMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationFrameId: number | null = null;
  private onLevelUpdate: (level: number) => void;
  private smoothedLevel = 0;

  constructor(onLevelUpdate: (level: number) => void) {
    this.onLevelUpdate = onLevelUpdate;
  }

  async start(stream: MediaStream) {
    this.stop();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      const update = () => {
        if (!this.analyser || !this.dataArray) return;
        this.analyser.getByteFrequencyData(this.dataArray);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        const normalized = Math.min(1, average / 128);

        // Exponential moving average smoothing like Mural:
        this.smoothedLevel = this.smoothedLevel * 0.35 + normalized * 0.65;
        this.onLevelUpdate(this.smoothedLevel);

        this.animationFrameId = requestAnimationFrame(update);
      };

      update();
    } catch (e) {
      console.warn('Could not initialize audio meter:', e);
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.smoothedLevel = 0;
    this.onLevelUpdate(0);
  }
}
