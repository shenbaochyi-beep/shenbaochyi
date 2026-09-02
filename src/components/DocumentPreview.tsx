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
  ArrowLeft
} from 'lucide-react';
import { VisitRecord } from '../types';
import { exportVisitRecordToDocx } from '../services/docxExportService';
import { SchoolLogo } from './SchoolLogo';

interface DocumentPreviewProps {
  activeRecord: VisitRecord;
  customLogoUrl?: string | null;
  onBackToEdit: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  activeRecord,
  customLogoUrl,
  onBackToEdit,
}) => {
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  const { visitInfo, summary, transcripts } = activeRecord;

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
訪視時間：${visitInfo.visitDate} ${visitInfo.visitTime}
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
            <h2 className="text-lg font-bold text-slate-900">
              家庭訪問紀錄表 — 公文預覽與文件下載
            </h2>
            <p className="text-xs text-slate-500">
              支援下載標準 Word (.docx) 檔、列印儲存 PDF 及一鍵複製校務文字
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-copy-text"
            onClick={handleCopyText}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
            title="複製純文字內容以供貼入校務行政系統"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">已複製公文文字</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>複製校務文字</span>
              </>
            )}
          </button>

          <button
            id="btn-download-txt"
            onClick={handleDownloadTranscriptTxt}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
            title="下載完整對話逐字稿純文字檔"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>下載逐字稿 (.txt)</span>
          </button>

          <button
            id="btn-print-pdf"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>列印 / 存為 PDF</span>
          </button>

          <button
            id="btn-download-docx"
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingDocx ? '正在打包 Word...' : '下載 Word 檔 (.docx)'}</span>
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
              {visitInfo.visitDate} ({visitInfo.visitTime || '—'})
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
