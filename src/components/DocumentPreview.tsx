import React, { useState } from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  FileCode,
  FileText,
  Share2,
  Sparkles,
  ArrowLeft,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { VisitRecord, CurrentUser } from '../types';
import { exportVisitRecordToDocx } from '../services/docxExportService';
import { SchoolLogo } from './SchoolLogo';

interface DocumentPreviewProps {
  activeRecord: VisitRecord;
  customLogoUrl?: string | null;
  onBackToEdit: () => void;
  currentUser: CurrentUser;
  onSwitchToVisitingTeacher?: () => void;
  onReturnToRecord?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  activeRecord,
  customLogoUrl,
  onBackToEdit,
  currentUser,
  onSwitchToVisitingTeacher,
  onReturnToRecord,
}) => {
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [permissionDeniedToast, setPermissionDeniedToast] = useState(false);

  const { visitInfo, summary, transcripts } = activeRecord;
  const visitingTeacher = visitInfo.teacherName || '王偉仁 老師';

  // Authorization check: Only this visit's teacher can preview/download, or academic dean (Hu Fang-Yi)
  const isVisitingTeacher =
    currentUser.role === 'teacher' &&
    currentUser.name.trim().replace(/\s+/g, '') === visitingTeacher.trim().replace(/\s+/g, '');
  const isDean = currentUser.role === 'dean' && Boolean(currentUser.isDeanAuthenticated);
  const canDownload = isVisitingTeacher || isDean;

  const triggerPermissionWarning = () => {
    setPermissionDeniedToast(true);
    setTimeout(() => setPermissionDeniedToast(false), 3500);
  };

  // If user is neither this visit's teacher nor academic dean, block both preview and download completely
  if (!canDownload) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Top banner */}
          <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-6 sm:p-8 text-center relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/90 border-2 border-rose-400/80 shadow-lg mb-4 p-1">
              <SchoolLogo customLogoUrl={customLogoUrl} size={56} className="w-14 h-14 rounded-full" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 text-xs font-semibold mb-2">
              國立成功商業水產職業學校 · 校園資安與個資隱私防護
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-wide">
              官方公文預覽與下載權限管制
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg mx-auto">
              依校園學生個人資料保護規範，家庭訪問公文表涉及學生家庭處遇與身心輔導紀錄
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Security Notice Box */}
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-5 text-rose-950 flex items-start gap-4">
              <ShieldAlert className="w-7 h-7 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs sm:text-sm">
                <p className="font-bold text-rose-900 text-base">
                  【資安嚴格管制：僅供本次家訪導師預覽與下載】
                </p>
                <p className="text-rose-800 leading-relaxed">
                  本份官方公文紀錄之訪視導師為【<strong className="text-rose-950 font-bold">{visitingTeacher}</strong>】（訪視學生：{visitInfo.studentName}，班級：{visitInfo.className}）。
                </p>
                <p className="text-rose-800 leading-relaxed font-semibold">
                  依學校資安及個資保護規範：其他導師均<span className="text-rose-600 font-bold underline decoration-2 underline-offset-2">禁止預覽公文內容</span>，且<span className="text-rose-600 font-bold underline decoration-2 underline-offset-2">禁止下載 Word / PDF 檔案或複製內容</span>。
                </p>
                <div className="mt-3 pt-3 border-t border-rose-200/80 flex flex-wrap items-center gap-2 text-xs text-rose-900">
                  <span>您目前登入身分：</span>
                  <span className="px-2.5 py-0.5 rounded bg-rose-200 text-rose-950 font-bold">
                    {currentUser.name}
                  </span>
                  <span className="text-rose-600 font-semibold">(非本次家訪導師，權限已被封鎖)</span>
                </div>
              </div>
            </div>

            {/* Switch / Back actions */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="text-xs font-semibold text-slate-700">
                若您為本次家訪導師，請點選下方按鈕切換身分以解除管制：
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {onSwitchToVisitingTeacher && (
                  <button
                    onClick={onSwitchToVisitingTeacher}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>切換為本次家訪導師【{visitingTeacher}】</span>
                  </button>
                )}

                <button
                  onClick={onBackToEdit}
                  className="w-full sm:w-auto py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回 AI 重點摘要</span>
                </button>

                {onReturnToRecord && (
                  <button
                    onClick={onReturnToRecord}
                    className="w-full sm:w-auto py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>返回即時紀錄</span>
                  </button>
                )}
              </div>
            </div>

            <div className="text-center text-xs text-slate-400">
              提示：亦可於右上角直接切換登入導師；學務主任胡方奕（帳號 slvssa300300）具備督導權限。
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Word (.docx) Export
  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportVisitRecordToDocx(activeRecord);
    } catch (err: any) {
      alert(`Word 匯出失敗: ${err.message}`);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Print / Save as PDF
  const handlePrint = () => {
    window.print();
  };

  // Copy Plain Text for School Administration System
  const handleCopyText = () => {
    const text = `【${visitInfo.schoolName || '學務處'} 導師家庭訪問紀錄表】
學年度/學期：${visitInfo.academicYear} ${visitInfo.semester}
學生姓名：${visitInfo.studentName} (${visitInfo.className} / 座號: ${visitInfo.studentId || '—'})
訪視導師：${visitInfo.teacherName}
訪視時間：${visitInfo.visitDate} ${visitInfo.visitTime || (visitInfo.visitStartTime ? `${visitInfo.visitStartTime} ~ ${visitInfo.visitEndTime}` : '')}${visitInfo.visitDurationMinutes ? ` (約${visitInfo.visitDurationMinutes}分鐘)` : ''}
訪視形式：${visitInfo.visitType} (地點: ${visitInfo.visitLocation})
受訪人員：${visitInfo.attendees}
訪談主旨：${visitInfo.visitPurpose}

一、訪談綜合紀要：
${summary?.executiveSummary || '無'}

二、家庭環境與生活照顧概況：
${summary?.familyEnvironment || '無'}

三、學業表現與在校學習態度：
${summary?.academicPerformance || '無'}

四、身心情緒與同儕人際相處：
${summary?.emotionalAndSocial || '無'}

五、家長管教態度與教育期待：
${summary?.parentDiscipline || '無'}

六、導師輔導建議與後續引導方向：
${summary?.teacherSuggestions || '無'}

七、具體決議與行動方案：
${(summary?.actionItems || []).map((a, i) => `${i + 1}. [${a.responsible}] ${a.item} (${a.deadline || '無期限'})`).join('\n') || '無'}

八、跨處室協處與轉介事項：
${(summary?.crossOfficeReferrals || []).join('、 ') || '無'}

關懷評級：${summary?.careLevel || '一般關懷'} (建議下次追蹤：${summary?.suggestedNextVisitDate || '學期末'})`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Download Transcript TXT
  const handleDownloadTranscriptTxt = () => {
    const content = transcripts
      .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}${t.isFlagged ? ' (★' + (t.flagCategory || '重點') + ')' : ''}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${visitInfo.className}_${visitInfo.studentName}_家庭訪問逐字稿_${visitInfo.visitDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Security Permission Alert Banner */}
      {!canDownload ? (
        <div className="print:hidden bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-amber-950">
                  資安權限管制：本公文僅供本次家訪導師下載
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-200/80 text-amber-800">
                  其他導師僅限線上閱覽
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                此份紀錄之訪視導師為【<strong className="text-amber-950">{visitingTeacher}</strong>】。您目前身分為【<strong className="text-amber-950">{currentUser.name}</strong>】（非本次訪視導師），依校園資安個資管理規定，無法下載 Word (.docx)、PDF 檔案或複製校務文字。
              </p>
            </div>
          </div>

          {onSwitchToVisitingTeacher && (
            <button
              onClick={onSwitchToVisitingTeacher}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto"
              title={`點擊切換身分為本次訪視導師 ${visitingTeacher}`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>切換為本次導師【{visitingTeacher}】</span>
            </button>
          )}
        </div>
      ) : isDean ? (
        <div className="print:hidden bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5 text-purple-900 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>
              <strong>學務主任 胡方奕</strong> (slvssa300300) — 最高行政督導查核權限，已開放公文查閱與檔案下載。
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-200 text-purple-800 font-semibold flex-shrink-0">
            主管下載核可
          </span>
        </div>
      ) : (
        <div className="print:hidden bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-emerald-900 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              身分驗證核可：您為本次家訪導師【<strong>{visitingTeacher}</strong>】，已授權正式公文 Word 檔下載、PDF 列印與校務文字匯出權限。
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 font-semibold flex-shrink-0">
            導師授權有效
          </span>
        </div>
      )}

      {/* Permission Denied Toast */}
      {permissionDeniedToast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className="bg-rose-800 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border border-rose-600">
            <Lock className="w-4 h-4 text-rose-200" />
            <span>資安限制：非本次家訪導師（{visitingTeacher}），無法執行下載或複製！</span>
          </div>
        </div>
      )}

      {/* Top Controls Bar (Hidden during window.print) */}
      <div className="print:hidden bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToEdit}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            title="返回編輯摘要"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>家庭訪問紀錄表 — 公文預覽與文件下載</span>
              {!canDownload && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-normal border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-700" />
                  下載已鎖定 (僅限本訪視導師)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              支援下載標準 Word (.docx) 檔、列印儲存 PDF 及一鍵複製校務文字
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Plain Text */}
          <button
            id="btn-copy-text"
            onClick={canDownload ? handleCopyText : triggerPermissionWarning}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              canDownload
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={canDownload ? '複製純文字內容以供貼入校務行政系統' : `資安管制：僅限本次家訪導師（${visitingTeacher}）可複製公文`}
          >
            {!canDownload && <Lock className="w-3.5 h-3.5 text-slate-400" />}
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">已複製公文文字</span>
              </>
            ) : (
              <>
                {canDownload && <Copy className="w-3.5 h-3.5" />}
                <span>複製校務文字</span>
              </>
            )}
          </button>

          {/* Download TXT */}
          <button
            id="btn-download-txt"
            onClick={canDownload ? handleDownloadTranscriptTxt : triggerPermissionWarning}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              canDownload
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={canDownload ? '下載完整對話逐字稿純文字檔' : `資安管制：僅限本次家訪導師（${visitingTeacher}）可下載逐字稿`}
          >
            {!canDownload ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <FileText className="w-3.5 h-3.5" />}
            <span>下載逐字稿 (.txt)</span>
          </button>

          {/* Print / Save PDF */}
          <button
            id="btn-print-pdf"
            onClick={canDownload ? handlePrint : triggerPermissionWarning}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5 ${
              canDownload
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
            }`}
            title={canDownload ? '列印本表單或儲存為 PDF' : `資安管制：僅限本次家訪導師（${visitingTeacher}）可列印/儲存 PDF`}
          >
            {!canDownload ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Printer className="w-3.5 h-3.5" />}
            <span>列印 / 存為 PDF</span>
          </button>

          {/* Download Docx */}
          <button
            id="btn-download-docx"
            onClick={canDownload ? handleDownloadDocx : triggerPermissionWarning}
            disabled={canDownload ? isExportingDocx : false}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${
              canDownload
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
            }`}
            title={canDownload ? '下載完整格式 Word 公文表' : `資安管制：僅限本次家訪導師（${visitingTeacher}）可下載 Word 公文`}
          >
            {!canDownload ? <Lock className="w-4 h-4 text-slate-500" /> : <Download className="w-4 h-4" />}
            <span>
              {!canDownload
                ? 'Word 檔 (未授權下載)'
                : isExportingDocx
                ? '正在打包 Word...'
                : '下載 Word 檔 (.docx)'}
            </span>
          </button>
        </div>
      </div>

      {/* Official Document A4 Preview Sheet */}
      <div 
        id="official-doc-sheet"
        className="bg-white shadow-lg border border-slate-300 rounded-sm p-8 sm:p-12 text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* Document Header with School Emblem */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 gap-4">
          <div className="flex-shrink-0">
            <SchoolLogo customLogoUrl={customLogoUrl} size={64} className="w-16 h-16" />
          </div>
          <div className="flex-1 text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-wider font-serif">
              {visitInfo.schoolName || '國立成功商業水產職業學校'}
            </h1>
            <h2 className="text-lg font-bold tracking-wide font-serif text-slate-800">
              {visitInfo.academicYear || '114學年度'} {visitInfo.semester || '第1學期'} 學務處導師家庭訪問紀錄表
            </h2>
          </div>
          <div className="w-16 flex-shrink-0 hidden sm:block text-right">
            <span className="text-[10px] text-slate-400 font-mono">CKVS-F01</span>
          </div>
        </div>

        {/* Metadata Grid Table */}
        <div className="mt-4 border border-slate-900 overflow-hidden text-xs">
          <div className="grid grid-cols-12 border-b border-slate-900">
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              學生姓名
            </div>
            <div className="col-span-4 p-2 font-semibold border-r border-slate-900">
              {visitInfo.studentName} ({visitInfo.studentGender || '—'})
            </div>
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              班級 / 座號
            </div>
            <div className="col-span-4 p-2 font-semibold">
              {visitInfo.className} / {visitInfo.studentId || '—'} 號
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-slate-900">
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              訪視導師
            </div>
            <div className="col-span-4 p-2 border-r border-slate-900">
              {visitInfo.teacherName}
            </div>
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              隨同人員
            </div>
            <div className="col-span-4 p-2">
              {visitInfo.accompanyStaff || '無'}
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-slate-900">
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              訪視日期時間
            </div>
            <div className="col-span-4 p-2 border-r border-slate-900">
              {visitInfo.visitDate} ({visitInfo.visitTime || (visitInfo.visitStartTime ? `${visitInfo.visitStartTime} ~ ${visitInfo.visitEndTime}` : '—')})
              {visitInfo.visitDurationMinutes ? (
                <span className="text-xs text-slate-600 ml-1">
                  [共{visitInfo.visitDurationMinutes}分鐘]
                </span>
              ) : null}
            </div>
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              訪視形式
            </div>
            <div className="col-span-4 p-2">
              {visitInfo.visitType}
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-slate-900">
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              訪視地點
            </div>
            <div className="col-span-4 p-2 border-r border-slate-900">
              {visitInfo.visitLocation || '學生自宅'}
            </div>
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              受訪對象關係
            </div>
            <div className="col-span-4 p-2">
              {visitInfo.attendees || '家長與學生'}
            </div>
          </div>

          <div className="grid grid-cols-12">
            <div className="col-span-2 bg-slate-100 p-2 font-bold text-center border-r border-slate-900">
              訪視主旨與目的
            </div>
            <div className="col-span-10 p-2">
              {visitInfo.visitPurpose || '生活作息與課業適應關懷'}
            </div>
          </div>
        </div>

        {/* Structured Sections Table */}
        <div className="mt-4 border border-slate-900 text-xs divide-y divide-slate-900">
          {/* Section 1 */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-50 p-3 font-bold border-r border-slate-900 flex items-center">
              一、訪談綜合紀要
            </div>
            <div className="col-span-9 p-3 leading-relaxed whitespace-pre-line text-slate-800">
              {summary?.executiveSummary || '尚未填寫'}
            </div>
          </div>

          {/* Section 2 */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-50 p-3 font-bold border-r border-slate-900 flex items-center">
              二、家庭環境與生活照顧概況
            </div>
            <div className="col-span-9 p-3 leading-relaxed whitespace-pre-line text-slate-800">
              {summary?.familyEnvironment || '尚未填寫'}
            </div>
          </div>

          {/* Section 3 */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-50 p-3 font-bold border-r border-slate-900 flex items-center">
              三、學業表現與學習態度交流
            </div>
            <div className="col-span-9 p-3 leading-relaxed whitespace-pre-line text-slate-800">
              {summary?.academicPerformance || '尚未填寫'}
            </div>
          </div>

          {/* Section 4 */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-50 p-3 font-bold border-r border-slate-900 flex items-center">
              四、身心情緒與同儕人際相處
            </div>
            <div className="col-span-9 p-3 leading-relaxed whitespace-pre-line text-slate-800">
              {summary?.emotionalAndSocial || '尚未填寫'}
            </div>
          </div>

          {/* Section 5 */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-50 p-3 font-bold border-r border-slate-900 flex items-center">
              五、家長管教態度與親職期待
            </div>
            <div className="col-span-9 p-3 leading-relaxed whitespace-pre-line text-slate-800">
              {summary?.parentDiscipline || '尚未填寫'}
            </div>
          </div>

          {/* Section 6 */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-50 p-3 font-bold border-r border-slate-900 flex items-center">
              六、導師輔導建議與後續策略
            </div>
            <div className="col-span-9 p-3 leading-relaxed whitespace-pre-line text-slate-800">
              {summary?.teacherSuggestions || '尚未填寫'}
            </div>
          </div>

          {/* Section 7 */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-50 p-3 font-bold border-r border-slate-900 flex items-center">
              七、跨處室協處與轉介建議
            </div>
            <div className="col-span-9 p-3 leading-relaxed text-slate-800">
              {(summary?.crossOfficeReferrals || []).join('、 ') || '導師持續生活常規觀察。'}
            </div>
          </div>

          {/* Section 8 */}
          <div className="grid grid-cols-12">
            <div className="col-span-3 bg-slate-50 p-3 font-bold border-r border-slate-900 flex items-center">
              八、關懷等級與追蹤期程
            </div>
            <div className="col-span-9 p-3 leading-relaxed text-slate-800 font-semibold flex items-center justify-between">
              <span>【關懷評級】：{summary?.careLevel || '一般關懷'}</span>
              <span className="text-slate-600 font-normal">
                【建議下次追蹤】：{summary?.suggestedNextVisitDate || '學期末視情況'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Items Sub-table */}
        <div className="mt-4">
          <h4 className="text-xs font-bold text-slate-900 mb-1">
            【具體決議與行動方案】
          </h4>
          <table className="w-full border-collapse border border-slate-900 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900">
                <th className="border-r border-slate-900 p-1.5 text-center w-12">編號</th>
                <th className="border-r border-slate-900 p-1.5 text-left">決議與具體行動方案</th>
                <th className="border-r border-slate-900 p-1.5 text-center w-24">負責對象</th>
                <th className="border-r border-slate-900 p-1.5 text-center w-16">優先級</th>
                <th className="p-1.5 text-center w-28">預定完成期程</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.actionItems || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-2 text-center text-slate-400">
                    無特定待辦行動項目
                  </td>
                </tr>
              ) : (
                (summary?.actionItems || []).map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-slate-900">
                    <td className="border-r border-slate-900 p-1.5 text-center">{idx + 1}</td>
                    <td className="border-r border-slate-900 p-1.5">{item.item}</td>
                    <td className="border-r border-slate-900 p-1.5 text-center font-medium">{item.responsible}</td>
                    <td className="border-r border-slate-900 p-1.5 text-center">{item.priority}</td>
                    <td className="p-1.5 text-center">{item.deadline || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Official Signature Blocks */}
        <div className="mt-6 border border-slate-900 text-xs">
          <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-900 text-center font-bold">
            <div className="p-2 border-r border-slate-900">訪視導師簽章</div>
            <div className="p-2 border-r border-slate-900">學務處生輔/訓育組長</div>
            <div className="p-2 border-r border-slate-900">學務主任核章</div>
            <div className="p-2">校長核閱</div>
          </div>
          <div className="grid grid-cols-4 h-20 text-center text-slate-400 divide-x divide-slate-900">
            <div className="p-2 flex flex-col justify-end">
              <span className="text-slate-800 font-semibold">{visitInfo.teacherName} (簽章)</span>
            </div>
            <div className="p-2 flex flex-col justify-end">
              <span>(核章)</span>
            </div>
            <div className="p-2 flex flex-col justify-end">
              <span>(核章)</span>
            </div>
            <div className="p-2 flex flex-col justify-end">
              <span>(核章)</span>
            </div>
          </div>
        </div>

        {/* Appendix: Dialogue Transcript Log */}
        <div className="mt-8 pt-6 border-t border-dashed border-slate-400 text-xs space-y-2">
          <h4 className="font-bold text-slate-800">
            【附件：訪談逐字即時轉譯紀錄】(共 {transcripts.length} 則對話)
          </h4>
          <div className="space-y-1.5 pl-2 text-slate-700">
            {transcripts.map((t) => (
              <p key={t.id} className="leading-relaxed">
                <span className="font-mono text-slate-400">[{t.timestamp}] </span>
                <span className="font-bold text-slate-900">{t.speaker}：</span>
                <span>{t.text}</span>
                {t.isFlagged && (
                  <span className="text-amber-700 font-semibold"> 【★{t.flagCategory || '重點'}】</span>
                )}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
