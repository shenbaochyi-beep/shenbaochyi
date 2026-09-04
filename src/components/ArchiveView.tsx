import React, { useState } from 'react';
import {
  History,
  Search,
  Calendar,
  User,
  School,
  Sparkles,
  FileText,
  Trash2,
  Download,
  Plus,
  ExternalLink,
  Tag,
  CheckCircle2,
  Lock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  KeyRound,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { VisitRecord, CareLevel, CurrentUser } from '../types';
import { 
  CLASS_OPTIONS, 
  TEACHER_OPTIONS, 
  CLASS_TO_TEACHER_MAP, 
  TEACHER_TO_CLASS_MAP, 
  getMatchedTeacherForClass, 
  getMatchedClassForTeacher 
} from '../utils/sampleData';
import { SchoolLogo } from './SchoolLogo';

interface ArchiveViewProps {
  records: VisitRecord[];
  onSelectRecord: (record: VisitRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNewVisit: () => void;
  currentUser: CurrentUser;
  onDeanLogin: (account: string) => boolean;
  onDeanLogout: () => void;
  onReturnToRecord: () => void;
  customLogoUrl?: string | null;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  records,
  onSelectRecord,
  onDeleteRecord,
  onNewVisit,
  currentUser,
  onDeanLogin,
  onDeanLogout,
  onReturnToRecord,
  customLogoUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [filterCareLevel, setFilterCareLevel] = useState<string>('all');

  // Dean Login state inside Archive view
  const [accountInput, setAccountInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAccount = accountInput.trim();
    if (!cleanAccount) {
      setErrorMessage('請輸入學務主任專屬授權帳號');
      return;
    }
    const success = onDeanLogin(cleanAccount);
    if (!success) {
      setErrorMessage('帳號驗證失敗！帳號不符，僅限學務主任專屬帳號 (slvssa300300) 登入。');
    } else {
      setErrorMessage('');
      setAccountInput('');
    }
  };

  // If user is not authenticated as Dean, block access completely and show Dean Login Gate
  if (!currentUser.isDeanAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 text-center relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/90 border-2 border-amber-400/80 shadow-lg mb-4 p-1">
              <SchoolLogo customLogoUrl={customLogoUrl} size={56} className="w-14 h-14 rounded-full" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-semibold mb-2">
              國立成功商業水產職業學校 · 學務處機密檔案庫
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-wide">
              學生歷年家庭訪問歷史資料庫
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg mx-auto">
              涉及學生個人資料保護、家庭隱私與高關懷輔導紀錄之專屬安全管理系統
            </p>
          </div>

          {/* Security Notice Warning */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 text-rose-950">
              <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-bold text-rose-900 text-sm">
                  【資安管制嚴格限制：全體導師均無法查閱】
                </p>
                <p className="text-rose-800 leading-relaxed">
                  依據校園學生個人資料保護法及輔導保密規範，歷年跨班級學生訪視紀錄包含敏感家庭處遇與身心評估，<strong>全體導師皆無權限瀏覽</strong>。本歷史資料庫<strong>僅提供學務主任專屬登入查核</strong>。
                </p>
                <p className="text-rose-700 text-xs pt-1">
                  您目前身分為：<span className="font-semibold underline">{currentUser.name}</span>（導師身分無調閱歷史資料庫權限）
                </p>
              </div>
            </div>

            {/* Login Card */}
            <form onSubmit={handleLoginSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  學務主任身分驗證登入
                </h3>
              </div>

              {/* Title & Name (Fixed) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  授權登入職稱與姓名
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-200/80 border border-slate-300 rounded-lg text-slate-800 text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>學務主任 胡方奕</span>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-normal">
                    系統預設主管
                  </span>
                </div>
              </div>

              {/* Account Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  學務主任專屬登入帳號 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={accountInput}
                    onChange={(e) => {
                      setAccountInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="請輸入學務主任專屬帳號"
                    className="w-full pl-9 pr-28 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAccountInput('slvssa300300');
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded transition-colors"
                  >
                    一鍵帶入帳號
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg text-xs text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  className="w-full sm:flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>以學務主任身分登入資料庫</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnToRecord}
                  className="w-full sm:w-auto py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回即時紀錄</span>
                </button>
              </div>
            </form>

            <div className="text-center text-xs text-slate-400">
              提示：依規定歷史資料庫僅限學務主任【胡方奕】使用，帳號為 <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">slvssa300300</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated as Dean, display full History Database
  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      r.visitInfo.studentName.toLowerCase().includes(term) ||
      r.visitInfo.className.toLowerCase().includes(term) ||
      r.visitInfo.teacherName.toLowerCase().includes(term) ||
      (r.summary?.executiveSummary || '').toLowerCase().includes(term);

    const matchClass =
      filterClass === 'all' || r.visitInfo.className === filterClass;

    const matchTeacher =
      filterTeacher === 'all' || r.visitInfo.teacherName === filterTeacher;

    const matchLevel =
      filterCareLevel === 'all' || r.summary?.careLevel === filterCareLevel;

    return matchSearch && matchClass && matchTeacher && matchLevel;
  });

  const handleExportAllJson = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `成功商水學務處_家庭訪問歷史總備份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Dean Top Security Authorization Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl shadow-md border border-indigo-800/50 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/80 border border-indigo-400/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold">
                學務處最高主管登入授權
              </span>
              <span className="text-xs text-indigo-200">
                帳號：<span className="font-mono text-white font-semibold">slvssa300300</span>
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
              <span>登入身分：學務主任 胡方奕</span>
              <span className="text-xs text-slate-300 font-normal hidden sm:inline">
                (全校 {records.length} 筆跨班歷史家訪總資料庫)
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            onClick={handleExportAllJson}
            className="px-3 py-2 text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
            title="匯出全校所有訪談歷程 JSON 完整備份檔"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>匯出全校備份 (JSON)</span>
          </button>

          <button
            onClick={onNewVisit}
            className="px-3.5 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建家訪</span>
          </button>

          <button
            onClick={onDeanLogout}
            className="px-3 py-2 text-xs bg-rose-900/70 hover:bg-rose-800 text-rose-200 rounded-lg border border-rose-700/60 transition-colors flex items-center gap-1.5 shadow-xs"
            title="登出學務主任並切換回一般導師身分"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>登出主任</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋學生姓名、班級、導師或訪談關鍵字..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={filterTeacher}
            onChange={(e) => {
              const val = e.target.value;
              setFilterTeacher(val);
              if (val !== 'all') {
                const matchedClass = getMatchedClassForTeacher(val);
                if (matchedClass) setFilterClass(matchedClass);
              }
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">所有導師</option>
            {TEACHER_OPTIONS.map((teacher) => (
              <option key={teacher} value={teacher}>
                {teacher}
              </option>
            ))}
          </select>
          <select
            value={filterClass}
            onChange={(e) => {
              const val = e.target.value;
              setFilterClass(val);
              if (val !== 'all') {
                const matchedTeacher = getMatchedTeacherForClass(val);
                if (matchedTeacher) setFilterTeacher(matchedTeacher);
              }
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">所有班級</option>
            {CLASS_OPTIONS.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
          <select
            value={filterCareLevel}
            onChange={(e) => setFilterCareLevel(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">所有關懷等級</option>
            <option value="一般關懷">一般關懷</option>
            <option value="持續追蹤">持續追蹤</option>
            <option value="高度關注">高度關注</option>
            <option value="緊急協處/通報">緊急協處/通報</option>
          </select>
        </div>
      </div>

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">查無符合條件之家庭訪問紀錄</p>
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const hasSummary = Boolean(rec.summary);
            let careLevelColor = 'bg-slate-100 text-slate-800 border-slate-200';
            if (rec.summary?.careLevel === '一般關懷') careLevelColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            if (rec.summary?.careLevel === '持續追蹤') careLevelColor = 'bg-amber-100 text-amber-800 border-amber-300';
            if (rec.summary?.careLevel === '高度關注') careLevelColor = 'bg-orange-100 text-orange-800 border-orange-300';
            if (rec.summary?.careLevel === '緊急協處/通報') careLevelColor = 'bg-rose-100 text-rose-800 border-rose-300';

            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl shadow-xs border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      {rec.visitInfo.className}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${careLevelColor}`}>
                      {rec.summary?.careLevel || '草稿中'}
                    </span>
                  </div>

                  {/* Student Title */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {rec.visitInfo.studentName}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      ({rec.visitInfo.studentGender || '—'} / 座號: {rec.visitInfo.studentId || '—'})
                    </span>
                  </h3>

                  {/* Metadata line */}
                  <div className="text-xs text-slate-500 space-y-1 mt-2">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rec.visitInfo.visitDate} ({rec.visitInfo.visitType})</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>導師：{rec.visitInfo.teacherName}</span>
                    </p>
                  </div>

                  {/* Summary Snippet */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                      {rec.summary?.executiveSummary ||
                        (rec.transcripts.length > 0
                          ? `收錄 ${rec.transcripts.length} 則對話，尚未生成摘要。`
                          : '尚無對話紀錄')}
                    </p>
                  </div>

                  {/* Tags */}
                  {rec.summary?.keyTags && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {rec.summary.keyTags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {rec.transcripts.length} 句轉譯對話
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(rec.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                      title="刪除紀錄"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectRecord(rec)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>開啟調閱</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
