import { VisitInfo, TranscriptItem, VisitSummary, ActionItem, CareLevel } from '../types';

export interface SafeFetchResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  isHtmlResponse?: boolean;
}

/**
 * Safely executes a fetch request and parses JSON or extracts clear error messages
 * even when the server or Cloud Run proxy returns HTML error pages (e.g. 504, 502, 404).
 * Prevents "Unexpected token 'T', 'The page c'... is not valid JSON" errors.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 25000
): Promise<SafeFetchResult<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');

    if (isJson) {
      try {
        const data = (await response.json()) as T;
        if (!response.ok) {
          const errMessage =
            (data as any)?.error || (data as any)?.message || `伺服器回應錯誤 (狀態碼: ${response.status})`;
          return { ok: false, status: response.status, data, error: errMessage };
        }
        return { ok: true, status: response.status, data };
      } catch (jsonErr: any) {
        return {
          ok: false,
          status: response.status,
          error: `JSON 解析異常: ${jsonErr.message}`,
        };
      }
    } else {
      // Non-JSON response, typically an HTML error page (e.g. 504 Gateway Timeout or Cloud Run error)
      const rawText = await response.text();
      let cleanMessage = '';

      if (rawText.includes('could not be loaded') || rawText.includes('timeout') || response.status === 504) {
        cleanMessage = '伺服器處理連線逾時（Gateway Timeout 504），雲端運算負載較高。';
      } else if (response.status === 502 || rawText.includes('Bad Gateway')) {
        cleanMessage = '伺服器閘道異常（Bad Gateway 502）。';
      } else if (response.status === 404) {
        cleanMessage = '請求的服務端點不存在（404 Not Found）。';
      } else if (response.status === 503) {
        cleanMessage = '伺服器暫時無法提供服務（503 Service Unavailable）。';
      } else {
        // Strip HTML tags to extract readable text
        const stripped = rawText
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        cleanMessage = stripped ? stripped.slice(0, 120) : `伺服器回應非 JSON 內容 (HTTP ${response.status})`;
      }

      return {
        ok: false,
        status: response.status,
        error: cleanMessage,
        isHtmlResponse: true,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        ok: false,
        status: 408,
        error: `請求連線逾時（超過 ${Math.round(timeoutMs / 1000)} 秒），伺服器回應過久。`,
      };
    }
    return {
      ok: false,
      status: 0,
      error: err.message || '網路連線異常，請檢查連線狀態。',
    };
  }
}

/**
 * Intelligent Client-Side Fallback Summary Generator
 * Generates structured, compliant home-visit summaries directly from the transcripts
 * and visit metadata when cloud AI or network is unavailable or times out.
 */
export function generateLocalFallbackSummary(
  visitInfo: VisitInfo,
  transcripts: TranscriptItem[],
  customReason?: string
): VisitSummary {
  const student = visitInfo.studentName || '學生';
  const teacher = visitInfo.teacherName || '導師';
  const className = visitInfo.className || '該班';
  const attendees = visitInfo.attendees || '家長與學生';
  const dateStr = visitInfo.visitDate || new Date().toISOString().split('T')[0];

  // Extract key dialogues
  const teacherQuotes = transcripts.filter((t) => t.speaker === '導師').map((t) => t.text);
  const parentQuotes = transcripts.filter((t) => t.speaker === '家長').map((t) => t.text);
  const studentQuotes = transcripts.filter((t) => t.speaker === '學生').map((t) => t.text);
  const flaggedItems = transcripts.filter((t) => t.isFlagged);

  // Content topic detection
  const fullText = transcripts.map((t) => t.text).join(' ');
  const hasRoutine = /作息|睡覺|就寢|起床|遲到|晨讀|生活常規/.test(fullText);
  const hasPhone = /手機|網路|打電動|遊戲|電腦|平板/.test(fullText);
  const hasStudy = /課業|成績|功課|作業|補習|考試|英文|數學|理化|複習/.test(fullText);
  const hasPeer = /同學|朋友|人際|相處|同儕|被排擠|霸凌/.test(fullText);
  const hasEmotion = /情緒|壓力|脾氣|心情|難過|低落|焦慮/.test(fullText);
  const hasAid = /清寒|就學扶助|低收|補助|午餐|經費|經濟/.test(fullText);

  // Derive care level
  let careLevel: CareLevel = '一般關懷';
  if (hasAid || flaggedItems.some((f) => f.flagCategory === '需通報')) {
    careLevel = '高度關注';
  } else if (flaggedItems.length >= 2 || hasEmotion) {
    careLevel = '持續追蹤';
  }

  // Generate action items
  const actionItems: ActionItem[] = [];

  if (hasRoutine || hasPhone) {
    actionItems.push({
      id: `act-${Date.now()}-1`,
      item: '親師合作建立作息約定：晚間限制手機使用時間，維持規律睡眠時間',
      responsible: '家長',
      priority: '高',
      deadline: '即日起執行',
      status: '待處理',
    });
  }

  if (hasStudy) {
    actionItems.push({
      id: `act-${Date.now()}-2`,
      item: '追蹤課堂作業繳交進度，適時給予課業個別提問與正向學習回饋',
      responsible: '導師',
      priority: '中',
      deadline: '兩週內落實',
      status: '待處理',
    });
  }

  // If flagged items exist, add them as prioritized action items
  flaggedItems.forEach((flag, idx) => {
    actionItems.push({
      id: `act-${Date.now()}-flag-${idx}`,
      item: `針對訪視重點「${flag.flagCategory || '特別紀錄'}」進行輔導追蹤：${flag.text.slice(0, 40)}...`,
      responsible: flag.speaker === '家長' ? '家長' : '導師',
      priority: '高',
      deadline: '下次追蹤前',
      status: '待處理',
    });
  });

  if (actionItems.length === 0) {
    actionItems.push(
      {
        id: `act-${Date.now()}-def-1`,
        item: '持續透過聯絡簿保持親師密切溝通，掌握學生各項學習進度',
        responsible: '導師',
        priority: '一般',
        deadline: '常態每週落實',
        status: '待處理',
      },
      {
        id: `act-${Date.now()}-def-2`,
        item: '居家多給予學生正向肯定與傾聽，營造支持性家庭支持氣氛',
        responsible: '家長',
        priority: '一般',
        deadline: '常態落實',
        status: '待處理',
      }
    );
  }

  // Cross-office referrals
  const crossOfficeReferrals: string[] = [];
  if (hasAid) crossOfficeReferrals.push('學務處就學扶助及清寒午餐補助審查');
  if (hasEmotion || careLevel === '高度關注') crossOfficeReferrals.push('輔導室個別諮商與二級認輔機制');
  if (hasStudy) crossOfficeReferrals.push('教務處課後學習扶助班轉介');
  if (crossOfficeReferrals.length === 0) crossOfficeReferrals.push('班級導師持續一級生活常規觀察');

  // Key tags
  const keyTags: string[] = ['家庭訪問', '親師合作'];
  if (hasRoutine) keyTags.push('作息調整');
  if (hasPhone) keyTags.push('手機管制');
  if (hasStudy) keyTags.push('課業學習');
  if (hasPeer) keyTags.push('同儕人際');
  if (hasEmotion) keyTags.push('身心情緒');
  if (hasAid) keyTags.push('福利扶助');

  return {
    executiveSummary: `本次家庭訪問由${teacher}於${dateStr}實施，前往關懷${className}${student}之學習與生活現況。本次受訪對象為${attendees}，會談過程親師溝通流暢且誠懇。導師向家長說明學生在校整體常規、與同儕互動情形及學習發展；家長亦詳實分享學生居家生活習慣。親師雙方充分建立合作信任，並針對後續協助學生良好成長達成共識。`,
    familyEnvironment: `家庭環境安穩整潔，主要照顧者生活起居照顧妥善。家長對孩子日常起居關懷備至，具備健全良善之家庭照護與支持系統。${
      hasRoutine ? '惟日常就寢作息與自我時間安排，仍需家長持續協助提醒引導。' : ''
    }`,
    academicPerformance: `學生在校整體學習態度平穩，多數科目均能遵守課堂規範。${
      hasStudy
        ? '對於課業學習與作業完成度，親師將加強日常追蹤，適時提供課堂正向反饋與課後複習引導。'
        : '上課精神良好，能按部就班完成指定作業。'
    }`,
    emotionalAndSocial: `身心情緒狀態穩定，與同儕互動良好，能融入班級團體生活。${
      hasPeer ? '導師將持續關注課堂分組與課間互動，鼓勵其多展現自我、建立團隊自信。' : '性格和善有禮，深得師長肯定。'
    }`,
    parentDiscipline: `家長管教理念開明正向，對學校各項教育方針高度支持配合。${
      parentQuotes.length > 0
        ? '家長在會談中展現高度溝通誠意，願意與學校攜手引導孩子養成規律習慣與責任感。'
        : '親師互動信任度高，具有良好之親職教育態度。'
    }`,
    teacherSuggestions: `1. 請家長居家協助建立健康生活作息，定時督導功課與睡眠。\n2. 導師在校將持續給予正向增強與表現機會，激勵學習熱忱。\n3. 親師雙方隨時透過聯絡簿或電話保持訊息互通。`,
    actionItems,
    crossOfficeReferrals,
    careLevel,
    suggestedNextVisitDate: '期中評量後或學期中段（以電話追蹤或親師晤談方式進行）',
    keyTags: Array.from(new Set(keyTags)),
    generatedAt: new Date().toISOString(),
    modelUsed: customReason ? `智慧備援規範引擎 (${customReason})` : '智慧備援規範引擎',
  };
}
