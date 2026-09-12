import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Sparkles,
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  Volume2,
  VolumeX,
  Upload,
  Clock,
  User,
  Users,
  Check,
  AlertCircle,
  Wand2,
  Tag,
  ArrowRight,
  Download,
  RefreshCw,
  Eye,
  Lock,
  Zap,
  CheckCircle2,
  FileText,
  Table,
  Unlock,
} from 'lucide-react';
import { TranscriptItem, SpeakerType, FlagCategory, VisitRecord } from '../types';
import { speechService } from '../services/speechService';
import { safeFetchJson } from '../utils/apiUtils';
import { detectSpeaker } from '../services/speakerDetectionService';
import {
  downloadAllTranscriptsAsTxt,
  downloadAllTranscriptsAsCsv,
} from '../services/transcriptExportService';

interface LiveRecorderProps {
  activeRecord: VisitRecord;
  onUpdateTranscripts: (transcripts: TranscriptItem[]) => void;
  onEndAndSummarize: () => void;
  onOpenSetup: () => void;
  hasEstablishedTeacher?: boolean;
}

const FLAG_CATEGORIES: { label: string; value: FlagCategory; color: string }[] = [
  { label: '重點核心', value: '重點', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { label: '生活常規', value: '生活常規', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: '學習狀況', value: '學習狀況', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { label: '身心情緒', value: '身心情緒', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { label: '親職管教', value: '親職管教', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: '需通報/危機', value: '需通報', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { label: '待追蹤決議', value: '待追蹤', color: 'bg-orange-100 text-orange-800 border-orange-300' },
];

export const AVAILABLE_SPEAKERS: {
  value: SpeakerType;
  label: string;
  icon: string;
  badgeClass: string;
  activeColor: string;
  inactiveClass: string;
}[] = [
  {
    value: '導師',
    label: '導師',
    icon: '👩‍🏫',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    activeColor: 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400',
    inactiveClass: 'bg-blue-50/80 text-blue-800 hover:bg-blue-100 border-blue-200',
  },
  {
    value: '家長',
    label: '家長',
    icon: '👨‍👩‍👧',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    activeColor: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400',
    inactiveClass: 'bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 border-emerald-200',
  },
  {
    value: '學生',
    label: '學生',
    icon: '🧑‍🎓',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    activeColor: 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400',
    inactiveClass: 'bg-amber-50/80 text-amber-800 hover:bg-amber-100 border-amber-200',
  },
  {
    value: '輔導老師',
    label: '輔導老師',
    icon: '🧑‍💼',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    activeColor: 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400',
    inactiveClass: 'bg-purple-50/80 text-purple-800 hover:bg-purple-100 border-purple-200',
  },
  {
    value: '其他',
    label: '其他',
    icon: '👥',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    activeColor: 'bg-slate-700 text-white shadow-sm ring-2 ring-slate-400',
    inactiveClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
  },
];

export const LiveRecorder: React.FC<LiveRecorderProps> = ({
  activeRecord,
  onUpdateTranscripts,
  onEndAndSummarize,
  onOpenSetup,
  hasEstablishedTeacher = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerType>('導師');
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(activeRecord.audioDurationSeconds || 0);
  const [manualInput, setManualInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [filterSpeaker, setFilterSpeaker] = useState<string>('all');
  const [filterOnlyFlagged, setFilterOnlyFlagged] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Dual-Track Concurrent Recognition State (手動切換身分優先 + 語音自動辨識換人同步進行)
  const [isManualLocked, setIsManualLocked] = useState(false);
  const [manualLockedSpeaker, setManualLockedSpeaker] = useState<SpeakerType | null>(null);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [autoDetectedInfo, setAutoDetectedInfo] = useState<{
    speaker: SpeakerType;
    reason: string;
    timestamp: number;
  } | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestPitchRef = useRef<number | null>(null);

  const isManualLockedRef = useRef<boolean>(false);
  useEffect(() => {
    isManualLockedRef.current = isManualLocked;
  }, [isManualLocked]);

  const autoDetectEnabledRef = useRef<boolean>(true);
  useEffect(() => {
    autoDetectEnabledRef.current = autoDetectEnabled;
  }, [autoDetectEnabled]);

  // Synchronized refs to avoid stale closure across continuous speech events
  const transcriptsRef = useRef<TranscriptItem[]>(activeRecord.transcripts);
  useEffect(() => {
    transcriptsRef.current = activeRecord.transcripts;
  }, [activeRecord.transcripts]);

  const activeSpeakerRef = useRef<SpeakerType>(activeSpeaker);
  useEffect(() => {
    activeSpeakerRef.current = activeSpeaker;
  }, [activeSpeaker]);

  const elapsedSecondsRef = useRef<number>(elapsedSeconds);
  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  const interimTextRef = useRef<string>(interimText);
  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  // Auto scroll to bottom when new transcript is added or during live speech
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeRecord.transcripts, interimText]);

  // Timer tick
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTimer = useCallback((totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Core sentence commit function - guarantees full accumulation without overwriting previous turns
  const commitTranscript = useCallback((rawText: string, speaker?: SpeakerType) => {
    const text = rawText.trim();
    if (!text) return;

    const currentList = transcriptsRef.current;
    const currentSec = elapsedSecondsRef.current;
    const currentSpeaker = speaker || activeSpeakerRef.current;

    // Smart check against the last transcript item from the SAME speaker:
    const last = currentList[currentList.length - 1];
    if (last && last.speaker === currentSpeaker && (currentSec - (last.timestampSeconds || 0)) < 25) {
      // 1. Exact duplicate sentence
      if (last.text === text) {
        setInterimText('');
        interimTextRef.current = '';
        return;
      }
      // 2. If new text extends/completes the previous partial sentence:
      // e.g. last was "孩子在學校", new is "孩子在學校的作息與學習情況"
      if (text.startsWith(last.text)) {
        const updatedList = currentList.map((item, idx) =>
          idx === currentList.length - 1 ? { ...item, text } : item
        );
        transcriptsRef.current = updatedList;
        onUpdateTranscripts(updatedList);
        setInterimText('');
        interimTextRef.current = '';
        return;
      }
      // 3. If previous card already contains this new text completely (e.g. prefix was re-emitted)
      if (last.text.includes(text) && last.text.length > text.length) {
        setInterimText('');
        interimTextRef.current = '';
        return;
      }
    }

    const newItem: TranscriptItem = {
      id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: formatTimer(currentSec),
      timestampSeconds: currentSec,
      speaker: currentSpeaker,
      text,
    };

    const nextList = [...currentList, newItem];
    transcriptsRef.current = nextList;
    onUpdateTranscripts(nextList);
    setInterimText('');
    interimTextRef.current = '';

    // If currently filtered to another speaker, reset filter to 'all' so new speech is immediately visible on screen!
    if (filterSpeaker !== 'all' && filterSpeaker !== currentSpeaker) {
      setFilterSpeaker('all');
    }
  }, [formatTimer, onUpdateTranscripts, filterSpeaker]);

  // Keep speechService callbacks bound to current commitTranscript and dual-track speaker detection
  useEffect(() => {
    if (isRecording) {
      speechService.setCallbacks({
        onPitchDetected: (pitch) => {
          latestPitchRef.current = pitch;
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onInterimResult: (text) => {
          setInterimText(text);

          // Concurrent automatic speaker detection:
          // If human has NOT manually switched (isManualLocked is false) and auto detection is enabled:
          if (
            autoDetectEnabledRef.current &&
            !isManualLockedRef.current &&
            text.trim().length >= 2
          ) {
            const detected = detectSpeaker({
              currentText: text,
              activeSpeaker: activeSpeakerRef.current,
              lastTranscripts: transcriptsRef.current,
              visitInfo: activeRecord.visitInfo,
              pitchHz: latestPitchRef.current,
              isManualLocked: false,
            });

            if (detected && detected.detectedSpeaker !== activeSpeakerRef.current) {
              const newSpeaker = detected.detectedSpeaker;
              setActiveSpeaker(newSpeaker);
              activeSpeakerRef.current = newSpeaker;
              setAutoDetectedInfo({
                speaker: newSpeaker,
                reason: detected.reason,
                timestamp: Date.now(),
              });
            }
          }
        },
        onFinalResult: (text) => {
          let targetSpeaker = activeSpeakerRef.current;
          // If human has NOT manually switched, evaluate final text as well
          if (
            autoDetectEnabledRef.current &&
            !isManualLockedRef.current &&
            text.trim().length >= 2
          ) {
            const detected = detectSpeaker({
              currentText: text,
              activeSpeaker: activeSpeakerRef.current,
              lastTranscripts: transcriptsRef.current,
              visitInfo: activeRecord.visitInfo,
              pitchHz: latestPitchRef.current,
              isManualLocked: false,
            });
            if (detected && detected.detectedSpeaker) {
              targetSpeaker = detected.detectedSpeaker;
              setActiveSpeaker(targetSpeaker);
              activeSpeakerRef.current = targetSpeaker;
              setAutoDetectedInfo({
                speaker: targetSpeaker,
                reason: detected.reason,
                timestamp: Date.now(),
              });
            }
          }
          commitTranscript(text, targetSpeaker);
        },
      });
    }
  }, [isRecording, commitTranscript, activeRecord.visitInfo]);

  const handleStartRecording = async () => {
    if (!hasEstablishedTeacher) {
      onOpenSetup();
      return;
    }
    setMicError(null);
    // Ensure all dialogue is visible on the screen during recording
    setFilterSpeaker('all');
    setFilterOnlyFlagged(false);

    try {
      await speechService.start({
        onPitchDetected: (pitch) => {
          latestPitchRef.current = pitch;
        },
        onInterimResult: (text) => {
          setInterimText(text);
          if (
            autoDetectEnabledRef.current &&
            !isManualLockedRef.current &&
            text.trim().length >= 2
          ) {
            const detected = detectSpeaker({
              currentText: text,
              activeSpeaker: activeSpeakerRef.current,
              lastTranscripts: transcriptsRef.current,
              visitInfo: activeRecord.visitInfo,
              pitchHz: latestPitchRef.current,
              isManualLocked: false,
            });

            if (detected && detected.detectedSpeaker !== activeSpeakerRef.current) {
              const newSpeaker = detected.detectedSpeaker;
              setActiveSpeaker(newSpeaker);
              activeSpeakerRef.current = newSpeaker;
              setAutoDetectedInfo({
                speaker: newSpeaker,
                reason: detected.reason,
                timestamp: Date.now(),
              });
            }
          }
        },
        onFinalResult: (text) => {
          let targetSpeaker = activeSpeakerRef.current;
          if (
            autoDetectEnabledRef.current &&
            !isManualLockedRef.current &&
            text.trim().length >= 2
          ) {
            const detected = detectSpeaker({
              currentText: text,
              activeSpeaker: activeSpeakerRef.current,
              lastTranscripts: transcriptsRef.current,
              visitInfo: activeRecord.visitInfo,
              pitchHz: latestPitchRef.current,
              isManualLocked: false,
            });
            if (detected && detected.detectedSpeaker) {
              targetSpeaker = detected.detectedSpeaker;
              setActiveSpeaker(targetSpeaker);
              activeSpeakerRef.current = targetSpeaker;
              setAutoDetectedInfo({
                speaker: targetSpeaker,
                reason: detected.reason,
                timestamp: Date.now(),
              });
            }
          }
          commitTranscript(text, targetSpeaker);
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onError: (err) => {
          setMicError(`麥克風連線狀態: ${err}`);
        },
        onStatusChange: (listening) => {
          setIsRecording(listening);
        },
      });
      setIsRecording(true);
    } catch (err: any) {
      setMicError(err.message || '無法取得麥克風收音權限');
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    // Flush any pending speech in interim buffer before stopping
    if (interimTextRef.current.trim()) {
      commitTranscript(interimTextRef.current.trim());
    }
    speechService.stop();
    setIsRecording(false);
    setAudioLevel(0);
    setInterimText('');
  };

  const handleAddManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEstablishedTeacher) {
      onOpenSetup();
      return;
    }
    if (!manualInput.trim()) return;
    commitTranscript(manualInput.trim(), activeSpeaker);
    setManualInput('');
  };

  const handleToggleFlag = (id: string, category?: FlagCategory) => {
    const updated = transcriptsRef.current.map((item) => {
      if (item.id === id) {
        const isFlagged = !item.isFlagged || (category && item.flagCategory !== category);
        return {
          ...item,
          isFlagged: isFlagged,
          flagCategory: isFlagged ? category || '重點' : undefined,
        };
      }
      return item;
    });
    transcriptsRef.current = updated;
    onUpdateTranscripts(updated);
  };

  const handleDeleteTranscript = (id: string) => {
    const updated = transcriptsRef.current.filter((t) => t.id !== id);
    transcriptsRef.current = updated;
    onUpdateTranscripts(updated);
  };

  const handleStartEdit = (item: TranscriptItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    const updated = transcriptsRef.current.map((t) =>
      t.id === id ? { ...t, text: editingText.trim() } : t
    );
    transcriptsRef.current = updated;
    onUpdateTranscripts(updated);
    setEditingId(null);
  };

  const handleChangeItemSpeaker = (id: string, newSpeaker: SpeakerType) => {
    const updated = transcriptsRef.current.map((t) =>
      t.id === id ? { ...t, speaker: newSpeaker } : t
    );
    transcriptsRef.current = updated;
    onUpdateTranscripts(updated);
  };

  // Manual speaker switch handler: Human manual switch takes TOP PRIORITY over automatic detection!
  const handleSwitchSpeaker = async (newSpeaker: SpeakerType) => {
    if (!hasEstablishedTeacher) {
      onOpenSetup();
      return;
    }
    // 1. Immediately commit any pending recognized text under previous speaker so nothing is lost
    if (interimTextRef.current.trim()) {
      commitTranscript(interimTextRef.current.trim(), activeSpeakerRef.current);
    }
    // 2. Restart recognition session to clear old speaker's buffer
    speechService.restartSession();

    // 3. Set Manual Priority: 人工手動切換身分優先處理
    setIsManualLocked(true);
    isManualLockedRef.current = true;
    setManualLockedSpeaker(newSpeaker);
    setAutoDetectedInfo(null);

    // 4. Set the new speaker immediately
    setActiveSpeaker(newSpeaker);
    activeSpeakerRef.current = newSpeaker;

    // 5. Ensure all dialogue is visible on the screen so new speaker's content is displayed
    setFilterSpeaker('all');
    setFilterOnlyFlagged(false);

    // 6. Guarantee microphone is recording immediately so speech is captured on the screen right away
    if (!isRecording) {
      await handleStartRecording();
    }

    // 7. Scroll to bottom so the new speaker state is right in front of the teacher
    requestAnimationFrame(() => {
      transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  // Release manual lock: Resume dual-track automatic speaker detection
  const handleUnlockManual = () => {
    setIsManualLocked(false);
    isManualLockedRef.current = false;
    setManualLockedSpeaker(null);
  };

  // Quick Speech Simulator by speaker (for instant testing of any role on screen)
  const handleSimulateSpeechForSpeaker = (speaker: SpeakerType) => {
    if (!hasEstablishedTeacher) {
      onOpenSetup();
      return;
    }
    const rolePhrases: Record<string, { text: string; flag?: FlagCategory }[]> = {
      '導師': [
        { text: '家長您好，今天特別跟您交流孩子在學校的作息與學習情況。' },
        { text: '他在學校跟同學相處融洽，近期上課參與度也有明顯提升！' },
        { text: '那我們約定晚上十一點就寢，並且我幫你報名學校的學習扶助班！', flag: '重點' },
      ],
      '家長': [
        { text: '老師好，感謝老師特別抽空到訪。他最近在家常常玩手機到很晚，早上叫不太起床。' },
        { text: '我們一定會全力配合導師指導，在家多關心他的複習進度。', flag: '待追蹤' },
        { text: '很感謝學校老師們平常這麼用心照顧孩子！' },
      ],
      '學生': [
        { text: '老師好，我最近數理公式有點記不住，所以晚上都在房間查影片複習。' },
        { text: '我會調整作息早點睡覺，明天開始上課會更加認真！' },
        { text: '我有報名學校的課後輔導，希望能把數學成績拉上來。' },
      ],
      '輔導老師': [
        { text: '孩子情緒表達其實很細膩，我們輔導室會持續提供個別心理支持與諮商談話。', flag: '身心情緒' },
        { text: '建議家長可以用正向傾聽的方式多給予鼓勵，建立溫暖的信任感。' },
        { text: '後續輔導室也會追蹤身心調適進度，與導師密切橫向聯繫共同協助孩子。', flag: '待追蹤' },
      ],
      '輔導員': [
        { text: '輔導處已備齊生涯探索與課業諮詢相關手冊，隨時歡迎家長與學生前來諮詢。' },
      ],
      '其他': [
        { text: '隨同里長及社工同仁也到場關懷家庭生活需求，若有物資或急難補助可隨時提出。' },
      ],
    };

    const phrases = rolePhrases[speaker] || rolePhrases['導師'];
    const randomItem = phrases[Math.floor(Math.random() * phrases.length)];
    const currentSec = elapsedSecondsRef.current;
    const newItem: TranscriptItem = {
      id: `tr-sim-${Date.now()}`,
      timestamp: formatTimer(currentSec + Math.floor(Math.random() * 5)),
      timestampSeconds: currentSec,
      speaker: speaker,
      text: randomItem.text,
      isFlagged: Boolean(randomItem.flag),
      flagCategory: randomItem.flag,
    };
    const nextList = [...transcriptsRef.current, newItem];
    transcriptsRef.current = nextList;
    onUpdateTranscripts(nextList);
    requestAnimationFrame(() => {
      transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  // Quick Speech Simulator (for instant demonstration/testing)
  const handleSimulateSpeech = () => {
    handleSimulateSpeechForSpeaker(activeSpeaker);
  };

  // Audio File Upload handler
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasEstablishedTeacher) {
      onOpenSetup();
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await safeFetchJson<{ transcripts?: any[] }>(
          '/api/transcribe-audio',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: file.type || 'audio/webm',
            }),
          },
          45000
        );

        if (!res.ok || !res.data) {
          throw new Error(res.error || '音訊轉譯失敗');
        }

        const data = res.data;
        if (data.transcripts && Array.isArray(data.transcripts)) {
          const newItems: TranscriptItem[] = data.transcripts.map((t: any, idx: number) => ({
            id: `tr-up-${Date.now()}-${idx}`,
            timestamp: t.timestamp || formatTimer(idx * 15),
            timestampSeconds: idx * 15,
            speaker: (['導師', '家長', '學生', '輔導員', '其他'].includes(t.speaker) ? t.speaker : '其他') as SpeakerType,
            text: t.text || '',
          }));
          const nextList = [...transcriptsRef.current, ...newItems];
          transcriptsRef.current = nextList;
          onUpdateTranscripts(nextList);
        }
        setIsUploadingAudio(false);
      };
      reader.onerror = () => {
        setUploadError('讀取音訊檔案失敗');
        setIsUploadingAudio(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || '音訊上傳處理異常');
      setIsUploadingAudio(false);
    }
  };

  const handleDownloadAudio = () => {
    if (!hasEstablishedTeacher) {
      onOpenSetup();
      return;
    }
    const blob = speechService.getRecordedBlob();
    if (!blob || blob.size === 0) {
      alert('目前尚未產生足夠的錄音暫存檔，請先點擊「開始收音」進行錄音。');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `家訪即時錄音_${activeRecord.visitInfo.studentName || '訪談'}_${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download ALL Transcripts as formal Plain Text (.txt) - Guarantees 100% full content
  const handleDownloadAllTranscriptsTxt = () => {
    if (!hasEstablishedTeacher) {
      onOpenSetup();
      return;
    }
    // Flush any pending interim speech so even the last spoken sentence is 100% included
    if (interimTextRef.current.trim()) {
      commitTranscript(interimTextRef.current.trim(), activeSpeakerRef.current);
    }
    const res = downloadAllTranscriptsAsTxt(activeRecord);
    setDownloadSuccessMessage(`已成功下載全部 ${res.totalCount} 則逐字稿（完整純文字全本 .txt）`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  // Download ALL Transcripts as Excel CSV (.csv with UTF-8 BOM)
  const handleDownloadAllTranscriptsCsv = () => {
    if (!hasEstablishedTeacher) {
      onOpenSetup();
      return;
    }
    if (interimTextRef.current.trim()) {
      commitTranscript(interimTextRef.current.trim(), activeSpeakerRef.current);
    }
    const res = downloadAllTranscriptsAsCsv(activeRecord);
    setDownloadSuccessMessage(`已成功下載全部 ${res.totalCount} 則逐字稿（Excel 表格檔 .csv）`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  const filteredTranscripts = activeRecord.transcripts.filter((t) => {
    if (filterSpeaker !== 'all' && t.speaker !== filterSpeaker) return false;
    if (filterOnlyFlagged && !t.isFlagged) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Initial Setup Prompt Banner (Shown if user closes the setup modal before establishing teacher) */}
      {!hasEstablishedTeacher && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <span>尚未建立新家庭訪問選單（開始收音等相關功能已關閉）</span>
              </h3>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                依系統規範，在尚未建立新家庭訪問選單前，已關閉麥克風即時收音、發言角色切換、語音模擬及訪談紀錄輸入等功能。請先點擊右側按鈕建立本次家庭訪問基本資料以正式啟用。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSetup}
            className="w-full md:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>開啟新建家訪選單</span>
          </button>
        </div>
      )}

      {/* Top Banner: Visit Status & Active Student Overview */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
              {activeRecord.visitInfo.visitType}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {activeRecord.visitInfo.visitDate} ({activeRecord.visitInfo.visitTime})
            </span>
            {!hasEstablishedTeacher && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>尚未建立選單 (功能鎖定)</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>
              {hasEstablishedTeacher && activeRecord.visitInfo.studentName
                ? `${activeRecord.visitInfo.className} ${activeRecord.visitInfo.studentName}`
                : '尚未建立訪視對象'}
            </span>
            <span className="text-sm font-normal text-slate-500">
              (座號: {activeRecord.visitInfo.studentId || '—'} / 導師: {hasEstablishedTeacher ? activeRecord.visitInfo.teacherName : '未設定'})
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
            訪談目的：{activeRecord.visitInfo.visitPurpose || '生活作息與課業關懷'}
          </p>
        </div>

        {/* Action button to finish and summarize */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSetup}
            className="text-xs px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-medium flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>{hasEstablishedTeacher ? '編輯訪視資訊' : '新建家訪選單'}</span>
          </button>

          <button
            id="btn-end-and-summarize"
            type="button"
            onClick={onEndAndSummarize}
            disabled={!hasEstablishedTeacher || activeRecord.transcripts.length === 0}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all ${
              hasEstablishedTeacher && activeRecord.transcripts.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={
              !hasEstablishedTeacher
                ? '尚未建立新家庭訪問選單，請先完成基本資料設定'
                : activeRecord.transcripts.length === 0
                ? '目前尚無對話紀錄'
                : '結束訪談並生成 AI 重點摘要'
            }
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>結束訪談並生成 AI 重點摘要</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Main Recording Workspace: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Microphone Control & Speaker Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Microphone Control Box */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">
                訪談收音控制台
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-mono text-slate-700 font-semibold">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Central Record Button */}
            <div className="flex flex-col items-center justify-center py-3">
              <button
                id="btn-toggle-mic"
                type="button"
                onClick={!hasEstablishedTeacher ? onOpenSetup : (isRecording ? handleStopRecording : handleStartRecording)}
                className={`relative group w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
                  !hasEstablishedTeacher
                    ? 'bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer shadow-none'
                    : isRecording
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-105 cursor-pointer'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 cursor-pointer'
                }`}
                title={
                  !hasEstablishedTeacher
                    ? '尚未建立新家庭訪問選單，收音功能已關閉（點此開啟新建選單）'
                    : isRecording
                    ? '暫停即時收音'
                    : '開始麥克風即時收音'
                }
              >
                {!hasEstablishedTeacher ? (
                  <>
                    <Lock className="w-8 h-8 text-slate-400 group-hover:text-amber-600 mb-0.5 transition-colors" />
                    <span className="text-[11px] font-semibold text-slate-500 group-hover:text-amber-700 tracking-tight transition-colors">
                      收音已關閉
                    </span>
                  </>
                ) : isRecording ? (
                  <>
                    <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-30"></span>
                    <Square className="w-8 h-8 fill-current mb-0.5" />
                    <span className="text-[11px] font-medium tracking-tight">暫停收音</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8 mb-0.5" />
                    <span className="text-[11px] font-medium tracking-tight">開始收音</span>
                  </>
                )}
              </button>

              {/* Status text & wave animation */}
              <div className="mt-3 text-center">
                {!hasEstablishedTeacher ? (
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      <Lock className="w-3 h-3 text-amber-600" />
                      收音功能已關閉（待建立選單）
                    </span>
                    <p className="text-[11px] text-slate-400">
                      點擊上方按鈕建立家訪選單後即可啟用
                    </p>
                  </div>
                ) : isRecording ? (
                  <div className="flex items-center gap-2 text-rose-600 font-medium text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                    <span>正在進行麥克風收音與即時轉譯...</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">
                    點擊上方按鈕啟動麥克風即時收音
                  </span>
                )}
              </div>

              {/* Audio visualizer bar */}
              <div className="w-full mt-3 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    isRecording ? 'bg-gradient-to-r from-blue-500 to-rose-500' : 'bg-slate-300'
                  }`}
                  style={{ width: `${isRecording ? Math.max(8, audioLevel) : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Mic Error Prompt */}
            {micError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{micError}</p>
                  <p className="text-[11px] text-amber-700">
                    提示：若瀏覽器未開放麥克風權限，可使用下方「快速模擬語句」或「手動記錄」。
                  </p>
                </div>
              </div>
            )}

            {/* Dual-Track Speaker Management: Manual Priority + Automatic Diarization Sync */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>發言身分管理（手動切換優先 ＋ 自動同步辨識）</span>
                </label>
                {!hasEstablishedTeacher ? (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    未建立選單
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    {isManualLocked ? (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-amber-600" />
                        人工手動優先
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-emerald-600" />
                        雙軌同步中
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status explanation badge */}
              {hasEstablishedTeacher && (
                <div className={`p-2.5 rounded-lg border text-xs leading-relaxed space-y-1 ${
                  isManualLocked
                    ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                    : 'bg-blue-50/80 border-blue-200 text-blue-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1">
                      {isManualLocked ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>手動切換身分優先：目前鎖定為【{activeSpeaker}】</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>雙軌同步中：目前身分【{activeSpeaker}】</span>
                        </>
                      )}
                    </span>
                    {isManualLocked && (
                      <button
                        type="button"
                        onClick={handleUnlockManual}
                        className="text-[11px] font-medium text-amber-800 hover:text-amber-950 underline flex items-center gap-0.5 cursor-pointer"
                        title="解除手動鎖定，讓系統在偵測換人時自動切換身分"
                      >
                        <Unlock className="w-2.5 h-2.5" />
                        <span>恢復自動換人</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] opacity-90">
                    {isManualLocked
                      ? '依規範已採用「人工手動切換身分優先處理」。若需系統再次自動偵測換人，可點選上方「恢復自動換人」。'
                      : '人工手動切換優先處理；若人工尚未切換，系統偵測換人時將自動切換身分錄音。'}
                  </p>
                </div>
              )}

              {/* Auto detected toast notification */}
              {autoDetectedInfo && !isManualLocked && (
                <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center justify-between animate-fadeIn">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>系統自動換人：已切換為【{autoDetectedInfo.speaker}】（{autoDetectedInfo.reason}）</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoDetectedInfo(null)}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 cursor-pointer ml-1"
                  >
                    關閉
                  </button>
                </div>
              )}

              {/* Speaker Buttons: clicking gives TOP PRIORITY to manual choice */}
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SPEAKERS.map((spk) => {
                  const isActive = activeSpeaker === spk.value;
                  return (
                    <button
                      key={spk.value}
                      type="button"
                      disabled={!hasEstablishedTeacher}
                      onClick={() => handleSwitchSpeaker(spk.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                        !hasEstablishedTeacher
                          ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : isActive
                          ? spk.activeColor + ' cursor-pointer ring-2 ring-offset-1'
                          : spk.inactiveClass + ' cursor-pointer'
                      }`}
                      title={
                        !hasEstablishedTeacher
                          ? '尚未建立新家庭訪問選單，切換身分已關閉'
                          : `以人工手動切換身分為「${spk.label}」（手動優先處理並同步錄音）`
                      }
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{spk.icon}</span>
                        <span>{spk.label}</span>
                      </span>
                      {isActive && hasEstablishedTeacher && (
                        <span className="flex items-center gap-1">
                          {isManualLocked && (
                            <span className="text-[9px] bg-white/30 px-1 py-0.2 rounded font-semibold">
                              手動
                            </span>
                          )}
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick helper tools & Full Transcript Download */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-semibold text-slate-700">
                  輔助輸入與全部逐字稿下載：
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  全本完整匯出
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!hasEstablishedTeacher}
                  onClick={handleSimulateSpeech}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 rounded-md border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title={!hasEstablishedTeacher ? '尚未建立新家庭訪問選單，模擬輸入已關閉' : '模擬訪談對話語句'}
                >
                  {!hasEstablishedTeacher ? <Lock className="w-3 h-3 text-slate-400" /> : <Wand2 className="w-3 h-3 text-purple-600" />}
                  <span>模擬單句輸入</span>
                </button>

                <label className={`text-xs px-2.5 py-1.5 rounded-md border border-slate-200 transition-colors flex items-center gap-1 ${
                  !hasEstablishedTeacher || isUploadingAudio
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                }`}
                title={!hasEstablishedTeacher ? '尚未建立新家庭訪問選單，匯入音訊已關閉' : '匯入音訊檔轉譯'}
                >
                  {!hasEstablishedTeacher ? <Lock className="w-3 h-3 text-slate-400" /> : <Upload className="w-3 h-3 text-blue-600" />}
                  <span>{isUploadingAudio ? '轉譯中...' : '匯入錄音檔'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    disabled={!hasEstablishedTeacher || isUploadingAudio}
                    className="hidden"
                  />
                </label>

                {/* Download ALL Transcripts as TXT */}
                <button
                  id="btn-download-all-txt"
                  type="button"
                  disabled={!hasEstablishedTeacher || activeRecord.transcripts.length === 0}
                  onClick={handleDownloadAllTranscriptsTxt}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 rounded-md border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title={
                    !hasEstablishedTeacher
                      ? '尚未建立新家庭訪問選單，下載逐字稿已關閉'
                      : activeRecord.transcripts.length === 0
                      ? '目前尚無逐字稿可下載'
                      : '下載全部逐字稿內容（全本純文字檔 .txt，保證全數包含）'
                  }
                >
                  {!hasEstablishedTeacher ? (
                    <Lock className="w-3 h-3 text-slate-400" />
                  ) : (
                    <FileText className="w-3 h-3 text-blue-600" />
                  )}
                  <span>下載全部逐字稿 (.txt)</span>
                </button>

                {/* Download ALL Transcripts as CSV */}
                <button
                  id="btn-download-all-csv"
                  type="button"
                  disabled={!hasEstablishedTeacher || activeRecord.transcripts.length === 0}
                  onClick={handleDownloadAllTranscriptsCsv}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 rounded-md border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title={
                    !hasEstablishedTeacher
                      ? '尚未建立新家庭訪問選單，下載逐字稿已關閉'
                      : activeRecord.transcripts.length === 0
                      ? '目前尚無逐字稿可下載'
                      : '下載全部逐字稿 Excel 表格檔 (.csv，含完整對話及時間戳記)'
                  }
                >
                  {!hasEstablishedTeacher ? (
                    <Lock className="w-3 h-3 text-slate-400" />
                  ) : (
                    <Download className="w-3 h-3 text-emerald-600" />
                  )}
                  <span>逐字稿表格 (.csv)</span>
                </button>

                <button
                  type="button"
                  disabled={!hasEstablishedTeacher || activeRecord.transcripts.length === 0}
                  onClick={handleDownloadAudio}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 rounded-md border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title={
                    !hasEstablishedTeacher
                      ? '尚未建立新家庭訪問選單，下載備份已關閉'
                      : activeRecord.transcripts.length === 0
                      ? '尚無錄音對話'
                      : '下載本次訪談錄製之音訊檔 (WebM 格式)'
                  }
                >
                  <Download className="w-3 h-3 text-purple-600" />
                  <span>下載錄音備份</span>
                </button>
              </div>

              {uploadError && (
                <p className="text-xs text-rose-600 font-medium">{uploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Transcription Stream & Immediate Screen (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden min-h-[580px]">
          {/* Header Bar: Filters & Count */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>即時轉譯螢幕</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-semibold">
                  共 {activeRecord.transcripts.length} 則完整呈現
                </span>
                {filteredTranscripts.length !== activeRecord.transcripts.length && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    目前顯示 {filteredTranscripts.length} 則
                  </span>
                )}
              </h3>
            </div>

            {/* Full Transcript Download Buttons & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Prominent Full Transcript Download Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="btn-header-download-txt"
                  disabled={!hasEstablishedTeacher || activeRecord.transcripts.length === 0}
                  onClick={handleDownloadAllTranscriptsTxt}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300 rounded-md text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="下載全部逐字稿內容（全本純文字 .txt，保證全數包含不受篩選影響）"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>下載全部逐字稿 (.txt)</span>
                </button>
                <button
                  type="button"
                  id="btn-header-download-csv"
                  disabled={!hasEstablishedTeacher || activeRecord.transcripts.length === 0}
                  onClick={handleDownloadAllTranscriptsCsv}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300 rounded-md text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="下載全部逐字稿表格檔 (.csv，含所有發言角色與時間戳記)"
                >
                  <Table className="w-3.5 h-3.5 text-emerald-600" />
                  <span>表格 (.csv)</span>
                </button>
              </div>

              {/* Filter pills */}
              <select
                value={filterSpeaker}
                onChange={(e) => setFilterSpeaker(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="all">所有發言角色 (完整顯示)</option>
                <option value="導師">僅看 導師</option>
                <option value="家長">僅看 家長</option>
                <option value="學生">僅看 學生</option>
                <option value="輔導老師">僅看 輔導老師</option>
                <option value="其他">僅看 其他</option>
              </select>

              <button
                type="button"
                onClick={() => setFilterOnlyFlagged(!filterOnlyFlagged)}
                className={`px-2.5 py-1 rounded-md border text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                  filterOnlyFlagged
                    ? 'bg-amber-100 text-amber-800 border-amber-300 font-medium'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>僅看重點標記</span>
              </button>

              {(filterSpeaker !== 'all' || filterOnlyFlagged) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSpeaker('all');
                    setFilterOnlyFlagged(false);
                  }}
                  className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  title="解除篩選，全部呈現所有錄音對話"
                >
                  <Eye className="w-3 h-3" />
                  <span>全部呈現</span>
                </button>
              )}
            </div>
          </div>

          {/* Download Success Notice Banner */}
          {downloadSuccessMessage && (
            <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-300 text-xs font-medium text-emerald-900 flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{downloadSuccessMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setDownloadSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-950 text-xs underline cursor-pointer"
              >
                知道了
              </button>
            </div>
          )}

          {/* Filter Notice Banner if any filter is active */}
          {(filterSpeaker !== 'all' || filterOnlyFlagged) && (
            <div className="px-4 py-2 bg-amber-50/90 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  目前處於篩選模式（僅顯示「{filterSpeaker !== 'all' ? filterSpeaker : '全部角色'}」{filterOnlyFlagged ? '且僅重點標記' : ''}），畫面上已隱藏 {activeRecord.transcripts.length - filteredTranscripts.length} 則對話。
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterSpeaker('all');
                  setFilterOnlyFlagged(false);
                }}
                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold cursor-pointer whitespace-nowrap shadow-2xs"
              >
                恢復全部呈現 ({activeRecord.transcripts.length} 則)
              </button>
            </div>
          )}

          {/* Quick Speaker Selector Directly on Live Transcript Screen */}
          <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5 mr-1">
                <span className={`w-2 h-2 rounded-full ${hasEstablishedTeacher ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`}></span>
                <span>切換發言身分（即刻顯示錄音）：</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {AVAILABLE_SPEAKERS.map((spk) => {
                  const isActive = activeSpeaker === spk.value;
                  return (
                    <button
                      key={spk.value}
                      type="button"
                      disabled={!hasEstablishedTeacher}
                      onClick={() => handleSwitchSpeaker(spk.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border shadow-2xs ${
                        !hasEstablishedTeacher
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : isActive
                          ? spk.activeColor + ' cursor-pointer'
                          : spk.inactiveClass + ' cursor-pointer'
                      }`}
                      title={
                        !hasEstablishedTeacher
                          ? '尚未建立新家庭訪問選單，切換功能已關閉'
                          : `點擊立即切換為「${spk.label}」並開始即時轉譯`
                      }
                    >
                      <span>{spk.icon}</span>
                      <span>{spk.label}</span>
                      {isActive && hasEstablishedTeacher && (
                        <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-bold">
                          發言中
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Test Demo Button */}
            <button
              type="button"
              disabled={!hasEstablishedTeacher}
              onClick={() => handleSimulateSpeechForSpeaker(activeSpeaker)}
              className="text-[11px] px-2.5 py-1 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 border border-slate-300 rounded-md shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              title={
                !hasEstablishedTeacher
                  ? '尚未建立新家庭訪問選單，測試功能已關閉'
                  : `模擬一則「${activeSpeaker}」的訪談發言並立即寫入螢幕`
              }
            >
              {!hasEstablishedTeacher ? <Lock className="w-3 h-3 text-slate-400" /> : <Wand2 className="w-3 h-3 text-purple-600" />}
              <span>測試【{activeSpeaker}】發言寫入</span>
            </button>
          </div>

          {/* Transcript Feed Scrollable Area */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[520px] space-y-3 bg-slate-50/40">
            {activeRecord.transcripts.length === 0 && !interimText && (
              !hasEstablishedTeacher ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center space-y-3 p-6 bg-white/60 rounded-xl border border-dashed border-amber-300">
                  <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">尚未建立新家庭訪問選單</p>
                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                      本系統在尚未建立新家庭訪問選單前，已關閉開始收音、即時語音轉譯及訪談紀錄輸入等功能。請點擊下方按鈕設定基本資料以啟用。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSetup}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>開啟新建家訪選單</span>
                  </button>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                  <Mic className="w-10 h-10 text-slate-300 animate-pulse" />
                  <p className="text-sm font-medium">尚未開始收音或尚無轉譯文字</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    請點擊左側「開始收音」或上方身分切換，系統將自動捕捉家庭訪問現場發言並即時轉譯至螢幕。
                  </p>
                </div>
              )
            )}

            {activeRecord.transcripts.length > 0 && filteredTranscripts.length === 0 && !interimText && (
              <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-center space-y-2 bg-white rounded-xl border border-dashed border-amber-300 p-6 shadow-2xs">
                <AlertCircle className="w-9 h-9 text-amber-500" />
                <p className="text-sm font-bold text-slate-700">目前篩選條件下無對話紀錄</p>
                <p className="text-xs text-slate-500 max-w-md">
                  系統目前已完整收錄 {activeRecord.transcripts.length} 則錄音對話。請點擊下方按鈕以在螢幕上完整顯示所有發言內容。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterSpeaker('all');
                    setFilterOnlyFlagged(false);
                  }}
                  className="mt-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>顯示全部 {activeRecord.transcripts.length} 則錄音內容</span>
                </button>
              </div>
            )}

            {filteredTranscripts.map((t) => {
              const speakerObj =
                AVAILABLE_SPEAKERS.find(
                  (s) => s.value === t.speaker || (t.speaker === '輔導員' && s.value === '輔導老師')
                ) || AVAILABLE_SPEAKERS[4];
              const badgeColor = speakerObj.badgeClass;

              const isEditing = editingId === t.id;

              return (
                <div
                  key={t.id}
                  id={`transcript-${t.id}`}
                  className={`group relative p-3.5 rounded-xl border transition-all ${
                    t.isFlagged
                      ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      {/* Speaker Badge with quick switcher */}
                      <div className="relative">
                        <select
                          value={t.speaker === '輔導員' ? '輔導老師' : t.speaker}
                          onChange={(e) => handleChangeItemSpeaker(t.id, e.target.value as SpeakerType)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${badgeColor}`}
                        >
                          {AVAILABLE_SPEAKERS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.icon} {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400">{t.timestamp}</span>

                      {/* Flag Badge if tagged */}
                      {t.isFlagged && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-200/80 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Bookmark className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                          <span>{t.flagCategory || '重點'}</span>
                        </span>
                      )}
                    </div>

                    {/* Action buttons (hover visible) */}
                    <div className="flex items-center space-x-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Quick Tag Selector */}
                      <div className="relative group/tag">
                        <button
                          type="button"
                          onClick={() => handleToggleFlag(t.id, '重點')}
                          className={`p-1 rounded text-xs hover:bg-slate-100 ${
                            t.isFlagged ? 'text-amber-600' : 'text-slate-400'
                          }`}
                          title="標記為重點對話"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${t.isFlagged ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(t)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="編輯轉譯文字"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTranscript(t.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                        title="刪除此句"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Item Content (View or Edit) */}
                  {isEditing ? (
                    <div className="mt-1 space-y-2">
                      <textarea
                        rows={2}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-2 text-sm border border-blue-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-100"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(t.id)}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
                        >
                          儲存修改
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-800 leading-relaxed font-sans select-text">
                      {t.text}
                    </p>
                  )}

                  {/* Flag category chips (expandable on click) */}
                  {t.isFlagged && (
                    <div className="mt-2 pt-1.5 border-t border-amber-200/60 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-amber-800 font-medium">標籤類型:</span>
                      {FLAG_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => handleToggleFlag(t.id, cat.value)}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            t.flagCategory === cat.value
                              ? cat.color + ' font-semibold ring-1 ring-amber-400'
                              : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Interim Active Live Speech Bubble */}
            {interimText && (
              <div className="p-3.5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-600 text-white animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      {activeSpeaker} (正在語音辨識...)
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatTimer(elapsedSeconds)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => commitTranscript(interimText)}
                    className="text-[11px] px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    title="立即將這段轉譯文字存入紀錄列表"
                  >
                    <Check className="w-3 h-3" />
                    <span>立即寫入</span>
                  </button>
                </div>
                <p className="text-sm text-blue-950 font-medium leading-relaxed whitespace-pre-wrap break-words">
                  {interimText}
                </p>
              </div>
            )}

            {/* Active recording state hint when not speaking */}
            {isRecording && !interimText && (
              <div className="px-3.5 py-2.5 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/80 flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="font-bold">
                    已切換為「{activeSpeaker}」即時收音中
                  </span>
                  <span className="text-[11px] text-emerald-700 hidden sm:inline">
                    請對準麥克風清晰說話，語音內容將即刻完整轉譯顯示於畫面上
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-800 font-bold">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            )}

            <div ref={transcriptsEndRef} />
          </div>

          {/* Bottom Manual Fast Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form onSubmit={handleAddManualEntry} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap pl-1 flex items-center gap-1">
                {!hasEstablishedTeacher && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                <span>以「{activeSpeaker}」手動記錄：</span>
              </span>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                disabled={!hasEstablishedTeacher}
                placeholder={
                  !hasEstablishedTeacher
                    ? '尚未建立新家庭訪問選單，請先完成基本資料設定以啟用記錄...'
                    : '輸入重點補充或手動記錄訪談內容，按 Enter 送出...'
                }
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!hasEstablishedTeacher || !manualInput.trim()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title={!hasEstablishedTeacher ? '請先建立新家庭訪問選單' : '加入手動紀錄'}
              >
                {!hasEstablishedTeacher ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>加入</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
