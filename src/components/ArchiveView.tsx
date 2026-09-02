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
  CheckCircle2
} from 'lucide-react';
import { VisitRecord, CareLevel } from '../types';
import { CLASS_OPTIONS, TEACHER_OPTIONS } from '../utils/sampleData';

interface ArchiveViewProps {
  records: VisitRecord[];
  onSelectRecord: (record: VisitRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNewVisit: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  records,
  onSelectRecord,
  onDeleteRecord,
  onNewVisit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [filterCareLevel, setFilterCareLevel] = useState<string>('all');

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
    a.download = `學務處家庭訪問紀錄備份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <span>歷史家庭訪問紀錄檔案庫</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            已儲存 {records.length} 筆訪談紀錄，可隨時調閱、重新編輯或匯出公文
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAllJson}
            className="px-3 py-2 text-xs border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出全部備份 (JSON)</span>
          </button>
          <button
            onClick={onNewVisit}
            className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建家庭訪問</span>
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
            onChange={(e) => setFilterTeacher(e.target.value)}
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
            onChange={(e) => setFilterClass(e.target.value)}
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
