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
 * A generic helper function to call the backend API directly.
 * @param endpoint The API endpoint (e.g., '/analyze').
 * @param body The request body.
 * @returns A promise that resolves with the JSON response from the backend.
 */
async function callApi<T>(endpoint: string, body: any): Promise<T> {
  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };

  // API calls are sent directly to their specific endpoints, prefixed with /api.
  const response = await fetch(`/api${endpoint}`, options);

  if (!response.ok) {
    // Try to parse a JSON error message from the backend, otherwise use status code and text.
    const errorData = await response.json().catch(() => ({ 
      message: `فشل الطلب مع الحالة: ${response.status} ${response.statusText}`.trim() 
    }));
    throw new Error(errorData.message || 'حدث خطأ غير معروف في واجهة برمجة التطبيقات.');
  }

  return response.json();
}


/**
 * Checks if the AI service is available. Assumed to be true from the client's perspective.
 */
export function isAiAvailable(): boolean {
    return true;
}

export const analyzeIncident = async (incident: IncidentReport): Promise<AnalysisResult> => {
  return callApi<AnalysisResult>('/analyze', { incident });
};

export const simulateWhatIf = async (incident: IncidentReport, scenario: string): Promise<SimulatedAction[]> => {
    return callApi<SimulatedAction[]>('/simulate', { incident, scenario });
};

export const searchGlobalCases = async (query: string): Promise<GlobalCase[]> => {
    return callApi<GlobalCase[]>('/global-cases', { query });
};

export const performPredictiveAnalysis = async (incident: IncidentReport): Promise<PredictiveAnalysisResult> => {
    return callApi<PredictiveAnalysisResult>('/predictive-analysis', { incident });
};

export const generateSystemicInsights = async (incidents: IncidentReport[]): Promise<SystemicInsight[]> => {
    return callApi<SystemicInsight[]>('/systemic-insights', { incidents });
};

export const getDeepDiveQuestions = async (analysis: AnalysisResult): Promise<string[]> => {
    const result = await callApi<{ questions: string[] }>('/deep-dive/questions', { analysis });
    return result.questions;
};

export const performDeepDive = async (incident: IncidentReport, question: string): Promise<DeepDiveResult> => {
    return callApi<DeepDiveResult>('/deep-dive/perform', { incident, question });
};

export const suggestAlternativeAction = async (incident: IncidentReport, failedAction: Recommendation): Promise<Omit<Recommendation, 'id' | 'status' | 'updates'>> => {
    const result = await callApi<{ newRecommendation: Omit<Recommendation, 'id' | 'status' | 'updates'> }>('/suggest-alternative', { incident, failedAction });
    return result.newRecommendation;
};

export const detectAndAnalyzeRecurrence = async (targetIncident: IncidentReport, allIncidents: IncidentReport[]): Promise<RecurrenceInfo> => {
    return callApi<RecurrenceInfo>('/recurrence-analysis', { targetIncident, allIncidents });
};

export const generateMetaRecommendations = async (recurringIncidents: IncidentReport[]): Promise<{ failurePatternAnalysis: string; metaRecommendations: Omit<Recommendation, 'id' | 'status' | 'updates'>[] }> => {
    return callApi<{ failurePatternAnalysis: string; metaRecommendations: Omit<Recommendation, 'id' | 'status' | 'updates'>[] }>('/meta-recommendations', { recurringIncidents });
};

export const getDashboardBriefing = async (incidents: IncidentReport[]): Promise<DashboardBriefing> => {
    return callApi<DashboardBriefing>('/dashboard-briefing', { incidents });
};

export const generateTrainingContent = async (incident: IncidentReport): Promise<TrainingModule> => {
    return callApi<TrainingModule>('/training-content', { incident });
};

export const extractIncidentDetailsFromAttachment = async (fileContent: string, mimeType: string, userContext: string): Promise<Partial<IncidentReport>> => {
  const body = { fileContent, mimeType, userContext };
  return callApi<Partial<IncidentReport>>('/extract-from-attachment', body);
};

export const generateImplementationPlan = async (incident: IncidentReport, recommendation: Recommendation, relevantCases: GlobalCase[]): Promise<{ tools: { name: string; description: string }[]; scenario: string; }> => {
    return callApi<{ tools: { name: string; description: string }[]; scenario: string; }>('/implementation-plan', { incident, recommendation, relevantCases });
};

export const perform5WhysAnalysis = async (incident: IncidentReport): Promise<FiveWhysAnalysis> => {
    return callApi<FiveWhysAnalysis>('/5whys', { incident });
};

export const performFishboneAnalysis = async (incident: IncidentReport): Promise<FishboneAnalysis> => {
    return callApi<FishboneAnalysis>('/fishbone', { incident });
};

export const performParetoAnalysis = async (incidents: IncidentReport[]): Promise<ParetoAnalysis> => {
    return callApi<ParetoAnalysis>('/pareto', { incidents });
};

export const performFmeaAnalysis = async (incident: IncidentReport): Promise<FmeaAnalysis> => {
    return callApi<FmeaAnalysis>('/fmea', { incident });
};

export const performFaultTreeAnalysis = async (incident: IncidentReport): Promise<FaultTreeAnalysis> => {
    return callApi<FaultTreeAnalysis>('/fta', { incident });
};

export const performPokaYokeAnalysis = async (incident: IncidentReport): Promise<PokaYokeAnalysis> => {
    return callApi<PokaYokeAnalysis>('/pokayoke', { incident });
};

export const performDmaicAnalysis = async (incident: IncidentReport): Promise<DmaicAnalysis> => {
    return callApi<DmaicAnalysis>('/dmaic', { incident });
};

export const performSopComplianceAnalysis = async (incident: IncidentReport, sopFileContent: string, sopFileMimeType: string): Promise<SopComplianceAnalysis> => {
    const body = { incident, sopFileContent, sopFileMimeType };
    return callApi<SopComplianceAnalysis>('/analyze-sop-compliance', body);
};

export const askSopQuestion = async (sopFileContent: string, sopMimeType: string, question: string): Promise<{ answer: string; sopReference: string; }> => {
    const body = { sopFileContent, sopMimeType, question };
    return callApi<{ answer: string; sopReference: string; }>('/sop-qa', body);
};

export const generateTestCaseForProcedure = async (sopFileContent: string, sopMimeType: string, procedureText: string): Promise<{ case: string, expectedOutcome: string, sopReference: string }> => {
    const body = { sopFileContent, sopMimeType, procedureText };
    return callApi<{ case: string, expectedOutcome: string, sopReference: string }>('/sop-test-case', body);
};

export const compareProcedureToSop = async (sopFileContent: string, sopMimeType: string, userProcedureDescription: string): Promise<SopComparisonResult> => {
    const body = { sopFileContent, sopMimeType, userProcedureDescription };
    return callApi<SopComparisonResult>('/sop-compare', body);
};

export const generateCreativeIdeasForSop = async (sopFileContent: string, sopMimeType: string): Promise<{ idea: string; sopReference?: string; }[]> => {
    const body = { sopFileContent, sopMimeType };
    const result = await callApi<{ ideas: { idea: string; sopReference?: string; }[] }>('/sop-ideas', body);
    return result.ideas;
};

export const extractProceduresFromSop = async (sopFileContent: string, sopMimeType: string): Promise<ExtractedProcedure[]> => {
    const body = { sopFileContent, sopMimeType };
    const result = await callApi<{ procedures: ExtractedProcedure[] }>('/sop-extract-procedures', body);
    return result.procedures;
};

export const generateMindMapForProcedure = async (sopFileContent: string, sopMimeType: string, procedureTitle: string): Promise<MindMapNode> => {
    const body = { sopFileContent, sopMimeType, procedureTitle };
    return callApi<MindMapNode>('/sop-mindmap', body);
};
