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
  Image as ImageIcon
} from 'lucide-react';
import { VisitRecord } from '../types';
import { SchoolLogo } from './SchoolLogo';

interface HeaderProps {
  currentTab: 'record' | 'summary' | 'preview' | 'archive';
  setCurrentTab: (tab: 'record' | 'summary' | 'preview' | 'archive') => void;
  activeRecord: VisitRecord;
  customLogoUrl?: string | null;
  onNewVisit: () => void;
  onLoadDemo: () => void;
  onOpenSetup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  activeRecord,
  customLogoUrl,
  onNewVisit,
  onLoadDemo,
  onOpenSetup,
}) => {
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
            className="hidden md:flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-full px-3 py-1.5 cursor-pointer transition-colors"
            title="點擊修改訪視基本資料"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-slate-400">受訪學生:</span>
            <span className="text-sm font-semibold text-slate-200">
              {activeRecord.visitInfo.className} {activeRecord.visitInfo.studentName || '未指定'}
            </span>
            <span className="text-xs text-blue-400 underline pl-1">修改設定</span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-load-demo"
              onClick={onLoadDemo}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
              title="載入示範完整訪視對話紀錄"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">載入示範紀錄</span>
            </button>
            <button
              id="btn-new-visit"
              onClick={onNewVisit}
              className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-colors flex items-center gap-1.5"
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
            <span>歷史訪視紀錄庫</span>
          </button>
        </div>
      </div>
    </header>
  );
};
