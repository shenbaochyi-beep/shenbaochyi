import React, { useState, useRef } from 'react';
import { X, Save, School, User, Calendar, MapPin, Target, Sparkles, Check, Upload, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { VisitInfo, VisitType } from '../types';
import { CLASS_OPTIONS, TEACHER_OPTIONS } from '../utils/sampleData';
import { SchoolLogo } from './SchoolLogo';

interface VisitSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitInfo: VisitInfo;
  onSave: (info: VisitInfo) => void;
  customLogoUrl?: string | null;
  onUpdateCustomLogo?: (url: string | null) => void;
}

const TEMPLATES = [
  {
    label: '日常關懷與生活常規訪視',
    info: {
      visitPurpose: '了解學生開學後生活作息適應、手機使用自律規範與同儕互動情形',
      specialNotes: '近期上課偶有專注力不佳情形，家長期望配合學校生活常規引導。',
      visitType: '實體到府訪視' as VisitType,
      attendees: '父親、母親、學生本人',
    },
  },
  {
    label: '學業落差與學習輔導訪視',
    info: {
      visitPurpose: '評估主要學科學習挫折原因，探討課後補救與學習扶助資源轉介',
      specialNotes: '數理科段考表現不理想，課堂參與度低，需親師合作重拾學習信心。',
      visitType: '校內親師面談' as VisitType,
      attendees: '家長（母親）、學生本人',
    },
  },
  {
    label: '高關懷/隔代教養支持訪視',
    info: {
      visitPurpose: '關懷弱勢/隔代教養家庭生活支持系統，協助申請校內外急難救助金與營養午餐補助',
      specialNotes: '主要照顧者為年邁長輩，家庭經濟狀況需校方積極協助資源媒合與認輔。',
      visitType: '實體到府訪視' as VisitType,
      attendees: '祖母、學生本人',
    },
  },
  {
    label: '人際情緒與適應不良訪視',
    info: {
      visitPurpose: '關心學生在校同儕相處摩擦及情緒調節問題，建立親師即時溝通管道',
      specialNotes: '性格較為內向敏感，偶與同學有言語誤會，需加強同理心與情緒支持。',
      visitType: '線上視訊訪談' as VisitType,
      attendees: '父母親',
    },
  },
];

export const VisitSetupModal: React.FC<VisitSetupModalProps> = ({
  isOpen,
  onClose,
  visitInfo,
  onSave,
  customLogoUrl,
  onUpdateCustomLogo,
}) => {
  const [formData, setFormData] = useState<VisitInfo>({ ...visitInfo });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof VisitInfo, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('請選擇有效的圖片格式檔 (PNG, JPG, SVG, WebP)');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (onUpdateCustomLogo) {
          onUpdateCustomLogo(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    if (onUpdateCustomLogo) {
      onUpdateCustomLogo(null);
    }
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    setFormData((prev) => ({
      ...prev,
      ...tpl.info,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="modal-visit-setup"
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <School className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">家庭訪問基本資料設定</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Template Presets */}
        <div className="px-6 py-3 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-blue-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            快速套用訪談主題範本：
          </span>
          {TEMPLATES.map((tpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="text-xs bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* School Emblem & Logo Settings Card */}
          <div className="p-3.5 bg-gradient-to-r from-sky-50 to-blue-50/50 rounded-lg border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-full p-1 bg-white shadow-sm border border-slate-200 flex items-center justify-center flex-shrink-0">
                <SchoolLogo customLogoUrl={customLogoUrl} size={50} className="w-12 h-12" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800">
                    {customLogoUrl ? '已套用自訂校徽圖片' : '國立成功商業水產職業學校 (海豚校徽)'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    正式校徽
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  自動應用於系統頂部、訪視表公文首頁與匯出文件
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleLogoFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-md border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>上傳更換校徽圖檔</span>
              </button>
              {customLogoUrl && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md border border-slate-200 transition-colors"
                  title="重設為預設海豚校徽"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 1: School & Semester */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">學校名稱</label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="例如：國立成功商業水產職業學校"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">學年度 (選單)</label>
              <select
                value={formData.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="114學年度">114學年度</option>
                <option value="115學年度">115學年度</option>
                <option value="116學年度">116學年度</option>
                <option value="117學年度">117學年度</option>
                <option value="118學年度">118學年度</option>
                <option value="119學年度">119學年度</option>
                <option value="120學年度">120學年度</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">學期 (選單)</label>
              <select
                value={formData.semester}
                onChange={(e) => handleChange('semester', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="第1學期">第1學期 (第一學期)</option>
                <option value="第2學期">第2學期 (第二學期)</option>
                <option value="暑期/寒假輔導">暑期/寒假輔導</option>
              </select>
            </div>
          </div>

          {/* Row 2: Student info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">班級 (選單) *</label>
              <select
                required
                value={formData.className}
                onChange={(e) => handleChange('className', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">學生姓名 *</label>
              <input
                type="text"
                required
                value={formData.studentName}
                onChange={(e) => handleChange('studentName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="陳冠宇"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">座號 / 學號</label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => handleChange('studentId', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="15 號 / 80315"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">性別</label>
              <select
                value={formData.studentGender}
                onChange={(e) => handleChange('studentGender', e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          {/* Row 3: Teacher & Accompany */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">訪視導師 (選單) *</label>
              <select
                required
                value={formData.teacherName}
                onChange={(e) => handleChange('teacherName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {!TEACHER_OPTIONS.includes(formData.teacherName) && formData.teacherName && (
                  <option value={formData.teacherName}>{formData.teacherName}</option>
                )}
                {TEACHER_OPTIONS.map((teacher) => (
                  <option key={teacher} value={teacher}>
                    {teacher}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">隨同人員 / 跨處室人員</label>
              <input
                type="text"
                value={formData.accompanyStaff || ''}
                onChange={(e) => handleChange('accompanyStaff', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="如：生教組長、輔導老師、社工師（無則免填）"
              />
            </div>
          </div>

          {/* Row 4: Visit Date & Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">訪視日期</label>
              <input
                type="date"
                required
                value={formData.visitDate}
                onChange={(e) => handleChange('visitDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">訪視時間區段</label>
              <input
                type="text"
                value={formData.visitTime}
                onChange={(e) => handleChange('visitTime', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="14:30 ~ 15:30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">訪視形式</label>
              <select
                value={formData.visitType}
                onChange={(e) => handleChange('visitType', e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="實體到府訪視">實體到府訪視</option>
                <option value="校內親師面談">校內親師面談</option>
                <option value="線上視訊訪談">線上視訊訪談</option>
                <option value="電話專題訪談">電話專題訪談</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          {/* Row 5: Location & Attendees */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">訪視地點</label>
              <input
                type="text"
                value={formData.visitLocation}
                onChange={(e) => handleChange('visitLocation', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="學生自宅 / 學校會談室"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">受訪對象與關係</label>
              <input
                type="text"
                value={formData.attendees}
                onChange={(e) => handleChange('attendees', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="如：父親、母親、學生本人"
              />
            </div>
          </div>

          {/* Row 6: Purpose */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">訪談主旨與目的 *</label>
            <input
              type="text"
              required
              value={formData.visitPurpose}
              onChange={(e) => handleChange('visitPurpose', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="例如：了解作息與學習進展、建立手機使用公約、促進親師互信"
            />
          </div>

          {/* Row 7: Special Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">訪前備註 / 特殊背景說明</label>
            <textarea
              rows={2}
              value={formData.specialNotes || ''}
              onChange={(e) => handleChange('specialNotes', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="可記錄學生特殊身心狀況、近期重大事件或重點觀察項目..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              儲存並套用
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
