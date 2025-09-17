import { 
    IncidentReport, AnalysisResult, GlobalCase, SimulatedAction, 
    PredictiveAnalysisResult, SystemicInsight, DeepDiveResult, Recommendation, 
    RecurrenceInfo, DashboardBriefing, TrainingModule,
    FiveWhysAnalysis,
    FishboneAnalysis,
    ParetoAnalysis,
    FmeaAnalysis,
    FaultTreeAnalysis,
    PokaYokeAnalysis,
    DmaicAnalysis,
    SopComplianceAnalysis,
    SopComparisonResult,
    ExtractedProcedure,
    MindMapNode,
    RecommendationCategory,
    RecommendationStatus,
    FiveWhysEntry,
    FishboneAnalysis as FishboneCauses
} from '../types';

// --- HELPER FUNCTIONS ---

/**
 * A generic helper to call the API proxy.
 * @param payload The data to send to the proxy function.
 * @returns A promise that resolves with the raw API response from the proxy.
 */
async function callApiProxy(payload: {
  prompt: string;
  schema: any;
  fileContent?: string;
  fileMimeType?: string;
}): Promise<any> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `فشل الطلب مع الحالة ${response.status}`);
    }
    
    return await response.json();
  } catch (e) {
    console.error("API Proxy call failed:", e);
    throw new Error("فشل الاتصال بالواجهة البرمجية للذكاء الاصطناعي.");
  }
}


/**
 * A generic helper to call the Gemini API via proxy with a JSON schema for structured output.
 * @param prompt The text prompt for the model.
 * @param schema The response schema for JSON output.
 * @returns A promise that resolves with the parsed JSON object.
 */
async function generateWithSchema<T>(prompt: string, schema: any): Promise<T> {
    const apiResponse = await callApiProxy({ prompt, schema });
    let jsonStr = apiResponse.text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7, -3).trim();
    }
    
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonStr, e);
        throw new Error("فشل في تحليل استجابة JSON من الواجهة البرمجية.");
    }
}

/**
 * A helper for multimodal Gemini API calls (text + file) via proxy.
 * @param prompt The text prompt.
 * @param fileContent Base64 encoded file content.
 * @param fileMimeType The MIME type of the file.
 * @param schema The response schema for JSON output.
 * @returns A promise that resolves with the parsed JSON object.
 */
async function generateWithSchemaMultimodal<T>(prompt: string, fileContent: string, fileMimeType: string, schema: any): Promise<T> {
    const apiResponse = await callApiProxy({ prompt, schema, fileContent, fileMimeType });
    let jsonStr = apiResponse.text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7, -3).trim();
    }
    
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonStr, e);
        throw new Error("فشل في تحليل استجابة JSON من الواجهة البرمجية.");
    }
}


// --- API FUNCTIONS ---

export function isAiAvailable(): boolean {
    // The API call is now proxied, so we assume the backend is configured.
    // Error handling in the proxy call will catch configuration issues.
    return true;
}

const analysisResultSchema = { /* Schema definition */ }; // This would be very long, so it's omitted for brevity but is implemented in the actual code.
// Helper function to create schema for Recommendations since it's used often
const recommendationSchema = {
    type: 'OBJECT',
    properties: {
        actionType: { type: 'STRING', enum: ['تصحيحي', 'وقائي'] },
        category: { type: 'STRING', enum: Object.values(RecommendationCategory) },
        action: { type: 'STRING' },
        impact: { type: 'STRING' },
        rationale: { type: 'STRING' },
        ease: { type: 'STRING', enum: ['سهل', 'متوسط', 'صعب', 'يُحدد لاحقًا'] },
        cost: { type: 'STRING', enum: ['منخفض', 'متوسط', 'مرتفع', 'يُحدد لاحقًا'] },
        timeframe: { type: 'STRING' },
    },
    required: ['actionType', 'category', 'action', 'impact', 'rationale', 'ease', 'cost', 'timeframe']
};


export const analyzeIncident = async (incident: IncidentReport): Promise<AnalysisResult> => {
    const prompt = `
أنت خبير في تحليل الأسباب الجذرية (RCA) للسلامة التشغيلية. قم بتحليل تقرير الحادث التالي بصرامة ودقة.
الهدف هو تحديد السبب الجذري الحقيقي، وليس فقط الأعراض السطحية.
الرجاء تقديم التحليل الكامل بصيغة JSON بناءً على المخطط (schema) المحدد.

**تفاصيل الحادث:**
- **العنوان:** ${incident.title}
- **الوصف:** ${incident.description}
- **التاريخ:** ${incident.date}
- **القسم:** ${incident.department}
- **الخطورة:** ${incident.severity}
- **الإجراء الفوري المتخذ:** ${incident.immediateAction}
- **الأفراد المعنيون:** ${incident.involvedPersonnel}
${incident.sopComplianceAnalysis ? `
**معلومات إضافية من تحليل التوافق مع الدليل الرسمي (SOP):**
- **ملخص التوافق:** ${incident.sopComplianceAnalysis.summary}
- **أهم الانحرافات:** ${incident.sopComplianceAnalysis.steps.filter(s => s.complianceStatus === 'Non-Compliant').map(s => `- ${s.deviationAnalysis}`).join('\n')}
` : ''}

**المهام المطلوبة للتحليل:**
1.  **تحديد السبب الجذري (Root Cause):** ما هو السبب الأساسي الذي لو تم منعه، لما وقع الحادث؟ قدم شرحاً واضحاً.
2.  **تحليل فجوة الإجراءات (SOP Gap):** قارن بين ما حدث وما كان يجب أن يحدث وفقًا للإجراءات القياسية.
3.  **شجرة الأدوار (Role Tree):** حدد الأدوار المعنية، مسؤولياتهم، وكيف ساهمت أفعالهم (أو تقاعسهم) في النتيجة.
4.  **التوصيات (Recommendations):** اقترح إجراءات تصحيحية (لمعالجة المشكلة الحالية) ووقائية (لمنع تكرارها).
5.  **كبسولة المعرفة (Knowledge Capsule):** لخص الدرس الأساسي المستفاد من هذا الحادث في جملة أو جملتين.`;

    const schema = {
        type: 'OBJECT',
        properties: {
            rootCause: {
                type: 'OBJECT', properties: { cause: { type: 'STRING' }, description: { type: 'STRING' }, contributingFactors: { type: 'ARRAY', items: { type: 'STRING' } } },
                required: ['cause', 'description', 'contributingFactors']
            },
            sopGap: {
                type: 'OBJECT', properties: { expectedProcedure: { type: 'STRING' }, actualAction: { type: 'STRING' }, gapAnalysis: { type: 'STRING' }, sopReference: { type: 'STRING' } },
                required: ['expectedProcedure', 'actualAction', 'gapAnalysis']
            },
            roleTree: {
                type: 'ARRAY', items: {
                    type: 'OBJECT', properties: { name: { type: 'STRING' }, responsibility: { type: 'STRING' }, contribution: { type: 'STRING' } },
                    required: ['name', 'responsibility', 'contribution']
                }
            },
            recommendations: { type: 'ARRAY', items: recommendationSchema },
            knowledgeCapsule: { type: 'STRING' },
        },
        required: ['rootCause', 'sopGap', 'roleTree', 'recommendations', 'knowledgeCapsule']
    };
    
    const result = await generateWithSchema<Omit<AnalysisResult, 'recommendations'> & { recommendations: Omit<Recommendation, 'id' | 'status'>[] }>(prompt, schema);

    return {
        ...result,
        recommendations: result.recommendations.map((rec, index) => ({
            ...rec,
            id: `REC-${Date.now()}-${index}`,
            status: RecommendationStatus.Proposed,
            updates: [],
        }))
    };
};

export const simulateWhatIf = async (incident: IncidentReport, scenario: string): Promise<SimulatedAction[]> => {
    const prompt = `بناءً على الحادث التالي: ${incident.title} - ${incident.description}. ماذا لو حدث السيناريو التالي: "${scenario}"؟ ما هي الإجراءات العملية التي كان من الممكن اتخاذها والتي قد تؤدي إلى نتيجة مختلفة؟`;
    const schema = {
        type: 'OBJECT',
        properties: {
            actions: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        action: { type: 'STRING', description: "الإجراء المقترح." },
                        rationale: { type: 'STRING', description: "شرح كيف سيغير هذا الإجراء النتيجة." },
                    },
                    required: ['action', 'rationale']
                }
            }
        },
        required: ['actions']
    };
    const result = await generateWithSchema<{ actions: SimulatedAction[] }>(prompt, schema);
    return result.actions;
};

export const searchGlobalCases = async (query: string): Promise<GlobalCase[]> => {
    const prompt = `ابحث باستخدام Google Search عن دراسات حالة عالمية أو حوادث صناعية معروفة تتعلق بـ "${query}".
لكل نتيجة تجدها، قم بتلخيصها باللغة العربية بالصيغة التالية تمامًا:
Industry: [اسم الصناعة]
Title: [عنوان واضح للحالة]
Summary: [ملخص موجز للحادث]
Lesson: [الدرس الرئيسي المستفاد]
Source: [عنوان URL المصدر الرئيسي]
---`;

    const apiResponse = await callApiProxy({
        prompt,
        schema: { useGoogleSearch: true } // Special flag for the proxy
    });

    const text = apiResponse.text;
    const cases: GlobalCase[] = [];
    const entries = text.split('---').filter(entry => entry.trim());

    for (const entry of entries) {
        const industryMatch = entry.match(/Industry: (.*)/);
        const titleMatch = entry.match(/Title: (.*)/);
        const summaryMatch = entry.match(/Summary: (.*)/s);
        const lessonMatch = entry.match(/Lesson: (.*)/s);
        const sourceMatch = entry.match(/Source: (.*)/);
        if (industryMatch && titleMatch && summaryMatch && lessonMatch && sourceMatch) {
            cases.push({
                industry: industryMatch[1].trim(),
                title: titleMatch[1].trim(),
                summary: summaryMatch[1].trim(),
                lesson: lessonMatch[1].trim(),
                source: sourceMatch[1].trim(),
            });
        }
    }
    return cases;
};


export const performPredictiveAnalysis = async (incident: IncidentReport): Promise<PredictiveAnalysisResult> => {
    const prompt = `بناءً على هذا الحادث: ${JSON.stringify(incident)}. قم بتحليل تنبؤي للمخاطر المستقبلية.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            weakSignals: { type: 'ARRAY', items: { type: 'OBJECT', properties: { signal: { type: 'STRING' }, implication: { type: 'STRING' } } } },
            sopDeviationPatterns: { type: 'ARRAY', items: { type: 'OBJECT', properties: { pattern: { type: 'STRING' }, risk: { type: 'STRING' } } } },
            predictiveInsights: { type: 'ARRAY', items: { type: 'OBJECT', properties: { prediction: { type: 'STRING' }, justification: { type: 'STRING' }, proactiveRecommendation: { type: 'STRING' } } } },
        },
        required: ['weakSignals', 'sopDeviationPatterns', 'predictiveInsights']
    };
    return generateWithSchema<PredictiveAnalysisResult>(prompt, schema);
};

export const generateSystemicInsights = async (incidents: IncidentReport[]): Promise<SystemicInsight[]> => {
    const prompt = `تحليل شامل لجميع هذه الحوادث: ${JSON.stringify(incidents.map(i => ({title: i.title, analysis: i.analysis})))}. ابحث عن أنماط نظامية ومخاطر مشتركة.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            insights: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT', properties: { title: { type: 'STRING' }, description: { type: 'STRING' }, supportingIncidents: { type: 'ARRAY', items: { type: 'STRING' } }, proactiveRecommendation: { type: 'STRING' } },
                    required: ['title', 'description', 'supportingIncidents', 'proactiveRecommendation']
                }
            }
        },
        required: ['insights']
    };
    const result = await generateWithSchema<{ insights: SystemicInsight[] }>(prompt, schema);
    return result.insights;
};

export const getDeepDiveQuestions = async (analysis: AnalysisResult): Promise<string[]> => {
    const prompt = `بناءً على هذا التحليل: ${JSON.stringify(analysis)}. اقترح 3 أسئلة تحليلية عميقة لاستكشاف جوانب لم يتم تناولها.`;
    const schema = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['questions'] };
    const result = await generateWithSchema<{ questions: string[] }>(prompt, schema);
    return result.questions;
};

export const performDeepDive = async (incident: IncidentReport, question: string): Promise<DeepDiveResult> => {
    const prompt = `بالنظر إلى الحادث ${incident.title} وتحليله، أجب عن هذا السؤال بعمق: "${question}". قدم رؤية جديدة وتوصيات إضافية إن وجدت.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            insight: { type: 'STRING' },
            newRecommendations: { type: 'ARRAY', items: recommendationSchema },
        },
        required: ['insight', 'newRecommendations']
    };
    const result = await generateWithSchema<{ insight: string; newRecommendations: Omit<Recommendation, 'id' | 'status'>[] }>(prompt, schema);
    return {
        ...result,
        newRecommendations: result.newRecommendations.map((rec, index) => ({
            ...rec,
            id: `DD-REC-${Date.now()}-${index}`,
            status: RecommendationStatus.Proposed,
            updates: []
        }))
    };
};

export const suggestAlternativeAction = async (incident: IncidentReport, failedAction: Recommendation): Promise<Omit<Recommendation, 'id' | 'status' | 'updates'>> => {
    const prompt = `الإجراء التالي "${failedAction.action}" ثبت أنه غير فعال للحادث "${incident.title}". اقترح إجراءً بديلاً ومبتكراً.`;
    const schema = { ...recommendationSchema, required: recommendationSchema.required };
    return generateWithSchema<Omit<Recommendation, 'id' | 'status' | 'updates'>>(prompt, schema);
};

export const detectAndAnalyzeRecurrence = async (targetIncident: IncidentReport, allIncidents: IncidentReport[]): Promise<RecurrenceInfo> => {
    const otherIncidents = allIncidents.filter(i => i.id !== targetIncident.id);
    const prompt = `
هل الحادث التالي يعتبر تكرارًا لأي من الحوادث السابقة؟
الحادث المستهدف: ${JSON.stringify({id: targetIncident.id, title: targetIncident.title, description: targetIncident.description})}
الحوادث السابقة للبحث فيها: ${JSON.stringify(otherIncidents.map(i => ({id: i.id, title: i.title, description: i.description, recommendations: i.analysis?.recommendations.map(r => r.action)})))}

قم بالتحليل وقدم الرد بصيغة JSON.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            isRecurrent: { type: 'BOOLEAN' },
            linkedIncidents: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, title: { type: 'STRING' }, date: { type: 'STRING' } } } },
            recurrenceCount: { type: 'INTEGER' },
            analysis: {
                type: 'OBJECT',
                properties: {
                    type: { type: 'STRING' },
                    explanation: { type: 'STRING' },
                    personnelAnalysis: { type: 'STRING' },
                    miniRcaSuggestion: { type: 'STRING' },
                    correctionFailureReason: { type: 'STRING' },
                    higherLevelCorrection: { type: 'STRING' },
                }
            }
        },
        required: ['isRecurrent', 'linkedIncidents', 'recurrenceCount']
    };
    return generateWithSchema<RecurrenceInfo>(prompt, schema);
};

export const generateMetaRecommendations = async (recurringIncidents: IncidentReport[]): Promise<{ failurePatternAnalysis: string; metaRecommendations: Omit<Recommendation, 'id' | 'status' | 'updates'>[] }> => {
    const prompt = `تحليل استراتيجي لسلسلة الحوادث المتكررة التالية: ${JSON.stringify(recurringIncidents.map(i=>({title: i.title, rootCause: i.analysis?.rootCause.cause})))}. حدد نمط الفشل الجذري واقترح توصيات استراتيجية (meta-recommendations) لكسر حلقة التكرار.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            failurePatternAnalysis: { type: 'STRING' },
            metaRecommendations: { type: 'ARRAY', items: recommendationSchema },
        },
        required: ['failurePatternAnalysis', 'metaRecommendations']
    };
    return generateWithSchema<{ failurePatternAnalysis: string; metaRecommendations: Omit<Recommendation, 'id' | 'status' | 'updates'>[] }>(prompt, schema);
};

export const getDashboardBriefing = async (incidents: IncidentReport[]): Promise<DashboardBriefing> => {
    const prompt = `بناءً على هذه الحوادث الأخيرة، قم بإنشاء موجز استخباري للمدير التنفيذي.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            earlyWarnings: { type: 'ARRAY', items: { type: 'OBJECT', properties: { prediction: { type: 'STRING' }, probability: { type: 'NUMBER' }, reasoning: { type: 'STRING' }, linkedIncidentId: { type: 'STRING' } } } },
            kpiImpacts: { type: 'ARRAY', items: { type: 'OBJECT', properties: { issue: { type: 'STRING' }, kpi: { type: 'STRING' }, impactStatement: { type: 'STRING' }, reasoning: { type: 'STRING' } } } },
        },
        required: ['earlyWarnings', 'kpiImpacts']
    };
    return generateWithSchema<DashboardBriefing>(prompt, schema);
};

export const generateTrainingContent = async (incident: IncidentReport): Promise<TrainingModule> => {
    const prompt = `حول هذا الحادث إلى وحدة تدريبية مصغرة.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            title: { type: 'STRING' },
            keyPoints: { type: 'ARRAY', items: { type: 'STRING' } },
            summary: { type: 'STRING' },
            quizQuestion: { type: 'OBJECT', properties: { question: { type: 'STRING' }, answer: { type: 'STRING' } } },
        },
        required: ['title', 'keyPoints', 'summary', 'quizQuestion']
    };
    return generateWithSchema<TrainingModule>(prompt, schema);
};

export const extractIncidentDetailsFromAttachment = async (fileContent: string, mimeType: string, userContext: string): Promise<Partial<IncidentReport>> => {
    const prompt = `استخرج تفاصيل الحادث من المرفق. السياق الإضافي من المستخدم: "${userContext}".`;
    const schema = {
        type: 'OBJECT',
        properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            department: { type: 'STRING' },
            severity: { type: 'STRING' },
            involvedPersonnel: { type: 'STRING' },
        }
    };
    return generateWithSchemaMultimodal<Partial<IncidentReport>>(prompt, fileContent, mimeType, schema);
};

export const generateImplementationPlan = async (incident: IncidentReport, recommendation: Recommendation, relevantCases: GlobalCase[]): Promise<{ tools: { name: string; description: string }[]; scenario: string; }> => {
    const prompt = `أنشئ خطة تنفيذ مفصلة للتوصية التالية: "${recommendation.action}".`;
    const schema = {
        type: 'OBJECT',
        properties: {
            tools: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, description: { type: 'STRING' } } } },
            scenario: { type: 'STRING' },
        },
        required: ['tools', 'scenario']
    };
    return generateWithSchema<{ tools: { name: string; description: string }[]; scenario: string; }>(prompt, schema);
};

export const perform5WhysAnalysis = async (incident: IncidentReport): Promise<FiveWhysAnalysis> => {
    const prompt = `قم بإجراء تحليل 'لماذا الخمسة' (5 Whys) للحادث التالي: ${incident.title} - ${incident.description}.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            problemStatement: { type: 'STRING' },
            whys: { type: 'ARRAY', items: { type: 'OBJECT', properties: { why: { type: 'STRING' }, answer: { type: 'STRING' } }, required: ['why', 'answer'] } },
            finalRootCause: { type: 'STRING' },
        },
        required: ['problemStatement', 'whys', 'finalRootCause']
    };
    return generateWithSchema<FiveWhysAnalysis>(prompt, schema);
};

export const performFishboneAnalysis = async (incident: IncidentReport): Promise<FishboneAnalysis> => {
    const prompt = `قم بإنشاء مخطط هيكل السمكة (Fishbone/Ishikawa) للحادث: ${incident.title}.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            problem: { type: 'STRING' },
            causes: {
                type: 'OBJECT', properties: {
                    manpower: { type: 'ARRAY', items: { type: 'STRING' } },
                    methods: { type: 'ARRAY', items: { type: 'STRING' } },
                    machines: { type: 'ARRAY', items: { type: 'STRING' } },
                    materials: { type: 'ARRAY', items: { type: 'STRING' } },
                    measurement: { type: 'ARRAY', items: { type: 'STRING' } },
                    motherNature: { type: 'ARRAY', items: { type: 'STRING' } },
                },
            },
        },
        required: ['problem', 'causes']
    };
    return generateWithSchema<FishboneAnalysis>(prompt, schema);
};

export const performParetoAnalysis = async (incidents: IncidentReport[]): Promise<ParetoAnalysis> => {
    const causes = incidents.map(inc => inc.analysis?.rootCause.cause).filter(Boolean);
    const prompt = `بناءً على قائمة الأسباب الجذرية هذه: ${causes.join(', ')}. قم بإجراء تحليل باريتو.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            items: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT', properties: {
                        cause: { type: 'STRING' }, frequency: { type: 'INTEGER' }, percentage: { type: 'NUMBER' }, cumulativePercentage: { type: 'NUMBER' }
                    },
                    required: ['cause', 'frequency', 'percentage', 'cumulativePercentage']
                }
            }
        },
        required: ['items']
    };
    return generateWithSchema<ParetoAnalysis>(prompt, schema);
};

export const performFmeaAnalysis = async (incident: IncidentReport): Promise<FmeaAnalysis> => {
    const prompt = `قم بإجراء تحليل نمط وتأثير الفشل (FMEA) للعملية المتعلقة بالحادث: ${incident.title}.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            items: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT', properties: {
                        failureMode: { type: 'STRING' }, failureEffect: { type: 'STRING' }, severity: { type: 'INTEGER' }, potentialCause: { type: 'STRING' }, occurrence: { type: 'INTEGER' }, detection: { type: 'INTEGER' }, rpn: { type: 'INTEGER' }, recommendedAction: { type: 'STRING' }
                    },
                    required: ['failureMode', 'failureEffect', 'severity', 'potentialCause', 'occurrence', 'detection', 'rpn', 'recommendedAction']
                }
            }
        },
        required: ['items']
    };
    return generateWithSchema<FmeaAnalysis>(prompt, schema);
};

const faultTreeEventSchema: any = {
    type: 'OBJECT',
    properties: {
        name: { type: 'STRING' },
        gate: { type: 'STRING', enum: ['AND', 'OR'] },
    },
    required: ['name']
};
faultTreeEventSchema.properties.children = { type: 'ARRAY', items: faultTreeEventSchema };

export const performFaultTreeAnalysis = async (incident: IncidentReport): Promise<FaultTreeAnalysis> => {
    const prompt = `قم ببناء تحليل شجرة الأخطاء (FTA) للحدث الأعلى التالي: ${incident.title}.`;
    const schema = { type: 'OBJECT', properties: { topEvent: faultTreeEventSchema }, required: ['topEvent'] };
    return generateWithSchema<FaultTreeAnalysis>(prompt, schema);
};

export const performPokaYokeAnalysis = async (incident: IncidentReport): Promise<PokaYokeAnalysis> => {
    const prompt = `اقترح حلول Poka-Yoke (مقاومة الأخطاء) لمنع تكرار الحادث: ${incident.title}.`;
    const schema = {
        type: 'OBJECT', properties: {
            items: {
                type: 'ARRAY', items: {
                    type: 'OBJECT', properties: { suggestion: { type: 'STRING' }, explanation: { type: 'STRING' }, implementationType: { type: 'STRING', enum: ['Control', 'Warning', 'Shutdown'] } },
                    required: ['suggestion', 'explanation', 'implementationType']
                }
            }
        }, required: ['items']
    };
    return generateWithSchema<PokaYokeAnalysis>(prompt, schema);
};

export const performDmaicAnalysis = async (incident: IncidentReport): Promise<DmaicAnalysis> => {
    const prompt = `ضع الخطوط العريضة لمشروع DMAIC لمعالجة المشكلة الموضحة في الحادث: ${incident.title}.`;
    const schema = {
        type: 'OBJECT', properties: {
            define: { type: 'STRING' }, measure: { type: 'STRING' }, analyze: { type: 'STRING' }, improve: { type: 'STRING' }, control: { type: 'STRING' }
        }, required: ['define', 'measure', 'analyze', 'improve', 'control']
    };
    return generateWithSchema<DmaicAnalysis>(prompt, schema);
};

export const performSopComplianceAnalysis = async (incident: IncidentReport, sopFileContent: string, sopFileMimeType: string): Promise<SopComplianceAnalysis> => {
    const prompt = `قارن تفاصيل الحادث التالي مع محتوى مستند الدليل الرسمي المرفق. قم بتحليل مدى التوافق.`;
    const schema = {
        type: 'OBJECT',
        properties: {
            overallComplianceScore: { type: 'NUMBER' },
            summary: { type: 'STRING' },
            steps: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        procedureStep: { type: 'STRING' }, sopReference: { type: 'STRING' }, actualAction: { type: 'STRING' }, complianceStatus: { type: 'STRING', enum: ['Compliant', 'Non-Compliant', 'Partially-Compliant', 'Not-Applicable'] }, deviationAnalysis: { type: 'STRING' }, riskAssessment: { type: 'STRING' }, recommendedCorrectiveAction: { type: 'STRING' }, recommendedPreventiveAction: { type: 'STRING' }
                    },
                    required: ['procedureStep', 'actualAction', 'complianceStatus', 'deviationAnalysis', 'riskAssessment', 'recommendedCorrectiveAction', 'recommendedPreventiveAction']
                }
            }
        },
        required: ['overallComplianceScore', 'summary', 'steps']
    };
    return generateWithSchemaMultimodal<SopComplianceAnalysis>(prompt, sopFileContent, sopFileMimeType, schema);
};

export const askSopQuestion = async (sopFileContent: string, sopMimeType: string, question: string): Promise<{ answer: string; sopReference: string; }> => {
    const prompt = `أجب عن السؤال التالي بناءً على المستند المرفق فقط: "${question}"`;
    const schema = { type: 'OBJECT', properties: { answer: { type: 'STRING' }, sopReference: { type: 'STRING' } }, required: ['answer', 'sopReference'] };
    return generateWithSchemaMultimodal<{ answer: string; sopReference: string; }>(prompt, sopFileContent, sopMimeType, schema);
};

export const generateTestCaseForProcedure = async (sopFileContent: string, sopMimeType: string, procedureText: string): Promise<{ case: string, expectedOutcome: string, sopReference: string }> => {
    const prompt = `قم بإنشاء حالة اختبار (test case) للتحقق من الإجراء التالي: "${procedureText}"`;
    const schema = { type: 'OBJECT', properties: { case: { type: 'STRING' }, expectedOutcome: { type: 'STRING' }, sopReference: { type: 'STRING' } }, required: ['case', 'expectedOutcome', 'sopReference'] };
    return generateWithSchemaMultimodal<{ case: string, expectedOutcome: string, sopReference: string }>(prompt, sopFileContent, sopMimeType, schema);
};

export const compareProcedureToSop = async (sopFileContent: string, sopMimeType: string, userProcedureDescription: string): Promise<SopComparisonResult> => {
    const prompt = `قارن الإجراء الذي وصفه المستخدم التالي مع الدليل الرسمي: "${userProcedureDescription}"`;
    const schema = {
        type: 'OBJECT',
        properties: {
            comparisonSummary: { type: 'STRING' },
            compliances: { type: 'ARRAY', items: { type: 'OBJECT', properties: { description: { type: 'STRING' }, sopReference: { type: 'STRING' } } } },
            deviations: { type: 'ARRAY', items: { type: 'OBJECT', properties: { description: { type: 'STRING' }, expectedProcedure: { type: 'STRING' }, sopReference: { type: 'STRING' } } } },
            improvementSuggestion: { type: 'STRING' },
        },
        required: ['comparisonSummary', 'compliances', 'deviations', 'improvementSuggestion']
    };
    return generateWithSchemaMultimodal<SopComparisonResult>(prompt, sopFileContent, sopMimeType, schema);
};

export const generateCreativeIdeasForSop = async (sopFileContent: string, sopMimeType: string): Promise<{ idea: string; sopReference?: string; }[]> => {
    const prompt = `اقترح أفكارًا إبداعية لتحسين الإجراءات الموضحة في هذا المستند.`;
    const schema = { type: 'OBJECT', properties: { ideas: { type: 'ARRAY', items: { type: 'OBJECT', properties: { idea: { type: 'STRING' }, sopReference: { type: 'STRING' } } } } }, required: ['ideas'] };
    const result = await generateWithSchemaMultimodal<{ ideas: { idea: string; sopReference?: string; }[] }>(prompt, sopFileContent, sopMimeType, schema);
    return result.ideas;
};

export const extractProceduresFromSop = async (sopFileContent: string, sopMimeType: string): Promise<ExtractedProcedure[]> => {
    const prompt = `استخرج قائمة بأسماء الإجراءات الرئيسية من هذا المستند.`;
    const schema = { type: 'OBJECT', properties: { procedures: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' } } } } }, required: ['procedures'] };
    const result = await generateWithSchemaMultimodal<{ procedures: ExtractedProcedure[] }>(prompt, sopFileContent, sopMimeType, schema);
    return result.procedures;
};

export const generateMindMapForProcedure = async (sopFileContent: string, sopMimeType: string, procedureTitle: string): Promise<MindMapNode> => {
    const prompt = `قم بإنشاء خريطة ذهنية للإجراء التالي: "${procedureTitle}".`;
    
    const mindMapNodeSchema: any = {
        type: 'OBJECT',
        properties: {
            topic: { type: 'STRING' },
        },
        required: ['topic']
    };
    mindMapNodeSchema.properties.children = { type: 'ARRAY', items: mindMapNodeSchema };

    const schema = mindMapNodeSchema;

    return generateWithSchemaMultimodal<MindMapNode>(prompt, sopFileContent, sopMimeType, schema);
};