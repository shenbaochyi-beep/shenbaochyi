import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Save, School, User, Calendar, MapPin, Target, Sparkles, Check, 
  Upload, RefreshCw, Clock, Timer, ArrowRight, Image as ImageIcon,
  Lock, ShieldAlert, ShieldCheck, UserCheck 
} from 'lucide-react';
import { VisitInfo, VisitType, CurrentUser } from '../types';
import { 
  CLASS_OPTIONS, 
  TEACHER_OPTIONS, 
  CLASS_TO_TEACHER_MAP, 
  TEACHER_TO_CLASS_MAP, 
  getMatchedTeacherForClass, 
  getMatchedClassForTeacher 
} from '../utils/sampleData';
import { SchoolLogo } from './SchoolLogo';
import { 
  parseVisitTime, 
  calculateDurationMinutes, 
  formatDurationText, 
  addMinutesToTime, 
  getCurrentTimeHHMM 
} from '../utils/timeUtils';
import { isCurrentUserDean, DEAN_CREDENTIALS } from '../utils/auth';

interface VisitSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitInfo: VisitInfo;
  onSave: (info: VisitInfo) => void;
  customLogoUrl?: string | null;
  onUpdateCustomLogo?: (url: string | null) => void;
  currentUser?: CurrentUser;
  onDeanLogin?: (account: string) => boolean;
  hasEstablishedTeacher?: boolean;
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
  currentUser,
  onDeanLogin,
  hasEstablishedTeacher = false,
}) => {
  const initialParsed = parseVisitTime(visitInfo.visitTime, visitInfo.visitStartTime, visitInfo.visitEndTime);
  const normalizedAcademicYear = (!visitInfo.academicYear || visitInfo.academicYear === '114學年度') ? '115學年度' : visitInfo.academicYear;
  const initialStudentName = visitInfo.studentName || '';
  const initialStudentId = visitInfo.studentId || '';
  const [formData, setFormData] = useState<VisitInfo>({
    ...visitInfo,
    studentName: initialStudentName,
    studentId: initialStudentId,
    academicYear: normalizedAcademicYear,
    visitStartTime: initialParsed.startTime,
    visitEndTime: initialParsed.endTime,
    visitDurationMinutes: initialParsed.durationMinutes,
    visitTime: visitInfo.visitTime || `${initialParsed.startTime} ~ ${initialParsed.endTime}`,
  });
  const [startTime, setStartTime] = useState<string>(initialParsed.startTime);
  const [endTime, setEndTime] = useState<string>(initialParsed.endTime);
  const [isManualTimeEdit, setIsManualTimeEdit] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dean authorization state for uploading local school logo
  const isDean = isCurrentUserDean(currentUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authAccountInput, setAuthAccountInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Sync state whenever modal is opened or visitInfo changes
  useEffect(() => {
    if (isOpen) {
      const parsed = parseVisitTime(visitInfo.visitTime, visitInfo.visitStartTime, visitInfo.visitEndTime);
      setStartTime(parsed.startTime);
      setEndTime(parsed.endTime);
      setIsManualTimeEdit(false);
      setFormData({
        ...visitInfo,
        studentName: visitInfo.studentName || '',
        studentId: visitInfo.studentId || '',
        academicYear: (!visitInfo.academicYear || visitInfo.academicYear === '114學年度') ? '115學年度' : visitInfo.academicYear,
        visitStartTime: parsed.startTime,
        visitEndTime: parsed.endTime,
        visitDurationMinutes: parsed.durationMinutes,
        visitTime: visitInfo.visitTime || `${parsed.startTime} ~ ${parsed.endTime}`,
      });
    }
  }, [isOpen, visitInfo]);

  if (!isOpen) return null;

  const handleChange = (field: keyof VisitInfo, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'className') {
        const matchedTeacher = getMatchedTeacherForClass(String(value));
        if (matchedTeacher) {
          updated.teacherName = matchedTeacher;
        }
      } else if (field === 'teacherName') {
        const matchedClass = getMatchedClassForTeacher(String(value));
        if (matchedClass) {
          updated.className = matchedClass;
        }
      }
      return updated;
    });
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const duration = calculateDurationMinutes(newStart, endTime);
    const formatted = `${newStart} ~ ${endTime}`;
    setFormData((prev) => ({
      ...prev,
      visitStartTime: newStart,
      visitEndTime: endTime,
      visitDurationMinutes: duration,
      visitTime: isManualTimeEdit ? prev.visitTime : formatted,
    }));
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const duration = calculateDurationMinutes(startTime, newEnd);
    const formatted = `${startTime} ~ ${newEnd}`;
    setFormData((prev) => ({
      ...prev,
      visitStartTime: startTime,
      visitEndTime: newEnd,
      visitDurationMinutes: duration,
      visitTime: isManualTimeEdit ? prev.visitTime : formatted,
    }));
  };

  const handleQuickDuration = (minutes: number) => {
    const baseStart = startTime || '14:30';
    const newEnd = addMinutesToTime(baseStart, minutes);
    setEndTime(newEnd);
    const formatted = `${baseStart} ~ ${newEnd}`;
    setFormData((prev) => ({
      ...prev,
      visitStartTime: baseStart,
      visitEndTime: newEnd,
      visitDurationMinutes: minutes,
      visitTime: formatted,
    }));
  };

  const handleSetCurrentTime = () => {
    const now = getCurrentTimeHHMM();
    const newEnd = addMinutesToTime(now, 60);
    setStartTime(now);
    setEndTime(newEnd);
    const formatted = `${now} ~ ${newEnd}`;
    setFormData((prev) => ({
      ...prev,
      visitStartTime: now,
      visitEndTime: newEnd,
      visitDurationMinutes: 60,
      visitTime: formatted,
    }));
  };

  const handleUploadClick = () => {
    if (isDean) {
      fileInputRef.current?.click();
    } else {
      setIsAuthModalOpen(true);
      setAuthAccountInput('');
      setAuthError('');
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = authAccountInput.trim();
    if (!clean) {
      setAuthError('請輸入學務主任專屬授權帳號');
      return;
    }
    if (clean.toLowerCase() === DEAN_CREDENTIALS.account.toLowerCase()) {
      if (onDeanLogin) {
        onDeanLogin(clean);
      }
      setIsAuthModalOpen(false);
      setAuthError('');
      // Trigger native file selector
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 150);
    } else {
      setAuthError('帳號驗證失敗！僅限學務主任專屬帳號具備上傳權限。');
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isNowDean = isCurrentUserDean(currentUser);
    if (!isNowDean && currentUser?.account !== DEAN_CREDENTIALS.account) {
      alert('【資安管制】僅限學務主任一人具備上傳校徽圖檔權限！');
      if (e.target) e.target.value = '';
      return;
    }
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
    if (e.target) e.target.value = '';
  };

  const handleResetLogo = () => {
    if (!isDean) {
      setIsAuthModalOpen(true);
      return;
    }
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
    const duration = calculateDurationMinutes(startTime, endTime);
    const finalFormattedTime = isManualTimeEdit && formData.visitTime?.trim()
      ? formData.visitTime.trim()
      : `${startTime} ~ ${endTime}`;

    const updatedData: VisitInfo = {
      ...formData,
      schoolName: '國立成功商業水產職業學校',
      visitStartTime: startTime,
      visitEndTime: endTime,
      visitDurationMinutes: duration,
      visitTime: finalFormattedTime,
    };

    onSave(updatedData);
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
            <div>
              <h2 className="text-lg font-bold">
                {!hasEstablishedTeacher ? '新建家庭訪問選單（設定訪視導師與基本資料）' : '家庭訪問基本資料設定'}
              </h2>
              {!hasEstablishedTeacher && (
                <p className="text-xs text-blue-300 font-normal">
                  請先建立本次訪視導師與學生資料，建立完成後將自動登入該導師身分
                </p>
              )}
            </div>
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
          <div className="p-4 bg-gradient-to-r from-sky-50 via-blue-50/40 to-slate-50 rounded-xl border border-sky-100 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-full p-1 bg-white shadow-sm border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <SchoolLogo customLogoUrl={customLogoUrl} size={50} className="w-12 h-12" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      {customLogoUrl === '/school_logo.png' || (!customLogoUrl) ? '國立成功商業水產職業學校 (官方標準校徽)' :
                       customLogoUrl === '/original_logo.png' ? '國立成功商水 (創校初始校徽 - 錢幣流水)' :
                       customLogoUrl === '/dolphin_logo.png' ? '國立成功商水 (官方海豚大躍進校徽)' :
                       '已套用自訂校徽圖片'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      正式應用中
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    點選下方款式可立即切換，或點擊「上傳本機圖檔」更換學校指定檔案
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上傳本機圖檔</span>
                </button>
                {customLogoUrl && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="px-2.5 py-1.5 text-xs bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                    title="重設為預設官方校徽"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>還原預設</span>
                  </button>
                )}
              </div>
            </div>

            {/* Logo Presets Grid */}
            <div className="pt-2 border-t border-sky-100/80">
              <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>學校官方校徽款式快速切換：</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Preset 1: Standard Circle */}
                <button
                  type="button"
                  onClick={() => onUpdateCustomLogo && onUpdateCustomLogo('/school_logo.png')}
                  className={`p-2 rounded-lg border text-left flex items-center space-x-2.5 transition-all ${
                    (!customLogoUrl || customLogoUrl === '/school_logo.png')
                      ? 'bg-white border-blue-500 ring-2 ring-blue-200 shadow-2xs'
                      : 'bg-white/70 hover:bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white p-0.5 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                    <img src="/school_logo.png" alt="官方標準校徽" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">官方標準圓徽</div>
                    <div className="text-[10px] text-slate-500 truncate">正式官方圓形校徽</div>
                  </div>
                  {(!customLogoUrl || customLogoUrl === '/school_logo.png') && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>

                {/* Preset 2: Original Initial Logo */}
                <button
                  type="button"
                  onClick={() => onUpdateCustomLogo && onUpdateCustomLogo('/original_logo.png')}
                  className={`p-2 rounded-lg border text-left flex items-center space-x-2.5 transition-all ${
                    customLogoUrl === '/original_logo.png'
                      ? 'bg-white border-blue-500 ring-2 ring-blue-200 shadow-2xs'
                      : 'bg-white/70 hover:bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white p-0.5 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                    <img src="/original_logo.png" alt="創校初始校徽" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">創校初始校徽</div>
                    <div className="text-[10px] text-slate-500 truncate">錢幣(商)與流水(水產)</div>
                  </div>
                  {customLogoUrl === '/original_logo.png' && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>

                {/* Preset 3: Leaping Dolphin Logo */}
                <button
                  type="button"
                  onClick={() => onUpdateCustomLogo && onUpdateCustomLogo('/dolphin_logo.png')}
                  className={`p-2 rounded-lg border text-left flex items-center space-x-2.5 transition-all ${
                    customLogoUrl === '/dolphin_logo.png'
                      ? 'bg-white border-blue-500 ring-2 ring-blue-200 shadow-2xs'
                      : 'bg-white/70 hover:bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white p-0.5 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                    <img src="/dolphin_logo.png" alt="海豚校徽" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">躍起海豚校徽</div>
                    <div className="text-[10px] text-slate-500 truncate">象徵學校大躍進</div>
                  </div>
                  {customLogoUrl === '/dolphin_logo.png' && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Row 1: School & Semester */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">學校名稱</label>
              <input
                type="text"
                readOnly
                disabled
                value="國立成功商業水產職業學校"
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-md text-slate-800 font-medium cursor-not-allowed select-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">學年度 (選單)</label>
              <select
                value={formData.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="115學年度">115學年度</option>
                <option value="116學年度">116學年度</option>
                <option value="117學年度">117學年度</option>
                <option value="118學年度">118學年度</option>
                <option value="119學年度">119學年度</option>
                <option value="120學年度">120學年度</option>
                <option value="121學年度">121學年度</option>
                <option value="122學年度">122學年度</option>
                <option value="123學年度">123學年度</option>
                <option value="124學年度">124學年度</option>
                <option value="125學年度">125學年度</option>
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
              <label className="block text-xs font-medium text-slate-700 mb-1">學生姓名</label>
              <input
                type="text"
                id="input-student-name"
                value={formData.studentName}
                onChange={(e) => handleChange('studentName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:italic"
                placeholder="王小明"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">座號 / 學號</label>
              <input
                type="text"
                id="input-student-id"
                value={formData.studentId}
                onChange={(e) => handleChange('studentId', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400 placeholder:italic"
                placeholder="15號/810001"
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
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>訪視導師 (選單) *</span>
                {!hasEstablishedTeacher && (
                  <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                    ★ 建立後將以此身分登入系統
                  </span>
                )}
              </label>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>訪視日期 *</span>
              </label>
              <input
                type="date"
                required
                value={formData.visitDate}
                onChange={(e) => handleChange('visitDate', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-600" />
                <span>訪視形式</span>
              </label>
              <select
                value={formData.visitType}
                onChange={(e) => handleChange('visitType', e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="實體到府訪視">實體到府訪視</option>
                <option value="校內親師面談">校內親師面談</option>
                <option value="線上視訊訪談">線上視訊訪談</option>
                <option value="電話專題訪談">電話專題訪談</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          {/* Dedicated Visit Start & End Time Input Section (起訖時間精準設定) */}
          <div className="p-4 bg-gradient-to-br from-slate-50 via-sky-50/40 to-blue-50/50 rounded-xl border border-sky-100 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>訪視起訖時間設定</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-normal">
                      精確至分鐘
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    完整記錄開始時間與結束時間，自動計算訪談總時長並同步公文
                  </p>
                </div>
              </div>

              {/* Duration calculation badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-700 text-white text-xs font-medium shadow-2xs">
                <Timer className="w-3.5 h-3.5 text-blue-200" />
                <span>時長：{formatDurationText(calculateDurationMinutes(startTime, endTime))}</span>
                <span className="opacity-75 text-[11px]">({calculateDurationMinutes(startTime, endTime)} 分鐘)</span>
              </div>
            </div>

            {/* Inputs: Start Time -> Arrow -> End Time */}
            <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>訪視開始時間 (起) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">時:分 (24小時制)</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white font-mono font-medium text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="sm:col-span-1 flex flex-col items-center justify-center pt-2 sm:pt-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-blue-600 border border-slate-200 shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>訪視結束時間 (訖) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">時:分 (24小時制)</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white font-mono font-medium text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">快速設定訪談時長：</span>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(30)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-md transition-colors shadow-2xs"
                >
                  30分鐘
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(45)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-md transition-colors shadow-2xs"
                >
                  45分鐘
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(60)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-md transition-colors shadow-2xs"
                >
                  60分鐘 (1小時)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(75)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-md transition-colors shadow-2xs"
                >
                  75分鐘
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration(90)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-md transition-colors shadow-2xs"
                >
                  90分鐘 (1.5小時)
                </button>
              </div>

              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="px-2.5 py-1 text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md flex items-center gap-1 transition-colors shadow-2xs"
              >
                <Clock className="w-3 h-3" />
                <span>以目前當下時間起算 (60分)</span>
              </button>
            </div>

            {/* Generated Time Preview & Custom String Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white/90 p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-medium text-slate-500">公文表登記字串：</span>
                {isManualTimeEdit ? (
                  <input
                    type="text"
                    value={formData.visitTime}
                    onChange={(e) => handleChange('visitTime', e.target.value)}
                    className="px-2 py-0.5 text-xs font-mono font-bold text-blue-900 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/30"
                    placeholder="例如：14:30 ~ 15:45"
                  />
                ) : (
                  <span className="font-mono font-bold text-blue-900">
                    {formData.visitTime || `${startTime} ~ ${endTime}`}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsManualTimeEdit(!isManualTimeEdit)}
                className="text-[11px] text-blue-600 hover:text-blue-800 underline flex items-center gap-0.5 self-end sm:self-auto"
              >
                {isManualTimeEdit ? '還原為起訖連動模式' : '手動微調公文字串'}
              </button>
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
              {!hasEstablishedTeacher ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>完成建立並登入導師</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>儲存並套用</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Dean Auth Verification Modal for School Logo Upload */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-amber-950/70 to-slate-900 text-white flex items-center justify-between border-b border-amber-500/30">
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">校徽圖檔上傳管制驗證</h3>
                  <p className="text-[10px] text-amber-200/80">僅限學務主任一人具備上傳權限</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setAuthError('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAuthSubmit} className="p-5 space-y-4">
              <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>學校官方圖記嚴格管制說明</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  校徽為正式公文與報告書的重要法定圖記。為防範誤置或未授權修改，本機校徽圖檔上傳功能<strong>僅開放學務主任一人</strong>上傳與更新。
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  請輸入學務主任專屬帳號 *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={authAccountInput}
                  onChange={(e) => {
                    setAuthAccountInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="請輸入學務主任專屬帳號"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none bg-white"
                />
                {authError && (
                  <p className="text-xs text-rose-600 mt-1.5 font-medium flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{authError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setAuthError('');
                  }}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>驗證身分並開啟上傳</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
