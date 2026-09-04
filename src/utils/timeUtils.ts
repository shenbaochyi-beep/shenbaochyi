/**
 * 時間計算與訪視起訖時間處理工具
 */

export interface ParsedTimeRange {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  durationMinutes: number;
}

/**
 * 依據傳入的 visitTime 或起訖欄位解析出標準的 startTime (HH:mm) 與 endTime (HH:mm)
 */
export function parseVisitTime(
  rawVisitTime?: string,
  rawStart?: string,
  rawEnd?: string
): ParsedTimeRange {
  let start = rawStart || '';
  let end = rawEnd || '';

  // 若已有明確的 start / end 且格式正確
  if (start && end) {
    const duration = calculateDurationMinutes(start, end);
    return { startTime: start, endTime: end, durationMinutes: duration };
  }

  // 從 rawVisitTime (如 "14:30 ~ 15:45", "14:30-15:45", "14:30~15:45") 解析
  if (rawVisitTime) {
    const timeMatch = rawVisitTime.match(/(\d{1,2}:\d{2})\s*[-~～至到]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      start = normalizeTimeFormat(timeMatch[1]);
      end = normalizeTimeFormat(timeMatch[2]);
      const duration = calculateDurationMinutes(start, end);
      return { startTime: start, endTime: end, durationMinutes: duration };
    }

    const singleMatch = rawVisitTime.match(/(\d{1,2}:\d{2})/);
    if (singleMatch) {
      start = normalizeTimeFormat(singleMatch[1]);
      end = addMinutesToTime(start, 60);
      return { startTime: start, endTime: end, durationMinutes: 60 };
    }
  }

  // 預設值 14:30 ~ 15:45
  return {
    startTime: '14:30',
    endTime: '15:45',
    durationMinutes: 75,
  };
}

/**
 * 標準化為 HH:mm 格式 (例如 9:30 -> 09:30)
 */
export function normalizeTimeFormat(timeStr: string): string {
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return timeStr;
}

/**
 * 計算開始時間至結束時間之相差分鐘數 (可跨午/下半天)
 */
export function calculateDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;

  const startTotalMinutes = startH * 60 + startM;
  let endTotalMinutes = endH * 60 + endM;

  // 跨午夜處理 (如 23:30 至 00:30)
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  return Math.max(0, endTotalMinutes - startTotalMinutes);
}

/**
 * 將分鐘數轉換為親切的中文字串，如 "1 小時 15 分鐘" 或 "50 分鐘"
 */
export function formatDurationText(minutes: number): string {
  if (minutes <= 0) return '0 分鐘';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) {
    return `${h} 小時 ${m} 分鐘`;
  }
  if (h > 0) {
    return `${h} 小時`;
  }
  return `${m} 分鐘`;
}

/**
 * 給定 HH:mm 加上指定分鐘數
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  if (!timeStr) return '15:30';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '15:30';

  let totalMinutes = (h * 60 + m + minutesToAdd) % (24 * 60);
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * 取得當前時間 HH:mm (例如 14:30)
 */
export function getCurrentTimeHHMM(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
