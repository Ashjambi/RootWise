

export enum IncidentSeverity {
  Low = 'منخفض',
  Medium = 'متوسط',
  High = 'مرتفع',
  Critical = 'حرج',
}

export enum IncidentStatus {
  Open = 'مفتوح',
  Analyzing = 'قيد التحليل',
  PendingReview = 'بانتظار المراجعة',
  SolutionImplemented = 'قيد التنفيذ',
  Resolved = 'تم الحل',
  Archived = 'مؤرشف',
}

export enum RecommendationCategory {
    Procedural = 'إجرائي',
    Organizational = 'تنظيمي',
    Training = 'تدريبي',
    Technical = 'تقني',
    Simulation = 'ناتج عن محاكاة',
    Strategic = 'استراتيجي'
}

export enum RecommendationStatus {
    Proposed = 'مقترح',
    InProgress = 'قيد التنفيذ',
    Implemented = 'تم التطبيق',
    Verified = 'تم التحقق من الفعالية',
    Ineffective = 'غير فعال'
}

export interface RecommendationUpdate {
    date: string;
    author: string;
    comment: string;
}

export interface Recommendation {
    id: string;
    actionType: 'تصحيحي' | 'وقائي';
    category: RecommendationCategory;
    action: string;
    impact: string;
    rationale: string;
    ease: 'سهل' | 'متوسط' | 'صعب' | 'يُحدد لاحقًا';
    cost: 'منخفض' | 'متوسط' | 'مرتفع' | 'يُحدد لاحقًا';
    timeframe: string;
    status: RecommendationStatus;
    effectivenessNotes?: string;
    owner?: string;
    dueDate?: string;
    updates?: RecommendationUpdate[];
    replacesActionId?: string;
    implementationPlan?: {
        tools: { name: string; description: string }[];
        scenario: string;
    } | null;
}

export interface ActionItem extends Recommendation {
    incidentId: string;
    incidentTitle: string;
    incidentDate: string;
    isMeta?: boolean;
}


export interface SopGap {
    expectedProcedure: string;
    actualAction: string;
    gapAnalysis: string;
    sopReference?: string;
}

export interface Role {
    name: string;
    responsibility: string;

    contribution: string;
}

export interface RootCause {
    cause: string;
    description: string;
    contributingFactors: string[];
}

export interface AnalysisResult {
    rootCause: RootCause;
    sopGap: SopGap;
    roleTree: Role[];
    recommendations: Recommendation[];
    knowledgeCapsule: string;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
}

export interface PredictiveInsight {
    prediction: string;
    justification: string;
    proactiveRecommendation: string;
}

export interface PredictiveAnalysisResult {
    weakSignals: { signal: string; implication: string }[];
    sopDeviationPatterns: { pattern: string; risk: string }[];
    predictiveInsights: PredictiveInsight[];
}

export interface DeepDiveQuestion {
    question: string;
}

export interface DeepDiveResult {
    insight: string;
    newRecommendations: Recommendation[];
}

export enum RecurrenceType {
    Total = 'تكرار كلي',
    Partial = 'تكرار جزئي',
    PoorExecution = 'ضعف تنفيذ',
}

export interface RecurrenceAnalysis {
    type: RecurrenceType;
    explanation: string;
    personnelAnalysis: string;
    miniRcaSuggestion: string;
    correctionFailureReason: string;
    higherLevelCorrection: string;
    failurePatternAnalysis?: string;
    metaRecommendations?: Recommendation[];
}

export interface RecurrenceInfo {
    isRecurrent: boolean;
    linkedIncidents: { id: string; title: string; date: string; }[];
    recurrenceCount: number;
    analysis?: RecurrenceAnalysis | null;
}

export interface FiveWhysEntry {
    why: string;
    answer: string;
}

export interface FiveWhysAnalysis {
    problemStatement: string;
    whys: FiveWhysEntry[];
    finalRootCause: string;
}

export interface FishboneAnalysis {
  problem: string;
  causes: {
    manpower: string[];
    methods: string[];
    machines: string[];
    materials: string[];
    measurement: string[];
    motherNature: string[];
  };
}

export interface ParetoAnalysisItem {
  cause: string;
  frequency: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface ParetoAnalysis {
  items: ParetoAnalysisItem[];
}

export interface FmeaAnalysisItem {
  failureMode: string;
  failureEffect: string;
  severity: number;
  potentialCause: string;
  occurrence: number;
  detection: number;
  rpn: number;
  recommendedAction: string;
}

export interface FmeaAnalysis {
  items: FmeaAnalysisItem[];
}

export interface FaultTreeEvent {
  name: string;
  gate?: 'AND' | 'OR';
  children?: FaultTreeEvent[];
}

export interface FaultTreeAnalysis {
  topEvent: FaultTreeEvent;
}

export interface PokaYokeSuggestion {
  suggestion: string;
  explanation: string;
  implementationType: 'Control' | 'Warning' | 'Shutdown';
}

export interface PokaYokeAnalysis {
  items: PokaYokeSuggestion[];
}

export interface DmaicAnalysis {
  define: string;
  measure: string;
  analyze: string;
  improve: string;
  control: string;
}

export interface SopComplianceStep {
  procedureStep: string;
  sopReference?: string;
  actualAction: string;
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'Partially-Compliant' | 'Not-Applicable';
  deviationAnalysis: string;
  riskAssessment: string;
  recommendedCorrectiveAction: string;
  recommendedPreventiveAction: string;
}

export interface SopComplianceAnalysis {
  overallComplianceScore: number;
  summary: string;
  steps: SopComplianceStep[];
}

export interface IncidentReport {
  id: string;
  title: string;
  description: string;
  date: string;
  department: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  immediateAction: string;
  involvedPersonnel: string;
  analysis?: AnalysisResult;
  attachments?: Attachment[];
  predictiveAnalysis?: PredictiveAnalysisResult;
  recurrenceInfo?: RecurrenceInfo;
  recurrenceChainId?: string; // ID of the oldest incident in a recurring chain
  deepDive?: {
      questions: string[];
      results: { question: string; result: DeepDiveResult }[];
  };
  fiveWhysAnalysis?: FiveWhysAnalysis;
  fishboneAnalysis?: FishboneAnalysis;
  fmeaAnalysis?: FmeaAnalysis;
  faultTreeAnalysis?: FaultTreeAnalysis;
  pokaYokeAnalysis?: PokaYokeAnalysis;
  dmaicAnalysis?: DmaicAnalysis;
  sopComplianceAnalysis?: SopComplianceAnalysis;
  sopDocument?: {
    name: string;
    content?: string; // base64 encoded
    mimeType: string;
  };
}

export interface GlobalCase {
    industry: string;
    title: string;
    summary: string;
    lesson: string;
    source: string;
}

export interface SimulatedAction {
    action: string;
    rationale: string;
}

export interface SystemicInsight {
    title: string;
    description: string;
    supportingIncidents: string[];
    proactiveRecommendation: string;
}

export interface KnowledgeCapsuleItem {
    incidentId: string;
    incidentTitle: string;
    capsule: string;
    date: string;
}

export interface EarlyWarning {
    prediction: string;
    probability: number;
    reasoning: string;
    linkedIncidentId: string;
}

export interface ManagerialInsight {
    title: string;
    recommendation: string;
    rationale: string;
    priority: 'عاجل' | 'هام' | 'استراتيجي';
}

export interface KpiImpact {
    issue: string;
    kpi: string;
    impactStatement: string;
    reasoning: string;
}

export interface DashboardBriefing {
  earlyWarnings: EarlyWarning[];
  kpiImpacts: KpiImpact[];
}

export interface TrainingModule {
    title: string;
    keyPoints: string[];
    summary: string;
    quizQuestion: {
        question: string;
        answer: string;
    };
}

export interface CustomFeature {
  id: 'analysis' | 'proactive' | 'decision' | 'learning';
  title: string;
  enabled: boolean;
}

export interface AppSettings {
  appName: string;
  logo: string | null;
  features: CustomFeature[];
}

export interface SopComparisonResult {
  comparisonSummary: string;
  compliances: {
    description: string;
    sopReference: string;
  }[];
  deviations: {
    description: string;
    expectedProcedure: string;
    sopReference: string;
  }[];
  improvementSuggestion: string;
}

export interface ExtractedProcedure {
  title: string;
}

export interface MindMapNode {
  topic: string;
  children?: MindMapNode[];
}

export type ActiveView = 'dashboard' | 'incident' | 'global_cases' | 'knowledge_base' | 'reports' | 'my_actions' | 'sop_assistant' | 'risk_dashboard' | 'about' | 'settings' | 'known_tools_analysis';