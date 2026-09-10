import React from 'react';
import { 
  FileText, 
  Mic, 
  Sparkles, 
  History, 
  PlusCircle, 
  School,
  Download,
  BookOpen,
  Image as ImageIcon,
  Lock,
  ShieldCheck,
  User,
  Shield
} from 'lucide-react';
import { VisitRecord, CurrentUser } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { TEACHER_OPTIONS } from '../utils/sampleData';

interface HeaderProps {
  currentTab: 'record' | 'summary' | 'preview' | 'archive';
  setCurrentTab: (tab: 'record' | 'summary' | 'preview' | 'archive') => void;
  activeRecord: VisitRecord;
  customLogoUrl?: string | null;
  currentUser: CurrentUser;
  onSwitchTeacher: (name: string) => void;
  onDeanLogout: () => void;
  onNewVisit: () => void;
  onLoadDemo: () => void;
  onOpenSetup: () => void;
  hasEstablishedTeacher?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  activeRecord,
  customLogoUrl,
  currentUser,
  onSwitchTeacher,
  onDeanLogout,
  onNewVisit,
  onLoadDemo,
  onOpenSetup,
  hasEstablishedTeacher = false,
}) => {
  const visitingTeacher = activeRecord.visitInfo.teacherName || '王偉仁 老師';
  const isVisitingTeacher =
    currentUser.role === 'teacher' &&
    currentUser.name.trim().replace(/\s+/g, '') === visitingTeacher.trim().replace(/\s+/g, '');
  const canDownload = isVisitingTeacher || (currentUser.role === 'dean' && currentUser.isDeanAuthenticated);
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & School info */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={onOpenSetup}
              title="點擊自訂或更換校徽圖檔"
              className="group relative focus:outline-none rounded-full"
            >
              <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-sky-400 to-blue-600 shadow-md hover:scale-105 transition-transform flex items-center justify-center">
                <SchoolLogo customLogoUrl={customLogoUrl} className="w-10 h-10 rounded-full" />
              </div>
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 border border-blue-700/50 font-medium">
                  {activeRecord.visitInfo.schoolName || '國立成功商業水產職業學校'}
                </span>
                <span className="text-xs text-slate-400">
                  {activeRecord.visitInfo.academicYear} {activeRecord.visitInfo.semester}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-100 tracking-wide flex items-center gap-1.5">
                導師家庭訪問即時記錄系統
              </h1>
            </div>
          </div>

          {/* Current Student Quick Pill */}
          <div 
            onClick={onOpenSetup}
            className="hidden xl:flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-full px-3 py-1.5 cursor-pointer transition-colors"
            title="點擊修改訪視基本資料"
          >
            <span className={`w-2 h-2 rounded-full ${hasEstablishedTeacher ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-xs text-slate-400">受訪學生:</span>
            <span className="text-sm font-semibold text-slate-200">
              {hasEstablishedTeacher && activeRecord.visitInfo.studentName
                ? `${activeRecord.visitInfo.className} ${activeRecord.visitInfo.studentName}`
                : '尚未建立 (點此開啟選單)'}
            </span>
            <span className="text-xs text-blue-400 underline pl-1">
              {hasEstablishedTeacher ? '修改設定' : '前往建立'}
            </span>
          </div>

          {/* User Identity & Security Role Switcher (Hidden until teacher is established via New Visit Setup) */}
          <div className="flex items-center space-x-2">
            {currentUser.isDeanAuthenticated ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-950 to-indigo-950 border border-purple-500/60 text-xs shadow-xs">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 text-left">
                  <span className="font-bold text-white text-xs">學務主任 胡方奕</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-purple-900/90 text-purple-200 font-mono">
                    slvssa300300
                  </span>
                </div>
                <button
                  onClick={onDeanLogout}
                  className="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 transition-colors"
                  title="登出學務主任並切換回一般導師身分"
                >
                  登出
                </button>
              </div>
            ) : hasEstablishedTeacher ? (
              <div 
                id="header-teacher-login-box"
                className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs transition-colors"
              >
                <User className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-slate-400 text-[11px] hidden md:inline">登入導師:</span>
                <select
                  value={currentUser.name}
                  onChange={(e) => onSwitchTeacher(e.target.value)}
                  className="bg-transparent text-slate-200 font-semibold text-xs focus:outline-none cursor-pointer border-none"
                  title="切換導師身分以驗證資安管制"
                >
                  <option value={visitingTeacher} className="bg-slate-900 text-amber-300 font-bold">
                    ⭐ {visitingTeacher} (本次家訪導師 - 可預覽與下載)
                  </option>
                  {TEACHER_OPTIONS.filter((t) => t.trim() !== visitingTeacher.trim()).map((teacher) => (
                    <option key={teacher} value={teacher} className="bg-slate-900 text-slate-200">
                      {teacher} (其他導師 - 禁預覽與下載)
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-load-demo"
              onClick={onLoadDemo}
              className="text-xs px-2.5 sm:px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
              title="載入示範完整訪視對話紀錄"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">示範紀錄</span>
            </button>
            <button
              id="btn-new-visit"
              onClick={onNewVisit}
              className="text-xs px-2.5 sm:px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>新建家訪</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-slate-800/80 pt-1 pb-2 overflow-x-auto scrollbar-none">
          <button
            id="nav-tab-record"
            onClick={() => setCurrentTab('record')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              currentTab === 'record'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Mic className="w-4 h-4 text-rose-400" />
            <span>1. 即時語音轉譯</span>
            {activeRecord.transcripts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-xs rounded-full bg-slate-900/60 text-slate-300">
                {activeRecord.transcripts.length} 句
              </span>
            )}
          </button>

          <button
            id="nav-tab-summary"
            onClick={() => setCurrentTab('summary')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              currentTab === 'summary'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>2. AI 重點摘要整理</span>
            {activeRecord.summary && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            id="nav-tab-preview"
            onClick={() => setCurrentTab('preview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              currentTab === 'preview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>3. 官方公文預覽與下載</span>
            {canDownload ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
                可預覽下載
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/90 text-rose-300 border border-rose-800/50 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                限本次導師
              </span>
            )}
          </button>

          <button
            id="nav-tab-archive"
            onClick={() => setCurrentTab('archive')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              currentTab === 'archive'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-purple-400" />
            <span>4. 歷史訪視紀錄庫</span>
            {currentUser.isDeanAuthenticated ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/90 text-purple-200 border border-purple-700/50 flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-amber-300" />
                主任已授權
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/90 text-rose-300 border border-rose-800/50 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                限學務主任
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
