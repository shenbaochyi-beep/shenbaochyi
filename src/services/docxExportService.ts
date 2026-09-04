import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import { VisitRecord, VisitInfo, VisitSummary, TranscriptItem } from '../types';

export async function exportVisitRecordToDocx(record: VisitRecord) {
  const { visitInfo, summary, transcripts } = record;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1200,
              right: 1200,
            },
          },
        },
        children: [
          // Header: School Name & Document Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: visitInfo.schoolName || '學務處導師家庭訪問紀錄表',
                bold: true,
                size: 32, // 16pt
                font: '標楷體',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `${visitInfo.academicYear || '113學年度'} ${visitInfo.semester || '第1學期'} 導師家庭訪問紀錄表`,
                bold: true,
                size: 28, // 14pt
                font: '標楷體',
              }),
            ],
          }),

          // Metadata Table
          createMetadataTable(visitInfo),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // Section: Summary Content Table
          createSummaryTable(visitInfo, summary),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // Action Items & Decisions Table
          createActionItemsTable(summary),

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // Official Signatures Approval Table
          createSignaturesTable(visitInfo),

          new Paragraph({ spacing: { before: 300, after: 100 } }),

          // Appendix: Full Transcript Log
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: '【附件：訪談逐字即時轉譯對話紀錄】',
                bold: true,
                size: 22,
                font: '標楷體',
              }),
            ],
          }),
          ...createTranscriptParagraphs(transcripts),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${visitInfo.className || '班級'}_${visitInfo.studentName || '學生'}_家庭訪問紀錄表_${visitInfo.visitDate || '訪談'}.docx`;
  saveAs(blob, fileName);
}

function createCell(text: string, isHeader = false, widthPercent = 25, isBold = false) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: isHeader
      ? { type: ShadingType.CLEAR, fill: 'F1F5F9' }
      : undefined,
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text || '—',
            bold: isHeader || isBold,
            size: 20, // 10pt
            font: '微軟正黑體',
          }),
        ],
      }),
    ],
  });
}

function createMetadataTable(info: VisitInfo): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell('學生姓名', true, 18),
          createCell(`${info.studentName} (${info.studentGender || '—'})`, false, 32, true),
          createCell('班級 / 座號', true, 18),
          createCell(`${info.className} / ${info.studentId || '—'}號`, false, 32),
        ],
      }),
      new TableRow({
        children: [
          createCell('訪視導師', true, 18),
          createCell(info.teacherName, false, 32),
          createCell('隨同人員', true, 18),
          createCell(info.accompanyStaff || '無', false, 32),
        ],
      }),
      new TableRow({
        children: [
          createCell('訪視日期時間', true, 18),
          createCell(`${info.visitDate} ${info.visitTime || (info.visitStartTime ? `${info.visitStartTime} ~ ${info.visitEndTime}` : '')}${info.visitDurationMinutes ? ` (共${info.visitDurationMinutes}分鐘)` : ''}`, false, 32),
          createCell('訪視形式', true, 18),
          createCell(info.visitType, false, 32),
        ],
      }),
      new TableRow({
        children: [
          createCell('訪視地點', true, 18),
          createCell(info.visitLocation || '學生住處', false, 32),
          createCell('受訪對象關係', true, 18),
          createCell(info.attendees || '家長與學生', false, 32),
        ],
      }),
      new TableRow({
        children: [
          createCell('訪視主旨/目的', true, 18),
          new TableCell({
            width: { size: 82, type: WidthType.PERCENTAGE },
            columnSpan: 3,
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: info.visitPurpose || '生活作息與課業學習關懷',
                    size: 20,
                    font: '微軟正黑體',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createSummaryTable(info: VisitInfo, summary?: VisitSummary): Table {
  if (!summary) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('訪談紀要', true, 20),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: '尚未產出 AI 摘要紀錄。' })],
            }),
          ],
        }),
      ],
    });
  }

  const sections = [
    { title: '一、訪談綜合紀要', content: summary.executiveSummary },
    { title: '二、家庭環境與生活照顧概況', content: summary.familyEnvironment },
    { title: '三、學業表現與學習態度交流', content: summary.academicPerformance },
    { title: '四、身心情緒與同儕人際相處', content: summary.emotionalAndSocial },
    { title: '五、家長管教態度與親職期待', content: summary.parentDiscipline },
    { title: '六、導師輔導建議與後續策略', content: summary.teacherSuggestions },
    {
      title: '七、跨處室協處與轉介建議',
      content: (summary.crossOfficeReferrals || []).join('、 ') || '導師持續生活常規觀察，視情況轉介。',
    },
    {
      title: '八、關懷評級與追蹤規劃',
      content: `【關懷等級】：${summary.careLevel || '一般關懷'}　|　【建議下次追蹤】：${summary.suggestedNextVisitDate || '學期中視情況聯繫'}`,
    },
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: sections.map((sec) => {
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: sec.title,
                    bold: true,
                    size: 20,
                    font: '微軟正黑體',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: sec.content
              .split('\n')
              .filter((line) => line.trim())
              .map(
                (line) =>
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: line,
                        size: 20,
                        font: '微軟正黑體',
                      }),
                    ],
                  })
              ),
          }),
        ],
      });
    }),
  });
}

function createActionItemsTable(summary?: VisitSummary): Table {
  const items = summary?.actionItems || [];
  const rows: TableRow[] = [
    new TableRow({
      children: [
        createCell('編號', true, 10, true),
        createCell('具體決議與行動方案', true, 50, true),
        createCell('負責對象', true, 15, true),
        createCell('優先級', true, 10, true),
        createCell('預定完成期程', true, 15, true),
      ],
    }),
  ];

  if (items.length === 0) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 5,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                text: '無待辦行動方案',
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      })
    );
  } else {
    items.forEach((item, idx) => {
      rows.push(
        new TableRow({
          children: [
            createCell(String(idx + 1), false, 10),
            createCell(item.item, false, 50),
            createCell(item.responsible, false, 15),
            createCell(item.priority, false, 10),
            createCell(item.deadline || '—', false, 15),
          ],
        }),
      );
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function createSignaturesTable(info: VisitInfo): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell('訪視導師簽章', true, 25),
          createCell('學務處生輔/訓育組長', true, 25),
          createCell('學務主任核章', true, 25),
          createCell('校長核閱', true, 25),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: { top: 350, bottom: 350, left: 100, right: 100 },
            children: [
              new Paragraph({
                text: `${info.teacherName || ''} (簽名/蓋章)`,
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: { top: 350, bottom: 350, left: 100, right: 100 },
            children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: { top: 350, bottom: 350, left: 100, right: 100 },
            children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: { top: 350, bottom: 350, left: 100, right: 100 },
            children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER })],
          }),
        ],
      }),
    ],
  });
}

function createTranscriptParagraphs(transcripts: TranscriptItem[]): Paragraph[] {
  if (!transcripts || transcripts.length === 0) {
    return [
      new Paragraph({
        children: [new TextRun({ text: '（無逐字對話紀錄）', italics: true, size: 18 })],
      }),
    ];
  }

  return transcripts.map((t) => {
    return new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `[${t.timestamp}] `,
          color: '64748B',
          size: 18,
          font: 'Consolas',
        }),
        new TextRun({
          text: `${t.speaker}：`,
          bold: true,
          color: t.speaker === '導師' ? '1E40AF' : t.speaker === '家長' ? '166534' : '854D0E',
          size: 18,
          font: '微軟正黑體',
        }),
        new TextRun({
          text: t.text,
          size: 18,
          font: '微軟正黑體',
        }),
        ...(t.isFlagged
          ? [
              new TextRun({
                text: ` 【★${t.flagCategory || '重點'}】`,
                bold: true,
                color: 'DC2626',
                size: 16,
              }),
            ]
          : []),
      ],
    });
  });
}
