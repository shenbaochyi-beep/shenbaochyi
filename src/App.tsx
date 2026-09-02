import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LiveRecorder } from './components/LiveRecorder';
import { SummaryEditor } from './components/SummaryEditor';
import { DocumentPreview } from './components/DocumentPreview';
import { ArchiveView } from './components/ArchiveView';
import { VisitSetupModal } from './components/VisitSetupModal';
import { VisitRecord, VisitInfo, VisitSummary, TranscriptItem } from './types';
import { DEFAULT_VISIT_INFO, SAMPLE_RECORDS, SAMPLE_SUMMARY_1, SAMPLE_TRANSCRIPTS_1 } from './utils/sampleData';

const STORAGE_KEY = 'school_home_visit_records_v4';
const LOGO_STORAGE_KEY = 'school_custom_logo_v1';

export default function App() {
  // Custom Logo URL state
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOGO_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const handleUpdateCustomLogo = (url: string | null) => {
    setCustomLogoUrl(url);
    try {
      if (url) {
        localStorage.setItem(LOGO_STORAGE_KEY, url);
      } else {
        localStorage.removeItem(LOGO_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save logo to localStorage:', e);
    }
  };

  // Load saved records or defaults
  const [records, setRecords] = useState<VisitRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: VisitRecord) => {
            if (item?.visitInfo?.teacherName?.includes('林書敏')) {
              return {
                ...item,
                visitInfo: {
                  ...item.visitInfo,
                  teacherName: '王偉仁 老師',
                },
              };
            }
            return item;
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved records from localStorage:', e);
    }
    return SAMPLE_RECORDS;
  });

  // Current active visit record
  const [activeRecordId, setActiveRecordId] = useState<string>(() => {
    return records[0]?.id || 'rec-initial-01';
  });

  const [currentTab, setCurrentTab] = useState<'record' | 'summary' | 'preview' | 'archive'>('record');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Get active record or fallback
  const activeRecord: VisitRecord =
    records.find((r) => r.id === activeRecordId) ||
    records[0] || {
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: '進行中',
      visitInfo: DEFAULT_VISIT_INFO,
      transcripts: [],
      audioDurationSeconds: 0,
    };

  // Sync records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save records to localStorage:', e);
    }
  }, [records]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateActiveRecord = (updates: Partial<VisitRecord>) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === activeRecord.id) {
          return {
            ...r,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );
  };

  const handleUpdateTranscripts = (transcripts: TranscriptItem[]) => {
    updateActiveRecord({ transcripts });
  };

  const handleUpdateSummary = (summary: VisitSummary) => {
    updateActiveRecord({
      summary,
      status: '已生成摘要',
    });
  };

  const handleSaveVisitInfo = (visitInfo: VisitInfo) => {
    updateActiveRecord({ visitInfo });
    showToast('訪視基本資料已更新', 'success');
  };

  // Generate AI Summary using Express / Gemini API
  const handleGenerateSummary = async () => {
    if (activeRecord.transcripts.length === 0) {
      showToast('目前尚無訪談對話紀錄，請先進行收音或手動輸入對話。', 'error');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitInfo: activeRecord.visitInfo,
          transcripts: activeRecord.transcripts,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'AI 摘要生成異常');
      }

      const data = await response.json();
      if (data.summary) {
        handleUpdateSummary(data.summary);
        showToast(
          data.isFallback
            ? '已依標準範本產出訪視公文摘要紀錄。'
            : '✨ Gemini AI 已成功產出家庭訪問綜合重點摘要！',
          'success'
        );
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      showToast(`摘要生成失敗: ${err.message}`, 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleEndAndSummarize = async () => {
    setCurrentTab('summary');
    if (!activeRecord.summary) {
      await handleGenerateSummary();
    }
  };

  const handleNewVisit = () => {
    const newId = `rec-${Date.now()}`;
    const newRecord: VisitRecord = {
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: '進行中',
      visitInfo: {
        ...DEFAULT_VISIT_INFO,
        studentName: '',
        studentId: '',
        visitDate: new Date().toISOString().split('T')[0],
        visitPurpose: '了解開學後生活常規與課業學習情形',
      },
      transcripts: [],
      audioDurationSeconds: 0,
    };

    setRecords((prev) => [newRecord, ...prev]);
    setActiveRecordId(newId);
    setCurrentTab('record');
    setIsSetupModalOpen(true);
    showToast('已建立新家庭訪問紀錄，請填寫基本資料', 'info');
  };

  const handleLoadDemo = () => {
    const demoId = `rec-demo-${Date.now()}`;
    const demoRecord: VisitRecord = {
      id: demoId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: '已生成摘要',
      visitInfo: {
        ...DEFAULT_VISIT_INFO,
        studentName: '陳冠宇',
        className: '一年忠班',
      },
      transcripts: SAMPLE_TRANSCRIPTS_1,
      summary: SAMPLE_SUMMARY_1,
      audioDurationSeconds: 675,
    };

    setRecords((prev) => [demoRecord, ...prev]);
    setActiveRecordId(demoId);
    setCurrentTab('record');
    showToast('已載入示範訪視對話與 AI 摘要紀錄', 'success');
  };

  const handleDeleteRecord = (id: string) => {
    if (records.length <= 1) {
      showToast('至少需保留一筆紀錄', 'error');
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (activeRecordId === id) {
      const remaining = records.filter((r) => r.id !== id);
      setActiveRecordId(remaining[0].id);
    }
    showToast('已刪除該筆訪視紀錄', 'info');
  };

  const handleSelectRecord = (record: VisitRecord) => {
    setActiveRecordId(record.id);
    if (record.summary) {
      setCurrentTab('preview');
    } else {
      setCurrentTab('record');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRecord={activeRecord}
        customLogoUrl={customLogoUrl}
        onNewVisit={handleNewVisit}
        onLoadDemo={handleLoadDemo}
        onOpenSetup={() => setIsSetupModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'record' && (
          <LiveRecorder
            activeRecord={activeRecord}
            onUpdateTranscripts={handleUpdateTranscripts}
            onEndAndSummarize={handleEndAndSummarize}
            onOpenSetup={() => setIsSetupModalOpen(true)}
          />
        )}

        {currentTab === 'summary' && (
          <SummaryEditor
            activeRecord={activeRecord}
            onUpdateSummary={handleUpdateSummary}
            onGenerateSummary={handleGenerateSummary}
            isGenerating={isGeneratingSummary}
            onGoToPreview={() => setCurrentTab('preview')}
          />
        )}

        {currentTab === 'preview' && (
          <DocumentPreview
            activeRecord={activeRecord}
            customLogoUrl={customLogoUrl}
            onBackToEdit={() => setCurrentTab('summary')}
          />
        )}

        {currentTab === 'archive' && (
          <ArchiveView
            records={records}
            onSelectRecord={handleSelectRecord}
            onDeleteRecord={handleDeleteRecord}
            onNewVisit={handleNewVisit}
          />
        )}
      </main>

      {/* Setup Modal */}
      <VisitSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        visitInfo={activeRecord.visitInfo}
        onSave={handleSaveVisitInfo}
        customLogoUrl={customLogoUrl}
        onUpdateCustomLogo={handleUpdateCustomLogo}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-600'
                : toastMessage.type === 'error'
                ? 'bg-rose-800 text-white border-rose-600'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
