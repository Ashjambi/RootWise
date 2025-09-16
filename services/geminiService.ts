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
    MindMapNode
} from '../types';

/**
 * A generic helper function to call the backend proxy API.
 * @param endpoint The API endpoint to call (e.g., '/analyze').
 * @param body The request body.
 * @param isFormData If true, the body is treated as FormData; otherwise, it's stringified as JSON.
 * @returns A promise that resolves with the JSON response from the backend.
 */
async function callProxyApi<T>(endpoint: string, body: any, isFormData: boolean = false): Promise<T> {
  const options: RequestInit = {
    method: 'POST',
  };

  if (isFormData) {
    options.body = body as FormData;
  } else {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  // All API calls go to a relative /api endpoint, which is handled by the backend proxy.
  const response = await fetch(`/api${endpoint}`, options);

  if (!response.ok) {
    // Try to parse a JSON error message from the backend, otherwise use status text.
    const errorData = await response.json().catch(() => ({ message: `فشل الطلب مع الحالة: ${response.statusText}` }));
    throw new Error(errorData.message || 'حدث خطأ غير معروف في واجهة برمجة التطبيقات.');
  }

  return response.json();
}

/**
 * Checks if the AI service is available. With a backend proxy, this is assumed to be always true from the client's perspective.
 */
export function isAiAvailable(): boolean {
    return true;
}

export const analyzeIncident = async (incident: IncidentReport): Promise<AnalysisResult> => {
  return callProxyApi<AnalysisResult>('/analyze', { incident });
};

export const simulateWhatIf = async (incident: IncidentReport, scenario: string): Promise<SimulatedAction[]> => {
    return callProxyApi<SimulatedAction[]>('/simulate', { incident, scenario });
};

export const searchGlobalCases = async (query: string): Promise<GlobalCase[]> => {
    return callProxyApi<GlobalCase[]>('/global-cases', { query });
};

export const performPredictiveAnalysis = async (incident: IncidentReport): Promise<PredictiveAnalysisResult> => {
    return callProxyApi<PredictiveAnalysisResult>('/predictive-analysis', { incident });
};

export const generateSystemicInsights = async (incidents: IncidentReport[]): Promise<SystemicInsight[]> => {
    return callProxyApi<SystemicInsight[]>('/systemic-insights', { incidents });
};

export const getDeepDiveQuestions = async (analysis: AnalysisResult): Promise<string[]> => {
    const result = await callProxyApi<{ questions: string[] }>('/deep-dive/questions', { analysis });
    return result.questions;
};

export const performDeepDive = async (incident: IncidentReport, question: string): Promise<DeepDiveResult> => {
    return callProxyApi<DeepDiveResult>('/deep-dive/perform', { incident, question });
};

export const suggestAlternativeAction = async (incident: IncidentReport, failedAction: Recommendation): Promise<Omit<Recommendation, 'id' | 'status' | 'updates'>> => {
    const result = await callProxyApi<{ newRecommendation: Omit<Recommendation, 'id' | 'status' | 'updates'> }>('/suggest-alternative', { incident, failedAction });
    return result.newRecommendation;
};

export const detectAndAnalyzeRecurrence = async (targetIncident: IncidentReport, allIncidents: IncidentReport[]): Promise<RecurrenceInfo> => {
    return callProxyApi<RecurrenceInfo>('/recurrence-analysis', { targetIncident, allIncidents });
};

export const generateMetaRecommendations = async (recurringIncidents: IncidentReport[]): Promise<{ failurePatternAnalysis: string; metaRecommendations: Omit<Recommendation, 'id' | 'status' | 'updates'>[] }> => {
    return callProxyApi<{ failurePatternAnalysis: string; metaRecommendations: Omit<Recommendation, 'id' | 'status' | 'updates'>[] }>('/meta-recommendations', { recurringIncidents });
};

export const getDashboardBriefing = async (incidents: IncidentReport[]): Promise<DashboardBriefing> => {
    return callProxyApi<DashboardBriefing>('/dashboard-briefing', { incidents });
};

export const generateTrainingContent = async (incident: IncidentReport): Promise<TrainingModule> => {
    return callProxyApi<TrainingModule>('/training-content', { incident });
};

export const extractIncidentDetailsFromAttachment = async (fileContent: string, mimeType: string, userContext: string): Promise<Partial<IncidentReport>> => {
  const formData = new FormData();
  formData.append('fileContent', fileContent);
  formData.append('mimeType', mimeType);
  formData.append('userContext', userContext);
  return callProxyApi<Partial<IncidentReport>>('/extract-from-attachment', formData, true);
};

export const generateImplementationPlan = async (incident: IncidentReport, recommendation: Recommendation, relevantCases: GlobalCase[]): Promise<{ tools: { name: string; description: string }[]; scenario: string; }> => {
    return callProxyApi<{ tools: { name: string; description: string }[]; scenario: string; }>('/implementation-plan', { incident, recommendation, relevantCases });
};

export const perform5WhysAnalysis = async (incident: IncidentReport): Promise<FiveWhysAnalysis> => {
    return callProxyApi<FiveWhysAnalysis>('/5whys', { incident });
};

export const performFishboneAnalysis = async (incident: IncidentReport): Promise<FishboneAnalysis> => {
    return callProxyApi<FishboneAnalysis>('/fishbone', { incident });
};

export const performParetoAnalysis = async (incidents: IncidentReport[]): Promise<ParetoAnalysis> => {
    return callProxyApi<ParetoAnalysis>('/pareto', { incidents });
};

export const performFmeaAnalysis = async (incident: IncidentReport): Promise<FmeaAnalysis> => {
    return callProxyApi<FmeaAnalysis>('/fmea', { incident });
};

export const performFaultTreeAnalysis = async (incident: IncidentReport): Promise<FaultTreeAnalysis> => {
    return callProxyApi<FaultTreeAnalysis>('/fta', { incident });
};

export const performPokaYokeAnalysis = async (incident: IncidentReport): Promise<PokaYokeAnalysis> => {
    return callProxyApi<PokaYokeAnalysis>('/pokayoke', { incident });
};

export const performDmaicAnalysis = async (incident: IncidentReport): Promise<DmaicAnalysis> => {
    return callProxyApi<DmaicAnalysis>('/dmaic', { incident });
};

export const performSopComplianceAnalysis = async (incident: IncidentReport, sopFileContent: string, sopFileMimeType: string): Promise<SopComplianceAnalysis> => {
    const formData = new FormData();
    formData.append('incident', JSON.stringify(incident));
    formData.append('sopFileContent', sopFileContent);
    formData.append('sopFileMimeType', sopFileMimeType);
    return callProxyApi<SopComplianceAnalysis>('/sop-compliance', formData, true);
};

export const askSopQuestion = async (sopFileContent: string, sopMimeType: string, question: string): Promise<{ answer: string; sopReference: string; }> => {
    const formData = new FormData();
    formData.append('sopFileContent', sopFileContent);
    formData.append('sopMimeType', sopMimeType);
    formData.append('question', question);
    return callProxyApi<{ answer: string; sopReference: string; }>('/sop-qa', formData, true);
};

export const generateTestCaseForProcedure = async (sopFileContent: string, sopMimeType: string, procedureText: string): Promise<{ case: string, expectedOutcome: string, sopReference: string }> => {
    const formData = new FormData();
    formData.append('sopFileContent', sopFileContent);
    formData.append('sopMimeType', sopMimeType);
    formData.append('procedureText', procedureText);
    return callProxyApi<{ case: string, expectedOutcome: string, sopReference: string }>('/sop-test-case', formData, true);
};

export const compareProcedureToSop = async (sopFileContent: string, sopMimeType: string, userProcedureDescription: string): Promise<SopComparisonResult> => {
    const formData = new FormData();
    formData.append('sopFileContent', sopFileContent);
    formData.append('sopMimeType', sopMimeType);
    formData.append('userProcedureDescription', userProcedureDescription);
    return callProxyApi<SopComparisonResult>('/sop-compare', formData, true);
};

export const generateCreativeIdeasForSop = async (sopFileContent: string, sopMimeType: string): Promise<{ idea: string; sopReference?: string; }[]> => {
    const formData = new FormData();
    formData.append('sopFileContent', sopFileContent);
    formData.append('sopMimeType', sopMimeType);
    const result = await callProxyApi<{ ideas: { idea: string; sopReference?: string; }[] }>('/sop-ideas', formData, true);
    return result.ideas;
};

export const extractProceduresFromSop = async (sopFileContent: string, sopMimeType: string): Promise<ExtractedProcedure[]> => {
    const formData = new FormData();
    formData.append('sopFileContent', sopFileContent);
    formData.append('sopMimeType', sopMimeType);
    const result = await callProxyApi<{ procedures: ExtractedProcedure[] }>('/sop-extract-procedures', formData, true);
    return result.procedures;
};

export const generateMindMapForProcedure = async (sopFileContent: string, sopMimeType: string, procedureTitle: string): Promise<MindMapNode> => {
    const formData = new FormData();
    formData.append('sopFileContent', sopFileContent);
    formData.append('sopMimeType', sopMimeType);
    formData.append('procedureTitle', procedureTitle);
    return callProxyApi<MindMapNode>('/sop-mindmap', formData, true);
};
