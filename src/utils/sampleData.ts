import { VisitRecord, VisitInfo, TranscriptItem, VisitSummary } from '../types';

export interface TeacherClassPair {
  teacher: string;
  class: string;
}

export const TEACHER_CLASS_PAIRS: readonly TeacherClassPair[] = [
  { teacher: '王偉仁 老師', class: '一年忠班' },
  { teacher: '卓銘欣 老師', class: '一年孝班' },
  { teacher: '巫佳容 老師', class: '一年仁班' },
  { teacher: '杜斯古莎尤慕 老師', class: '一年愛班' },
  { teacher: '黃永耀 老師', class: '高二商資' },
  { teacher: '熊代勛 老師', class: '高二水產' },
  { teacher: '陳芷琳 老師', class: '高二觀光' },
  { teacher: '林政銘 老師', class: '高二餐飲' },
  { teacher: '胡方奕 老師', class: '高二資訊' },
  { teacher: '許書齊 老師', class: '高三餐飲' },
  { teacher: '周芳琪 老師', class: '高三觀光' },
  { teacher: '趙川俊 老師', class: '高三水產' },
  { teacher: '陳中明 老師', class: '高三商資' },
] as const;

export const CLASS_OPTIONS: string[] = TEACHER_CLASS_PAIRS.map((p) => p.class);

export const TEACHER_OPTIONS: string[] = TEACHER_CLASS_PAIRS.map((p) => p.teacher);

export const CLASS_TO_TEACHER_MAP: Record<string, string> = Object.fromEntries(
  TEACHER_CLASS_PAIRS.map((p) => [p.class, p.teacher])
);

// Map teacher -> class, supporting both '王偉仁 老師' and '王偉仁老師'
export const TEACHER_TO_CLASS_MAP: Record<string, string> = {
  ...Object.fromEntries(TEACHER_CLASS_PAIRS.map((p) => [p.teacher, p.class])),
  ...Object.fromEntries(TEACHER_CLASS_PAIRS.map((p) => [p.teacher.replace(/\s+/g, ''), p.class])),
  ...Object.fromEntries(TEACHER_CLASS_PAIRS.map((p) => [p.teacher.replace(' 老師', ''), p.class])),
  ...Object.fromEntries(TEACHER_CLASS_PAIRS.map((p) => [p.teacher.replace(' 老師', '').trim(), p.class])),
};

export const getMatchedTeacherForClass = (className: string): string | undefined => {
  if (!className) return undefined;
  return CLASS_TO_TEACHER_MAP[className.trim()];
};

export const getMatchedClassForTeacher = (teacherName: string): string | undefined => {
  if (!teacherName) return undefined;
  const clean = teacherName.trim();
  return (
    TEACHER_TO_CLASS_MAP[clean] ||
    TEACHER_TO_CLASS_MAP[clean.replace(/\s+/g, '')] ||
    TEACHER_TO_CLASS_MAP[`${clean} 老師`] ||
    TEACHER_TO_CLASS_MAP[`${clean}老師`]
  );
};

export const DEFAULT_VISIT_INFO: VisitInfo = {
  schoolName: '國立成功商業水產職業學校',
  academicYear: '115學年度',
  semester: '第1學期',
  className: '一年忠班',
  studentName: '陳冠宇',
  studentId: '115015',
  studentGender: '男',
  teacherName: '王偉仁 老師',
  accompanyStaff: '張輔導組長',
  visitDate: new Date().toISOString().split('T')[0],
  visitTime: '14:30 ~ 15:45',
  visitStartTime: '14:30',
  visitEndTime: '15:45',
  visitDurationMinutes: 75,
  visitType: '實體到府訪視',
  visitLocation: '學生自宅 (臺東縣成功鎮大同路)',
  attendees: '父親、母親、學生本人',
  visitPurpose: '了解開學後生活作息與課業適應、探討手機使用規範與同儕互動',
  specialNotes: '近期上課偶有打瞌睡情形，專業實習與英文科目反映較為吃力，家長期望提升自我自律能力。',
};

export const INITIAL_NEW_VISIT_INFO: VisitInfo = {
  schoolName: '國立成功商業水產職業學校',
  academicYear: '115學年度',
  semester: '第1學期',
  className: '一年忠班',
  studentName: '',
  studentId: '',
  studentGender: '男',
  teacherName: '王偉仁 老師',
  accompanyStaff: '',
  visitDate: new Date().toISOString().split('T')[0],
  visitTime: '14:30 ~ 15:30',
  visitStartTime: '14:30',
  visitEndTime: '15:30',
  visitDurationMinutes: 60,
  visitType: '實體到府訪視',
  visitLocation: '學生自宅',
  attendees: '家長與學生本人',
  visitPurpose: '了解開學後生活作息、課業學習適應與同儕互動情形',
  specialNotes: '',
};

export const SAMPLE_TRANSCRIPTS_1: TranscriptItem[] = [
  {
    id: 't-1',
    timestamp: '00:00:15',
    timestampSeconds: 15,
    speaker: '導師',
    text: '陳爸爸、陳媽媽您好，謝謝您們今天抽空讓我們來家裡做家庭訪問。冠宇也在，太好了！',
  },
  {
    id: 't-2',
    timestamp: '00:00:32',
    timestampSeconds: 32,
    speaker: '家長',
    text: '王老師好、組長好，快請進坐！冠宇在學校麻煩老師多費心照顧了，這陣子我們也很想跟老師聊聊他的狀況。',
  },
  {
    id: 't-3',
    timestamp: '00:01:05',
    timestampSeconds: 65,
    speaker: '導師',
    text: '冠宇在班上人緣很好，體育課跟打掃時間都很熱心助人，同學都很喜歡他。不過開學這三週，早自習跟第一節課偶爾會看他無精打采甚至趴在桌上，想先了解一下他在家裡的作息情況。',
    isFlagged: true,
    flagCategory: '生活常規',
  },
  {
    id: 't-4',
    timestamp: '00:02:10',
    timestampSeconds: 130,
    speaker: '家長',
    text: '唉，老師您說到重點了。他最近晚上常常說要在房間用手機查資料或跟同學討論分組報告，常常摸到半夜一點才睡，我們早上叫他起床都很吃力。',
    isFlagged: true,
    flagCategory: '生活常規',
  },
  {
    id: 't-5',
    timestamp: '00:03:20',
    timestampSeconds: 200,
    speaker: '學生',
    text: '我其實沒有一直在玩啦，只是有時候看 YouTube 教學影片，或是跟同組同學分配社團和報告的事，不知不覺時間就過了...',
  },
  {
    id: 't-6',
    timestamp: '00:04:15',
    timestampSeconds: 255,
    speaker: '導師',
    text: '老師能理解國二階段課業變重、社團活動也變多，很多同學都想自主掌控時間。但如果睡眠不足，白天大腦就沒辦法有效記憶，像數學跟理化這種需要高度專注的科目就會感覺特別吃力。冠宇你覺得呢？',
    isFlagged: true,
    flagCategory: '學習狀況',
  },
  {
    id: 't-7',
    timestamp: '00:05:40',
    timestampSeconds: 340,
    speaker: '學生',
    text: '嗯...最近理化小考確實覺得公式很多記不太起來，上課老師講到後面有點聽不太懂，心裡有點挫折。',
    isFlagged: true,
    flagCategory: '學習狀況',
  },
  {
    id: 't-8',
    timestamp: '00:06:55',
    timestampSeconds: 415,
    speaker: '家長',
    text: '我們之前有考慮要不要讓他去補習班，但又怕他壓力太大反彈。我們希望跟他訂個手機使用公約，比如晚上十一點後手機放客廳充電，不知道老師有什麼建議？',
    isFlagged: true,
    flagCategory: '親職管教',
  },
  {
    id: 't-9',
    timestamp: '00:08:20',
    timestampSeconds: 500,
    speaker: '導師',
    text: '家長提的這個「手機夜間集中客廳充電」是非常有效的做法！冠宇，我們可以先約定這兩週試試看：每晚十點半開始收心，十一點前就寢。至於理化，學校第八節有開辦學習扶助班，小班制且有專門老師帶練習題，我可以幫冠宇安排加入！',
    isFlagged: true,
    flagCategory: '重點',
  },
  {
    id: 't-10',
    timestamp: '00:09:45',
    timestampSeconds: 585,
    speaker: '學生',
    text: '如果是在學校的扶助班我願意參加，我會努力把作息調好，十一點前睡覺。',
  },
  {
    id: 't-11',
    timestamp: '00:10:30',
    timestampSeconds: 630,
    speaker: '家長',
    text: '太感謝老師了！有學校的學習扶助資源我們放心很多，我們家長在家裡也會確實落實手機管理與聯絡簿簽名，每週跟老師保持聯繫。',
    isFlagged: true,
    flagCategory: '待追蹤',
  },
  {
    id: 't-12',
    timestamp: '00:11:15',
    timestampSeconds: 675,
    speaker: '導師',
    text: '太好了，那我們今天就確立這三個具體約定：第一是十一點前就寢手機出房門，第二是報名學校理化學習扶助班，第三是導師在班上每週五檢核週誌並給予正向反饋。謝謝爸爸媽媽今天的用心支持！',
    isFlagged: true,
    flagCategory: '重點',
  },
];

export const SAMPLE_SUMMARY_1: VisitSummary = {
  executiveSummary: '本次訪視主要針對學生近期晨間作息疲憊、理化學習挫折及夜間手機使用狀況進行親師生三方深入會談。訪談過程親師溝通良好，學生態度坦誠且配合度高，三方共同擬定具體作息規範與課業補強計畫，預期能顯著改善生活常規與專注力。',
  familyEnvironment: '居住環境良好且家庭氣氛溫馨，父母均相當關心學生發展與身心健康。平日生活照顧無虞，家庭支持系統十分健全。',
  academicPerformance: '在校整體學習態度正向，近期因八年級理化難度提升且晚睡導致專注力下降，產生暫時性學習挫折。學生主動表達補強意願，已達成參加學校學習扶助課程之共識。',
  emotionalAndSocial: '人際關係良好，個性熱心助人且富責任感，無不良同儕交往情形。面對課業壓力偶有焦慮，需透過規律生活與階段性成功經驗建立自信。',
  parentDiscipline: '家長管教態度民主且理性，願意傾聽孩子想法，主動提出以溫和堅定之家庭公約方式管理手機與睡眠時間，親師合作默契極佳。',
  teacherSuggestions: '1. 建立「晚上11:00前就寢、手機放置客廳」之具體生活作息公約。\n2. 安排學生自下週起參加教務處理化科學習扶助增能課程。\n3. 導師每週五個別晤談關懷，檢視作息調整成效並給予正向肯定。',
  actionItems: [
    {
      id: 'act-1',
      item: '落實夜間 23:00 手機集中客廳充電與就寢公約',
      responsible: '家長',
      priority: '高',
      deadline: '即日起每日落實',
      status: '進行中',
    },
    {
      id: 'act-2',
      item: '協助辦理參加第八節理化學習扶助增能班',
      responsible: '導師',
      priority: '高',
      deadline: '下週一前完成報名',
      status: '待處理',
    },
    {
      id: 'act-3',
      item: '課堂觀察上課精神狀況，每週五進行聯絡簿進度檢核',
      responsible: '導師',
      priority: '中',
      deadline: '本學期每週持續',
      status: '進行中',
    },
  ],
  crossOfficeReferrals: ['教務處課業學習扶助班轉介', '學務處生活常規晨檢追蹤'],
  careLevel: '一般關懷',
  suggestedNextVisitDate: '期中評量後一週（約11月中旬以電話/面談追蹤）',
  keyTags: ['作息調整', '手機管制', '理化扶助', '親師生三方約定', '生活常規'],
  generatedAt: new Date().toISOString(),
  modelUsed: 'gemini-3.7-flash',
};

export const SAMPLE_RECORDS: VisitRecord[] = [
  {
    id: 'rec-demo-001',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: '已生成摘要',
    visitInfo: DEFAULT_VISIT_INFO,
    transcripts: SAMPLE_TRANSCRIPTS_1,
    summary: SAMPLE_SUMMARY_1,
    audioDurationSeconds: 675,
  },
  {
    id: 'rec-demo-002',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    status: '已歸檔',
    visitInfo: {
      schoolName: '國立成功商業水產職業學校',
      academicYear: '115學年度',
      semester: '第1學期',
      className: '一年孝班',
      studentName: '張雅涵',
      studentId: '114008',
      studentGender: '女',
      teacherName: '卓銘欣 老師',
      accompanyStaff: '認輔教師 李老師',
      visitDate: '2026-08-18',
      visitTime: '18:00 ~ 19:15',
      visitStartTime: '18:00',
      visitEndTime: '19:15',
      visitDurationMinutes: 75,
      visitType: '實體到府訪視',
      visitLocation: '學生自宅',
      attendees: '祖母、學生本人',
      visitPurpose: '隔代教養家庭生活支持系統探訪、新生入學適應關懷',
      specialNotes: '父母離異在外地工作，由年邁祖母主要照料，申請低收入戶就學扶助中。',
    },
    transcripts: [
      { id: 't2-1', timestamp: '00:00:10', timestampSeconds: 10, speaker: '導師', text: '阿嬤您好！今天跟李老師一起來看看雅涵，阿嬤辛苦了。' },
      { id: 't2-2', timestamp: '00:00:30', timestampSeconds: 30, speaker: '家長', text: '老師好，感謝老師特別跑一趟。我年紀大看不太懂功課，很擔心她升國中跟不上。' },
      { id: 't2-3', timestamp: '00:01:20', timestampSeconds: 80, speaker: '導師', text: '雅涵在學校非常懂事貼心，國文跟美術都很有天分，學校有提供課後免費輔導與愛心便當，我們都會幫忙申請。', isFlagged: true, flagCategory: '生活常規' },
    ],
    summary: {
      executiveSummary: '該生為隔代教養家庭，由祖母照顧生活起居。學生性格溫順懂事且學習態度認真，惟家中經濟負擔較重。導師已協助申請學校午餐補助及課後免費課輔，並轉介輔導室認輔機制。',
      familyEnvironment: '生活環境單純，祖孫感情深厚，祖母雖年邁但竭盡所能照顧孩子生活。家庭經濟條件屬中低收，需學校福利資源適時介入支持。',
      academicPerformance: '文科與藝能科表現優異，數理科目基礎尚可。已安排參加校內課後輔導班，減輕家庭課業督導負擔。',
      emotionalAndSocial: '在校人際關係良好，情緒穩定，懂得體貼長輩。導師將持續給予關懷，增強自信心。',
      parentDiscipline: '祖母管教以慈愛關懷為主，對學校指導十分信任與配合。',
      teacherSuggestions: '1. 協助申請仁愛基金與午餐補助。\n2. 安排課後自習與多元社團活動。\n3. 轉介輔導室納入認輔個案。',
      actionItems: [
        { id: 'a-1', item: '完成校內清寒就學與午餐補助申請', responsible: '學務處', priority: '高', deadline: '開學第一個月', status: '已完成' },
        { id: 'a-2', item: '安排輔導室每週一次認輔談心', responsible: '輔導室', priority: '中', deadline: '持續進行', status: '進行中' },
      ],
      crossOfficeReferrals: ['輔導室二級認輔轉介', '總務處仁愛基金補助', '學務處急難救助金協處'],
      careLevel: '持續追蹤',
      suggestedNextVisitDate: '學期末電訪關懷',
      keyTags: ['隔代教養', '助學金申請', '入學適應', '輔導室認輔', '愛心午餐'],
      generatedAt: '2026-08-18T19:30:00Z',
      modelUsed: 'gemini-3.7-flash',
    },
    audioDurationSeconds: 520,
  },
];
