export interface SpeechRecognitionCallbacks {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (isListening: boolean) => void;
  onAudioLevel?: (level: number) => void;
}

export class SpeechService {
  private recognition: any = null;
  private isListening: boolean = false;
  private shouldKeepListening: boolean = false;
  private language: string = 'zh-TW';
  private callbacks: SpeechRecognitionCallbacks = {};
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript.trim() && this.callbacks.onInterimResult) {
          this.callbacks.onInterimResult(interimTranscript);
        }

        if (finalTranscript.trim() && this.callbacks.onFinalResult) {
          this.callbacks.onFinalResult(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Ignore no-speech, keep running
          return;
        }
        if (this.callbacks.onError) {
          this.callbacks.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        // Auto restart if teacher hasn't explicitly clicked Stop/Pause
        if (this.shouldKeepListening) {
          try {
            this.recognition.start();
          } catch (e) {
            // Wait and retry
            setTimeout(() => {
              if (this.shouldKeepListening) {
                try {
                  this.recognition.start();
                } catch {
                  // ignored
                }
              }
            }, 300);
          }
        } else {
          this.isListening = false;
          if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange(false);
          }
        }
      };
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
    }
  }

  public isSupported(): boolean {
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  public setLanguage(lang: string) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public async start(callbacks: SpeechRecognitionCallbacks) {
    this.callbacks = callbacks;
    this.shouldKeepListening = true;

    // Start Audio Level Analyser for Visualizer
    await this.startAudioAnalyser();

    if (!this.recognition) {
      this.initRecognition();
    }

    if (this.recognition) {
      try {
        this.recognition.lang = this.language;
        this.recognition.start();
        this.isListening = true;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange(true);
        }
      } catch (e: any) {
        if (e.name === 'InvalidStateError') {
          // already started
          this.isListening = true;
          if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange(true);
          }
        } else {
          console.error('Failed to start speech recognition:', e);
          if (this.callbacks.onError) {
            this.callbacks.onError(e.message || '麥克風語音辨識啟動失敗');
          }
        }
      }
    } else {
      if (this.callbacks.onError) {
        this.callbacks.onError('瀏覽器不支援 Web Speech API，可改用手動輸入或上傳音檔。');
      }
    }
  }

  public stop() {
    this.shouldKeepListening = false;
    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignored
      }
    }

    this.stopAudioAnalyser();

    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(false);
    }
  }

  private async startAudioAnalyser() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const updateLevel = () => {
          if (!this.shouldKeepListening || !this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));

          if (this.callbacks.onAudioLevel) {
            this.callbacks.onAudioLevel(normalizedLevel);
          }

          this.animationFrameId = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      }
    } catch (err) {
      console.warn('AudioAnalyser getUserMedia not permitted or failed:', err);
    }
  }

  private stopAudioAnalyser() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }
}

export const speechService = new SpeechService();
