import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LiveRecorder } from './components/LiveRecorder';
import { SummaryEditor } from './components/SummaryEditor';
import { DocumentPreview } from './components/DocumentPreview';
import { ArchiveView } from './components/ArchiveView';
import { VisitSetupModal } from './components/VisitSetupModal';
import { VisitRecord, VisitInfo, VisitSummary, TranscriptItem, CurrentUser } from './types';
import { 
  DEFAULT_VISIT_INFO, 
  INITIAL_NEW_VISIT_INFO, 
  SAMPLE_RECORDS, 
  SAMPLE_SUMMARY_1, 
  SAMPLE_TRANSCRIPTS_1,
  getMatchedClassForTeacher 
} from './utils/sampleData';
import { getInitialCurrentUser, saveCurrentUser, DEAN_CREDENTIALS, DEAN_USER, DEFAULT_TEACHER_USER } from './utils/auth';
import { safeFetchJson, generateLocalFallbackSummary } from './utils/apiUtils';

const STORAGE_KEY = 'school_home_visit_records_v4';
const LOGO_STORAGE_KEY = 'school_custom_logo_v1';

export default function App() {
  // Current logged in user (teacher or Dean)
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => getInitialCurrentUser());

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

  // Check if teacher has been established via New Visit Setup in this session
  const [hasEstablishedTeacher, setHasEstablishedTeacher] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('has_established_teacher_v1') === 'true';
    } catch {
      return false;
    }
  });

  // Load saved records or defaults
  const [records, setRecords] = useState<VisitRecord[]>(() => {
    const isTeacherEstablished = (() => {
      try {
        return sessionStorage.getItem('has_established_teacher_v1') === 'true';
      } catch {
        return false;
      }
    })();

    const initialNewRecord: VisitRecord = {
      id: 'rec-init-new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: '進行中',
      visitInfo: INITIAL_NEW_VISIT_INFO,
      transcripts: [],
      audioDurationSeconds: 0,
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loaded = parsed.map((item: VisitRecord) => {
            const updatedInfo = item.visitInfo
              ? {
                  ...item.visitInfo,
                  schoolName: '國立成功商業水產職業學校',
                  academicYear: (!item.visitInfo.academicYear || item.visitInfo.academicYear === '114學年度') ? '115學年度' : item.visitInfo.academicYear,
                  className: item.visitInfo.className === '一年教班' ? '一年孝班' : item.visitInfo.className,
                  studentName: item.visitInfo.studentName || '',
                  studentId: item.visitInfo.studentId || '',
                  teacherName: item.visitInfo.teacherName?.includes('林書敏')
                    ? '王偉仁 老師'
                    : item.visitInfo.teacherName,
                }
              : item.visitInfo;
            return {
              ...item,
              visitInfo: updatedInfo,
            };
          });

          if (!isTeacherEstablished) {
            return [initialNewRecord, ...loaded.filter((r) => r.id !== 'rec-init-new')];
          }
          return loaded;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved records from localStorage:', e);
    }

    if (!isTeacherEstablished) {
      return [initialNewRecord, ...SAMPLE_RECORDS];
    }
    return SAMPLE_RECORDS;
  });

  // Current active visit record
  const [activeRecordId, setActiveRecordId] = useState<string>(() => {
    return records[0]?.id || 'rec-init-new';
  });

  const [currentTab, setCurrentTab] = useState<'record' | 'summary' | 'preview' | 'archive'>('record');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('has_established_teacher_v1') !== 'true';
    } catch {
      return true;
    }
  });
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

  // Sync currentUser to localStorage
  useEffect(() => {
    saveCurrentUser(currentUser);
  }, [currentUser]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSwitchTeacher = (teacherName: string) => {
    const updated: CurrentUser = {
      role: 'teacher',
      name: teacherName,
      title: '訪視導師',
      isDeanAuthenticated: false,
    };
    setCurrentUser(updated);
    showToast(`已切換目前登入身分為導師：${teacherName}`, 'info');
  };

  const handleDeanLogin = (account: string): boolean => {
    const clean = account.trim().toLowerCase();
    if (clean === DEAN_CREDENTIALS.account.toLowerCase()) {
      setCurrentUser(DEAN_USER);
      showToast(`🎉 歡迎學務主任 ${DEAN_CREDENTIALS.name}！已完成安全驗證，開啟歷年家庭訪問資料庫。`, 'success');
      return true;
    }
    return false;
  };

  const handleDeanLogout = () => {
    const fallbackTeacher = activeRecord.visitInfo.teacherName || DEFAULT_TEACHER_USER.name;
    const updated: CurrentUser = {
      role: 'teacher',
      name: fallbackTeacher,
      title: '訪視導師',
      isDeanAuthenticated: false,
    };
    setCurrentUser(updated);
    showToast('已安全登出學務主任帳號，恢復為導師身分。', 'info');
  };

  const handleSwitchToVisitingTeacher = () => {
    const visitingTeacher = activeRecord.visitInfo.teacherName || '王偉仁 老師';
    handleSwitchTeacher(visitingTeacher);
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
    const teacherName = visitInfo.teacherName || '王偉仁 老師';
    handleSwitchTeacher(teacherName);
    setHasEstablishedTeacher(true);
    try {
      sessionStorage.setItem('has_established_teacher_v1', 'true');
    } catch (e) {
      // ignore
    }
    showToast(`🎉 已成功建立家訪基本資料！目前登入導師為【${teacherName}】`, 'success');
  };

  // Generate AI Summary using Express / Gemini API
  const handleGenerateSummary = async () => {
    if (activeRecord.transcripts.length === 0) {
      showToast('目前尚無訪談對話紀錄，請先進行收音或手動輸入對話。', 'error');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const res = await safeFetchJson<{
        summary: VisitSummary;
        isFallback?: boolean;
        warning?: string;
      }>(
        '/api/generate-summary',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitInfo: activeRecord.visitInfo,
            transcripts: activeRecord.transcripts,
          }),
        },
        25000
      );

      if (res.ok && res.data?.summary) {
        handleUpdateSummary(res.data.summary);
        showToast(
          res.data.isFallback
            ? (res.data.warning || '已依教育部規範標準產出結構化家庭訪問摘要報告。')
            : '✨ Gemini AI 已成功產出家庭訪問綜合重點摘要！',
          'success'
        );
      } else {
        // Safe automatic client fallback: If backend returns HTML (e.g. 504 Gateway Timeout)
        // or fails, generate standard compliant summary from recorded transcripts
        console.warn('Backend summary request returned error or non-JSON:', res.error);
        const fallbackSummary = generateLocalFallbackSummary(
          activeRecord.visitInfo,
          activeRecord.transcripts,
          res.error || '連線逾時備援機制'
        );
        handleUpdateSummary(fallbackSummary);
        showToast(
          `✨ 已自動彙整產出教育部標準家庭訪問摘要（${res.error ? '雲端連線忙碌，已自動啟動備援' : '備援引擎'}）。`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Error in handleGenerateSummary:', err);
      const localFallback = generateLocalFallbackSummary(
        activeRecord.visitInfo,
        activeRecord.transcripts,
        err.message || '本機備援'
      );
      handleUpdateSummary(localFallback);
      showToast('已依訪談紀錄產出標準家庭訪問摘要（本機備援）。', 'success');
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
    const currentTeacher = currentUser.name || activeRecord.visitInfo.teacherName || '王偉仁 老師';
    const currentClass = getMatchedClassForTeacher(currentTeacher) || '一年忠班';
    const newRecord: VisitRecord = {
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: '進行中',
      visitInfo: {
        ...INITIAL_NEW_VISIT_INFO,
        academicYear: '115學年度',
        teacherName: currentTeacher,
        className: currentClass,
        studentName: '',
        studentId: '',
        visitDate: new Date().toISOString().split('T')[0],
      },
      transcripts: [],
      audioDurationSeconds: 0,
    };

    setRecords((prev) => [newRecord, ...prev]);
    setActiveRecordId(newId);
    setCurrentTab('record');
    setHasEstablishedTeacher(false);
    try {
      sessionStorage.removeItem('has_established_teacher_v1');
    } catch (e) {
      // ignore
    }
    setIsSetupModalOpen(true);
    showToast('已開啟新建家訪選單，請填寫導師與基本資料', 'info');
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
    setHasEstablishedTeacher(true);
    try {
      sessionStorage.setItem('has_established_teacher_v1', 'true');
    } catch (e) {
      // ignore
    }
    const demoTeacher = demoRecord.visitInfo.teacherName || '王偉仁 老師';
    handleSwitchTeacher(demoTeacher);
    showToast(`已載入示範訪視對話與 AI 摘要紀錄，登入導師為【${demoTeacher}】`, 'success');
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
    if (record.id !== 'rec-init-new' && (record.transcripts.length > 0 || record.summary || record.visitInfo.teacherName)) {
      setHasEstablishedTeacher(true);
      try {
        sessionStorage.setItem('has_established_teacher_v1', 'true');
      } catch (e) {
        // ignore
      }
    }
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
        currentUser={currentUser}
        onSwitchTeacher={handleSwitchTeacher}
        onDeanLogout={handleDeanLogout}
        onNewVisit={handleNewVisit}
        onLoadDemo={handleLoadDemo}
        onOpenSetup={() => setIsSetupModalOpen(true)}
        hasEstablishedTeacher={hasEstablishedTeacher}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'record' && (
          <LiveRecorder
            activeRecord={activeRecord}
            onUpdateTranscripts={handleUpdateTranscripts}
            onEndAndSummarize={handleEndAndSummarize}
            onOpenSetup={() => setIsSetupModalOpen(true)}
            hasEstablishedTeacher={hasEstablishedTeacher}
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
            currentUser={currentUser}
            onSwitchToVisitingTeacher={handleSwitchToVisitingTeacher}
            onBackToEdit={() => setCurrentTab('summary')}
            onReturnToRecord={() => setCurrentTab('record')}
          />
        )}

        {currentTab === 'archive' && (
          <ArchiveView
            records={records}
            onSelectRecord={handleSelectRecord}
            onDeleteRecord={handleDeleteRecord}
            onNewVisit={handleNewVisit}
            currentUser={currentUser}
            onDeanLogin={handleDeanLogin}
            onDeanLogout={handleDeanLogout}
            onReturnToRecord={() => setCurrentTab('record')}
            customLogoUrl={customLogoUrl}
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
        currentUser={currentUser}
        onDeanLogin={handleDeanLogin}
        hasEstablishedTeacher={hasEstablishedTeacher}
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
