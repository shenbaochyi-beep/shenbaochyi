import { SpeakerType, TranscriptItem, VisitInfo } from '../types';

export interface SpeakerDetectionResult {
  detectedSpeaker: SpeakerType;
  confidence: number;
  reason: string;
  matchedKeywords: string[];
}

export interface SpeakerDetectionOptions {
  currentText: string;
  activeSpeaker: SpeakerType;
  lastTranscripts: TranscriptItem[];
  visitInfo?: VisitInfo;
  pitchHz?: number | null;
  isManualLocked?: boolean;
}

// Linguistic cues for role detection in school home visits
const TEACHER_KEYWORDS = [
  '在學校', '我們班', '班上', '上課', '段考', '期中考', '期末考', '作業', '聯絡簿',
  '出缺席', '請假', '曠課', '遲到', '早自修', '學習扶助', '補救教學', '身為導師',
  '我是導師', '老師發現', '學校規定', '家長您好', '爸爸媽媽', '林媽媽', '陳媽媽',
  '張媽媽', '李媽媽', '黃媽媽', '爸爸您好', '媽媽您好', '今天來訪', '家庭訪問',
  '課堂表現', '升學規劃', '志願選填', '輔導會談', '導師會持續', '在校生活'
];

const PARENT_KEYWORDS = [
  '老師好', '導師好', '謝謝老師', '感謝老師', '麻煩老師', '拜託老師', '老師您好',
  '在家裡', '回家之後', '這孩子', '我兒子', '我女兒', '我小孩', '玩手機', '滑手機',
  '打電動', '玩電腦', '不睡覺', '熬夜', '叫不起床', '早上叫不醒', '管不動', '講不聽',
  '做父母的', '當家長的', '關在房間', '頂嘴', '零用錢', '補習', '家裡生活',
  '我們全力配合', '麻煩老師多費心', '拜託導師', '請老師多多指導'
];

const STUDENT_KEYWORDS = [
  '老師好', '我會早點睡', '我會改進', '我最近', '我數理', '我數學', '我英文',
  '我聽不懂', '我考不好', '我在房間', '我打手遊', '我知道了', '我明天會交',
  '我想要考', '我跟同學', '我不是故意', '我自己覺得', '我有點記不住', '我有在看書',
  '我之後會', '老師我想問', '媽媽不要再念了', '爸爸我會去讀書'
];

const COUNSELOR_KEYWORDS = [
  '輔導室', '心理師', '心理諮商', '情緒調適', '個別晤談', '特教', '身心特質',
  '同理心', '性向測驗', '興趣探索', '心理支持', '個別諮商', '橫向聯繫', '輔導老師'
];

const OTHER_KEYWORDS = [
  '里長', '社工', '社會局', '急難救助', '補助款', '低收入戶', '中低收', '鄰里長',
  '隨行訪員', '課後輔導員', '生活扶助'
];

/**
 * Intelligent Speaker Classifier
 * Evaluates linguistic cues, conversation flow, role context, and optional acoustic pitch.
 */
export function detectSpeaker(options: SpeakerDetectionOptions): SpeakerDetectionResult | null {
  const { currentText, activeSpeaker, lastTranscripts, visitInfo, pitchHz } = options;
  const text = currentText.trim();
  if (!text || text.length < 2) return null;

  const scores: Record<SpeakerType, { score: number; reasons: string[]; matches: string[] }> = {
    '導師': { score: 0, reasons: [], matches: [] },
    '家長': { score: 0, reasons: [], matches: [] },
    '學生': { score: 0, reasons: [], matches: [] },
    '輔導老師': { score: 0, reasons: [], matches: [] },
    '輔導員': { score: 0, reasons: [], matches: [] },
    '其他': { score: 0, reasons: [], matches: [] },
  };

  // 1. Keyword scoring
  for (const kw of TEACHER_KEYWORDS) {
    if (text.includes(kw)) {
      scores['導師'].score += 2.5;
      scores['導師'].matches.push(kw);
      scores['導師'].reasons.push(`出現導師專屬語境/稱謂「${kw}」`);
    }
  }

  for (const kw of PARENT_KEYWORDS) {
    if (text.includes(kw)) {
      scores['家長'].score += 2.8;
      scores['家長'].matches.push(kw);
      scores['家長'].reasons.push(`出現家長對導師敬稱或家庭用語「${kw}」`);
    }
  }

  for (const kw of STUDENT_KEYWORDS) {
    if (text.includes(kw)) {
      scores['學生'].score += 2.6;
      scores['學生'].matches.push(kw);
      scores['學生'].reasons.push(`出現學生第一人稱陳述或學習用語「${kw}」`);
    }
  }

  for (const kw of COUNSELOR_KEYWORDS) {
    if (text.includes(kw)) {
      scores['輔導老師'].score += 3.5;
      scores['輔導老師'].matches.push(kw);
      scores['輔導老師'].reasons.push(`出現輔導室專門術語「${kw}」`);
    }
  }

  for (const kw of OTHER_KEYWORDS) {
    if (text.includes(kw)) {
      scores['其他'].score += 3.0;
      scores['其他'].matches.push(kw);
      scores['其他'].reasons.push(`出現社工/里政用語「${kw}」`);
    }
  }

  // 2. Student name vocative detection
  if (visitInfo?.studentName) {
    const sName = visitInfo.studentName.trim();
    // If text starts with student name or says "XXX同學", speaker is almost certainly Teacher or Parent
    if (text.includes(sName)) {
      if (activeSpeaker === '學生') {
        scores['導師'].score += 2.0;
        scores['導師'].reasons.push(`稱呼學生「${sName}」，非學生本人發言`);
      }
    }
  }

  // 3. Turn-taking dynamics from immediate previous utterance
  const lastItem = lastTranscripts[lastTranscripts.length - 1];
  if (lastItem) {
    const lastText = lastItem.text.trim();
    const isQuestion = lastText.endsWith('？') || lastText.endsWith('?') || 
                       lastText.includes('好不好') || lastText.includes('是不是') || 
                       lastText.includes('如何') || lastText.includes('怎麼看') ||
                       lastText.includes('你覺得呢');

    if (lastItem.speaker === '導師') {
      if (isQuestion) {
        // Teacher asked question -> Next speaker is likely Parent or Student
        scores['家長'].score += 1.2;
        scores['學生'].score += 1.1;
      }
    } else if (lastItem.speaker === '家長') {
      if (isQuestion || lastText.includes('老師')) {
        // Parent asked teacher -> Next speaker is likely Teacher
        scores['導師'].score += 1.5;
        scores['導師'].reasons.push('接續家長之詢問提問');
      }
    } else if (lastItem.speaker === '學生') {
      // Student responded -> Next speaker is usually Teacher guiding or Parent reinforcing
      scores['導師'].score += 1.2;
      scores['家長'].score += 0.8;
    }
  }

  // 4. Acoustic pitch assistance (if available)
  if (typeof pitchHz === 'number' && pitchHz > 50) {
    // Normal adult male: 85 - 150 Hz
    // Normal adult female: 160 - 260 Hz
    // Student / Adolescent: 190 - 320 Hz
    if (pitchHz > 230 && scores['學生'].score > 1.0) {
      scores['學生'].score += 0.8;
      scores['學生'].reasons.push(`聲學基頻 (${Math.round(pitchHz)}Hz) 符合青少年聲線特徵`);
    }
  }

  // Find candidate with maximum score
  let maxRole: SpeakerType = activeSpeaker;
  let maxScore = 0;
  let maxReasons: string[] = [];
  let maxMatches: string[] = [];

  const roles = Object.keys(scores) as SpeakerType[];
  for (const role of roles) {
    if (scores[role].score > maxScore) {
      maxScore = scores[role].score;
      maxRole = role;
      maxReasons = scores[role].reasons;
      maxMatches = scores[role].matches;
    }
  }

  // Confidence threshold: Must have clear linguistic cue (score >= 2.0)
  if (maxScore >= 2.0 && maxRole !== activeSpeaker) {
    return {
      detectedSpeaker: maxRole,
      confidence: Math.min(0.98, Math.round((maxScore / (maxScore + 2)) * 100) / 100),
      reason: maxReasons[0] || '語音語義自動辨識換人',
      matchedKeywords: maxMatches,
    };
  }

  return null;
}
