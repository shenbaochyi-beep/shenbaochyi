export type SpeakerType = '導師' | '家長' | '學生' | '輔導老師' | '輔導員' | '其他';

export type FlagCategory = '重點' | '生活常規' | '學習狀況' | '身心情緒' | '親職管教' | '需通報' | '待追蹤';

export type CareLevel = '一般關懷' | '持續追蹤' | '高度關注' | '緊急協處/通報';

export type VisitType = '實體到府訪視' | '校內親師面談' | '線上視訊訪談' | '電話專題訪談' | '其他';

export interface TranscriptItem {
  id: string;
  timestamp: string; // e.g. "00:02:15" or ISO string
  timestampSeconds: number;
  speaker: SpeakerType;
  text: string;
  isFlagged?: boolean;
  flagCategory?: FlagCategory;
  isInterim?: boolean;
}

export interface ActionItem {
  id: string;
  item: string;
  responsible: '導師' | '學務處' | '輔導室' | '教務處' | '家長' | '學生' | '跨處室';
  priority: '高' | '中' | '一般';
  deadline?: string;
  status: '待處理' | '進行中' | '已完成';
}

export interface VisitInfo {
  schoolName: string; // 學校名稱 (e.g. 國立臺灣示範高級中學 / 市立示範國民中學)
  academicYear: string; // 學年度 (e.g. 115學年度)
  semester: string; // 學期 (e.g. 第1學期 / 第2學期)
  className: string; // 班級 (e.g. 八年三班 / 高一忠班)
  studentName: string; // 學生姓名
  studentId: string; // 學號 / 座號
  studentGender: '男' | '女' | '其他';
  teacherName: string; // 訪視導師
  accompanyStaff?: string; // 隨同人員 (如生教組長、輔導老師、社工)
  visitDate: string; // 訪視日期 YYYY-MM-DD
  visitTime: string; // 訪視時間區段 e.g. 14:30 ~ 15:45
  visitStartTime?: string; // 訪視開始時間 HH:mm e.g. 14:30
  visitEndTime?: string; // 訪視結束時間 HH:mm e.g. 15:45
  visitDurationMinutes?: number; // 訪視時長 (分鐘)
  visitType: VisitType; // 訪視形式
  visitLocation: string; // 訪視地點
  attendees: string; // 受訪對象與關係 (e.g. 父親、母親、祖母、學生本人)
  visitPurpose: string; // 訪談主旨/目的 (e.g. 開學適應與生活關懷、學習落差與作息輔導、家庭支持系統了解)
  specialNotes?: string; // 訪前備註事項 (如特殊家庭背景、重大疾病、高關懷個案)
}

export interface VisitSummary {
  executiveSummary: string; // 訪談綜合紀要
  familyEnvironment: string; // 家庭環境與生活照顧概況
  academicPerformance: string; // 學業表現與在校學習態度
  emotionalAndSocial: string; // 身心情緒與同儕人際相處
  parentDiscipline: string; // 家長管教態度與教育期待
  teacherSuggestions: string; // 導師輔導建議與後續引導方向
  actionItems: ActionItem[]; // 決議與具體行動方案
  crossOfficeReferrals: string[]; // 跨處室協處或轉介建議 (如輔導室轉介、就學扶助、常規關注)
  careLevel: CareLevel; // 訪視關懷評級
  suggestedNextVisitDate?: string; // 建議下次追蹤時間
  keyTags: string[]; // 關鍵字標籤
  generatedAt: string; // AI 生成時間
  modelUsed?: string;
}

export interface VisitRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: '進行中' | '訪談完成' | '已生成摘要' | '已歸檔';
  visitInfo: VisitInfo;
  transcripts: TranscriptItem[];
  summary?: VisitSummary;
  audioDurationSeconds: number;
}

export type UserRole = 'teacher' | 'dean';

export interface CurrentUser {
  role: UserRole;
  name: string; // e.g. '王偉仁 老師' or '胡方奕'
  title: string; // e.g. '班級導師' or '學務主任'
  account?: string; // 'slvssa300300'
  isDeanAuthenticated?: boolean;
}
