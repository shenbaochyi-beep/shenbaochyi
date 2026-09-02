import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Warning: GEMINI_API_KEY is not set in environment.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with increased limit for base64 audio if needed
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // API 1: Generate Home Visit Summary (學務處導師家庭訪問重點摘要生成)
  app.post("/api/generate-summary", async (req, res) => {
    try {
      const { visitInfo, transcripts, customPrompt } = req.body;

      if (!transcripts || !Array.isArray(transcripts) || transcripts.length === 0) {
        return res.status(400).json({ error: "無有效的訪談對話紀錄內容。" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        // Return a mock/fallback structured summary if API key is not configured yet
        return res.json({
          summary: generateFallbackSummary(visitInfo, transcripts),
          isFallback: true,
          message: "未設定 GEMINI_API_KEY，已自動生成結構化預設摘要範本。",
        });
      }

      // Format transcripts into text
      const transcriptText = transcripts
        .map((t: any) => `[${t.timestamp || "00:00"}] ${t.speaker || "訪談者"}${t.isFlagged ? " (★重點標記:" + (t.flagCategory || "重點") + ")" : ""}: ${t.text}`)
        .join("\n");

      const systemInstruction = `你是一位資深的中學/小學學務處與導師輔導專家。你的任務是將導師與家長、學生的家庭訪問對話錄音轉譯內容，嚴謹、客觀、專業地整理成臺灣教育部標準規範之「學務處導師家庭訪問紀錄表」核心摘要。
輸出要求：
1. 語氣嚴謹、正向且具教育輔導專業性，符合公文與學籍輔導記錄規範。
2. 仔細辨析導師、家長、學生三方的表達核心，特別注意有標註 ★重點標記 的對話。
3. 具體列出決議與行動方案（含負責人、優先等級）。
4. 依據訪視內容研判學生關懷等級（'一般關懷'、'持續追蹤'、'高度關注'、'緊急協處/通報'）與跨處室協作建議。
5. 必須嚴格輸出合法的 JSON 格式。`;

      const prompt = `【家庭訪問基本資料】
學校：${visitInfo?.schoolName || "本校"}
學年度/學期：${visitInfo?.academicYear || "113學年度"} ${visitInfo?.semester || "第1學期"}
班級：${visitInfo?.className || "未指定班級"}
學生姓名：${visitInfo?.studentName || "學生"} (座號/學號: ${visitInfo?.studentId || "未填"}, 性別: ${visitInfo?.studentGender || "不拘"})
訪視導師：${visitInfo?.teacherName || "導師"}
訪視對象與關係：${visitInfo?.attendees || "家長與學生"}
訪視形式：${visitInfo?.visitType || "實體到府訪視"}
訪視地點：${visitInfo?.visitLocation || "學生住處"}
訪談目的：${visitInfo?.visitPurpose || "生活與學習關懷"}
訪前備註：${visitInfo?.specialNotes || "無"}

【訪談逐字轉譯紀錄】
${transcriptText}

${customPrompt ? `【導師額外補充指示】：${customPrompt}` : ""}

請根據上述資料與完整對話紀錄，精準分析並產出完整的家庭訪問綜合摘要報告，包含以下欄位：
- executiveSummary: 訪談綜合紀要（200~300字，總結本次訪視的核心發現與整體氛圍）
- familyEnvironment: 家庭環境與生活照顧概況（生活作息、居住環境、作息常規、主要照顧者等）
- academicPerformance: 學業表現與在校學習態度探討（作業繳交、課業困難、學習動機、目標）
- emotionalAndSocial: 身心情緒與同儕人際相處（情緒調節、人際互動、同儕交往、手機網路使用等）
- parentDiscipline: 家長管教態度與教育期待（家長態度、溝通模式、對孩子之期待與困擾）
- teacherSuggestions: 導師輔導建議與後續引導方向（導師專業引導策略、親師合作默契）
- actionItems: 具體行動方案列表，每項包含 item(事項內容), responsible('導師'|'學務處'|'輔導室'|'教務處'|'家長'|'學生'|'跨處室'), priority('高'|'中'|'一般'), deadline(建議完成期程)
- crossOfficeReferrals: 跨處室協處或轉介建議字串陣列（例如：'輔導室個別諮商/認輔'、'學務處生活常規關懷'、'申請就學扶助/午餐補助'、'特教資源諮詢' 等，若無則列合適建議或維持現狀）
- careLevel: 評定關懷等級，僅能填 '一般關懷' | '持續追蹤' | '高度關注' | '緊急協處/通報'
- suggestedNextVisitDate: 建議下次追蹤訪談或親師聯繫之大致期程（如：一個月後期中考後、學期末或具體週次）
- keyTags: 5~8 個能概括本次家訪主題的關鍵字標籤（如：['作息調整', '手機管制', '數學補救', '親職溝通', '生活常規']）`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING, description: "訪談綜合紀要" },
              familyEnvironment: { type: Type.STRING, description: "家庭環境與生活照顧概況" },
              academicPerformance: { type: Type.STRING, description: "學業表現與在校學習態度" },
              emotionalAndSocial: { type: Type.STRING, description: "身心情緒與同儕人際相處" },
              parentDiscipline: { type: Type.STRING, description: "家長管教態度與教育期待" },
              teacherSuggestions: { type: Type.STRING, description: "導師輔導建議與後續引導方向" },
              actionItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.STRING },
                    responsible: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    deadline: { type: Type.STRING },
                  },
                  required: ["item", "responsible", "priority"],
                },
              },
              crossOfficeReferrals: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              careLevel: { type: Type.STRING },
              suggestedNextVisitDate: { type: Type.STRING },
              keyTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              "executiveSummary",
              "familyEnvironment",
              "academicPerformance",
              "emotionalAndSocial",
              "parentDiscipline",
              "teacherSuggestions",
              "actionItems",
              "careLevel",
            ],
          },
        },
      });

      const text = response.text || "{}";
      const parsedData = JSON.parse(text);

      const formattedSummary = {
        ...parsedData,
        actionItems: (parsedData.actionItems || []).map((item: any, idx: number) => ({
          id: `act-${Date.now()}-${idx}`,
          item: item.item || "",
          responsible: item.responsible || "導師",
          priority: item.priority || "一般",
          deadline: item.deadline || "兩週內",
          status: "待處理",
        })),
        crossOfficeReferrals: parsedData.crossOfficeReferrals || ["導師持續生活常規觀察"],
        careLevel: parsedData.careLevel || "一般關懷",
        keyTags: parsedData.keyTags || ["家庭訪問", "親師合作"],
        generatedAt: new Date().toISOString(),
        modelUsed: "gemini-3.7-flash",
      };

      return res.json({
        summary: formattedSummary,
        isFallback: false,
      });
    } catch (error: any) {
      console.error("Error in /api/generate-summary:", error);
      return res.status(500).json({
        error: error.message || "摘要生成失敗，請檢查網路或稍後再試。",
      });
    }
  });

  // API 2: Refine / Polish specific section with AI (智慧改寫與單項潤飾)
  app.post("/api/refine-summary", async (req, res) => {
    try {
      const { sectionKey, originalText, instruction, visitInfo } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(400).json({ error: "尚未配置 GEMINI_API_KEY。" });
      }

      const prompt = `你是一位學校導師與學務輔導專業顧問。請根據以下指示修飾家庭訪問紀錄內容：
學生：${visitInfo?.studentName || "學生"}（${visitInfo?.className || "班級"}）
欄位項目：${sectionKey}
原始內容：
${originalText || "(尚無內容)"}

導師修改要求：
${instruction}

請直接輸出潤飾或擴充後的繁體中文內容，語氣務必符合臺灣中小學學務處與導師輔導紀錄公文風格，條理分明、用詞溫暖且具體。不要輸出多餘的開頭問候語或包裹引號。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      return res.json({
        refinedText: response.text?.trim() || originalText,
      });
    } catch (error: any) {
      console.error("Error in /api/refine-summary:", error);
      return res.status(500).json({ error: error.message || "修飾失敗" });
    }
  });

  // API 3: Transcribe pre-recorded audio file using gemini-3.5-transcribe
  app.post("/api/transcribe-audio", async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: "請提供音訊資料。" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(400).json({ error: "尚未設定 GEMINI_API_KEY，無法使用雲端音訊轉譯。" });
      }

      const audioPart = {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audioBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            audioPart,
            {
              text: `請將此段家庭訪問或親師對話錄音精準轉譯為繁體中文逐字紀錄。
請盡可能辨識發言者角色（例如：導師、家長、學生），並輸出 JSON 陣列格式：
[
  { "speaker": "導師", "timestamp": "00:00:05", "text": "家長您好，今天特別來家訪..." },
  { "speaker": "家長", "timestamp": "00:00:18", "text": "老師好，請進請進..." }
]
若無法精準辨識時間軸，請依對話順序切分句子。僅回傳合法 JSON 陣列。`,
            },
          ],
        },
      });

      const text = response.text || "[]";
      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      let parsed: any[] = [];
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = [{ speaker: "轉譯內容", timestamp: "00:00:00", text: cleaned }];
      }

      return res.json({ transcripts: parsed });
    } catch (error: any) {
      console.error("Error in /api/transcribe-audio:", error);
      return res.status(500).json({ error: error.message || "音訊轉譯失敗" });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 家訪即時記錄系統伺服器已啟動: http://localhost:${PORT}`);
  });
}

function generateFallbackSummary(visitInfo: any, transcripts: any[]) {
  const student = visitInfo?.studentName || "該生";
  const teacher = visitInfo?.teacherName || "導師";
  return {
    executiveSummary: `本次訪視於${visitInfo?.visitDate || "近期"}進行，由${teacher}前往訪視${student}家庭。家長熱誠接待，親師雙方就學生在校常規表現、人際互動與課業學習進展進行深入交流，雙方溝通氣氛融洽，並達成共同協助學生建立良好生活作息與自我管理習慣之共識。`,
    familyEnvironment: `${student}家庭居住環境單純整潔，家庭支持系統穩定。家長平日工作忙碌但十分關心孩子生活起居，晚間能有固定親子互動時光，具備良好之家庭照護基礎。`,
    academicPerformance: `在校學習態度尚佳，對於有興趣之科目表現積極。主要需加強部分學科之自主複習與時間管理，家長允諾將配合督促每日課後作業完成度及限制晚間手機使用時間。`,
    emotionalAndSocial: `個性溫和，與同儕互動良好，能遵守班級生活公約。偶遇挫折時較為內斂，導師建議平時多鼓勵其勇於表達想法，增強自信心。`,
    parentDiscipline: `家長管教態度開明且尊重學校指導，對孩子抱有合理期待，期望能於國中/高中階段培養獨立自律之良好品格，親師合作意願高。`,
    teacherSuggestions: `1. 請家長協助維持規律作息，每晚10點半前就寢以確保隔日精神。\n2. 導師於班級中將適時給予口頭肯定與幹部責任，提升自我肯定感。\n3. 持續透過聯絡簿與通訊軟體維持每週親師資訊暢通。`,
    actionItems: [
      {
        id: `act-${Date.now()}-1`,
        item: "建立每日聯絡簿檢核與作息自律打卡機制",
        responsible: "家長",
        priority: "高",
        deadline: "即日起每週執行",
        status: "待處理",
      },
      {
        id: `act-${Date.now()}-2`,
        item: "課堂適時給予發言表現機會與正向鼓勵",
        responsible: "導師",
        priority: "中",
        deadline: "學期進行中",
        status: "待處理",
      },
      {
        id: `act-${Date.now()}-3`,
        item: "追蹤期中考前學習進度與課業理解度",
        responsible: "導師",
        priority: "一般",
        deadline: "期中評量前",
        status: "待處理",
      },
    ],
    crossOfficeReferrals: ["學務處生活常規導護關心", "教務處學習扶助資源關注"],
    careLevel: "一般關懷",
    suggestedNextVisitDate: "期中考後一個月（電話追蹤或親師面談）",
    keyTags: ["生活常規", "親師合作", "作息調整", "學習進度"],
    generatedAt: new Date().toISOString(),
    modelUsed: "local-template",
  };
}

startServer();
