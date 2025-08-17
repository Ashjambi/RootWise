import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { IncidentReport, AnalysisResult, IncidentStatus, Recommendation, RecommendationStatus, Attachment, PredictiveAnalysisResult, DeepDiveResult, KnowledgeCapsuleItem, ActiveView, GlobalCase, FiveWhysAnalysis } from '../types';
import { analyzeIncident, performPredictiveAnalysis, getDeepDiveQuestions, performDeepDive, suggestAlternativeAction, detectAndAnalyzeRecurrence, searchGlobalCases, generateImplementationPlan } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';
import Tag from './ui/Tag';
import WhatIfSimulatorModal from './WhatIfSimulatorModal';
import WorkflowTracker from './WorkflowTracker';
import ActionCard from './ActionCard';
import IncidentHistoryLog from './IncidentHistoryLog';


interface IncidentDetailProps {
  incident: IncidentReport;
  allIncidents: IncidentReport[];
  onUpdate: (incident: IncidentReport) => void;
  currentUser: string;
  onNavigate: (view: ActiveView, incidentId?: string | null) => void;
}

const AnalysisSection: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactElement<{ className?: string }> }> = ({ title, children, icon }) => (
    <Card className="mt-6">
        <div className="flex items-center mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-3 ml-4 shadow-lg shadow-blue-500/40 glass-icon">
              {React.cloneElement(icon, { className: 'h-6 w-6' })}
            </div>
            <h3 className="text-xl font-bold text-gray-800 font-cairo">{title}</h3>
        </div>
        <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed">{children}</div>
    </Card>
);

const FileIcon: React.FC<{ type: string }> = ({ type }) => {
    let icon;
    if (type.startsWith('image/')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    } else if (type === 'application/pdf') {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    } else if (type.startsWith('video/')) {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
    } else {
        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
    }
    return <span className="text-gray-400 ml-3 flex-shrink-0">{icon}</span>;
};


const IncidentDetail: React.FC<IncidentDetailProps> = ({ incident, allIncidents, onUpdate, currentUser, onNavigate }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  
  const [isGettingQuestions, setIsGettingQuestions] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [activeDeepDive, setActiveDeepDive] = useState<{ question: string; loading: boolean }>({ question: '', loading: false });
  const [similarLessons, setSimilarLessons] = useState<KnowledgeCapsuleItem[]>([]);
  const [isFindingLessons, setIsFindingLessons] = useState(false);
  const [isAnalysisMenuOpen, setIsAnalysisMenuOpen] = useState(false);
  const analysisMenuRef = useRef<HTMLDivElement>(null);
  const [isDeepDiveVisible, setIsDeepDiveVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'history'>('analysis');
  
  const hasStandardAnalysis = !!incident.analysis;

  const { recurrenceChainId } = incident;
  const chainInfo = useMemo(() => {
    if (!recurrenceChainId) {
      return { isChained: false, count: 0, head: null };
    }
    const chainMembers = allIncidents.filter(i => i.recurrenceChainId === recurrenceChainId);
    const head = allIncidents.find(i => i.id === recurrenceChainId) || null;
    return {
      isChained: true,
      count: chainMembers.length,
      head: head
    };
  }, [recurrenceChainId, allIncidents]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (analysisMenuRef.current && !analysisMenuRef.current.contains(event.target as Node)) {
            setIsAnalysisMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [analysisMenuRef]);


  const findSimilarKnowledge = () => {
      setIsFindingLessons(true);
      // This is a simplified simulation. A real implementation would call a Gemini function.
      const knowledgeBase = allIncidents
        .filter(inc => inc.analysis?.knowledgeCapsule && inc.id !== incident.id)
        .map(inc => ({
            incidentId: inc.id,
            incidentTitle: inc.title,
            capsule: inc.analysis!.knowledgeCapsule,
            date: inc.date,
        }));
      
      // Simple keyword matching for simulation
      const keywords = incident.title.split(' ').concat(incident.description.split(' '));
      const foundLessons = knowledgeBase.filter(lesson => 
          keywords.some(kw => lesson.incidentTitle.includes(kw) || lesson.capsule.includes(kw))
      );
      
      setTimeout(() => {
          setSimilarLessons(foundLessons);
          setIsFindingLessons(false);
      }, 1500);
  };
  
  useEffect(() => {
      if (!incident.analysis) {
          findSimilarKnowledge();
      }
  }, [incident.id]);


  const handleAnalyze = useCallback(async () => {
    if (!process.env.API_KEY) {
      setAnalysisError("تحليل الذكاء الاصطناعي معطل. مفتاح API_KEY غير مهيأ.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    onUpdate({ ...incident, status: IncidentStatus.Analyzing });
    try {
      // Step 1: Perform root cause analysis
      const analysisResult = await analyzeIncident(incident);
      // Step 2: Perform recurrence analysis
      const recurrenceResult = await detectAndAnalyzeRecurrence(incident, allIncidents);
      // Step 3: Update incident with both results
      onUpdate({
        ...incident,
        analysis: analysisResult,
        recurrenceInfo: recurrenceResult,
        status: IncidentStatus.PendingReview,
      });
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "حدث خطأ غير معروف أثناء التحليل الشامل.");
      onUpdate({ ...incident, status: IncidentStatus.Open });
    } finally {
      setIsAnalyzing(false);
    }
  }, [incident, onUpdate, allIncidents]);

  const handlePredictiveAnalysis = useCallback(async () => {
    setIsAnalysisMenuOpen(false);
    if (!process.env.API_KEY) {
      setPredictionError("التحليل التنبؤي معطل. مفتاح API_KEY غير مهيأ.");
      return;
    }
    setIsPredicting(true);
    setPredictionError(null);
    try {
      const predictiveResult = await performPredictiveAnalysis(incident);
      onUpdate({ ...incident, predictiveAnalysis: predictiveResult });
    } catch (e) {
      setPredictionError(e instanceof Error ? e.message : "حدث خطأ غير معروف.");
    } finally {
      setIsPredicting(false);
    }
  }, [incident, onUpdate]);

  const handleGetDeepDiveQuestions = useCallback(async () => {
    if (!incident.analysis) return;
    setIsGettingQuestions(true);
    setDeepDiveError(null);
    try {
        const questions = await getDeepDiveQuestions(incident.analysis);
        onUpdate({ ...incident, deepDive: { ...(incident.deepDive || { results: [] }), questions } });
    } catch (e) {
        setDeepDiveError(e instanceof Error ? e.message : "فشل في توليد أسئلة.");
    } finally {
        setIsGettingQuestions(false);
    }
  }, [incident, onUpdate]);

  useEffect(() => {
    if (isDeepDiveVisible && hasStandardAnalysis && (!incident.deepDive || !incident.deepDive.questions || incident.deepDive.questions.length === 0)) {
        if(!isGettingQuestions) {
             handleGetDeepDiveQuestions();
        }
    }
  }, [isDeepDiveVisible, hasStandardAnalysis, incident.deepDive, handleGetDeepDiveQuestions, isGettingQuestions]);

  const handlePerformDeepDive = useCallback(async (question: string) => {
    setActiveDeepDive({ question, loading: true });
    setDeepDiveError(null);
    try {
        const result = await performDeepDive(incident, question);
        const newDeepDiveResult = { question, result };
        
        const existingResults = incident.deepDive?.results || [];
        const newRecommendations = result.newRecommendations || [];

        onUpdate({ 
            ...incident,
            analysis: {
                ...incident.analysis!,
                recommendations: [...incident.analysis!.recommendations, ...newRecommendations]
            },
            deepDive: {
                ...incident.deepDive!,
                results: [...existingResults, newDeepDiveResult]
            }
        });
    } catch (e) {
        setDeepDiveError(e instanceof Error ? e.message : "فشل في إجراء التحليل العميق.");
    } finally {
        setActiveDeepDive({ question: '', loading: false });
    }
  }, [incident, onUpdate]);

  const handleSuggestAlternative = async (failedAction: Recommendation) => {
    setDeepDiveError(null);
    try {
        const newRecData = await suggestAlternativeAction(incident, failedAction);
        const newRecommendation: Recommendation = {
            ...newRecData,
            id: `ALT-REC-${Date.now()}`,
            status: RecommendationStatus.Proposed,
            updates: [],
            effectivenessNotes: `بديل للإجراء الفاشل: "${failedAction.action}"`,
            replacesActionId: failedAction.id,
        };

        onUpdate({
            ...incident,
            analysis: {
                ...incident.analysis!,
                recommendations: [...incident.analysis!.recommendations, newRecommendation]
            }
        });
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "فشل في اقتراح حل بديل.";
        setDeepDiveError(errorMessage);
    }
  };

  const handleUpdateAction = useCallback((updatedAction: Recommendation) => {
    if (!incident.analysis) return;
    const updatedRecommendations = incident.analysis.recommendations.map(rec => 
        rec.id === updatedAction.id ? updatedAction : rec
    );
    onUpdate({ ...incident, analysis: { ...incident.analysis, recommendations: updatedRecommendations } });
  }, [incident, onUpdate]);
  
  const handleGeneratePlanForAction = useCallback(async (recommendation: Recommendation) => {
    setDeepDiveError(null); 
    try {
        const relevantCases: GlobalCase[] = await searchGlobalCases(recommendation.action);
        const plan = await generateImplementationPlan(incident, recommendation, relevantCases);
        
        const updatedAction = { ...recommendation, implementationPlan: plan };
        handleUpdateAction(updatedAction);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "فشل في إنشاء خطة التنفيذ.";
        setDeepDiveError(errorMessage); // Reuse error state for user feedback
    }
}, [incident, handleUpdateAction]);


  const hasPredictiveAnalysis = !!incident.predictiveAnalysis;

  const deepDiveQuestions = incident.deepDive?.questions || [];
  const deepDiveResults = incident.deepDive?.results || [];
  
  const anyLoading = isAnalyzing || isPredicting;

  const orderedRecommendations = useMemo(() => {
    if (!incident.analysis?.recommendations) return [];
    
    const recommendations = incident.analysis.recommendations;
    const recommendationMap = new Map(recommendations.map(r => [r.id, r]));
    const alternativesMap = new Map<string, Recommendation[]>();
    const topLevelRecs: Recommendation[] = [];

    // Separate top-level recs from alternatives
    for (const rec of recommendations) {
        if (rec.replacesActionId && recommendationMap.has(rec.replacesActionId)) {
            if (!alternativesMap.has(rec.replacesActionId)) {
                alternativesMap.set(rec.replacesActionId, []);
            }
            const alternatives = alternativesMap.get(rec.replacesActionId);
            if(alternatives) {
                alternatives.push(rec);
            }
        } else {
            topLevelRecs.push(rec);
        }
    }

    const result: Recommendation[] = [];
    for (const rec of topLevelRecs) {
        result.push(rec);
        if (alternativesMap.has(rec.id)) {
            result.push(...(alternativesMap.get(rec.id) || []));
        }
    }
    return result;

}, [incident.analysis?.recommendations]);

  return (
    <>
    <div className="max-w-4xl mx-auto">
      {chainInfo.isChained && (
        <Card className="!p-4 mb-6 bg-yellow-400/10 border-2 border-yellow-400/30 shadow-lg">
            <div className="flex items-center gap-x-4">
                <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 4.875 4.875 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.092 1.21-.138 2.43-.138 3.662a4.875 4.875 0 007.466 4.472.5.5 0 00.568 0A4.875 4.875 0 0019.5 12z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-yellow-900">حادث متكرر</h3>
                    <p className="text-sm text-yellow-800">
                      هذا الحادث جزء من سلسلة متكررة. 
                      <button onClick={() => onNavigate('my_actions')} className="text-blue-600 hover:underline font-semibold mx-1">
                        انتقل إلى "كل الإجراءات"
                      </button> 
                      لتحليل نمط التكرار واقتراح حلول استراتيجية.
                    </p>
                </div>
            </div>
        </Card>
      )}
      <Card>
        <div className="mb-6">
            <WorkflowTracker currentStatus={incident.status} />
        </div>
        <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
                <h2 className="text-3xl font-extrabold text-gray-900 font-cairo">{incident.title}</h2>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>{new Date(incident.date).toLocaleString('ar-EG')}</span>
                    <span className="font-semibold">{incident.department}</span>
                </div>
                <div className="mt-3 flex gap-2">
                    <Tag type={incident.severity} />
                    <Tag type={incident.status} />
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                 {!hasStandardAnalysis && (
                    <Button onClick={handleAnalyze} isLoading={isAnalyzing} disabled={isAnalyzing || incident.status === IncidentStatus.Analyzing}>
                        {incident.status === IncidentStatus.Analyzing ? 'جاري التحليل...' : 'تحليل السبب الجذري'}
                    </Button>
                )}
                <div className="relative inline-block text-left" ref={analysisMenuRef}>
                    <Button 
                        onClick={() => setIsAnalysisMenuOpen(prev => !prev)} 
                        variant="secondary" 
                        disabled={anyLoading}
                        isLoading={anyLoading}
                    >
                        تحليل ذكي
                        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </Button>
                     {isAnalysisMenuOpen && (
                        <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white/80 backdrop-blur-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                                <button onClick={() => { setIsAnalysisMenuOpen(false); setIsSimulatorOpen(true); }} disabled={anyLoading} className="text-gray-700 block w-full text-right px-4 py-2 text-sm hover:bg-gray-100/50 disabled:opacity-50" role="menuitem">محاكاة "ماذا لو؟"</button>
                                <button onClick={handlePredictiveAnalysis} disabled={anyLoading || !hasStandardAnalysis || hasPredictiveAnalysis} className="text-gray-700 block w-full text-right px-4 py-2 text-sm hover:bg-gray-100/50 disabled:opacity-50" role="menuitem">
                                    {hasPredictiveAnalysis ? 'تم التحليل التنبؤي ✓' : 'تحليل تنبؤي للمخاطر'}
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsAnalysisMenuOpen(false);
                                        setIsDeepDiveVisible(true);
                                    }} 
                                    disabled={anyLoading || !hasStandardAnalysis} 
                                    className="text-gray-700 block w-full text-right px-4 py-2 text-sm hover:bg-gray-100/50 disabled:opacity-50" 
                                    role="menuitem"
                                >
                                    التحليل الأعمق (Deep Dive)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="border-t border-gray-900/10 mt-6 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2 font-cairo">ملخص الحادث</h3>
            <p className="text-gray-600 mb-4">{incident.description}</p>
            <div className="space-y-2 text-sm">
                <p><strong className="font-semibold text-gray-700">الإجراء الفوري:</strong> {incident.immediateAction}</p>
                <p><strong className="font-semibold text-gray-700">الأفراد المعنيون:</strong> {incident.involvedPersonnel}</p>
            </div>
        </div>

        {incident.attachments && incident.attachments.length > 0 && (
            <div className="border-t border-gray-900/10 mt-6 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 font-cairo">المرفقات</h3>
                <ul role="list" className="border border-gray-200/80 rounded-md divide-y divide-gray-200/80">
                    {incident.attachments.map((file, index) => (
                        <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm hover:bg-gray-500/5 transition-colors">
                            <div className="w-0 flex-1 flex items-center">
                                <FileIcon type={file.type} />
                                <span className="mr-3 flex-1 w-0 truncate" title={file.name}>
                                    {file.name}
                                </span>
                            </div>
                            <div className="ml-4 flex-shrink-0 flex items-center gap-x-4">
                                <span className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                <a href="#" className="font-medium text-blue-600 hover:text-blue-500" onClick={(e) => e.preventDefault()}>
                                    تحميل
                                </a>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </Card>

      <div className="border-b border-gray-200/80 my-6">
        <nav className="-mb-px flex space-x-6 rtl:space-x-reverse" aria-label="Tabs">
            <button
                onClick={() => setActiveTab('analysis')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-base transition-colors duration-200 focus:outline-none ${activeTab === 'analysis' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
                التحليل الشامل
            </button>
            <button
                onClick={() => setActiveTab('history')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-base transition-colors duration-200 focus:outline-none ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
                سجل الحادث
            </button>
        </nav>
      </div>
      
      {analysisError && <div className="mt-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{analysisError}</div>}
      {predictionError && <div className="mt-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{predictionError}</div>}
      {deepDiveError && <div className="mt-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{deepDiveError}</div>}
      
      {activeTab === 'analysis' && (
        <div>
            {isDeepDiveVisible && hasStandardAnalysis && (
                <AnalysisSection title="التحليل الأعمق (Deep Dive)" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" /></svg>}>
                    {isGettingQuestions ? (
                        <div className="text-center p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p className="mt-2 text-gray-600">جاري توليد أسئلة للتحليل العميق...</p></div>
                    ) : deepDiveQuestions.length > 0 ? (
                        <div className="space-y-4 mt-4">
                            <h4 className="font-bold text-gray-800">اختر سؤالاً للتعمق فيه:</h4>
                            {deepDiveQuestions.map((q, i) => {
                                const resultForQuestion = deepDiveResults.find(r => r.question === q);
                                const isAnswered = !!resultForQuestion;
                                const isLoading = activeDeepDive.loading && activeDeepDive.question === q;
                                
                                return (
                                    <div key={i} className="p-3 bg-gray-500/5 rounded-lg transition-all">
                                    <Button 
                                        variant='secondary' 
                                        onClick={() => handlePerformDeepDive(q)} 
                                        disabled={isAnswered || activeDeepDive.loading} 
                                        isLoading={isLoading} 
                                        className="w-full justify-start text-right"
                                    >
                                        {q} {isAnswered && ' (تمت الإجابة ✓)'}
                                    </Button>
                                    
                                    {resultForQuestion && (
                                        <div className="mt-4 p-4 bg-blue-500/5 border-l-4 border-blue-500/50">
                                            <p className="font-semibold text-gray-800">الرؤية المكتشفة:</p>
                                            <p className="mt-2 text-gray-800">{resultForQuestion.result.insight}</p>
                                            {resultForQuestion.result.newRecommendations && resultForQuestion.result.newRecommendations.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-blue-900/10">
                                                    <p className="font-semibold text-gray-800 text-sm">توصيات جديدة نتجت عن هذا التحليل:</p>
                                                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-700">
                                                        {resultForQuestion.result.newRecommendations.map((rec, recIndex) => (
                                                            <li key={recIndex}>{rec.action}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">لم يتمكن الذكاء الاصطناعي من توليد أسئلة. حاول مرة أخرى.</p>
                    )}
                    <div className="mt-6 text-center">
                        <Button variant="secondary" onClick={() => setIsDeepDiveVisible(false)}>إغلاق</Button>
                    </div>
                </AnalysisSection>
            )}

            {!hasStandardAnalysis && (
                <Card className="mt-6">
                    <h3 className="text-xl font-bold text-gray-800 font-cairo mb-4 flex items-center">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl p-3 ml-4 shadow-lg shadow-purple-500/40 glass-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6.253v11.494m-9-5.747h18" /></svg>
                        </div>
                        محرك المعرفة الذكي
                    </h3>
                    {isFindingLessons ? (
                        <div className="text-center p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p className="mt-2 text-gray-600">جاري البحث عن دروس مشابهة...</p></div>
                    ) : similarLessons.length > 0 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-700">وجدنا الدروس التالية من حوادث سابقة قد تكون ذات صلة:</p>
                            {similarLessons.map(lesson => (
                                <div key={lesson.incidentId} className="p-4 bg-purple-400/5 border-l-4 border-purple-500/30 rounded-r-lg">
                                    <p className="italic text-gray-800">"{lesson.capsule}"</p>
                                    <Button variant="secondary" className="py-1 px-3 text-xs mt-2" onClick={() => onNavigate('incident', lesson.incidentId)}>
                                        عرض تفاصيل الحادث {lesson.incidentId}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">لم يتم العثور على دروس مشابهة في قاعدة المعرفة.</p>
                    )}
                </Card>
            )}

            {hasPredictiveAnalysis && (
                <div className="mt-4">
                    <AnalysisSection title="التحليل التنبؤي للمخاطر" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691L7.985 5.644m12.038 0L16.023 9.348" /></svg>}>
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>المؤثرات الخفية (Weak Signals)</h4>
                                <div className="space-y-3">
                                {incident.predictiveAnalysis!.weakSignals.map((item, i) => (
                                    <div key={i} className="p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                                    <p className="font-semibold text-yellow-900">{item.signal}</p>
                                    <p className="text-sm text-yellow-800 mt-1">{item.implication}</p>
                                    </div>
                                ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.142 16.223a5.5 5.5 0 11-10.284 0 5.5 5.5 0 0110.284 0zM12 10.25V13.5M12 16.75h.01" /></svg>أنماط الانحراف عن الإجراءات</h4>
                                <div className="space-y-3">
                                {incident.predictiveAnalysis!.sopDeviationPatterns.map((item, i) => (
                                    <div key={i} className="p-3 bg-orange-400/10 rounded-lg border border-orange-400/20">
                                    <p className="font-semibold text-orange-900">{item.pattern}</p>
                                    <p className="text-sm text-orange-800 mt-1">{item.risk}</p>
                                    </div>
                                ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7.5a6.472 6.472 0 00-3.5-1M9.5 6.5a6.472 6.472 0 01-3.5 1m-4 5a.48.48 0 00.477.521 5.513 5.513 0 014.046 0 .48.48 0 00.477-.521 5.525 5.525 0 00-5-5.023.48.48 0 00-.477.522 5.513 5.513 0 010 4.002zM18.5 12a.48.48 0 00.477.521 5.513 5.513 0 014.046 0 .48.48 0 00.477-.521 5.525 5.525 0 00-5-5.023.48.48 0 00-.477.522 5.513 5.513 0 010 4.002z" /></svg>رؤى تنبؤية</h4>
                                <div className="space-y-3">
                                {incident.predictiveAnalysis!.predictiveInsights.map((item, i) => (
                                    <div key={i} className="p-4 bg-purple-400/10 rounded-lg border border-purple-400/20">
                                    <p className="font-bold text-purple-900">التنبؤ: {item.prediction}</p>
                                    <p className="text-sm text-purple-800 mt-2"><strong className='font-semibold'>الأساس المنطقي:</strong> {item.justification}</p>
                                    <p className="text-sm text-purple-800 mt-2 bg-purple-200/40 p-2 rounded-md"><strong className='font-semibold'>التوصية الاستباقية:</strong> {item.proactiveRecommendation}</p>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>
                    </AnalysisSection>
                </div>
            )}

            {hasStandardAnalysis && (
                <>
                    <AnalysisSection title="الإجراءات التصحيحية والوقائية (CAPA)" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}>
                        <div className="space-y-4">
                            {orderedRecommendations.length > 0 ? orderedRecommendations.map((rec) => <ActionCard key={rec.id} action={rec} onUpdate={handleUpdateAction} currentUser={currentUser} onSuggestAlternative={handleSuggestAlternative} onGeneratePlan={handleGeneratePlanForAction} viewContext="detail" incidentDate={incident.date} />) : <p>لا توجد توصيات بعد.</p>}
                        </div>
                    </AnalysisSection>

                    <AnalysisSection title="تحليل السبب الجذري" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}>
                        <div>
                            <h4 className="font-bold text-lg text-gray-900">{incident.analysis.rootCause.cause}</h4>
                            <p>{incident.analysis.rootCause.description}</p>
                            <h5 className="font-semibold mt-4 mb-2">العوامل المساهمة:</h5>
                            <ul className="list-disc list-inside space-y-1 pr-4">
                                {incident.analysis.rootCause.contributingFactors.map((factor, i) => <li key={i}>{factor}</li>)}
                            </ul>
                        </div>
                    </AnalysisSection>

                    <AnalysisSection title="تحليل فجوة إجراءات التشغيل القياسية" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}>
                        <p><strong className="font-semibold">الإجراء المتوقع:</strong> {incident.analysis.sopGap.expectedProcedure}</p>
                        <p><strong className="font-semibold">الإجراء الفعلي:</strong> {incident.analysis.sopGap.actualAction}</p>
                        <p><strong className="font-semibold text-red-600">الفجوة:</strong> {incident.analysis.sopGap.gapAnalysis}</p>
                    </AnalysisSection>

                    <AnalysisSection title="شجرة الأدوار" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}>
                        <div className="space-y-4">
                            {incident.analysis.roleTree.map((role, i) => (
                                <div key={i} className="border-r-4 border-gray-300/70 pr-4">
                                    <p className="font-bold text-gray-800">{role.name}</p>
                                    <p className="text-sm"><strong className="font-medium text-gray-600">المسؤولية:</strong> {role.responsibility}</p>
                                    <p className="text-sm"><strong className="font-medium text-gray-600">المساهمة في النتيجة:</strong> {role.contribution}</p>
                                </div>
                            ))}
                        </div>
                    </AnalysisSection>
                    
                    <AnalysisSection title="كبسولة معرفية" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.747h18" /></svg>}>
                        <p className="italic text-lg text-gray-800 bg-gray-900/5 p-4 rounded-lg">{incident.analysis.knowledgeCapsule}</p>
                    </AnalysisSection>
                </>
            )}
        </div>
      )}

      {activeTab === 'history' && (
          <IncidentHistoryLog incident={incident} />
      )}
    </div>
    {isSimulatorOpen && (
        <WhatIfSimulatorModal
            incident={incident}
            onClose={() => setIsSimulatorOpen(false)}
            onUpdate={onUpdate}
        />
    )}
    </>
  );
};

export default IncidentDetail;