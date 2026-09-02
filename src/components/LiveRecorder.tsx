import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { TranscriptItem, SpeakerType, FlagCategory, VisitRecord } from '../types';
import { speechService } from '../services/speechService';

interface LiveRecorderProps {
  activeRecord: VisitRecord;
  onUpdateTranscripts: (transcripts: TranscriptItem[]) => void;
  onEndAndSummarize: () => void;
  onOpenSetup: () => void;
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

export const LiveRecorder: React.FC<LiveRecorderProps> = ({
  activeRecord,
  onUpdateTranscripts,
  onEndAndSummarize,
  onOpenSetup,
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

  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new transcript is added
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

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setMicError(null);
    try {
      await speechService.start({
        onInterimResult: (text) => {
          setInterimText(text);
        },
        onFinalResult: (text) => {
          if (!text.trim()) return;
          const newItem: TranscriptItem = {
            id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: formatTimer(elapsedSeconds),
            timestampSeconds: elapsedSeconds,
            speaker: activeSpeaker,
            text: text.trim(),
          };
          onUpdateTranscripts([...activeRecord.transcripts, newItem]);
          setInterimText('');
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onError: (err) => {
          setMicError(`麥克風提醒: ${err}`);
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
    speechService.stop();
    setIsRecording(false);
    setAudioLevel(0);
    setInterimText('');
  };

  const handleAddManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const newItem: TranscriptItem = {
      id: `tr-manual-${Date.now()}`,
      timestamp: formatTimer(elapsedSeconds),
      timestampSeconds: elapsedSeconds,
      speaker: activeSpeaker,
      text: manualInput.trim(),
    };

    onUpdateTranscripts([...activeRecord.transcripts, newItem]);
    setManualInput('');
  };

  const handleToggleFlag = (id: string, category?: FlagCategory) => {
    const updated = activeRecord.transcripts.map((item) => {
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
    onUpdateTranscripts(updated);
  };

  const handleDeleteTranscript = (id: string) => {
    onUpdateTranscripts(activeRecord.transcripts.filter((t) => t.id !== id));
  };

  const handleStartEdit = (item: TranscriptItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    const updated = activeRecord.transcripts.map((t) =>
      t.id === id ? { ...t, text: editingText.trim() } : t
    );
    onUpdateTranscripts(updated);
    setEditingId(null);
  };

  const handleChangeItemSpeaker = (id: string, newSpeaker: SpeakerType) => {
    const updated = activeRecord.transcripts.map((t) =>
      t.id === id ? { ...t, speaker: newSpeaker } : t
    );
    onUpdateTranscripts(updated);
  };

  // Quick Speech Simulator (for instant demonstration/testing)
  const handleSimulateSpeech = () => {
    const phrases = [
      { speaker: '導師' as SpeakerType, text: '家長您好，今天特別跟您交流孩子在學校的作息與學習情況。' },
      { speaker: '家長' as SpeakerType, text: '老師好，他最近在家裡常常玩手機到很晚，早上叫不太起床。' },
      { speaker: '學生' as SpeakerType, text: '我最近數理公式有點記不住，所以晚上都在房間查影片複習。' },
      { speaker: '導師' as SpeakerType, text: '那我們約定晚上十一點就寢，並且我幫你報名學校的學習扶助班！', flag: '重點' as FlagCategory },
      { speaker: '家長' as SpeakerType, text: '太感謝老師了！我們一定會全力配合監督作息。', flag: '待追蹤' as FlagCategory },
    ];

    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    const newItem: TranscriptItem = {
      id: `tr-sim-${Date.now()}`,
      timestamp: formatTimer(elapsedSeconds + Math.floor(Math.random() * 20)),
      timestampSeconds: elapsedSeconds,
      speaker: randomPhrase.speaker,
      text: randomPhrase.text,
      isFlagged: Boolean(randomPhrase.flag),
      flagCategory: randomPhrase.flag,
    };
    onUpdateTranscripts([...activeRecord.transcripts, newItem]);
  };

  // Audio File Upload handler
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await fetch('/api/transcribe-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: file.type || 'audio/webm',
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || '音訊轉譯失敗');
        }

        const data = await res.json();
        if (data.transcripts && Array.isArray(data.transcripts)) {
          const newItems: TranscriptItem[] = data.transcripts.map((t: any, idx: number) => ({
            id: `tr-up-${Date.now()}-${idx}`,
            timestamp: t.timestamp || formatTimer(idx * 15),
            timestampSeconds: idx * 15,
            speaker: (['導師', '家長', '學生', '輔導員', '其他'].includes(t.speaker) ? t.speaker : '其他') as SpeakerType,
            text: t.text || '',
          }));
          onUpdateTranscripts([...activeRecord.transcripts, ...newItems]);
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

  const filteredTranscripts = activeRecord.transcripts.filter((t) => {
    if (filterSpeaker !== 'all' && t.speaker !== filterSpeaker) return false;
    if (filterOnlyFlagged && !t.isFlagged) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>{activeRecord.visitInfo.className} {activeRecord.visitInfo.studentName}</span>
            <span className="text-sm font-normal text-slate-500">
              (座號: {activeRecord.visitInfo.studentId || '—'} / 導師: {activeRecord.visitInfo.teacherName})
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
            訪談目的：{activeRecord.visitInfo.visitPurpose || '生活作息與課業關懷'}
          </p>
        </div>

        {/* Action button to finish and summarize */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSetup}
            className="text-xs px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"
          >
            編輯訪視資訊
          </button>

          <button
            id="btn-end-and-summarize"
            onClick={onEndAndSummarize}
            disabled={activeRecord.transcripts.length === 0}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all ${
              activeRecord.transcripts.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
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
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`relative group w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-105'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                }`}
              >
                {isRecording ? (
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
                {isRecording ? (
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

            {/* Active Speaker Switcher (Crucial for home visit roles) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                目前發言者切換（即時套用）：
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['導師', '家長', '學生', '輔導員', '其他'] as SpeakerType[]).map((spk) => {
                  const isActive = activeSpeaker === spk;
                  let colorClass = '';
                  let icon = '👩‍🏫';
                  if (spk === '導師') {
                    colorClass = isActive ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100';
                    icon = '👩‍🏫';
                  } else if (spk === '家長') {
                    colorClass = isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100';
                    icon = '👨‍👩‍👧';
                  } else if (spk === '學生') {
                    colorClass = isActive ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100';
                    icon = '🧑‍🎓';
                  } else if (spk === '輔導員') {
                    colorClass = isActive ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100';
                    icon = '🧑‍💼';
                  } else {
                    colorClass = isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200';
                    icon = '👥';
                  }

                  return (
                    <button
                      key={spk}
                      type="button"
                      onClick={() => setActiveSpeaker(spk)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between border border-transparent ${colorClass}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{icon}</span>
                        <span>{spk}</span>
                      </span>
                      {isActive && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick helper tools */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="block text-xs font-semibold text-slate-700">
                輔助輸入方式：
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSimulateSpeech}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors flex items-center gap-1"
                  title="模擬訪談對話語句"
                >
                  <Wand2 className="w-3 h-3 text-purple-600" />
                  <span>模擬單句輸入</span>
                </button>

                <label className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3 text-blue-600" />
                  <span>{isUploadingAudio ? '轉譯中...' : '匯入錄音檔'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    disabled={isUploadingAudio}
                    className="hidden"
                  />
                </label>
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
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-normal">
                  共 {activeRecord.transcripts.length} 則對話
                </span>
              </h3>
            </div>

            {/* Filter pills */}
            <div className="flex items-center space-x-2 text-xs">
              <select
                value={filterSpeaker}
                onChange={(e) => setFilterSpeaker(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">所有發言角色</option>
                <option value="導師">僅看 導師</option>
                <option value="家長">僅看 家長</option>
                <option value="學生">僅看 學生</option>
                <option value="輔導員">僅看 輔導員</option>
              </select>

              <button
                type="button"
                onClick={() => setFilterOnlyFlagged(!filterOnlyFlagged)}
                className={`px-2.5 py-1 rounded-md border text-xs transition-colors flex items-center gap-1 ${
                  filterOnlyFlagged
                    ? 'bg-amber-100 text-amber-800 border-amber-300 font-medium'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>僅看重點標記</span>
              </button>
            </div>
          </div>

          {/* Transcript Feed Scrollable Area */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[520px] space-y-3 bg-slate-50/40">
            {filteredTranscripts.length === 0 && !interimText && (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                <Mic className="w-10 h-10 text-slate-300 animate-pulse" />
                <p className="text-sm font-medium">尚未開始收音或尚無轉譯文字</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  請點擊左側「開始收音」，系統將自動捕捉家庭訪問現場發言並即時轉譯至螢幕。
                </p>
              </div>
            )}

            {filteredTranscripts.map((t) => {
              const isTeacher = t.speaker === '導師';
              const isParent = t.speaker === '家長';
              const isStudent = t.speaker === '學生';
              const isCounselor = t.speaker === '輔導員';

              let badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
              if (isTeacher) badgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
              if (isParent) badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
              if (isStudent) badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
              if (isCounselor) badgeColor = 'bg-purple-100 text-purple-900 border-purple-300';

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
                          value={t.speaker}
                          onChange={(e) => handleChangeItemSpeaker(t.id, e.target.value as SpeakerType)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${badgeColor}`}
                        >
                          <option value="導師">👩‍🏫 導師</option>
                          <option value="家長">👨‍👩‍👧 家長</option>
                          <option value="學生">🧑‍🎓 學生</option>
                          <option value="輔導員">🧑‍💼 輔導員</option>
                          <option value="其他">👥 其他</option>
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
              <div className="p-3.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 animate-pulse">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                    {activeSpeaker} (即時轉譯中...)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>
                <p className="text-sm text-blue-950 font-medium italic">
                  {interimText}
                </p>
              </div>
            )}

            <div ref={transcriptsEndRef} />
          </div>

          {/* Bottom Manual Fast Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form onSubmit={handleAddManualEntry} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap pl-1">
                以「{activeSpeaker}」手動記錄：
              </span>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="輸入重點補充或手動記錄訪談內容，按 Enter 送出..."
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>加入</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
