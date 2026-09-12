import { VisitRecord } from '../types';
import { exportVisitRecordToDocx } from './docxExportService';

/**
 * Generates and downloads the COMPLETE transcripts as a formal Plain Text file (.txt).
 * Guarantees 100% of all transcripts are exported regardless of UI filters.
 */
export function downloadAllTranscriptsAsTxt(record: VisitRecord): { success: boolean; totalCount: number; fileName: string } {
  const { visitInfo, transcripts = [] } = record;
  const totalCount = transcripts.length;

  // Speaker breakdown statistics
  const speakerStats: Record<string, number> = {};
  for (const t of transcripts) {
    speakerStats[t.speaker] = (speakerStats[t.speaker] || 0) + 1;
  }
  const statsString = Object.entries(speakerStats)
    .map(([speaker, count]) => `${speaker}: ${count} 則`)
    .join('、 ');

  const school = visitInfo.schoolName || '國立成功商業水產職業學校';
  const cName = visitInfo.className || '班級未定';
  const sName = visitInfo.studentName || '訪視學生';
  const vDate = visitInfo.visitDate || new Date().toISOString().slice(0, 10);
  const teacher = visitInfo.teacherName || '訪視導師';

  const lines: string[] = [
    `================================================================================`,
    `【${school}】家庭訪問正式訪談逐字對話紀錄表（全本完整收錄）`,
    `================================================================================`,
    `學年度／學期：${visitInfo.academicYear || '115學年度'} ${visitInfo.semester || '第1學期'}`,
    `受訪學生姓名：${sName} (${cName} / 座號: ${visitInfo.studentId || '—'})`,
    `訪視主責導師：${teacher}`,
    `訪視日期時間：${vDate} ${visitInfo.visitTime || (visitInfo.visitStartTime ? `${visitInfo.visitStartTime} ~ ${visitInfo.visitEndTime}` : '')}`,
    `訪視形式地點：${visitInfo.visitType || '實體到府訪視'} (地點: ${visitInfo.visitLocation || '學生住家'})`,
    `受訪家庭人員：${visitInfo.attendees || '家長與學生本人'}`,
    `本次訪談主旨：${visitInfo.visitPurpose || '學生在校生活適應與家庭關懷'}`,
    `逐字紀錄統計：共收錄 ${totalCount} 則發言 (${statsString || '無對話'})`,
    `匯出下載時間：${new Date().toLocaleString('zh-TW', { hour12: false })}`,
    `資安聲明規範：本檔案涉及學生家庭隱私與處遇紀錄，受個人資料保護法及校園資安規範保護。`,
    `================================================================================`,
    ``,
    `【全部訪談對話逐字內容清單】（共 ${totalCount} 則，依時間序完整列示，絕無遺漏）：`,
    ``,
  ];

  if (totalCount === 0) {
    lines.push(`（目前尚無收錄任何逐字對話紀錄）`);
  } else {
    transcripts.forEach((t, index) => {
      const num = String(index + 1).padStart(3, '0');
      const time = t.timestamp || '00:00';
      const speaker = t.speaker;
      const flagStr = t.isFlagged ? `  【★重點標記: ${t.flagCategory || '重點'}】` : '';
      lines.push(`[${num}] [${time}] 【${speaker}】: ${t.text}${flagStr}`);
    });
  }

  lines.push(``);
  lines.push(`================================================================================`);
  lines.push(`【紀錄結束 · 成功商水導師家庭訪問支援系統自動產生】`);
  lines.push(`================================================================================`);

  const fileContent = lines.join('\r\n');
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fileName = `${cName}_${sName}_完整家訪逐字稿全本_${vDate}.txt`;
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, totalCount, fileName };
}

/**
 * Generates and downloads the COMPLETE transcripts as an Excel-compatible CSV file.
 * Includes UTF-8 BOM so Microsoft Excel correctly displays Traditional Chinese characters.
 */
export function downloadAllTranscriptsAsCsv(record: VisitRecord): { success: boolean; totalCount: number; fileName: string } {
  const { visitInfo, transcripts = [] } = record;
  const totalCount = transcripts.length;
  const cName = visitInfo.className || '班級';
  const sName = visitInfo.studentName || '學生';
  const vDate = visitInfo.visitDate || new Date().toISOString().slice(0, 10);

  const escapeCsv = (str: string) => {
    if (!str) return '""';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows: string[] = [
    // Header row
    ['序號', '時間戳記', '訪談秒數(秒)', '發言角色', '對話逐字內容', '是否重點標記', '標記分類', '受訪學生', '班級', '訪視導師', '訪視日期']
      .map(escapeCsv)
      .join(','),
  ];

  transcripts.forEach((t, index) => {
    const row = [
      String(index + 1),
      t.timestamp || '',
      String(t.timestampSeconds || 0),
      t.speaker || '',
      t.text || '',
      t.isFlagged ? '是' : '否',
      t.flagCategory || '',
      sName,
      cName,
      visitInfo.teacherName || '',
      vDate,
    ];
    rows.push(row.map(escapeCsv).join(','));
  });

  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fileName = `${cName}_${sName}_家訪對話逐字稿表格_${vDate}.csv`;
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, totalCount, fileName };
}

/**
 * Downloads the full official Word (.docx) document including the complete transcript appendix.
 */
export async function downloadAllTranscriptsAsDocx(record: VisitRecord): Promise<void> {
  await exportVisitRecordToDocx(record);
}
