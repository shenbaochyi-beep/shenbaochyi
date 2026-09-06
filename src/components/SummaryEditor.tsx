import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Wand2,
  Save,
  Tag,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VisitRecord, VisitSummary, ActionItem, CareLevel } from '../types';
import { safeFetchJson } from '../utils/apiUtils';

interface SummaryEditorProps {
  activeRecord: VisitRecord;
  onUpdateSummary: (summary: VisitSummary) => void;
  onGenerateSummary: () => Promise<void>;
  isGenerating: boolean;
  onGoToPreview: () => void;
}

const CARE_LEVEL_OPTIONS: { level: CareLevel; color: string; desc: string }[] = [
  { level: '一般關懷', color: 'border-emerald-300 bg-emerald-50 text-emerald-900', desc: '適應良好，親師持續保持常規聯繫' },
  { level: '持續追蹤', color: 'border-amber-300 bg-amber-50 text-amber-900', desc: '需觀察生活作息、課業進度或手機使用自律' },
  { level: '高度關注', color: 'border-orange-400 bg-orange-50 text-orange-900', desc: '有明顯人際情緒、家庭變故或學業嚴重落差' },
  { level: '緊急協處/通報', color: 'border-rose-400 bg-rose-50 text-rose-900', desc: '涉及兒少保護、高風險家庭或法定通報事項' },
];

const COMMON_REFERRALS = [
  '學務處生活常規導護關心',
  '輔導室個別諮商/認輔志工',
  '教務處課後學習扶助增能班',
  '申請校內仁愛基金/午餐補助',
  '社工師/高風險家庭關懷轉介',
  '特教資源巡迴諮詢',
  '課後多元社團自習安排',
];

export const SummaryEditor: React.FC<SummaryEditorProps> = ({
  activeRecord,
  onUpdateSummary,
  onGenerateSummary,
  isGenerating,
  onGoToPreview,
}) => {
  const summary = activeRecord.summary;
  const [activeSection, setActiveSection] = useState<string>('all');
  const [refiningSection, setRefiningSection] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [newActionText, setNewActionText] = useState('');
  const [newActionResp, setNewActionResp] = useState<'導師' | '家長' | '學生' | '學務處' | '輔導室' | '教務處'>('導師');
  const [newActionPriority, setNewActionPriority] = useState<'高' | '中' | '一般'>('中');
  const [newActionDeadline, setNewActionDeadline] = useState('兩週內');

  if (!summary) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">
            尚未生成家庭訪問 AI 重點摘要
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            系統將依據目前所收錄之 {activeRecord.transcripts.length} 則訪談對話紀錄，運用 Gemini AI 自動彙整為教育部標準之公文格式訪談摘要。
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onGenerateSummary}
            disabled={isGenerating || activeRecord.transcripts.length === 0}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2 mx-auto disabled:bg-slate-300"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI 正在深入分析對話並編整紀錄表中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>立即一鍵生成 AI 重點摘要</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const handleFieldChange = (field: keyof VisitSummary, value: any) => {
    onUpdateSummary({
      ...summary,
      [field]: value,
    });
  };

  const handleAddActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim()) return;

    const newItem: ActionItem = {
      id: `act-${Date.now()}`,
      item: newActionText.trim(),
      responsible: newActionResp,
      priority: newActionPriority,
      deadline: newActionDeadline || '無期限',
      status: '待處理',
    };

    onUpdateSummary({
      ...summary,
      actionItems: [...(summary.actionItems || []), newItem],
    });

    setNewActionText('');
  };

  const handleDeleteActionItem = (id: string) => {
    onUpdateSummary({
      ...summary,
      actionItems: summary.actionItems.filter((a) => a.id !== id),
    });
  };

  const handleToggleReferral = (ref: string) => {
    const current = summary.crossOfficeReferrals || [];
    const exists = current.includes(ref);
    const updated = exists ? current.filter((r) => r !== ref) : [...current, ref];
    handleFieldChange('crossOfficeReferrals', updated);
  };

  // AI Refinement for a specific section
  const handleRefineSection = async (sectionKey: keyof VisitSummary, label: string) => {
    if (!refinePrompt.trim()) return;
    setIsRefining(true);

    try {
      const res = await safeFetchJson<{ refinedText?: string }>(
        '/api/refine-summary',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionKey: label,
            originalText: summary[sectionKey],
            instruction: refinePrompt,
            visitInfo: activeRecord.visitInfo,
          }),
        },
        20000
      );

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'AI 修飾失敗');
      }

      if (res.data.refinedText) {
        handleFieldChange(sectionKey, res.data.refinedText);
      }
      setRefiningSection(null);
      setRefinePrompt('');
    } catch (err: any) {
      alert(`修飾失敗: ${err.message || '請稍後重試'}`);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner with AI Re-generate and Export Button */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>AI 重點摘要已就緒</span>
            </span>
            <span className="text-xs text-slate-400">
              分析於 {new Date(summary.generatedAt).toLocaleTimeString()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {activeRecord.visitInfo.className} {activeRecord.visitInfo.studentName} — 家庭訪問綜合紀錄審閱
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onGenerateSummary}
            disabled={isGenerating}
            className="text-xs px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            title="以目前轉譯對話重新生成完整摘要"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>重新生成摘要</span>
          </button>

          <button
            id="btn-goto-preview"
            onClick={onGoToPreview}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>前往公文預覽與下載 (.docx/PDF)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 6 Standard Sections (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Executive Summary */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>一、訪談綜合紀要 (核心發現與整體總結)</span>
              </label>
              <button
                type="button"
                onClick={() => setRefiningSection(refiningSection === 'executiveSummary' ? null : 'executiveSummary')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <Wand2 className="w-3 h-3" />
                <span>AI 智慧潤飾</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={summary.executiveSummary}
              onChange={(e) => handleFieldChange('executiveSummary', e.target.value)}
              className="w-full p-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
              placeholder="輸入或修改訪談綜合紀要..."
            />

            {/* Inline AI Refiner Box */}
            {refiningSection === 'executiveSummary' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2">
                <span className="text-xs font-semibold text-blue-900 block">
                  請輸入 AI 潤飾指示（例如：轉化為正式公文體、強調親師生共識）：
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="請將語氣修飾得更加嚴謹正向，突出具體輔導成果..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRefineSection('executiveSummary', '訪談綜合紀要')}
                    disabled={isRefining || !refinePrompt.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md disabled:bg-slate-300"
                  >
                    {isRefining ? '潤飾中...' : '送出修飾'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Family Environment */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>二、家庭環境與生活照顧概況</span>
              </label>
              <button
                type="button"
                onClick={() => setRefiningSection(refiningSection === 'familyEnvironment' ? null : 'familyEnvironment')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <Wand2 className="w-3 h-3" />
                <span>AI 潤飾</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={summary.familyEnvironment}
              onChange={(e) => handleFieldChange('familyEnvironment', e.target.value)}
              className="w-full p-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
            />
            {refiningSection === 'familyEnvironment' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2">
                <span className="text-xs font-semibold text-blue-900 block">AI 潤飾家庭環境說明：</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="補充主要照顧者之互動模式與居住整潔度..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRefineSection('familyEnvironment', '家庭環境與生活照顧概況')}
                    disabled={isRefining || !refinePrompt.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md disabled:bg-slate-300"
                  >
                    {isRefining ? '潤飾中...' : '送出'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Academic Performance */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>三、學業表現與在校學習態度交流</span>
              </label>
              <button
                type="button"
                onClick={() => setRefiningSection(refiningSection === 'academicPerformance' ? null : 'academicPerformance')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <Wand2 className="w-3 h-3" />
                <span>AI 潤飾</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={summary.academicPerformance}
              onChange={(e) => handleFieldChange('academicPerformance', e.target.value)}
              className="w-full p-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
            />
            {refiningSection === 'academicPerformance' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2">
                <span className="text-xs font-semibold text-blue-900 block">AI 潤飾學業表現：</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="補充作業訂正習慣與課堂專注度調整策略..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRefineSection('academicPerformance', '學業表現與學習態度')}
                    disabled={isRefining || !refinePrompt.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md disabled:bg-slate-300"
                  >
                    {isRefining ? '潤飾中...' : '送出'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Emotional and Social */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>四、身心情緒與同儕人際相處</span>
              </label>
              <button
                type="button"
                onClick={() => setRefiningSection(refiningSection === 'emotionalAndSocial' ? null : 'emotionalAndSocial')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <Wand2 className="w-3 h-3" />
                <span>AI 潤飾</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={summary.emotionalAndSocial}
              onChange={(e) => handleFieldChange('emotionalAndSocial', e.target.value)}
              className="w-full p-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
            />
            {refiningSection === 'emotionalAndSocial' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2">
                <span className="text-xs font-semibold text-blue-900 block">AI 潤飾情緒人際：</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="補充同儕支持團體與情緒抒發管道..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRefineSection('emotionalAndSocial', '身心情緒與同儕人際相處')}
                    disabled={isRefining || !refinePrompt.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md disabled:bg-slate-300"
                  >
                    {isRefining ? '潤飾中...' : '送出'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Parent Discipline */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>五、家長管教態度與教育期待</span>
              </label>
              <button
                type="button"
                onClick={() => setRefiningSection(refiningSection === 'parentDiscipline' ? null : 'parentDiscipline')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <Wand2 className="w-3 h-3" />
                <span>AI 潤飾</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={summary.parentDiscipline}
              onChange={(e) => handleFieldChange('parentDiscipline', e.target.value)}
              className="w-full p-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
            />
            {refiningSection === 'parentDiscipline' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2">
                <span className="text-xs font-semibold text-blue-900 block">AI 潤飾親職管教：</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="補充家長對手機限制與睡前關心模式..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRefineSection('parentDiscipline', '家長管教態度與教育期待')}
                    disabled={isRefining || !refinePrompt.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md disabled:bg-slate-300"
                  >
                    {isRefining ? '潤飾中...' : '送出'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Teacher Suggestions */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>六、導師輔導建議與後續引導方向</span>
              </label>
              <button
                type="button"
                onClick={() => setRefiningSection(refiningSection === 'teacherSuggestions' ? null : 'teacherSuggestions')}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <Wand2 className="w-3 h-3" />
                <span>AI 潤飾</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={summary.teacherSuggestions}
              onChange={(e) => handleFieldChange('teacherSuggestions', e.target.value)}
              className="w-full p-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Right Column: Action Items, Referrals & Care Level (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Care Level Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              訪視關懷評級 (學務處建檔標準)：
            </label>
            <div className="space-y-2">
              {CARE_LEVEL_OPTIONS.map((opt) => {
                const isSelected = summary.careLevel === opt.level;
                return (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => handleFieldChange('careLevel', opt.level)}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? opt.color + ' ring-2 ring-blue-600 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span>{opt.level}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Suggested Next Date */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-700 mb-1">建議下次追蹤時間</label>
              <input
                type="text"
                value={summary.suggestedNextVisitDate || ''}
                onChange={(e) => handleFieldChange('suggestedNextVisitDate', e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="例如：期中評量後一週、學期末前"
              />
            </div>
          </div>

          {/* Action Items List */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                具體決議與行動方案 ({summary.actionItems?.length || 0})
              </label>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {(summary.actionItems || []).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                      {item.responsible} 負責
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        item.priority === '高' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.priority}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteActionItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-800 font-medium">{item.item}</p>
                  <p className="text-[10px] text-slate-500">期程：{item.deadline || '未定'}</p>
                </div>
              ))}
            </div>

            {/* Add new action item form */}
            <form onSubmit={handleAddActionItem} className="pt-2 border-t border-slate-100 space-y-2">
              <input
                type="text"
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                placeholder="新增行動決議事項..."
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <select
                  value={newActionResp}
                  onChange={(e) => setNewActionResp(e.target.value as any)}
                  className="p-1 border border-slate-300 rounded text-[11px]"
                >
                  <option value="導師">導師</option>
                  <option value="家長">家長</option>
                  <option value="學生">學生</option>
                  <option value="學務處">學務處</option>
                  <option value="輔導室">輔導室</option>
                  <option value="教務處">教務處</option>
                </select>
                <select
                  value={newActionPriority}
                  onChange={(e) => setNewActionPriority(e.target.value as any)}
                  className="p-1 border border-slate-300 rounded text-[11px]"
                >
                  <option value="高">優先級：高</option>
                  <option value="中">優先級：中</option>
                  <option value="一般">優先級：一般</option>
                </select>
                <input
                  type="text"
                  value={newActionDeadline}
                  onChange={(e) => setNewActionDeadline(e.target.value)}
                  placeholder="期限"
                  className="p-1 border border-slate-300 rounded text-[11px]"
                />
              </div>
              <button
                type="submit"
                disabled={!newActionText.trim()}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 text-white text-xs font-medium rounded-md flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>加入行動方案</span>
              </button>
            </form>
          </div>

          {/* Cross-office Referrals Checkboxes */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              跨處室協處與校內資源轉介：
            </label>
            <div className="space-y-1.5">
              {COMMON_REFERRALS.map((ref) => {
                const checked = (summary.crossOfficeReferrals || []).includes(ref);
                return (
                  <label
                    key={ref}
                    className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleReferral(ref)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{ref}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
