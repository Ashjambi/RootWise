import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { 
    IncidentReport, AnalysisResult, RecommendationCategory, GlobalCase, SimulatedAction, 
    PredictiveAnalysisResult, SystemicInsight, DeepDiveResult, RecommendationStatus, Recommendation, 
    RecurrenceInfo, RecurrenceType, EarlyWarning, ManagerialInsight, KpiImpact, TrainingModule, IncidentSeverity, DashboardBriefing,
    FiveWhysAnalysis,
    FishboneAnalysis,
    ParetoAnalysis,
    FmeaAnalysis,
    FaultTreeAnalysis,
    PokaYokeAnalysis,
    DmaicAnalysis,
    RecommendationType,
    FaultTreeEvent
} from '../types';

let ai: GoogleGenAI | null = null;

try {
  // This will throw a ReferenceError if `process` is not defined, which is caught below.
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
  } else {
    console.warn("API_KEY environment variable is not set. AI features will be unavailable.");
  }
} catch (e) {
  // This is the expected path in a browser environment without a build step.
  console.warn("Could not initialize Gemini AI, likely because process.env.API_KEY is not available. AI features will be disabled.");
}

function getAiInstance(): GoogleGenAI {
    if (!ai) {
        throw new Error("خدمة الذكاء الاصطناعي غير متاحة. يرجى التأكد من تهيئة مفتاح API بشكل صحيح.");
    }
    return ai;
}


// --- START: Robust API call utility with exponential backoff ---
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(
    callFn: () => Promise<GenerateContentResponse>
): Promise<GenerateContentResponse> {
    let lastError: Error | null = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await callFn();
        } catch (error: any) {
            lastError = error;
            const errorMessage = (error.toString() || '').toLowerCase();

            // Check for rate-limiting error codes/messages
            if (errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
                const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, i) + (Math.random() * 1000); // Add jitter
                console.warn(`Gemini API rate limit exceeded. Retrying in ${Math.round(backoffTime)}ms... (Attempt ${i + 1}/${MAX_RETRIES})`);
                await delay(backoffTime);
            } else {
                // Not a rate-limiting error, rethrow immediately
                throw error;
            }
        }
    }
    console.error("Gemini API call failed after multiple retries.", lastError);
    throw new Error(`فشل استدعاء Gemini API بعد ${MAX_RETRIES} محاولات. الخطأ الأخير: ${lastError}`);
}
// --- END: Robust API call utility ---


const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    rootCause: {
      type: Type.OBJECT,
      description: "تحليل عميق للسبب الجذري الأساسي، وليس فقط المشكلة السطحية.",
      properties: {
        cause: { type: Type.STRING, description: "عبارة موجزة عن السبب الجذري الرئيسي." },
        description: { type: Type.STRING, description: "شرح مفصل لكيفية ولماذا أدى هذا السبب الجذري إلى الحادث." },
        contributingFactors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "قائمة بالعوامل الثانوية التي ساهمت في وقوع الحادث." },
      },
      required: ["cause", "description", "contributingFactors"],
    },
    sopGap: {
      type: Type.OBJECT,
      description: "تحليل الفجوة بين إجراءات التشغيل القياسية (SOP) الرسمية وما حدث بالفعل.",
      properties: {
        expectedProcedure: { type: Type.STRING, description: "ما كان يجب أن يحدث وفقًا للإجراءات التشغيلية القياسية." },
        actualAction: { type: Type.STRING, description: "ما حدث بالفعل أثناء الحادث." },
        gapAnalysis: { type: Type.STRING, description: "شرح للانحراف وسبب أهميته." },
      },
      required: ["expectedProcedure", "actualAction", "gapAnalysis"],
    },
    roleTree: {
        type: Type.ARRAY,
        description: "تحليل مسؤوليات ومساهمات كل دور معني بالحادث، معروضة على شكل 'شجرة أدوار'. يجب أن يكون التحليل موضوعيًا وليس اتهاميًا.",
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "اسم الدور أو الشخص/المنصب." },
                responsibility: { type: Type.STRING, description: "المسؤولية المتوقعة منهم في هذا السياق وفقًا للإجراءات." },
                contribution: { type: Type.STRING, description: "كيف ساهم فعلهم أو تقاعسهم في نتيجة الحدث (بشكل إيجابي أو سلبي)." },
            },
            required: ["name", "responsibility", "contribution"],
        }
    },
    recommendations: {
      type: Type.ARRAY,
      description: "قائمة من التوصيات الملموسة والقابلة للتنفيذ لمنع تكرار الحادث، مع تصنيفها.",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['إجراء تصحيحي', 'إجراء وقائي'], description: "تصنيف الإجراء: 'تصحيحي' لمعالجة سبب مباشر للحادث، أو 'وقائي' لمنع مشكلة مستقبلية محتملة." },
          category: { type: Type.STRING, enum: Object.values(RecommendationCategory).filter(c => c !== RecommendationCategory.Simulation), description: "فئة التوصية." },
          action: { type: Type.STRING, description: "الإجراء المحدد الموصى باتخاذه." },
          impact: { type: Type.STRING, description: "التأثير الإيجابي المتوقع من تنفيذ هذا الإجراء." },
          rationale: { type: Type.STRING, description: "الأساس المنطقي لهذه التوصية، وربطها بالسبب الجذري." },
          ease: { type: Type.STRING, enum: ['سهل', 'متوسط', 'صعب'], description: "مدى سهولة تطبيق التوصية." },
          cost: { type: Type.STRING, enum: ['منخفض', 'متوسط', 'مرتفع'], description: "التكلفة التقديرية للتنفيذ." },
          timeframe: { type: Type.STRING, description: "الإطار الزمني المتوقع للتنفيذ (مثال: 'أسبوع واحد', '3 أشهر')." },
        },
        required: ["type", "category", "action", "impact", "rationale", "ease", "cost", "timeframe"],
      },
    },
    knowledgeCapsule: {
      type: Type.STRING,
      description: "'كبسولة معرفية' موجزة أو ملخص للدرس الرئيسي المستفاد من هذا الحادث يمكن استخدامه للتدريب المؤسسي.",
    },
  },
  required: ["rootCause", "sopGap", "roleTree", "recommendations", "knowledgeCapsule"],
};


export const analyzeIncident = async (incident: IncidentReport): Promise<AnalysisResult> => {
  const ai = getAiInstance();
  const model = "gemini-2.5-flash";

  const prompt = `
    بصفتك خبيرًا عالميًا في التميز التشغيلي وتحليل الأسباب الجذرية، قم بتحليل تقرير الحادث التالي.
    هدفك هو تحديد السبب الجذري الحقيقي، وليس الأعراض فقط، وتقديم حلول عملية وذكية ومبتكرة.
    لا تلم الأفراد؛ ركز على العوامل المتعلقة بالنظام والإجراءات والبيئة والثقافة التنظيمية.

    **تقرير الحادث:**
    - **العنوان:** ${incident.title}
    - **الوصف:** ${incident.description}
    - **التاريخ:** ${incident.date}
    - **القسم:** ${incident.department}
    - **الخطورة:** ${incident.severity}
    - **الإجراء الفوري المتخذ:** ${incident.immediateAction}
    - **الأفراد/الأدوار المعنية:** ${incident.involvedPersonnel}

    **مهمتك:**
    قدم تحليلاً شاملاً بصيغة JSON بناءً على المخطط المحدد.
    1.  **تحليل السبب الجذري:** تجاوز ما هو واضح. لماذا حدث الفشل الأولي؟ ما هي نقطة الضعف الأساسية في النظام أو العملية التي سمحت بحدوث ذلك؟ ابحث عن الأسباب الكامنة.
    2.  **تحليل فجوة إجراءات التشغيل القياسية (SOP):** افترض وجود إجراء تشغيل قياسي لهذه المهمة. قارن الإجراء الصحيح المحتمل بما حدث بالفعل. حدد الفجوة.
    3.  **تحليل شجرة الأدوار:** حلل الأدوار المعنية. ماذا كانت مسؤولية كل دور وكيف ساهمت أفعالهم (أو تقاعسهم) في النتيجة؟ قدم هذا كتحليل للنظام، وليس لومًا فرديًا.
    4.  **التوصيات (CAPAs):** اقترح إجراءات تصحيحية ووقائية ذكية ومبتكرة. صنف كل توصية بوضوح إما كـ 'إجراء تصحيحي' أو 'إجراء وقائي'. اشرح لماذا كل توصية ضرورية.
    5.  **كبسولة معرفية:** لخص النقطة الأساسية في "كبسولة معرفية" غنية بالمعلومات وقابلة للاستخدام للتدريب المستقبلي ومنع تكرار المشكلة.
  `;

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 4096 },
      }
    }));
    
    const jsonText = response.text?.trim();
    if (!jsonText) {
        throw new Error("فشل في الحصول على تحليل صالح من الذكاء الاصطناعي. الاستجابة كانت فارغة.");
    }

    let parsableText = jsonText;
    if (parsableText.startsWith('```json')) {
        parsableText = parsableText.substring(7, parsableText.length - 3).trim();
    }
    const result = JSON.parse(parsableText);
    
    // Add default status and other required fields to recommendations
    const finalResult: AnalysisResult = {
      ...result,
      recommendations: result.recommendations.map((rec: Omit<Recommendation, 'id' | 'status' | 'updates'>, index: number) => ({ 
          ...rec, 
          id: `REC-${Date.now()}-${index}`,
          status: RecommendationStatus.Proposed,
          updates: [],
      }))
    };

    return finalResult;

  } catch (error) {
    console.error("خطأ في تحليل الحادث باستخدام Gemini API:", error);
    if (error instanceof Error && error.message.includes('API_KEY')) {
        throw new Error("مفتاح Gemini API غير مهيأ أو غير صالح. يرجى تعيين متغير البيئة API_KEY.");
    }
    throw new Error(`فشل في الحصول على تحليل صالح من الذكاء الاصطناعي. ${error}`);
  }
};

const simulationSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            description: "قائمة بالإجراءات أو التوصيات العملية المستمدة من المحاكاة.",
            items: {
                type: Type.OBJECT,
                properties: {
                    action: { type: Type.STRING, description: "الإجراء الملموس المقترح." },
                    rationale: { type: Type.STRING, description: "شرح موجز لسبب أهمية هذا الإجراء بناءً على نتيجة المحاكاة." },
                },
                required: ["action", "rationale"],
            },
        },
    },
    required: ["suggestions"],
};

export const simulateWhatIf = async (incident: IncidentReport, scenario: string): Promise<SimulatedAction[]> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const prompt = `
        بصفتك خبير استراتيجي في إدارة المخاطر والعمليات، قم بإجراء محاكاة "ماذا لو".
        
        **الحادث الأصلي:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **السبب الجذري الذي تم تحديده (إن وجد):** ${incident.analysis?.rootCause?.cause || 'لم يحدد بعد'}

        **سيناريو "ماذا لو":**
        ${scenario}

        **مهمتك:**
        1. قم بتحليل النتائج المحتملة للسيناريو الافتراضي. كن واضحًا وموجزًا في تحليلك الداخلي.
        2. بناءً على هذا التحليل، استخلص قائمة من 1 إلى 3 إجراءات عملية أو توصيات يمكن اتخاذها.
        3. يجب أن يكون كل إجراء قابلاً للتنفيذ ومصممًا إما للاستفادة من فرصة كشفها السيناريو أو للتخفيف من ضعف كشفه.
        4. قدم إجابتك **حصريًا** بصيغة JSON بناءً على المخطط المحدد، مع تضمين الإجراء المقترح والأساس المنطقي له. لا تقم بتضمين أي نص أو تفسير خارج كائن JSON.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: simulationSchema,
                maxOutputTokens: 2048,
                thinkingConfig: { thinkingBudget: 1024 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("لم ترجع واجهة برمجة التطبيقات أي استجابة للمحاكاة.");
        }

        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        return result.suggestions || [];
    } catch (error) {
        console.error("خطأ في محاكاة 'ماذا لو' باستخدام Gemini API:", error);
        throw new Error(`فشلت محاكاة 'ماذا لو'. ${error}`);
    }
};

const globalCasesSchema = {
    type: Type.OBJECT,
    properties: {
        cases: {
            type: Type.ARRAY,
            description: "قائمة بالحالات العالمية ذات الصلة.",
            items: {
                type: Type.OBJECT,
                properties: {
                    industry: { type: Type.STRING, description: "الصناعة التي وقع فيها الحادث (مثال: طيران، تصنيع، لوجستيات)." },
                    title: { type: Type.STRING, description: "عنوان وصفي للحالة." },
                    summary: { type: Type.STRING, description: "ملخص موجز للحادث وما حدث." },
                    lesson: { type: Type.STRING, description: "الدرس الرئيسي المستفاد من هذه الحالة." },
                    source: { type: Type.STRING, description: "المصدر العام للمعلومات (مثال: تقرير NTSB، أفضل ممارسات ISO 9001)." },
                },
                required: ["industry", "title", "summary", "lesson", "source"],
            },
        },
    },
    required: ["cases"],
};


export const searchGlobalCases = async (query: string): Promise<GlobalCase[]> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const prompt = `
        بصفتك مستشارًا عالميًا في إدارة المخاطر والتميز التشغيلي، ابحث في قاعدة معارفك الواسعة عن حالات حوادث عالمية وأفضل الممارسات المتعلقة بالاستعلام التالي.

        **استعلام البحث:**
        "${query}"

        **مهمتك:**
        - ابحث عن 3-5 حالات دراسية أو أمثلة من مصادر عامة وموثوقة (مثل تقارير السلامة، معايير الصناعة، مقالات أكاديمية).
        - لخص كل حالة بشكل واضح وموجز.
        - استخلص الدرس الرئيسي أو الحكمة العملية من كل حالة.
        - قدم النتائج بصيغة JSON بناءً على المخطط المحدد. لا تقدم أي شيء آخر غير JSON.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: globalCasesSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        
        const jsonText = response.text?.trim();
        if (!jsonText) {
             throw new Error("لم ترجع واجهة برمجة التطبيقات أي استجابة للبحث.");
        }

        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        return result.cases || [];

    } catch (error) {
        console.error("خطأ في البحث عن حالات عالمية باستخدام Gemini API:", error);
        throw new Error(`فشل البحث في الحالات العالمية. ${error}`);
    }
};


const predictiveAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        weakSignals: {
            type: Type.ARRAY,
            description: "قائمة بالإشارات الضعيفة أو المؤثرات الخفية التي سبقت الحادث.",
            items: {
                type: Type.OBJECT,
                properties: {
                    signal: { type: Type.STRING, description: "وصف للإشارة الضعيفة (مثال: زيادة طفيفة في أخطاء إدخال البيانات)." },
                    implication: { type: Type.STRING, description: "ماذا يعني هذا المؤثر أو على ماذا يدل." }
                },
                required: ["signal", "implication"]
            }
        },
        sopDeviationPatterns: {
            type: Type.ARRAY,
            description: "أنماط الانحراف المحتملة الأخرى عن إجراءات التشغيل القياسية.",
            items: {
                type: Type.OBJECT,
                properties: {
                    pattern: { type: Type.STRING, description: "وصف لنمط الانحراف (مثال: تخطي خطوات التحقق لتوفير الوقت)." },
                    risk: { type: Type.STRING, description: "الخطر الذي يمثله هذا النمط." }
                },
                required: ["pattern", "risk"]
            }
        },
        predictiveInsights: {
            type: Type.ARRAY,
            description: "رؤى تنبؤية حول الحوادث المستقبلية المحتملة.",
            items: {
                type: Type.OBJECT,
                properties: {
                    prediction: { type: Type.STRING, description: "التنبؤ بالحادث التالي المحتمل (مثال: فشل في نظام النسخ الاحتياطي)." },
                    justification: { type: Type.STRING, description: "الأساس المنطقي لهذا التنبؤ بناءً على الإشارات والأنماط." },
                    proactiveRecommendation: { type: Type.STRING, description: "توصية استباقية محددة لمنع هذا الحادث المتوقع." }
                },
                required: ["prediction", "justification", "proactiveRecommendation"]
            }
        }
    },
    required: ["weakSignals", "sopDeviationPatterns", "predictiveInsights"]
};

export const performPredictiveAnalysis = async (incident: IncidentReport): Promise<PredictiveAnalysisResult> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const prompt = `
        بصفتك محلل مخاطر تنبؤي ومفكر أنظمة من الطراز العالمي، مهمتك هي تحليل تقرير الحادث وتجاوز السبب الجذري المباشر. يجب عليك تحديد الظروف الخفية والكامنة (الإشارات الضعيفة) والتنبؤ بالإخفاقات المستقبلية من خلال تحليل الانحرافات عن الإجراءات القياسية.

        **تقرير الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **السبب الجذري المحدد:** ${incident.analysis?.rootCause?.cause || 'لم يتم تحليله بعد'}
        - **فجوة الإجراءات القياسية:** ${incident.analysis?.sopGap?.gapAnalysis || 'لم يتم تحليلها بعد'}

        **مهمتك:**
        افترض أن لديك إمكانية الوصول إلى مجموعة واسعة من البيانات التشغيلية (الافتراضية) للمؤسسة، مثل لوحات معلومات الأداء، وسجلات الأخطاء الطفيفة، وقنوات ملاحظات الموظفين، وملاحظات تحديث النظام. بناءً على الحادث المقدم، قم بإجراء تحليل تنبؤي عميق.

        أرجع تحليلك **حصريًا** بتنسيق JSON بناءً على المخطط المحدد.

        1.  **الإشارات الضعيفة (المؤثرات الخفية):** حدد 2-3 "إشارات ضعيفة" معقولة كانت موجودة على الأرجح في البيئة التشغيلية *قبل* وقوع الحادث. هذه ليست السبب الجذري بحد ذاته، بل هي نذائر خفية. لكل إشارة، اشرح دلالتها المحتملة.
        2.  **أنماط الانحراف عن الإجراءات:** بناءً على فجوة الإجراءات المحددة، استقرئ انحرافات أخرى محتملة وغير مسجلة أو "حلول بديلة" قد تستخدمها الفرق. صف النمط والخطر الذي يمثله.
        3.  **رؤى تنبؤية:** بناءً على الإشارات وأنماط الانحراف، قدم 1-2 تنبؤات ملموسة للحوادث المحتملة *المستقبلية*. لكل تنبؤ، برره بناءً على تحليلك، وقدم توصية استباقية عالية التأثير لمنعه. هذا هو الجزء الأكثر أهمية في تحليلك.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: predictiveAnalysisSchema,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 4096 },
            }
        }));
        
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("فشل في الحصول على تحليل تنبؤي صالح. الاستجابة كانت فارغة.");
        }

        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        return result;

    } catch (error) {
        console.error("خطأ في إجراء التحليل التنبؤي باستخدام Gemini API:", error);
        throw new Error(`فشل في الحصول على تحليل تنبؤي صالح من الذكاء الاصطناعي. ${error}`);
    }
};

const systemicInsightsSchema = {
    type: Type.OBJECT,
    properties: {
        insights: {
            type: Type.ARRAY,
            description: "قائمة بالرؤى النظامية والمخاطر المشتركة بين الحوادث.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "عنوان موجز للرؤية أو النمط المكتشف." },
                    description: { type: Type.STRING, description: "شرح مفصل للنمط أو المشكلة النظامية التي تم تحديدها عبر حوادث متعددة." },
                    supportingIncidents: { type: Type.ARRAY, items: { type: Type.STRING }, description: "قائمة بمعرفات الحوادث (IDs) التي تدعم هذه الرؤية." },
                    proactiveRecommendation: { type: Type.STRING, description: "توصية استراتيجية أو استباقية لمعالجة هذه المشكلة النظامية على مستوى المؤسسة." }
                },
                required: ["title", "description", "supportingIncidents", "proactiveRecommendation"]
            }
        }
    },
    required: ["insights"]
};

export const generateSystemicInsights = async (incidents: IncidentReport[]): Promise<SystemicInsight[]> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const incidentSummaries = incidents
        .filter(inc => inc.analysis) // Only use analyzed incidents
        .map(inc => `ID: ${inc.id}, العنوان: ${inc.title}, السبب الجذري: ${inc.analysis!.rootCause.cause}, القسم: ${inc.department}`).join('\n');

    const prompt = `
        بصفتك محللًا استراتيجيًا وخبيرًا في التفكير المنظومي، مهمتك هي تحليل ملخصات الحوادث التالية لتحديد الأنماط والمخاطر النظامية العابرة للأقسام.

        **ملخصات الحوادث:**
        ${incidentSummaries}

        **مهمتك:**
        1.  ابحث عن روابط وأنماط مخفية بين هذه الحوادث. لا تركز على كل حادث بمعزل عن الآخر.
        2.  هل هناك أسباب جذرية متشابهة تظهر في أقسام مختلفة؟
        3.  هل هناك مشاكل في التنسيق بين الأقسام تظهر بشكل متكرر؟
        4.  هل هناك نقاط ضعف ثقافية (مثل التركيز المفرط على السرعة على حساب الجودة) أو تقنية (مثل الديون التقنية) تساهم في حوادث متعددة؟
        5.  استخلص 2-3 رؤى استراتيجية عالية المستوى. لكل رؤية، حدد الحوادث الداعمة لها وقدم توصية استباقية لمعالجة المشكلة على مستوى المنظمة.
        6.  أرجع إجابتك **حصريًا** بتنسيق JSON بناءً على المخطط المحدد.
    `;
    
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: systemicInsightsSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("لم ترجع واجهة برمجة التطبيقات أي استجابة لتوليد الرؤى.");
        }

        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        return result.insights || [];

    } catch (error) {
        console.error("خطأ في توليد الرؤى النظامية باستخدام Gemini API:", error);
        throw new Error(`فشل توليد الرؤى النظامية. ${error}`);
    }
};


const deepDiveQuestionsSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            description: "قائمة بأسئلة استكشافية للتعمق في التحليل.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "سؤال ذكي ومثير للتفكير للتعمق في جانب معين من التحليل." },
                },
                required: ["question"]
            }
        }
    },
    required: ["questions"]
}


export const getDeepDiveQuestions = async (analysis: AnalysisResult): Promise<string[]> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const prompt = `
        بصفتك محققًا خبيرًا في تحليل الأسباب الجذرية، لقد تم تقديم التحليل التالي. مهمتك هي اقتراح 3 أسئلة استكشافية ذكية يمكن أن تكشف عن طبقات أعمق من المشكلة.

        **التحليل الحالي:**
        - **السبب الجذري:** ${analysis.rootCause.cause}
        - **وصفه:** ${analysis.rootCause.description}
        - **العوامل المساهمة:** ${analysis.rootCause.contributingFactors.join(', ')}
        - **فجوة الإجراءات:** ${analysis.sopGap.gapAnalysis}

        **مهمتك:**
        اقترح 3 أسئلة قصيرة وموجزة للتعمق أكثر. يجب أن تكون الأسئلة مفتوحة وتتحدى الافتراضات.
        أمثلة جيدة: "كيف تؤثر مقاييس الأداء الحالية على قرارات الموظفين اليومية؟" أو "ما هي العوائق التي تمنع التواصل الفعال بين قسمي X و Y؟"
        
        أرجع إجابتك **حصريًا** بصيغة JSON بناءً على المخطط المحدد.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: deepDiveQuestionsSchema,
                maxOutputTokens: 1024,
                thinkingConfig: { thinkingBudget: 512 },
            }
        }));
        const jsonText = response.text?.trim();

        if (!jsonText) {
             throw new Error("فشل في توليد أسئلة: لم تستجب خدمة الذكاء الاصطناعي.");
        }
        
        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        const questions = result?.questions;

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("فشل في توليد أسئلة: الاستجابة المستلمة لا تحتوي على أسئلة صالحة.");
        }

        return questions.map((q: {question: string}) => q.question);

    } catch (error) {
        console.error("خطأ في الحصول على أسئلة التحليل العميق:", error);
        if (error instanceof Error && error.message.includes('API_KEY')) {
            throw new Error("مفتاح Gemini API غير مهيأ أو غير صالح.");
        }
        const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير معروف.";
        throw new Error(`فشل في توليد أسئلة التحليل العميق. ${errorMessage}`);
    }
}

const deepDiveResultSchema = {
    type: Type.OBJECT,
    properties: {
        insight: { type: Type.STRING, description: "إجابة مفصلة ورؤية معمقة للسؤال المطروح." },
        newRecommendations: {
            type: Type.ARRAY,
            description: "قائمة بالتوصيات الجديدة والمحددة التي نتجت عن هذا التحليل العميق.",
            items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['إجراء تصحيحي', 'إجراء وقائي'], description: "تصنيف الإجراء: 'تصحيحي' لمعالجة سبب مباشر للحادث، أو 'وقائي' لمنع مشكلة مستقبلية محتملة." },
                  category: { type: Type.STRING, enum: Object.values(RecommendationCategory).filter(c => c !== RecommendationCategory.Simulation), description: "فئة التوصية." },
                  action: { type: Type.STRING, description: "الإجراء المحدد الموصى باتخاذه." },
                  impact: { type: Type.STRING, description: "التأثير الإيجابي المتوقع." },
                  rationale: { type: Type.STRING, description: "الأساس المنطقي لهذه التوصية." },
                  ease: { type: Type.STRING, enum: ['سهل', 'متوسط', 'صعب'], description: "مدى سهولة التطبيق." },
                  cost: { type: Type.STRING, enum: ['منخفض', 'متوسط', 'مرتفع'], description: "التكلفة التقديرية." },
                  timeframe: { type: Type.STRING, description: "الإطار الزمني للتنفيذ." },
                },
                required: ["type", "category", "action", "impact", "rationale", "ease", "cost", "timeframe"],
            },
        }
    },
    required: ["insight", "newRecommendations"]
}


export const performDeepDive = async (incident: IncidentReport, question: string): Promise<DeepDiveResult> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const prompt = `
        بصفتك محلل أنظمة خبير، قم بالتعمق في الحادث التالي بناءً على السؤال المحدد.

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **التحليل الأولي:** ${JSON.stringify(incident.analysis, null, 2)}

        **سؤال التحقيق للتعمق:**
        "${question}"

        **مهمتك:**
        1.  قدم إجابة مفصلة ومعمقة على السؤال المطروح، واكشف عن رؤى جديدة.
        2.  بناءً على هذه الرؤية الجديدة، اقترح 1-2 توصيات عملية وملموسة لم تكن موجودة في التحليل الأولي.
        3.  أرجع إجابتك **حصريًا** بصيغة JSON بناءً على المخطط المحدد.
    `;
     try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: deepDiveResultSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("فشل في إجراء التحليل العميق: لم تستجب خدمة الذكاء الاصطناعي.");
        }

        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        
        if (!result || !result.insight) {
             throw new Error("فشل في إجراء التحليل العميق: الاستجابة المستلمة لا تحتوي على رؤية صالحة.");
        }
        
        const finalResult: DeepDiveResult = {
          ...result,
          newRecommendations: (result.newRecommendations || []).map((rec: Omit<Recommendation, 'id' | 'status' | 'updates'>, index: number) => ({ 
              ...rec, 
              id: `DD-REC-${Date.now()}-${index}`,
              status: RecommendationStatus.Proposed,
              updates: [],
            }))
        };

        return finalResult;

    } catch (error) {
        console.error("خطأ في إجراء التحليل العميق:", error);
        const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير معروف.";
        throw new Error(`فشل في الحصول على نتيجة تحليل عميق صالحة. ${errorMessage}`);
    }
}

const alternativeActionSchema = {
    type: Type.OBJECT,
    properties: {
        newRecommendation: {
            type: Type.OBJECT,
            description: "توصية جديدة وبديلة من المرجح أن تنجح.",
            properties: {
                type: { type: Type.STRING, enum: ['إجراء تصحيحي', 'إجراء وقائي'], description: "تصنيف الإجراء: 'تصحيحي' لمعالجة سبب مباشر للحادث، أو 'وقائي' لمنع مشكلة مستقبلية محتملة." },
                category: { type: Type.STRING, enum: Object.values(RecommendationCategory).filter(c => c !== RecommendationCategory.Simulation), description: "فئة التوصية." },
                action: { type: Type.STRING, description: "الإجراء المحدد الموصى به." },
                impact: { type: Type.STRING, description: "التأثير الإيجابي المتوقع لهذا الإجراء." },
                rationale: { type: Type.STRING, description: "الأساس المنطقي لهذه التوصية الجديدة، مع شرح لماذا قد تنجح حيث فشلت السابقة." },
                ease: { type: Type.STRING, enum: ['سهل', 'متوسط', 'صعب'], description: "مدى سهولة تطبيق التوصية." },
                cost: { type: Type.STRING, enum: ['منخفض', 'متوسط', 'مرتفع'], description: "التكلفة التقديرية للتنفيذ." },
                timeframe: { type: Type.STRING, description: "الإطار الزمني المتوقع للتنفيذ (مثال: 'أسبوع واحد', '3 أشهر')." },
            },
            required: ["type", "category", "action", "impact", "rationale", "ease", "cost", "timeframe"],
        }
    },
    required: ["newRecommendation"],
};

export const suggestAlternativeAction = async (incident: IncidentReport, failedAction: Recommendation): Promise<Omit<Recommendation, 'id' | 'status' | 'updates'>> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const prompt = `
        بصفتك مستشارًا خبيرًا في التميز التشغيلي، تم تكليفك بإيجاد حل جديد لمشكلة فشلت فيها محاولة سابقة.

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **تحليل السبب الجذري وسياق الحادث الكامل:** ${JSON.stringify(incident.analysis, null, 2)}

        **التوصية التي فشلت:**
        - **الإجراء:** ${failedAction.action}
        - **الأساس المنطقي:** ${failedAction.rationale}
        - **سبب الفشل (إن وجد):** ${failedAction.effectivenessNotes || 'غير محدد، ولكن تم وضع علامة "غير فعال" عليه.'}

        **مهمتك:**
        حلل سبب فشل التوصية السابقة واقترح **توصية بديلة جديدة ومختلفة وعملية**.
        يجب أن يعالج الاقتراح الجديد السبب الجذري الأصلي ولكن من زاوية مختلفة أو بنهج مختلف.
        تأكد من أن التوصية المقترحة جديدة وليست تكرارًا لتوصيات موجودة بالفعل في سياق الحادث.
        قدم إجابتك **حصريًا** بصيغة JSON صالحة بناءً على المخطط المحدد. لا تقم بتضمين أي نص أو تفسير خارج كائن JSON.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: alternativeActionSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) {
            const blockReason = response.promptFeedback?.blockReason;
            const finishReason = response.candidates?.[0]?.finishReason;
            let errorDetails = [];
            if (blockReason) errorDetails.push(`الطلب محظور لسبب: ${blockReason}`);
            if (finishReason && finishReason !== 'STOP') errorDetails.push(`سبب الإنهاء: ${finishReason}`);
            
            const extraInfo = errorDetails.length > 0 ? ` (${errorDetails.join(', ')})` : '';
            throw new Error(`لم ترجع خدمة الذكاء الاصطناعي أي استجابة للإجراء البديل.${extraInfo}`);
        }
        
        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);

        if (!result || !result.newRecommendation) {
            throw new Error("لا تحتوي استجابة الذكاء الاصطناعي على توصية جديدة صالحة.");
        }

        return result.newRecommendation;
    } catch (error) {
        console.error("خطأ في اقتراح إجراء بديل باستخدام Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير معروف.";
        throw new Error(`فشل في الحصول على توصية بديلة صالحة. ${errorMessage}`);
    }
}

const recurrenceAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        isRecurrent: { type: Type.BOOLEAN, description: "هل هذا الحادث تكرار لحادث سابق؟" },
        linkedIncidents: {
            type: Type.ARRAY,
            description: "قائمة بالحوادث المتكررة المكتشفة من السجل التاريخي، مع تفاصيلها.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "المعرّف المرجعي للحادث التاريخي." },
                    title: { type: Type.STRING, description: "عنوان الحادث التاريخي." },
                    date: { type: Type.STRING, description: "تاريخ الحادث التاريخي." },
                },
                required: ["id", "title", "date"]
            }
        },
        analysis: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: Object.values(RecurrenceType), description: "تصنيف نوع التكرار." },
                explanation: { type: Type.STRING, description: "شرح مرئي للتشابه، مثال: 'الحادثة هذه حصلت X مرات...'" },
                personnelAnalysis: { type: Type.STRING, description: "تحليل لتكرار الموظفين المعنيين، مثال: 'الموظف X كان مشاركًا في Y أحداث مشابهة.'" },
                miniRcaSuggestion: { type: Type.STRING, description: "اقتراح بإجراء تحقيق مصغر (Mini RCA) لفهم سبب فشل الحلول السابقة." },
                correctionFailureReason: { type: Type.STRING, description: "تشخيص لسبب فشل الإجراءات التصحيحية السابقة (مثال: لم يكن الحل جذريًا، مقاومة للتغيير)." },
                higherLevelCorrection: { type: Type.STRING, description: "اقتراح بتصحيح من مستوى أعلى (مثال: إعادة تصميم العملية، تعديل في النظام)." }
            },
            required: ["type", "explanation", "personnelAnalysis", "miniRcaSuggestion", "correctionFailureReason", "higherLevelCorrection"]
        }
    },
    required: ["isRecurrent", "linkedIncidents"]
};

export const detectAndAnalyzeRecurrence = async (targetIncident: IncidentReport, allIncidents: IncidentReport[]): Promise<RecurrenceInfo> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const otherIncidentsSummary = allIncidents
        .filter(inc => inc.id !== targetIncident.id)
        .map(inc => ({
            id: inc.id,
            title: inc.title,
            description: inc.description,
            date: inc.date,
            rootCause: inc.analysis?.rootCause?.cause || 'غير محدد',
            personnel: inc.involvedPersonnel
        }));

    const prompt = `
        بصفتك خبيرًا في الذكاء التشغيلي وتحليل الأنماط، مهمتك هي تحليل الحادث المستهدف ومقارنته بقائمة من الحوادث التاريخية لاكتشاف التكرار بأعلى دقة ممكنة.

        **الحادث المستهدف:**
        - ID: ${targetIncident.id}
        - العنوان: ${targetIncident.title}
        - الوصف: ${targetIncident.description}
        - السبب الجذري (إن وجد): ${targetIncident.analysis?.rootCause?.cause || 'غير محدد'}
        - الأفراد المعنيون: ${targetIncident.involvedPersonnel}

        **الحوادث التاريخية (السجل الكامل):**
        ${JSON.stringify(otherIncidentsSummary, null, 2)}

        **خريطة عمل لتحليل التكرار (اتبع هذه الخطوات بدقة):**

        1.  **الفهم العميق أولاً (تجنب المقارنة السطحية):**
            -   **حلل الحادث المستهدف:** قبل النظر في السجل التاريخي، فكك الحادث المستهدف. ما هو "الموضوع الجوهري" للمشكلة (مثال: ليس "تأخير رحلة"، بل "فشل في تنسيق الصيانة الأرضية")؟ وما هو "السياق التشغيلي" (مثال: "خلال عاصفة جوية"، "بعد تحديث النظام مباشرة")؟
            -   **حلل كل حادث تاريخي بنفس الطريقة:** طبق نفس عملية التحليل (الموضوع الجوهري والسياق) على كل حادث في السجل التاريخي.

        2.  **المقارنة المنهجية (السياق بالسياق):**
            -   قارن "الموضوع الجوهري" للحادث المستهدف مع "الموضوع الجوهري" لكل حادث تاريخي.
            -   قارن "السياق التشغيلي" للحادث المستهدف مع "السياق التشغيلي" لكل حادث تاريخي.
            -   **تحذير هام لتجنب الأخطاء:** لا تعتبر الحوادث متكررة لمجرد تشابه الكلمات أو الأقسام. **مثال:** حادثة متعلقة بـ "فقدان الأمتعة" وأخرى متعلقة بـ "تكدس الركاب عند بوابات الصعود" **ليستا** متكررتين لمجرد أنهما وقعتا في قسم "خدمات الركاب". التكرار يثبت فقط إذا كان السبب الجوهري واحدًا، مثل "ضعف تخطيط الموارد البشرية في أوقات الذروة" الذي أثر على كلتا العمليتين.

        3.  **اتخاذ القرار بناءً على فهم:**
            -   فقط إذا وجدت تشابهًا عميقًا في كل من "الموضوع الجوهري" و"السياق التشغيلي"، عندها فقط قم بتصنيف الحادث على أنه متكرر.
            -   اذكر الحوادث المرتبطة بوضوح (ID, Title, Date).

        4.  **إذا تم العثور على تكرار، قم بإجراء تحليل شامل (كما هو مطلوب في المخطط):**
            -   صنّف نوع التكرار إلى أحد الأنواع التالية: '${RecurrenceType.Total}'، '${RecurrenceType.Partial}'، أو '${RecurrenceType.PoorExecution}'.
            -   قدم شرحًا مرئيًا (مثال: "هذه الحادثة تكررت X مرات...").
            -   حلل الأفراد المعنيين.
            -   اقترح تحقيقًا مصغرًا (Mini RCA) للبحث في سبب فشل الحلول السابقة.
            -   شخص سبب فشل التصحيحات السابقة.
            -   اقترح تصحيحًا من مستوى أعلى.

        5.  **الإخراج النهائي:** قدم إجابتك **حصريًا** بتنسيق JSON بناءً على المخطط المحدد. إذا لم يتم العثور على تكرار، يجب أن تكون قيمة 'isRecurrent' هي 'false' وتكون 'linkedIncidents' مصفوفة فارغة.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: recurrenceAnalysisSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("لم ترجع خدمة الذكاء الاصطناعي أي استجابة لتحليل التكرار.");
        }
        
        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        
        return {
            isRecurrent: result.isRecurrent,
            linkedIncidents: result.linkedIncidents || [],
            recurrenceCount: (result.linkedIncidents || []).length,
            analysis: result.isRecurrent ? result.analysis : null
        };

    } catch (error) {
        console.error("خطأ في تحليل تكرار الحادث باستخدام Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير معروف.";
        throw new Error(`فشل تحليل التكرار. ${errorMessage}`);
    }
};

const metaRecsSchema = {
    type: Type.OBJECT,
    properties: {
        failurePatternAnalysis: {
            type: Type.STRING,
            description: "تحليل سببي لنمط الفشل، يشرح لماذا لم تمنع الحلول السابقة تكرار المشكلة. مثال: 'كانت التوصيات السابقة تركز على تدريب الأفراد، لكن المشكلة الحقيقية تكمن في تصميم الواجهة الذي يشجع على الخطأ تحت الضغط.'"
        },
        metaRecommendations: {
            type: Type.ARRAY,
            description: "قائمة من 1 إلى 3 توصيات استراتيجية جديدة وعالية المستوى لمعالجة نمط الفشل ومنع التكرار من جذوره.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['إجراء تصحيحي', 'إجراء وقائي'], description: "تصنيف الإجراء. الإجراءات الاستراتيجية غالبًا ما تكون 'وقائية'." },
                    category: { type: Type.STRING, enum: [RecommendationCategory.Strategic, RecommendationCategory.Technical, RecommendationCategory.Procedural], description: `فئة التوصية. استخدم '${RecommendationCategory.Strategic}' للإجراءات التي تغير السياسات أو الاستراتيجيات.` },
                    action: { type: Type.STRING, description: "الإجراء الاستراتيجي المحدد الموصى به." },
                    impact: { type: Type.STRING, description: "التأثير الإيجابي المتوقع من تنفيذ هذا الإجراء الاستراتيجي." },
                    rationale: { type: Type.STRING, description: "الأساس المنطقي لهذه التوصية، مع ربطها مباشرة بتحليل نمط الفشل." },
                    ease: { type: Type.STRING, enum: ['سهل', 'متوسط', 'صعب'], description: "مدى سهولة تطبيق التوصية." },
                    cost: { type: Type.STRING, enum: ['منخفض', 'متوسط', 'مرتفع'], description: "التكلفة التقديرية للتنفيذ." },
                    timeframe: { type: Type.STRING, description: "الإطار الزمني المتوقع للتنفيذ." },
                },
                required: ["type", "category", "action", "impact", "rationale", "ease", "cost", "timeframe"],
            },
        }
    },
    required: ["failurePatternAnalysis", "metaRecommendations"]
};


export const generateMetaRecommendations = async (
    recurringIncidents: IncidentReport[]
): Promise<{ failurePatternAnalysis: string; metaRecommendations: Omit<Recommendation, 'id' | 'status' | 'updates'>[] }> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";

    const incidentSummaries = recurringIncidents.map(inc => {
        return {
            id: inc.id,
            title: inc.title,
            date: inc.date,
            rootCause: inc.analysis?.rootCause.cause,
            previousRecommendations: inc.analysis?.recommendations.map(r => r.action).join('; ')
        }
    });

    const prompt = `
        بصفتك خبير استراتيجي في التميز التشغيلي ومفكر أنظمة، تم تزويدك بسلسلة من الحوادث المتكررة.
        مهمتك ليست إعادة تحليل كل حادث، بل تحليل **نمط التكرار** نفسه.

        **سياق الحوادث المتكررة:**
        ${JSON.stringify(incidentSummaries, null, 2)}

        **مهمتك الأساسية:**
        أجب عن السؤال الجوهري: **لماذا فشلت الإجراءات التصحيحية السابقة في منع تكرار هذه المشكلة؟**

        1.  **تحليل نمط الفشل:**
            -   هل تم تشخيص السبب الجذري بشكل خاطئ في البداية؟
            -   هل كانت الحلول السابقة مجرد "حلول مؤقتة" لم تعالج المشكلة الحقيقية؟
            -   هل كان هناك فشل في تنفيذ الحلول (نقص الموارد، مقاومة التغيير، عدم المتابعة)؟
            -   هل المشكلة نظامية (Systemic) وتتطلب حلاً على مستوى أعلى من مجرد إجراء فردي؟
            -   قم بصياغة تحليل موجز وواضح لنمط الفشل.

        2.  **توليد "إجراءات استراتيجية" (Meta-Recommendations):**
            -   بناءً على تحليلك لنمط الفشل، اقترح 1-3 توصيات **جديدة واستراتيجية**.
            -   يجب أن تكون هذه التوصيات مصممة لكسر حلقة التكرار من جذورها.
            -   تجنب تكرار الحلول السابقة. فكر في: إعادة تصميم العمليات، تغييرات في النظام، بروتوكولات تدريب جديدة، تعديل مؤشرات الأداء.
            -   صنف هذه الإجراءات الجديدة كـ '${RecommendationCategory.Strategic}' إن أمكن، وحدد نوعها (غالبًا ما تكون 'إجراء وقائي').

        أرجع إجابتك **حصريًا** بتنسيق JSON بناءً على المخطط المحدد.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: metaRecsSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));

        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("لم تتمكن خدمة الذكاء الاصطناعي من إنشاء توصيات استراتيجية.");
        }
        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        
        if (!result.failurePatternAnalysis || !result.metaRecommendations) {
             throw new Error("الاستجابة من الخدمة لا تحتوي على تحليل أو توصيات صالحة.");
        }

        return result;
    } catch (error) {
        console.error("خطأ في إنشاء توصيات استراتيجية:", error);
        throw new Error(`فشل إنشاء التوصيات الاستراتيجية. ${error instanceof Error ? error.message : ''}`);
    }
};

const dashboardBriefingSchema = {
    type: Type.OBJECT,
    properties: {
        earlyWarnings: {
            type: Type.ARRAY,
            description: "قائمة بالتحذيرات المبكرة المحتملة بناءً على الأنماط الحالية.",
            items: {
                type: Type.OBJECT,
                properties: {
                    prediction: { type: Type.STRING, description: "وصف للحادث المحتمل." },
                    probability: { type: Type.NUMBER, description: "احتمالية حدوث التنبؤ (من 0 إلى 1)." },
                    reasoning: { type: Type.STRING, description: "شرح للسبب بناءً على الأنماط المكتشفة." },
                    linkedIncidentId: { type: Type.STRING, description: "معرف الحادث التاريخي الذي يشبه النمط الحالي." }
                },
                required: ["prediction", "probability", "reasoning", "linkedIncidentId"]
            }
        },
        kpiImpacts: {
            type: Type.ARRAY,
            description: "قائمة بتأثيرات الحوادث على مؤشرات الأداء.",
            items: {
                type: Type.OBJECT,
                properties: {
                    issue: { type: Type.STRING, description: "المشكلة أو السبب الجذري المتكرر." },
                    kpi: { type: Type.STRING, description: "مؤشر الأداء الرئيسي المتأثر (مثال: SLA, Customer Satisfaction, Operating Cost)." },
                    impactStatement: { type: Type.STRING, description: "جملة كمية تصف الأثر (مثال: 'خفضت الأداء بنسبة 3.5%')." },
                    reasoning: { type: Type.STRING, description: "شرح موجز لكيفية الوصول إلى هذا التقدير، مع الأخذ في الاعتبار تكرار الحادث وشدته." }
                },
                required: ["issue", "kpi", "impactStatement", "reasoning"]
            }
        }
    },
    required: ["earlyWarnings", "kpiImpacts"]
};

export const getDashboardBriefing = async (incidents: IncidentReport[]): Promise<DashboardBriefing> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const incidentSummaries = incidents.map(inc => `ID: ${inc.id}, العنوان: ${inc.title}, السبب: ${inc.analysis?.rootCause.cause}, الخطورة: ${inc.severity}, القسم: ${inc.department}`).join('\n');
    
     const severityScores: Record<IncidentSeverity, number> = {
        [IncidentSeverity.Low]: 1,
        [IncidentSeverity.Medium]: 3,
        [IncidentSeverity.High]: 5,
        [IncidentSeverity.Critical]: 10,
    };
    
    const incidentsByRootCause = incidents.reduce((acc, incident) => {
        const cause = incident.analysis?.rootCause?.cause;
        if (cause) {
            if (!acc[cause]) acc[cause] = [];
            acc[cause].push(incident);
        }
        return acc;
    }, {} as Record<string, IncidentReport[]>);

    const recurringCausesSummary = Object.entries(incidentsByRootCause)
        .filter(([, group]) => group.length > 1)
        .map(([cause, group]) => {
            const totalSeverity = group.reduce((sum, inc) => sum + severityScores[inc.severity], 0);
            return {
                cause,
                count: group.length,
                totalSeverity,
                departments: [...new Set(group.map(inc => inc.department))].join(', ')
            };
        })
        .sort((a, b) => (b.count * b.totalSeverity) - (a.count * a.totalSeverity))
        .slice(0, 3);
        
    const prompt = `
        بصفتك نظام ذكاء تشغيلي، قم بتحليل البيانات التالية لتقديم موجز استخباري للمدير.

        **البيانات التاريخية للحوادث:**
        ${incidentSummaries}

        **ملخص المشاكل المتكررة الأكثر تأثيرًا:**
        ${JSON.stringify(recurringCausesSummary, null, 2)}
        
        **مهمتك:**
        قدم موجزًا استخباريًا شاملاً بتنسيق JSON بناءً على المخطط المحدد. يجب أن يتضمن الموجز قسمين رئيسيين:

        1.  **الإنذارات المبكرة (Early Warnings):**
            -   ابحث عن 1-2 أنماط حالية قد تؤدي إلى تكرار الحوادث التاريخية.
            -   لكل نمط، أصدر تحذيرًا استباقيًا، وحدد احتمالية وقوعه (0-1)، واشرح المنطق، واربطه بالحادث التاريخي ذي الصلة.

        2.  **تأثير مؤشرات الأداء (KPI Impacts):**
            -   لكل مشكلة متكررة في الملخص، حدد مؤشر أداء رئيسي واحد يتأثر بها بشدة.
            -   قدم **تقديرًا كميًا** للأثر (مثال: "زيادة التكاليف بنسبة 5%").
            -   قدم **تبريرًا موجزًا** لكيفية وصولك لهذا التقدير، مع الأخذ في الاعتبار تكرار الحادث وخطورته.

        أرجع إجابتك **حصريًا** بصيغة JSON.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({ 
            model, 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json", 
                responseSchema: dashboardBriefingSchema, 
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 }
            } 
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("لم يتم إنشاء موجز استخباري.");
        let parsableText = jsonText.startsWith('```json') ? jsonText.substring(7, jsonText.length - 3).trim() : jsonText;
        const result = JSON.parse(parsableText);
        return {
            earlyWarnings: result.earlyWarnings || [],
            kpiImpacts: result.kpiImpacts || []
        };
    } catch (error) {
        console.error("خطأ في إنشاء الموجز الاستخباري:", error);
        throw new Error(`فشل في إنشاء الموجز الاستخباري. ${error}`);
    }
};

const managerialInsightsSchema = {
    type: Type.OBJECT,
    properties: {
        insights: {
            type: Type.ARRAY,
            description: "قائمة بأفضل 3 قرارات للمدير.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "عنوان القرار." },
                    recommendation: { type: Type.STRING, description: "وصف القرار المقترح." },
                    rationale: { type: Type.STRING, description: "لماذا هذا القرار مهم الآن." },
                    priority: { type: Type.STRING, enum: ['عاجل', 'هام', 'استراتيجي'], description: "أولوية القرار." }
                },
                required: ["title", "recommendation", "rationale", "priority"]
            }
        }
    },
    required: ["insights"]
};

export const getManagerialInsights = async (incidents: IncidentReport[]): Promise<ManagerialInsight[]> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const contextSummary = incidents.map(inc => `ID: ${inc.id}, العنوان: ${inc.title}, الحالة: ${inc.status}, الخطورة: ${inc.severity}, السبب: ${inc.analysis?.rootCause.cause || 'N/A'}`).join('\n');
    const prompt = `
        بصفتك مساعدًا ذكيًا للمدير التنفيذي (AI Coach)، قم بتحليل الوضع التشغيلي الحالي بناءً على قائمة الحوادث.
        
        **ملخص الوضع:**
        ${contextSummary}

        **مهمتك:**
        حدد أفضل 3 قرارات ذات أولوية يمكن للمدير اتخاذها اليوم أو هذا الأسبوع لمعالجة أكبر المخاطر أو الفرص.
        يجب أن تكون القرارات عملية وقابلة للتنفيذ.
        قدم إجابتك **حصريًا** بصيغة JSON.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: managerialInsightsSchema, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 1024 } } }));
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("لم يتم إنشاء رؤى إدارية.");
        let parsableText = jsonText.startsWith('```json') ? jsonText.substring(7, jsonText.length - 3).trim() : jsonText;
        return JSON.parse(parsableText).insights || [];
    } catch (error) {
        console.error("خطأ في مساعد المدير الذكي:", error);
        throw new Error(`فشل إنشاء الرؤى الإدارية. ${error}`);
    }
};

const trainingModuleSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "عنوان المحتوى التدريبي." },
        keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "قائمة بالنقاط الرئيسية للتدريب." },
        summary: { type: Type.STRING, description: "ملخص قصير للدرس المستفاد." },
        quizQuestion: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING, description: "سؤال اختبار بسيط." },
                answer: { type: Type.STRING, description: "إجابة السؤال." }
            },
            required: ["question", "answer"]
        }
    },
    required: ["title", "keyPoints", "summary", "quizQuestion"]
};

export const generateTrainingContent = async (incident: IncidentReport): Promise<TrainingModule> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const prompt = `
        بصفتك مصممًا تعليميًا، قم بإنشاء محتوى تدريبي مصغر (micro-learning) بناءً على تحليل الحادث التالي، خاصة سبب فشل الحلول السابقة.

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **تحليل التكرار:** ${JSON.stringify(incident.recurrenceInfo?.analysis, null, 2)}
        - **الدرس المستفاد:** ${incident.analysis?.knowledgeCapsule}

        **مهمتك:**
        أنشئ وحدة تدريبية بسيطة وموجزة.
        1. **عنوان جذاب.**
        2. **3 نقاط رئيسية** يجب أن يتذكرها الموظف.
        3. **ملخص قصير** للدرس.
        4. **سؤال اختبار** واحد بسيط لتأكيد الفهم.
        5. قدم إجابتك **حصريًا** بصيغة JSON.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: trainingModuleSchema, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 1024 } } }));
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("لم يتم إنشاء محتوى تدريبي.");
        let parsableText = jsonText.startsWith('```json') ? jsonText.substring(7, jsonText.length - 3).trim() : jsonText;
        return JSON.parse(parsableText);
    } catch (error) {
        console.error("خطأ في إنشاء المحتوى التدريبي:", error);
        throw new Error(`فشل إنشاء المحتوى التدريبي. ${error}`);
    }
};

const incidentExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "عنوان موجز ووصفي للحادث." },
    description: { type: Type.STRING, description: "وصف تفصيلي لما حدث، بما في ذلك الإجراء الفوري المتخذ إن وجد." },
    department: { type: Type.STRING, description: "القسم أو الفريق المسؤول أو الأكثر تأثرًا." },
    severity: { type: Type.STRING, enum: Object.values(IncidentSeverity), description: "مستوى خطورة الحادث." },
    involvedPersonnel: { type: Type.STRING, description: "قائمة بالأسماء أو الأدوار المعنية بالحادث." },
  },
  required: ["title", "description", "department", "severity", "involvedPersonnel"],
};

export const extractIncidentDetailsFromAttachment = async (
  fileContent: string, // base64 encoded string
  mimeType: string,
  userContext: string // Optional text from description field
): Promise<Partial<IncidentReport>> => {
  const ai = getAiInstance();
  const model = "gemini-2.5-flash";

  const filePart = {
    inlineData: {
      data: fileContent,
      mimeType: mimeType,
    },
  };
  
  const textParts: { text: string }[] = [
    { text: `بصفتك محلل عمليات متخصص، قم بتحليل المرفق التالي (قد يكون صورة لتقرير، نص بريد إلكتروني، أو مستند).` },
  ];

  if(userContext && userContext.trim() !== '') {
    textParts.push({ text: `استخدم النص التالي الذي قدمه المستخدم كسياق إضافي مهم: "${userContext}"` });
  }

  textParts.push({ text: `مهمتك هي استخلاص المعلومات الأساسية المتعلقة بالحادث بدقة وتعبئتها في بنية JSON المحددة.
    **ملاحظة هامة: إذا كان المرفق مستندًا متعدد الصفحات (مثل PDF)، تأكد من قراءة وتحليل جميع الصفحات بالكامل لضمان اكتمال المعلومات.**
    إذا كانت بعض المعلومات غير موجودة بشكل صريح، استنتجها بشكل منطقي أو اتركها كنص فارغ.
    - **الوصف (description):** يجب أن يكون شاملاً، ويدمج تفاصيل الحادث من المرفق بأكمله مع أي إجراءات فورية تم اتخاذها.` });

  const contentParts = [filePart, ...textParts];

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: model,
      contents: { parts: contentParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: incidentExtractionSchema,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    }));

    const jsonText = response.text?.trim();
    if (!jsonText) {
      throw new Error("فشل في استخلاص التفاصيل من المرفق. لم تستجب خدمة الذكاء الاصطناعي.");
    }
    
    let parsableText = jsonText;
    if (parsableText.startsWith('```json')) {
        parsableText = parsableText.substring(7, parsableText.length - 3).trim();
    }
    const result = JSON.parse(parsableText);
    return result;

  } catch (error) {
    console.error("خطأ في استخلاص تفاصيل الحادث من المرفق:", error);
    throw new Error(`فشل في تحليل المرفق. ${error instanceof Error ? error.message : "حدث خطأ غير معروف"}`);
  }
};

const implementationPlanSchema = {
    type: Type.OBJECT,
    properties: {
        tools: {
            type: Type.ARRAY,
            description: "قائمة بالأدوات المقترحة (منهجيات، برامج، الخ) للمساعدة في تنفيذ التوصية.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "اسم الأداة أو المنهجية." },
                    description: { type: Type.STRING, description: "شرح لكيفية استخدام هذه الأداة في هذا السياق المحدد." }
                },
                required: ["name", "description"]
            }
        },
        scenario: {
            type: Type.STRING,
            description: "سيناريو تطبيقي مفصل ومحترف لكيفية تنفيذ التوصية خطوة بخطوة. يجب أن يكون عمليًا ومبنيًا على أفضل الممارسات. إذا تم توفير حالات عالمية ذات صلة، استلهم منها لإنشاء سيناريو واقعي."
        }
    },
    required: ["tools", "scenario"]
};

export const generateImplementationPlan = async (
    incident: IncidentReport, 
    recommendation: Recommendation,
    relevantCases: GlobalCase[]
): Promise<{ tools: { name: string; description: string }[]; scenario: string; }> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const relevantCasesSummary = relevantCases.length > 0 
        ? `للمعلومية، تم العثور على الحالات العالمية التالية التي قد تكون ذات صلة. استفد من الدروس المستفادة منها عند إنشاء السيناريو:\n${JSON.stringify(relevantCases, null, 2)}`
        : "لم يتم العثور على حالات عالمية مشابهة بشكل مباشر، لذا اعتمد على خبرتك العامة وأفضل الممارسات.";

    const prompt = `
        بصفتك خبير استراتيجي في التنفيذ والتميز التشغيلي، تم تكليفك بإنشاء خطة مساعدة لتنفيذ التوصية التالية.

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **السبب الجذري:** ${incident.analysis?.rootCause?.cause || 'غير محدد'}

        **التوصية المطلوب تنفيذها:**
        - **الإجراء:** ${recommendation.action}
        - **الأساس المنطقي:** ${recommendation.rationale}

        **مواد مرجعية:**
        ${relevantCasesSummary}

        **مهمتك:**
        قم بإنشاء خطة مساعدة مفصلة لمساعدة الفريق على تنفيذ التوصية بفعالية واحترافية. يجب أن تكون الخطة عملية وقابلة للتطبيق.
        قدم إجابتك **حصريًا** بصيغة JSON بناءً على المخطط المحدد.

        1.  **الأدوات المقترحة (Tools):** اقترح قائمة من 2-4 أدوات (مثل منهجيات تحليل FMEA، برامج إدارة المشاريع كـ Jira، تقنيات Poka-yoke، أو حتى قوائم تحقق بسيطة) يمكن أن تساعد في التنفيذ. لكل أداة، اشرح كيف تساهم في نجاح تنفيذ هذه التوصية تحديدًا.
        2.  **سيناريو التنفيذ (Scenario):** قدم سيناريو تطبيقي مفصل ومحترف، خطوة بخطوة. صف كيف يمكن للفريق أن يبدأ، وما هي الخطوات الرئيسية، ومن يجب أن يشارك، وكيف يمكن قياس النجاح. اجعل السيناريو قصة عملية يمكن اتباعها.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: implementationPlanSchema,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 4096 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("لم تتمكن خدمة الذكاء الاصطناعي من إنشاء خطة تنفيذ.");
        }
        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result = JSON.parse(parsableText);
        return result || { tools: [], scenario: '' };
    } catch (error) {
        console.error("خطأ في إنشاء خطة التنفيذ باستخدام Gemini API:", error);
        throw new Error(`فشل في إنشاء خطة التنفيذ. ${error}`);
    }
};

const fiveWhysSchema = {
    type: Type.OBJECT,
    properties: {
        problemStatement: { type: Type.STRING, description: "عبارة المشكلة الأولية التي يتم تحليلها." },
        whys: {
            type: Type.ARRAY,
            description: "سلسلة من 5 أسئلة 'لماذا' وإجاباتها للوصول إلى السبب الجذري.",
            items: {
                type: Type.OBJECT,
                properties: {
                    why: { type: Type.STRING, description: "سؤال 'لماذا' (مثال: لماذا تأخرت عملية التعبئة؟)." },
                    answer: { type: Type.STRING, description: "الإجابة على السؤال (مثال: بسبب نقص العمالة في قسم التعبئة)." }
                },
                required: ["why", "answer"]
            }
        },
        finalRootCause: { type: Type.STRING, description: "السبب الجذري النهائي الذي تم التوصل إليه بعد طرح الأسئلة الخمسة." }
    },
    required: ["problemStatement", "whys", "finalRootCause"]
};

export const perform5WhysAnalysis = async (incident: IncidentReport): Promise<FiveWhysAnalysis> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const problem = incident.analysis?.rootCause?.cause || incident.title;

    const prompt = `
        بصفتك خبيرًا في تحليل الأسباب الجذرية، قم بتطبيق تقنية "لماذا الخمسة" (5 Whys) على المشكلة التالية المستخلصة من تقرير حادث.
        
        **المشكلة الأولية:**
        "${problem}"

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **السبب الجذري الأولي (إن وجد):** ${incident.analysis?.rootCause?.cause || 'غير محدد'}

        **مهمتك:**
        1. ابدأ بعبارة المشكلة الأولية.
        2. اطرح سؤال "لماذا؟" بشكل متكرر (حوالي 5 مرات) للتعمق في سلسلة الأسباب. يجب أن تكون كل إجابة أساسًا للسؤال التالي.
        3. حدد السبب الجذري الحقيقي في النهاية.
        4. قدم النتيجة **حصريًا** بصيغة JSON بناءً على المخطط المحدد. لا تضمن أي نص خارج كائن JSON.

        **مثال على المنهجية:**
        - المشكلة: تأخر تسليم المنتجات للعملاء.
        - لماذا 1؟ (بسبب) تأخر عملية التعبئة والشحن.
        - لماذا 2؟ (بسبب) نقص العمالة في قسم التعبئة.
        - ... وهكذا وصولاً للسبب الجذري.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: fiveWhysSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("فشل في إجراء تحليل 'لماذا الخمسة'. الاستجابة كانت فارغة.");
        }

        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result: FiveWhysAnalysis = JSON.parse(parsableText);
        
        if (!result.whys || result.whys.length === 0) {
             throw new Error("تحليل 'لماذا الخمسة' لم ينتج سلسلة أسئلة صالحة.");
        }

        return result;
    } catch (error) {
        console.error("خطأ في تحليل 'لماذا الخمسة' باستخدام Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير معروف.";
        throw new Error(`فشل في الحصول على تحليل 'لماذا الخمسة' صالح. ${errorMessage}`);
    }
};

const fishboneSchema = {
    type: Type.OBJECT,
    properties: {
        problem: { type: Type.STRING, description: "عبارة المشكلة الرئيسية أو النتيجة التي يتم تحليلها (رأس السمكة)." },
        causes: {
            type: Type.OBJECT,
            description: "تصنيف الأسباب المحتملة ضمن فئات 6M's.",
            properties: {
                manpower: { type: Type.ARRAY, items: { type: Type.STRING }, description: "الأسباب المتعلقة بالعامل البشري (مثال: نقص التدريب، الإرهاق)." },
                methods: { type: Type.ARRAY, items: { type: Type.STRING }, description: "الأسباب المتعلقة بالطرق والعمليات (مثال: إجراءات غير واضحة)." },
                machines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "الأسباب المتعلقة بالمعدات والآلات (مثال: أعطال، صيانة غير كافية)." },
                materials: { type: Type.ARRAY, items: { type: Type.STRING }, description: "الأسباب المتعلقة بالمواد الخام أو المدخلات (مثال: جودة منخفضة)." },
                measurement: { type: Type.ARRAY, items: { type: Type.STRING }, description: "الأسباب المتعلقة بالقياس والفحص (مثال: أدوات غير دقيقة)." },
                motherNature: { type: Type.ARRAY, items: { type: Type.STRING }, description: "الأسباب المتعلقة بالبيئة وظروف العمل (مثال: حرارة، إضاءة)." }
            },
            required: ["manpower", "methods", "machines", "materials", "measurement", "motherNature"]
        }
    },
    required: ["problem", "causes"]
};

export const performFishboneAnalysis = async (incident: IncidentReport): Promise<FishboneAnalysis> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const problem = incident.analysis?.rootCause?.cause || incident.title;

    const prompt = `
        بصفتك خبيرًا في إدارة الجودة الشاملة (TQM)، قم بإنشاء تحليل "مخطط هيكل السمكة" (Ishikawa Diagram) للمشكلة التالية المستخلصة من تقرير حادث.
        
        **المشكلة (النتيجة):**
        "${problem}"

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **السبب الجذري الأولي (إن وجد):** ${incident.analysis?.rootCause?.cause || 'غير محدد'}

        **مهمتك:**
        1. ابدأ بعبارة المشكلة كـ "رأس السمكة".
        2. فكر بشكل منهجي في جميع العوامل المحتملة التي قد تساهم في المشكلة.
        3. صنّف كل سبب محتمل ضمن الفئات الست الرئيسية (6M's):
            - **Manpower (الأشخاص):** العوامل البشرية.
            - **Methods (الأساليب):** العمليات والإجراءات.
            - **Machines (الآلات):** المعدات والأدوات.
            - **Materials (المواد):** المواد الخام والمكونات.
            - **Measurement (القياس):** فحص الجودة والبيانات.
            - **Mother Nature (البيئة):** الظروف المحيطة.
        4. قدم قائمة من 2-4 أسباب محتملة لكل فئة من الفئات الست. يجب أن تكون الأسباب معقولة ومستنبطة من سياق الحادث.
        5. قدم النتيجة **حصريًا** بصيغة JSON بناءً على المخطط المحدد. لا تضمن أي نص خارج كائن JSON.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: fishboneSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("فشل في إجراء تحليل 'مخطط هيكل السمكة'. الاستجابة كانت فارغة.");
        }

        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result: FishboneAnalysis = JSON.parse(parsableText);
        
        if (!result.causes) {
             throw new Error("تحليل 'مخطط هيكل السمكة' لم ينتج بنية أسباب صالحة.");
        }

        return result;
    } catch (error) {
        console.error("خطأ في تحليل 'مخطط هيكل السمكة' باستخدام Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير معروف.";
        throw new Error(`فشل في الحصول على تحليل 'مخطط هيكل السمكة' صالح. ${errorMessage}`);
    }
};

const paretoSchema = {
    type: Type.OBJECT,
    properties: {
        items: {
            type: Type.ARRAY,
            description: "قائمة مصنفة تنازليًا بالأسباب وتكرارها ونسبتها المئوية والتراكمية.",
            items: {
                type: Type.OBJECT,
                properties: {
                    cause: { type: Type.STRING, description: "السبب الجذري للمشكلة." },
                    frequency: { type: Type.INTEGER, description: "عدد مرات تكرار هذا السبب." },
                    percentage: { type: Type.NUMBER, description: "النسبة المئوية لهذا السبب من الإجمالي." },
                    cumulativePercentage: { type: Type.NUMBER, description: "النسبة المئوية التراكمية." }
                },
                required: ["cause", "frequency", "percentage", "cumulativePercentage"]
            }
        }
    },
    required: ["items"]
};

export const performParetoAnalysis = async (incidents: IncidentReport[]): Promise<ParetoAnalysis> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";

    const analyzableIncidents = incidents.filter(inc => inc.analysis?.rootCause?.cause);
    if (analyzableIncidents.length < 3) {
        throw new Error("يتطلب تحليل باريتو 3 حوادث محللة على الأقل للحصول على نتائج ذات معنى.");
    }
    const rootCauses = analyzableIncidents.map(inc => inc.analysis!.rootCause.cause);

    const prompt = `
        بصفتك خبيرًا في إدارة الجودة وتطبيق مبدأ باريتو (قاعدة 80/20)، قم بتحليل قائمة الأسباب الجذرية التالية المستخلصة من تقارير الحوادث.

        **قائمة الأسباب الجذرية المجمعة:**
        ${JSON.stringify(rootCauses)}

        **مهمتك:**
        1.  **عد التكرار:** قم بحساب عدد مرات تكرار كل سبب جذري فريد.
        2.  **الترتيب:** رتب الأسباب تنازليًا من الأكثر تكرارًا إلى الأقل.
        3.  **حساب النسب:** لكل سبب، احسب نسبته المئوية من إجمالي عدد الأسباب.
        4.  **حساب النسب التراكمية:** احسب النسبة المئوية التراكمية لكل سبب بعد الترتيب.
        5.  قدم النتيجة **حصريًا** بصيغة JSON بناءً على المخطط المحدد. يجب أن تكون النتائج مرتبة تنازليًا حسب التكرار.
    `;

    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: paretoSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("فشل في إجراء تحليل باريتو. الاستجابة كانت فارغة.");
        }

        let parsableText = jsonText;
        if (parsableText.startsWith('```json')) {
            parsableText = parsableText.substring(7, parsableText.length - 3).trim();
        }
        const result: ParetoAnalysis = JSON.parse(parsableText);
        
        if (!result.items || result.items.length === 0) {
             throw new Error("تحليل باريتو لم ينتج بيانات صالحة.");
        }

        return result;
    } catch (error) {
        console.error("خطأ في تحليل باريتو باستخدام Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير معروف.";
        throw new Error(`فشل في الحصول على تحليل باريتو صالح. ${errorMessage}`);
    }
};

const fmeaSchema = {
    type: Type.OBJECT,
    properties: {
        items: {
            type: Type.ARRAY,
            description: "قائمة بأنماط الفشل المحتملة وتحليلها.",
            items: {
                type: Type.OBJECT,
                properties: {
                    failureMode: { type: Type.STRING, description: "نمط الفشل المحتمل في العملية." },
                    failureEffect: { type: Type.STRING, description: "التأثير المحتمل للفشل." },
                    severity: { type: Type.INTEGER, description: "تقدير لخطورة التأثير (1-10)." },
                    potentialCause: { type: Type.STRING, description: "السبب المحتمل لنمط الفشل." },
                    occurrence: { type: Type.INTEGER, description: "تقدير لاحتمالية حدوث السبب (1-10)." },
                    detection: { type: Type.INTEGER, description: "تقدير لمدى سهولة اكتشاف الفشل (1-10)." },
                    rpn: { type: Type.INTEGER, description: "رقم أولوية المخاطر (Severity * Occurrence * Detection)." },
                    recommendedAction: { type: Type.STRING, description: "الإجراء الموصى به لتقليل المخاطر." }
                },
                required: ["failureMode", "failureEffect", "severity", "potentialCause", "occurrence", "detection", "rpn", "recommendedAction"]
            }
        }
    },
    required: ["items"]
};

export const performFmeaAnalysis = async (incident: IncidentReport): Promise<FmeaAnalysis> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const problem = incident.analysis?.rootCause?.cause || incident.title;

    const prompt = `
        بصفتك مهندس جودة متخصص في تحليل نمط وتأثير الفشل (FMEA)، قم بتحليل المشكلة التالية من سياق الحادث المقدم.

        **المشكلة / العملية لتحليلها:**
        "${problem}"

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **السبب الجذري الأولي (إن وجد):** ${incident.analysis?.rootCause?.cause || 'غير محدد'}

        **مهمتك:**
        1.  حدد 3-5 "أنماط فشل" محتملة وواقعية مرتبطة بالعملية أو المشكلة المحددة.
        2.  لكل نمط فشل، قم بتعبئة جدول FMEA بالكامل:
            - **تأثير الفشل:** ما هي نتيجة حدوث هذا الفشل؟
            - **الخطورة (Severity):** قدر خطورة التأثير على مقياس من 1 (لا تأثير) إلى 10 (تأثير كارثي).
            - **السبب المحتمل:** ما الذي قد يسبب نمط الفشل هذا؟
            - **الحدوث (Occurrence):** قدر احتمالية حدوث السبب على مقياس من 1 (نادر جدًا) إلى 10 (شبه مؤكد).
            - **الاكتشاف (Detection):** قدر مدى سهولة اكتشاف الفشل قبل وصوله للمستخدم النهائي على مقياس من 1 (سهل الاكتشاف) إلى 10 (مستحيل الاكتشاف).
            - **رقم أولوية المخاطر (RPN):** احسبه تلقائيًا (الخطورة × الحدوث × الاكتشاف).
            - **الإجراء الموصى به:** اقترح إجراءً ملموسًا لتقليل الخطورة أو الحدوث، أو لتحسين الاكتشاف.
        3.  قدم النتيجة **حصريًا** بصيغة JSON بناءً على المخطط المحدد. يجب أن تكون النتائج مرتبة تنازليًا حسب RPN.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: fmeaSchema,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 4096 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("فشل في إجراء تحليل FMEA. الاستجابة كانت فارغة.");
        let parsableText = jsonText.startsWith('```json') ? jsonText.substring(7, jsonText.length - 3).trim() : jsonText;
        const result: FmeaAnalysis = JSON.parse(parsableText);
        if (!result.items || result.items.length === 0) throw new Error("تحليل FMEA لم ينتج بيانات صالحة.");
        return result;
    } catch (error) {
        console.error("خطأ في تحليل FMEA باستخدام Gemini API:", error);
        throw new Error(`فشل في الحصول على تحليل FMEA صالح. ${error instanceof Error ? error.message : ""}`);
    }
};

const faultTreeEventSchema: any = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "وصف الحدث." },
        gate: { type: Type.STRING, enum: ['AND', 'OR'], description: "البوابة المنطقية التي تربط الأحداث الفرعية (إذا وجدت)." },
    },
    required: ["name"]
};
faultTreeEventSchema.properties.children = {
    type: Type.ARRAY,
    items: faultTreeEventSchema,
    description: "قائمة بالأحداث الفرعية التي تساهم في هذا الحدث."
};

const faultTreeSchema = {
    type: Type.OBJECT,
    properties: {
        topEvent: faultTreeEventSchema
    },
    required: ["topEvent"]
};

export const performFaultTreeAnalysis = async (incident: IncidentReport): Promise<FaultTreeAnalysis> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const topEventDescription = incident.analysis?.rootCause?.cause || incident.title;
    const prompt = `
        بصفتك خبيرًا في هندسة الموثوقية والسلامة، قم بإجراء تحليل شجرة الأخطاء (FTA) للحدث غير المرغوب فيه التالي.

        **الحدث الأعلى (Top Event):**
        "${topEventDescription}"

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}
        - **السبب الجذري الأولي (إن وجد):** ${incident.analysis?.rootCause?.cause || 'غير محدد'}

        **مهمتك:**
        1.  ابدأ بالحدث الأعلى المحدد.
        2.  استخدم التفكير الاستنباطي لتحديد الأسباب المباشرة التي يمكن أن تؤدي إلى هذا الحدث.
        3.  اربط هذه الأسباب باستخدام بوابات منطقية مناسبة ('AND' أو 'OR').
            - استخدم 'OR' إذا كان أي سبب من الأسباب الفرعية كافياً لوحده لإحداث الحدث الأعلى.
            - استخدم 'AND' إذا كانت جميع الأسباب الفرعية يجب أن تحدث معًا لإحداث الحدث الأعلى.
        4.  استمر في تفكيك كل حدث وسيط إلى أسباب أكثر جوهرية حتى تصل إلى الأحداث الأساسية (الأسباب الجذرية التي لا يمكن تفكيكها أكثر).
        5.  يجب أن يكون الهيكل النهائي للشجرة منطقيًا ويعكس علاقات السبب والنتيجة بدقة.
        6.  قدم النتيجة **حصريًا** بصيغة JSON بناءً على المخطط المحدد.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: faultTreeSchema,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 4096 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("فشل في إجراء تحليل FTA. الاستجابة كانت فارغة.");
        let parsableText = jsonText.startsWith('```json') ? jsonText.substring(7, jsonText.length - 3).trim() : jsonText;
        const result: FaultTreeAnalysis = JSON.parse(parsableText);
        if (!result.topEvent) throw new Error("تحليل FTA لم ينتج بيانات صالحة.");
        return result;
    } catch (error) {
        console.error("خطأ في تحليل FTA باستخدام Gemini API:", error);
        throw new Error(`فشل في الحصول على تحليل FTA صالح. ${error instanceof Error ? error.message : ""}`);
    }
};

const pokaYokeSchema = {
    type: Type.OBJECT,
    properties: {
        items: {
            type: Type.ARRAY,
            description: "قائمة باقتراحات Poka-Yoke.",
            items: {
                type: Type.OBJECT,
                properties: {
                    suggestion: { type: Type.STRING, description: "اقتراح مقاومة الخطأ." },
                    explanation: { type: Type.STRING, description: "شرح لكيفية عمل الاقتراح." },
                    implementationType: { type: Type.STRING, enum: ['Control', 'Warning', 'Shutdown'], description: "نوع التنفيذ: 'Control' يمنع الخطأ، 'Warning' يحذر منه، 'Shutdown' يوقف العملية." }
                },
                required: ["suggestion", "explanation", "implementationType"]
            }
        }
    },
    required: ["items"]
};

export const performPokaYokeAnalysis = async (incident: IncidentReport): Promise<PokaYokeAnalysis> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const problem = incident.analysis?.rootCause?.cause || incident.title;
    const prompt = `
        بصفتك خبيرًا في منهجية Lean و Poka-Yoke (مقاومة الأخطاء)، قم بتوليد اقتراحات لمنع الأخطاء المتعلقة بالمشكلة التالية.
        
        **المشكلة / نقطة الخطأ:**
        "${problem}"

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}

        **مهمتك:**
        1.  حلل نقطة الخطأ في العملية المذكورة.
        2.  اقترح 2-3 حلول Poka-Yoke مبتكرة وعملية.
        3.  لكل اقتراح:
            - **صف الاقتراح:** كن واضحًا ومحددًا.
            - **اشرح كيف يعمل:** كيف يمنع هذا الحل الخطأ أو يجعله واضحًا على الفور؟
            - **حدد نوع التنفيذ:**
                - **Control (تحكم):** يجعل ارتكاب الخطأ مستحيلاً (مثال: قابس USB لا يمكن إدخاله إلا بطريقة واحدة).
                - **Warning (تحذير):** ينبه المستخدم إلى وجود خطأ (مثال: صوت طنين عند ترك باب السيارة مفتوحًا).
                - **Shutdown (إيقاف):** يوقف العملية تلقائيًا عند اكتشاف خطأ.
        4.  قدم النتيجة **حصريًا** بصيغة JSON بناءً على المخطط المحدد.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: pokaYokeSchema,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("فشل في إجراء تحليل Poka-Yoke. الاستجابة كانت فارغة.");
        let parsableText = jsonText.startsWith('```json') ? jsonText.substring(7, jsonText.length - 3).trim() : jsonText;
        const result: PokaYokeAnalysis = JSON.parse(parsableText);
        if (!result.items) throw new Error("تحليل Poka-Yoke لم ينتج بيانات صالحة.");
        return result;
    } catch (error) {
        console.error("خطأ في تحليل Poka-Yoke باستخدام Gemini API:", error);
        throw new Error(`فشل في الحصول على تحليل Poka-Yoke صالح. ${error instanceof Error ? error.message : ""}`);
    }
};

const dmaicSchema = {
    type: Type.OBJECT,
    properties: {
        define: { type: Type.STRING, description: "مرحلة التعريف: تحديد المشكلة وأهداف المشروع بوضوح." },
        measure: { type: Type.STRING, description: "مرحلة القياس: وصف لكيفية قياس أداء العملية الحالية وجمع البيانات." },
        analyze: { type: Type.STRING, description: "مرحلة التحليل: تحليل البيانات لتحديد الأسباب الجذرية للمشكلة." },
        improve: { type: Type.STRING, description: "مرحلة التحسين: اقتراح حلول لتحسين العملية بناءً على التحليل." },
        control: { type: Type.STRING, description: "مرحلة التحكم: وصف لكيفية مراقبة الحلول لضمان استدامتها ومنع تكرار المشكلة." }
    },
    required: ["define", "measure", "analyze", "improve", "control"]
};

export const performDmaicAnalysis = async (incident: IncidentReport): Promise<DmaicAnalysis> => {
    const ai = getAiInstance();
    const model = "gemini-2.5-flash";
    const problem = incident.analysis?.rootCause?.cause || incident.title;
    const prompt = `
        بصفتك خبيرًا في Lean Six Sigma (حزام أسود)، قم بوضع مخطط لمشروع DMAIC لمعالجة المشكلة التالية.

        **المشكلة:**
        "${problem}"

        **سياق الحادث:**
        - **العنوان:** ${incident.title}
        - **الوصف:** ${incident.description}

        **مهمتك:**
        قم بإنشاء ملخص عالي المستوى لكل مرحلة من مراحل DMAIC الخمس. يجب أن يكون كل ملخص عمليًا وموجهًا نحو حل المشكلة المحددة.
        1.  **Define (التعريف):** صف المشكلة بوضوح، وحدد أهداف المشروع، وما هو نطاق التحسين.
        2.  **Measure (القياس):** صف البيانات التي يجب جمعها وكيف سيتم قياس أداء العملية الحالي.
        3.  **Analyze (التحليل):** اشرح كيف سيتم تحليل البيانات لتحديد والتحقق من الأسباب الجذرية.
        4.  **Improve (التحسين):** اقترح أنواع الحلول التي يمكن تطويرها وتنفيذها لمعالجة الأسباب الجذرية.
        5.  **Control (التحكم):** صف كيف سيتم وضع ضوابط لضمان استمرار التحسينات ومنع تكرار المشكلة.
        
        قدم النتيجة **حصريًا** بصيغة JSON بناءً على المخطط المحدد.
    `;
    try {
        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: dmaicSchema,
                maxOutputTokens: 8192,
                thinkingConfig: { thinkingBudget: 4096 },
            }
        }));
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("فشل في إجراء تحليل DMAIC. الاستجابة كانت فارغة.");
        let parsableText = jsonText.startsWith('```json') ? jsonText.substring(7, jsonText.length - 3).trim() : jsonText;
        const result: DmaicAnalysis = JSON.parse(parsableText);
        if (!result.define) throw new Error("تحليل DMAIC لم ينتج بيانات صالحة.");
        return result;
    } catch (error) {
        console.error("خطأ في تحليل DMAIC باستخدام Gemini API:", error);
        throw new Error(`فشل في الحصول على تحليل DMAIC صالح. ${error instanceof Error ? error.message : ""}`);
    }
};