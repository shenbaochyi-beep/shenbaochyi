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

  // Real-audio recording backup (MediaRecorder)
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Real-time complete capture state
  private pendingInterimText: string = '';
  private silenceTimer: any = null;
  private restartTimer: any = null;
  private watchdogTimer: any = null;
  private lastEmittedText: string = '';
  private lastEmittedTime: number = 0;
  private isStarting: boolean = false;

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
      if (this.recognition) {
        try {
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          this.recognition.abort();
        } catch {
          // cleanup previous instance
        }
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        const finalSegments: string[] = [];

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item && item[0] ? item[0].transcript : '';
          if (item && item.isFinal) {
            if (transcript && transcript.trim()) {
              finalSegments.push(transcript.trim());
            }
          } else if (transcript) {
            interimTranscript += transcript;
          }
        }

        // 1. If engine produced final segments, emit them directly
        if (finalSegments.length > 0) {
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
          this.pendingInterimText = '';
          for (const seg of finalSegments) {
            this.emitFinalResult(seg);
          }
        }

        // 2. Process active live interim text
        const trimmedInterim = interimTranscript.trim();
        this.pendingInterimText = trimmedInterim;
        if (this.callbacks.onInterimResult) {
          this.callbacks.onInterimResult(trimmedInterim);
        }

        // 3. Smart Pause Finalizer: When speaker pauses for 1.2s, force-finalize the speech
        // Calling recognition.stop() gracefully tells Chrome to finalize pending audio,
        // trigger onend, and scheduleRestart() restarts with an empty clean buffer!
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        if (trimmedInterim) {
          this.silenceTimer = setTimeout(() => {
            if (this.pendingInterimText.trim() && this.recognition) {
              try {
                // Calling stop() instructs Chrome to commit buffered speech to final and fire onend
                this.recognition.stop();
              } catch {
                this.flushPendingInterim();
              }
            }
          }, 1200);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Normal pause or deliberate session transition; allow onend / watchdog to handle
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          if (this.callbacks.onError) {
            this.callbacks.onError('無法取得麥克風收音權限，請確認瀏覽器已允許使用麥克風。');
          }
          this.shouldKeepListening = false;
          this.isListening = false;
          return;
        }

        if (this.callbacks.onError) {
          this.callbacks.onError(`語音辨識提醒 (${event.error})，系統正自動維持收音連線...`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;

        // Ensure any pending speech is emitted so no dialogue is lost
        this.flushPendingInterim();

        // Auto restart if recording is still active
        if (this.shouldKeepListening) {
          this.scheduleRestart(100);
        } else {
          if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange(false);
          }
        }
      };
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
    }
  }

  // Resilient restart mechanism with debounced timer
  private scheduleRestart(delayMs: number = 100) {
    if (!this.shouldKeepListening) return;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.restartTimer = setTimeout(() => {
      if (!this.shouldKeepListening) return;
      this.safeStartRecognition();
    }, delayMs);
  }

  private safeStartRecognition() {
    if (!this.recognition || !this.shouldKeepListening) return;
    if (this.isStarting) return;

    this.isStarting = true;
    try {
      this.recognition.lang = this.language;
      this.recognition.start();
      this.isListening = true;
      this.isStarting = false;
      if (this.callbacks.onStatusChange) {
        this.callbacks.onStatusChange(true);
      }
    } catch (err: any) {
      this.isStarting = false;
      if (err.name === 'InvalidStateError') {
        // Recognition is already active or in start transition
        this.isListening = true;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange(true);
        }
      } else {
        // Reset recognition instance and retry
        console.warn('Recognition start failed, reinitializing instance:', err);
        this.initRecognition();
        setTimeout(() => {
          if (this.shouldKeepListening && this.recognition) {
            try {
              this.recognition.start();
              this.isListening = true;
              if (this.callbacks.onStatusChange) {
                this.callbacks.onStatusChange(true);
              }
            } catch {
              // Retry on next watchdog tick
            }
          }
        }, 200);
      }
    }
  }

  // Watchdog keep-alive loop: guarantees continuous listening while shouldKeepListening is true
  private startWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
    }
    this.watchdogTimer = setInterval(() => {
      if (this.shouldKeepListening && !this.isListening && !this.isStarting) {
        this.scheduleRestart(150);
      }
    }, 2500);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  // Flushes unfinalized interim speech so nothing is dropped
  public flushPendingInterim(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    const text = this.pendingInterimText.trim();
    if (text) {
      this.emitFinalResult(text);
      this.pendingInterimText = '';
      if (this.callbacks.onInterimResult) {
        this.callbacks.onInterimResult('');
      }
    }
  }

  // Smoothly restarts the recognition session with clean buffer (used on speaker switch)
  public restartSession(): void {
    this.flushPendingInterim();
    this.lastEmittedText = '';
    this.lastEmittedTime = 0;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignored
      }
    }
    if (this.shouldKeepListening) {
      this.scheduleRestart(80);
    }
  }

  private emitFinalResult(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Deduplication within 1.2 seconds to prevent double firing on flush + isFinal
    if (trimmed === this.lastEmittedText && Date.now() - this.lastEmittedTime < 1200) {
      return;
    }

    this.lastEmittedText = trimmed;
    this.lastEmittedTime = Date.now();

    if (this.callbacks.onFinalResult) {
      this.callbacks.onFinalResult(trimmed);
    }
    if (this.callbacks.onInterimResult) {
      this.callbacks.onInterimResult('');
    }
  }

  public isSupported(): boolean {
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition
    );
  }

  public setLanguage(lang: string) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public setCallbacks(callbacks: Partial<SpeechRecognitionCallbacks>) {
    this.callbacks = {
      ...this.callbacks,
      ...callbacks,
    };
  }

  public async start(callbacks: SpeechRecognitionCallbacks) {
    this.callbacks = callbacks;
    this.shouldKeepListening = true;
    this.pendingInterimText = '';
    this.lastEmittedText = '';
    this.lastEmittedTime = 0;

    // Start Audio Level Analyser & MediaRecorder
    await this.startAudioAnalyser();

    if (!this.recognition) {
      this.initRecognition();
    }

    this.startWatchdog();
    this.safeStartRecognition();
  }

  public stop() {
    this.shouldKeepListening = false;
    this.isListening = false;
    this.stopWatchdog();
    this.flushPendingInterim();

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
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Initialize AudioContext for Volume Meter
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

        // Initialize MediaRecorder for full audio backup
        if (typeof MediaRecorder !== 'undefined') {
          try {
            this.recordedChunks = [];
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : MediaRecorder.isTypeSupported('audio/webm')
              ? 'audio/webm'
              : '';

            this.mediaRecorder = mimeType
              ? new MediaRecorder(this.mediaStream, { mimeType })
              : new MediaRecorder(this.mediaStream);

            this.mediaRecorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                this.recordedChunks.push(e.data);
              }
            };
            this.mediaRecorder.start(1000); // 1-second chunks
          } catch (e) {
            console.warn('MediaRecorder backup init failed:', e);
          }
        }
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

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignored
      }
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

  // Get raw recorded audio blob for download or cloud transcription
  public getRecordedBlob(): Blob | null {
    if (this.recordedChunks.length === 0) return null;
    return new Blob(this.recordedChunks, { type: 'audio/webm' });
  }

  // Get base64 string of recorded audio for Gemini transcription
  public getRecordedBase64(): Promise<string | null> {
    const blob = this.getRecordedBlob();
    if (!blob) return Promise.resolve(null);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || null;
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }
}

export const speechService = new SpeechService();
