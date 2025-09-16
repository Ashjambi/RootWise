import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { IncidentReport, AnalysisResult, IncidentStatus, Recommendation, RecommendationStatus, Attachment, PredictiveAnalysisResult, DeepDiveResult, KnowledgeCapsuleItem, ActiveView, GlobalCase, FiveWhysAnalysis, RecurrenceAnalysis, RecurrenceType } from '../types';
import { analyzeIncident, performPredictiveAnalysis, getDeepDiveQuestions, performDeepDive, suggestAlternativeAction, detectAndAnalyzeRecurrence, searchGlobalCases, generateImplementationPlan, performSopComplianceAnalysis, generateMetaRecommendations } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';
import Tag from './ui/Tag';
import WhatIfSimulatorModal from './WhatIfSimulatorModal';
import WorkflowTracker from './WorkflowTracker';
import ActionCard from './ActionCard';
import IncidentHistoryLog from './IncidentHistoryLog';
import SopComplianceView from './SopComplianceView';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface IncidentDetailProps {
  incident: IncidentReport;
  allIncidents: IncidentReport[];
  onUpdate: (incident: IncidentReport) => void;
  currentUser: string;
  onNavigate: (view: ActiveView, incidentId?: string | null) => void;
}

const CaseStudyModal: React.FC<{ incident: IncidentReport; onClose: () => void; }> = ({ incident, onClose }) => {
    const caseStudyRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportToPdf = async () => {
        if (!caseStudyRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(caseStudyRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: caseStudyRef.current.scrollWidth,
                windowHeight: caseStudyRef.current.scrollHeight,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = position - pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`RootWise_Case_Study_${incident.id}.pdf`);
        } catch (error) {
            console.error("خطأ في تصدير PDF:", error);
        } finally {
            setIsExporting(false);
        }
    };
    
    const Section: React.FC<{title: string; icon: JSX.Element; children: React.ReactNode}> = ({title, icon, children}) => (
        <div className="mt-8">
            <div className="flex items-center mb-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 font-cairo">{title}</h3>
            </div>
            <div className="pl-11 prose prose-sm max-w-none text-gray-700">{children}</div>
        </div>
    );

    if (!incident.analysis) {
        return (
             <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
                <div className="bg-white/80 rounded-2xl shadow-2xl w-full max-w-lg text-center p-8" onClick={e => e.stopPropagation()}>
                    <h2 className="text-xl font-bold">ميزة غير متوفرة</h2>
                    <p className="mt-2 text-gray-600">لا يمكن إنشاء دراسة حالة إلا للحوادث التي تم تحليلها.</p>
                    <Button onClick={onClose} variant="secondary" className="mt-6">إغلاق</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] border border-white/80 flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-900/10 flex justify-between items-center flex-shrink-0 bg-white/70 rounded-t-2xl">
                    <h2 className="text-lg font-bold text-gray-900 font-cairo">عرض دراسة الحالة</h2>
                    <div className="flex items-center gap-3">
                        <Button onClick={handleExportToPdf} isLoading={isExporting} variant="secondary" className="py-1.5 px-4 text-sm">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                           تصدير PDF
                        </Button>
                        <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-500/10" aria-label="إغلاق"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </header>
                <main className="p-2 sm:p-4 md:p-6 overflow-y-auto flex-grow">
                    <div ref={caseStudyRef} className="p-6 sm:p-8 md:p-10 bg-white shadow-lg rounded-lg">
                        <p className="text-sm font-semibold text-blue-600 font-cairo">دراسة حالة في تحليل الأسباب الجذرية</p>
                        <h1 className="text-3xl font-extrabold text-gray-900 mt-2 font-cairo">{incident.title}</h1>
                        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 border-y py-3 border-gray-200">
                           <span><strong>التاريخ:</strong> {new Date(incident.date).toLocaleDateString('ar-EG')}</span>
                           <span><strong>القسم:</strong> {incident.department}</span>
                           <div className="flex gap-2"><Tag type={incident.severity} /><Tag type={incident.status} /></div>
                        </div>

                        <Section title="1. ملخص تنفيذي" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}>
                            <p className="italic text-lg text-gray-800 bg-gray-900/5 p-4 rounded-lg mt-2">{incident.analysis.knowledgeCapsule}</p>
                        </Section>

                        <Section title="2. خلفية الحادث" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>}>
                            <h4 className="font-semibold text-gray-800">وصف ما حدث:</h4>
                            <p>{incident.description}</p>
                            <h4 className="font-semibold text-gray-800 mt-3">الإجراء الفوري المتخذ:</h4>
                            <p>{incident.immediateAction}</p>
                        </Section>

                        <Section title="3. تحليل المشكلة" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}>
                            <div className="space-y-4">
                                <div><h4 className="font-semibold text-gray-800">السبب الجذري: {incident.analysis.rootCause.cause}</h4><p>{incident.analysis.rootCause.description}</p></div>
                                <div><h4 className="font-semibold text-gray-800">فجوة الإجراءات (SOP Gap):</h4><p className="text-red-600">{incident.analysis.sopGap.gapAnalysis}</p></div>
                                <div><h4 className="font-semibold text-gray-800">العوامل المساهمة:</h4><ul className="list-disc pl-5"> {incident.analysis.rootCause.contributingFactors.map((f,i) => <li key={i}>{f}</li>)}</ul></div>
                            </div>
                        </Section>
                        
                        <Section title="4. الإجراءات التصحيحية والوقائية" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                            <div className="overflow-x-auto not-prose mt-2">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-100"><tr className="text-right"><th className="p-2 font-semibold">الإجراء</th><th className="p-2 font-semibold">الفئة</th><th className="p-2 font-semibold">الحالة</th></tr></thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {incident.analysis.recommendations.map(rec => (
                                            <tr key={rec.id}><td className="p-2 align-top">{rec.action}</td><td className="p-2 align-top">{rec.category}</td><td className="p-2 align-top"><Tag type={rec.status}/></td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>

                        <div className="mt-10 pt-4 text-center border-t border-dashed">
                            <p className="text-xs text-gray-500">تم إنشاء التقرير بواسطة RootWise - {new Date().getFullYear()}</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};


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
    } else if (type === 'application/pdf' || type.includes('word') || type.includes('text')) {
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
  const [isAnalysisMenuOpen, setIsAnalysisMenuOpen] = useState(false);
  const analysisMenuRef = useRef<HTMLDivElement>(null);
  const [isDeepDiveVisible, setIsDeepDiveVisible] = useState(false);
  const [isCaseStudyVisible, setIsCaseStudyVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'history'>('analysis');
  const [sopFile, setSopFile] = useState<File | null>(null);
  const [isUnifiedAnalyzing, setIsUnifiedAnalyzing] = useState(false);
  const [isAnalyzingRecurrence, setIsAnalyzingRecurrence] = useState(false);
  
  const hasRcaAnalysis = !!incident.analysis;


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

  const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve({ data: base64Data, mimeType: file.type });
        };
        reader.onerror = error => reject(error);
    });
  };

  const handlePerformUnifiedAnalysis = useCallback(async () => {
    if (!sopFile) {
        setAnalysisError('يرجى اختيار ملف الدليل الرسمي للمتابعة.');
        return;
    }
    setIsUnifiedAnalyzing(true);
    setAnalysisError(null);
    
    try {
        onUpdate({ ...incident, status: IncidentStatus.Analyzing });

        const { data, mimeType } = await fileToBase64(sopFile);
        
        // Step 1: Perform Compliance Analysis
        const sopAnalysisResult = await performSopComplianceAnalysis(incident, data, mimeType);

        // Step 2: Create an intermediate incident object that includes the compliance result for the next steps
        const incidentForNextAnalyses: IncidentReport = { 
            ...incident, 
            sopComplianceAnalysis: sopAnalysisResult,
            sopDocument: { name: sopFile.name, content: data, mimeType: mimeType }
        };

        // Step 3: Perform main analysis and recurrence detection using the enriched incident data
        const analysisResult = await analyzeIncident(incidentForNextAnalyses);
        const recurrenceResult = await detectAndAnalyzeRecurrence(incidentForNextAnalyses, allIncidents);
        
        // Step 4: Prepare the final update object, ensuring all new data is included and sensitive data is removed.
        const { content, ...sopDocumentWithoutContent } = incidentForNextAnalyses.sopDocument!;

        const finalIncidentUpdate: IncidentReport = {
            ...incident, // Start with the original incident to preserve all its existing properties
            sopComplianceAnalysis: sopAnalysisResult, // Add the new compliance data
            sopDocument: sopDocumentWithoutContent, // Add document info (without base64 content)
            analysis: analysisResult, // Add the new main analysis result
            recurrenceInfo: recurrenceResult, // Add the new recurrence info
            status: IncidentStatus.PendingReview, // Set the final status
        };

        onUpdate(finalIncidentUpdate);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "حدث خطأ غير متوقع أثناء التحليل الموحد.";
        setAnalysisError(errorMessage);
        onUpdate({ ...incident, status: IncidentStatus.Open });
    } finally {
        setIsUnifiedAnalyzing(false);
    }
  }, [incident, onUpdate, allIncidents, sopFile]);


  const handlePredictiveAnalysis = useCallback(async () => {
    setIsAnalysisMenuOpen(false);
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

    const handleStrategicRecurrenceAnalysis = useCallback(async () => {
        setIsAnalyzingRecurrence(true);
        setAnalysisError(null);
    
        try {
            // Step 1: Detect and analyze recurrence
            const recurrenceInfo = await detectAndAnalyzeRecurrence(incident, allIncidents);
            
            // Create an intermediate update to show the first part of the analysis immediately
            let intermediateIncident = { ...incident, recurrenceInfo };
            onUpdate(intermediateIncident);
    
            if (!recurrenceInfo.isRecurrent) {
                // If not recurrent, the process is done.
                setIsAnalyzingRecurrence(false);
                return;
            }
    
            // Step 2: Gather incidents for meta-analysis
            const recurringIncidentIds = new Set([intermediateIncident.id, ...recurrenceInfo.linkedIncidents.map(i => i.id)]);
            const recurringIncidents = allIncidents.filter(inc => recurringIncidentIds.has(inc.id));
            
            if (recurringIncidents.length < 2) {
                // Not enough data for meta-analysis, so the process is done.
                setIsAnalyzingRecurrence(false);
                return;
            }
    
            // Step 3: Generate meta-recommendations (the second, longer step)
            const { failurePatternAnalysis, metaRecommendations } = await generateMetaRecommendations(recurringIncidents);
            
            const newMetaRecs: Recommendation[] = metaRecommendations.map((rec, index) => ({
                ...rec,
                id: `META-REC-${Date.now()}-${index}`,
                status: RecommendationStatus.Proposed,
                updates: []
            }));
    
            // Step 4: Combine results and create the final update
            const finalAnalysis: RecurrenceAnalysis = {
                ...(intermediateIncident.recurrenceInfo?.analysis!),
                failurePatternAnalysis,
                metaRecommendations: newMetaRecs,
            };
            
            const finalIncidentUpdate = {
                ...intermediateIncident,
                recurrenceInfo: {
                    ...intermediateIncident.recurrenceInfo!,
                    analysis: finalAnalysis,
                }
            };
    
            onUpdate(finalIncidentUpdate); // Second and final update with all data
    
        } catch (e) {
            setAnalysisError(e instanceof Error ? e.message : "حدث خطأ أثناء تحليل التكرار الاستراتيجي.");
        } finally {
            setIsAnalyzingRecurrence(false);
        }
    }, [incident, allIncidents, onUpdate]);

  const handleSopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          // Increased file size limit to 13MB per user request.
          if (file.size > 13 * 1024 * 1024) { 
              setAnalysisError('حجم الملف كبير جدًا. يرجى اختيار ملف أصغر من 13 ميجابايت.');
              setSopFile(null);
              // Clear the file input
              e.target.value = '';
              return;
          }
          setSopFile(file);
          setAnalysisError(null);
      }
  };

  const handleRemoveSopFile = () => {
      setSopFile(null);
  };

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
    if (isDeepDiveVisible && hasRcaAnalysis && (!incident.deepDive || !incident.deepDive.questions || incident.deepDive.questions.length === 0)) {
        if(!isGettingQuestions) {
             handleGetDeepDiveQuestions();
        }
    }
  }, [isDeepDiveVisible, hasRcaAnalysis, incident.deepDive, handleGetDeepDiveQuestions, isGettingQuestions]);

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

    const handleUpdateMetaAction = useCallback((updatedAction: Recommendation) => {
        if (!incident.recurrenceInfo?.analysis?.metaRecommendations) return;
        
        // Find the head of the chain to update. The current incident might not be the head.
        const chainId = incident.recurrenceChainId || incident.id;
        const headIncident = allIncidents.find(i => i.id === chainId);
        if (!headIncident || !headIncident.recurrenceInfo?.analysis) return;

        const updatedMetaRecs = headIncident.recurrenceInfo.analysis.metaRecommendations!.map(rec =>
            rec.id === updatedAction.id ? updatedAction : rec
        );

        const updatedHeadIncident: IncidentReport = {
            ...headIncident,
            recurrenceInfo: {
                ...headIncident.recurrenceInfo,
                analysis: {
                    ...headIncident.recurrenceInfo.analysis,
                    metaRecommendations: updatedMetaRecs,
                }
            }
        };
        onUpdate(updatedHeadIncident);

    }, [incident, onUpdate, allIncidents]);

    const handleGeneratePlanForMetaAction = useCallback(async (recommendation: Recommendation) => {
        setAnalysisError(null); 
        const chainId = incident.recurrenceChainId || incident.id;
        const headIncident = allIncidents.find(i => i.id === chainId);
        if (!headIncident) {
            setAnalysisError("لم يتم العثور على الحادث الرئيسي للسلسلة.");
            return;
        }

        try {
            const relevantCases: GlobalCase[] = await searchGlobalCases(recommendation.action);
            const plan = await generateImplementationPlan(headIncident, recommendation, relevantCases);
            
            const updatedAction = { ...recommendation, implementationPlan: plan };
            handleUpdateMetaAction(updatedAction);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "فشل في إنشاء خطة التنفيذ.";
            setAnalysisError(errorMessage);
        }
    }, [incident, allIncidents, handleUpdateMetaAction]);


  const hasPredictiveAnalysis = !!incident.predictiveAnalysis;

  const deepDiveQuestions = incident.deepDive?.questions || [];
  const deepDiveResults = incident.deepDive?.results || [];

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
        <div className="mt-6">
            {!hasRcaAnalysis ? (
                 <div className="space-y-6">
                    <Card>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-blue-500 text-white font-bold text-xl">1</div>
                            <h3 className="text-xl font-bold text-gray-800 font-cairo">التحليل الموحد والشامل</h3>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-4">للحصول على تحليل دقيق، ارفع الدليل الرسمي أو الإجراء القياسي (SOP). سيقوم الذكاء الاصطناعي بمقارنة الحادث مع الدليل، تحديد السبب الجذري، واقتراح إجراءات تصحيحية مرتبطة مباشرة بأي انحراف عن الإجراءات الرسمية.</p>
                            {!sopFile ? (
                                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300/60 border-dashed rounded-xl bg-white/30">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        <div className="flex text-sm text-gray-600 justify-center"><label htmlFor="sop-file-upload" className="relative cursor-pointer bg-white/80 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2"><span>اختر ملفًا</span><input id="sop-file-upload" name="sop-file-upload" type="file" className="sr-only" onChange={handleSopFileChange} accept="application/pdf,.doc,.docx,text/plain,.txt" /></label></div>
                                        <p className="text-xs text-gray-500">PDF, DOCX, TXT (13MB كحد أقصى)</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2"><ul role="list" className="border border-gray-200/80 rounded-md divide-y divide-gray-200/80"><li className="pl-3 pr-4 py-3 flex items-center justify-between text-sm"><div className="w-0 flex-1 flex items-center"><FileIcon type={sopFile.type} /><span className="mr-2 flex-1 w-0 truncate">{sopFile.name}</span></div><div className="ml-4 flex-shrink-0 flex items-center space-i-4"><span className="text-gray-500">{(sopFile.size / 1024).toFixed(2)} KB</span><button type="button" onClick={handleRemoveSopFile} className="font-medium text-red-600 hover:text-red-500 mr-3">إزالة</button></div></li></ul></div>
                            )}
                            <div className="text-center mt-4"><Button onClick={handlePerformUnifiedAnalysis} isLoading={isUnifiedAnalyzing} disabled={isUnifiedAnalyzing || !sopFile}>بدء التحليل الموحد (إصدار جديد)</Button></div>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="space-y-6">
                    <AnalysisSection title="ملخص التحليل التنفيذي" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>}>
                        <h4 className="font-bold text-lg text-gray-900">{incident.analysis!.rootCause.cause}</h4>
                        <p className="italic text-lg text-gray-800 bg-gray-900/5 p-4 rounded-lg mt-2">{incident.analysis!.knowledgeCapsule}</p>
                    </AnalysisSection>

                    {incident.sopComplianceAnalysis && (
                        <AnalysisSection title="تفاصيل تحليل التوافق مع الدليل الرسمي" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-1.125 0-2.063.938-2.063 2.063v15.375c0 1.125.938 2.063 2.063 2.063h12.75c1.125 0 2.063-.938 2.063-2.063V12.313" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 15.375c.621 0 1.125-.504 1.125-1.125s-.504-1.125-1.125-1.125-1.125.504-1.125 1.125.504 1.125 1.125 1.125z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 2.25v6h6" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 11.25l-3.75 3.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 15l-3.75-3.75" /></svg>}>
                            {incident.sopDocument && (
                                <div className="mb-4 p-3 bg-gray-500/10 rounded-lg border border-gray-900/10 flex items-center gap-x-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <div>
                                        <p className="text-xs text-gray-600">تم التحليل بناءً على المستند:</p>
                                        <p className="font-semibold text-gray-800">{incident.sopDocument.name}</p>
                                    </div>
                                </div>
                            )}
                            <SopComplianceView analysis={incident.sopComplianceAnalysis!} />
                        </AnalysisSection>
                    )}

                    {incident.recurrenceInfo?.isRecurrent && (
                        <AnalysisSection title="تحليل التكرار" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0119.5 19.5M20 20l-1.5-1.5A9 9 0 004.5 4.5" /></svg>}>
                            <div className="space-y-4">
                                <p className="text-sm">
                                    تم تحديد هذا الحادث كتكرار لـ 
                                    <strong> {incident.recurrenceInfo.linkedIncidents.length} </strong> 
                                    حادث(ة) سابقة.
                                </p>
                                {incident.recurrenceInfo.analysis && (
                                    <div className="mt-4 space-y-4">
                                        <div className="p-3 bg-gray-500/10 rounded-lg border border-gray-900/10">
                                            <p className="font-bold text-gray-800">نوع التكرار: <span className="font-medium text-gray-700">{incident.recurrenceInfo.analysis.type}</span></p>
                                            <p className="text-sm text-gray-700 mt-1">{incident.recurrenceInfo.analysis.explanation}</p>
                                        </div>
                                        
                                        <h4 className="font-bold text-lg text-gray-900 pt-4 border-t border-gray-900/10">التشخيص العميق</h4>
                                        
                                        <div className="p-3 bg-yellow-500/5 rounded-lg">
                                            <p className="font-semibold text-gray-800">تحليل الأفراد المعنيين:</p>
                                            <p className="text-sm text-gray-700">{incident.recurrenceInfo.analysis.personnelAnalysis}</p>
                                        </div>

                                        <div className="p-3 bg-yellow-500/5 rounded-lg">
                                            <p className="font-semibold text-gray-800">سبب فشل الحلول السابقة:</p>
                                            <p className="text-sm text-gray-700">{incident.recurrenceInfo.analysis.correctionFailureReason}</p>
                                        </div>

                                        <div className="p-3 bg-blue-500/5 rounded-lg">
                                            <p className="font-semibold text-gray-800">اقتراح حل من مستوى أعلى:</p>
                                            <p className="text-sm text-gray-700">{incident.recurrenceInfo.analysis.higherLevelCorrection}</p>
                                        </div>

                                        <div className="p-3 bg-blue-500/5 rounded-lg">
                                            <p className="font-semibold text-gray-800">اقتراح تحقيق مصغر (Mini-RCA):</p>
                                            <p className="text-sm text-gray-700">{incident.recurrenceInfo.analysis.miniRcaSuggestion}</p>
                                        </div>
                                        
                                        {/* The strategic part */}
                                        {incident.recurrenceInfo.analysis.failurePatternAnalysis && (
                                            <div className="p-4 bg-purple-500/10 rounded-lg border-l-4 border-purple-500/20 text-purple-800">
                                                <p className="font-bold text-purple-900">تحليل نمط الفشل (Meta-Analysis):</p>
                                                <p className="mt-1">{incident.recurrenceInfo.analysis.failurePatternAnalysis}</p>
                                            </div>
                                        )}
                                        {incident.recurrenceInfo.analysis.metaRecommendations && incident.recurrenceInfo.analysis.metaRecommendations.length > 0 && (
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-900 mb-2">الإجراءات الاستراتيجية المقترحة</h4>
                                                <div className="space-y-4">
                                                    {incident.recurrenceInfo.analysis.metaRecommendations.map(rec => (
                                                        <ActionCard
                                                            key={rec.id}
                                                            action={rec}
                                                            onUpdate={handleUpdateMetaAction}
                                                            currentUser={currentUser}
                                                            onGeneratePlan={handleGeneratePlanForMetaAction}
                                                            viewContext="detail"
                                                            incidentDate={incident.date}
                                                            isMeta={true}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </AnalysisSection>
                    )}

                    <AnalysisSection title="الإجراءات التصحيحية والوقائية (CAPA)" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}>
                        <div className="space-y-4">{orderedRecommendations.length > 0 ? orderedRecommendations.map((rec) => <ActionCard key={rec.id} action={rec} onUpdate={handleUpdateAction} currentUser={currentUser} onSuggestAlternative={handleSuggestAlternative} onGeneratePlan={handleGeneratePlanForAction} viewContext="detail" incidentDate={incident.date} />) : <p>لا توجد توصيات بعد.</p>}</div>
                    </AnalysisSection>

                    <AnalysisSection title="تفاصيل السبب الجذري" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}>
                        <h4 className="font-bold text-lg text-gray-900 mb-2">شرح السبب الجذري</h4><p>{incident.analysis!.rootCause.description}</p>
                        <h5 className="font-semibold mt-4 mb-2">العوامل المساهمة:</h5>
                        {incident.analysis!.rootCause.contributingFactors.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 pr-4">{incident.analysis!.rootCause.contributingFactors.map((factor, i) => <li key={i}>{factor}</li>)}</ul>
                        ) : (
                            <p className="text-sm text-gray-500 italic pr-4">لم يتم تحديد عوامل مساهمة إضافية.</p>
                        )}
                        <hr className="my-6 border-gray-900/10"/>
                        <h4 className="font-bold text-lg text-gray-900 mb-2">فجوة إجراءات التشغيل القياسية (من التحليل الشامل)</h4>
                        {incident.analysis!.sopGap.sopReference && <p className="text-sm mb-2 font-mono text-gray-500 bg-gray-100 p-2 rounded-md inline-block">المرجع: {incident.analysis!.sopGap.sopReference}</p>}
                        <p><strong className="font-semibold">الإجراء المتوقع:</strong> {incident.analysis!.sopGap.expectedProcedure}</p>
                        <p><strong className="font-semibold">الإجراء الفعلي:</strong> {incident.analysis!.sopGap.actualAction}</p>
                        <p><strong className="font-semibold text-red-600">الفجوة:</strong> {incident.analysis!.sopGap.gapAnalysis}</p>
                    </AnalysisSection>

                    <AnalysisSection title="شجرة الأدوار" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}>
                        {incident.analysis!.roleTree.length > 0 ? (
                            <div className="space-y-4">{incident.analysis!.roleTree.map((role, i) => (<div key={i} className="border-r-4 border-gray-300/70 pr-4"><p className="font-bold text-gray-800">{role.name}</p><p className="text-sm"><strong className="font-medium text-gray-600">المسؤولية:</strong> {role.responsibility}</p><p className="text-sm"><strong className="font-medium text-gray-600">المساهمة في النتيجة:</strong> {role.contribution}</p></div>))}</div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">لم يتم تحديد أدوار محددة في هذا التحليل.</p>
                        )}
                    </AnalysisSection>

                    <Card>
                        <h3 className="text-xl font-bold text-gray-800 font-cairo mb-4">الخطوات التالية والتحليلات المتقدمة</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Button onClick={() => setIsSimulatorOpen(true)} variant="secondary" className="flex-col h-24"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.062 4.062a1.5 1.5 0 012.122 0l1.124 1.124a1.5 1.5 0 010 2.122L5.184 9.432a1.5 1.5 0 01-2.122 0l-1.124-1.124a1.5 1.5 0 010-2.122L4.062 4.062zM19.938 19.938a1.5 1.5 0 01-2.122 0l-1.124-1.124a1.5 1.5 0 010-2.122l2.124-2.124a1.5 1.5 0 012.122 0l1.124 1.124a1.5 1.5 0 010 2.122L19.938 19.938zM12 11.816V17m0-12v2.184m0 0a2.981 2.981 0 011.658 2.13l.832 3.328a2.981 2.981 0 01-5.964 0l.832-3.328A2.981 2.981 0 0112 7.184z" /></svg>محاكاة "ماذا لو؟"</Button>
                            <Button onClick={handlePredictiveAnalysis} variant="secondary" className="flex-col h-24" disabled={isPredicting || hasPredictiveAnalysis} isLoading={isPredicting}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7.5a6.472 6.472 0 00-3.5-1M9.5 6.5a6.472 6.472 0 01-3.5 1m-4 5a.48.48 0 00.477.521 5.513 5.513 0 014.046 0 .48.48 0 00.477-.521 5.525 5.525 0 00-5-5.023.48.48 0 00-.477.522 5.513 5.513 0 010 4.002zM18.5 12a.48.48 0 00.477.521 5.513 5.513 0 014.046 0 .48.48 0 00.477-.521 5.525 5.525 0 00-5-5.023.48.48 0 00-.477.522 5.513 5.513 0 010 4.002z" /></svg>{hasPredictiveAnalysis ? 'تم التحليل التنبؤي ✓' : 'تحليل تنبؤي'}</Button>
                            <Button onClick={() => setIsDeepDiveVisible(true)} variant="secondary" className="flex-col h-24"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" /></svg>التحليل الأعمق</Button>
                            <Button onClick={handleStrategicRecurrenceAnalysis} variant="secondary" className="flex-col h-24" disabled={isAnalyzingRecurrence || !hasRcaAnalysis} isLoading={isAnalyzingRecurrence}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0119.5 19.5M20 20l-1.5-1.5A9 9 0 004.5 4.5" /></svg>تحليل التكرار</Button>
                            <Button onClick={() => setIsCaseStudyVisible(true)} variant="secondary" className="flex-col h-24" disabled={!hasRcaAnalysis}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>عرض كدراسة حالة</Button>
                        </div>
                         {hasPredictiveAnalysis && <div className="mt-4"><AnalysisSection title="التحليل التنبؤي للمخاطر" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691L7.985 5.644m12.038 0L16.023 9.348" /></svg>}><div className="space-y-6"><div><h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>المؤثرات الخفية (Weak Signals)</h4><div className="space-y-3">{incident.predictiveAnalysis!.weakSignals.map((item, i) => (<div key={i} className="p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20"><p className="font-semibold text-yellow-900">{item.signal}</p><p className="text-sm text-yellow-800 mt-1">{item.implication}</p></div>))}</div></div><div><h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.142 16.223a5.5 5.5 0 11-10.284 0 5.5 5.5 0 0110.284 0zM12 10.25V13.5M12 16.75h.01" /></svg>أنماط الانحراف عن الإجراءات</h4><div className="space-y-3">{incident.predictiveAnalysis!.sopDeviationPatterns.map((item, i) => (<div key={i} className="p-3 bg-orange-400/10 rounded-lg border border-orange-400/20"><p className="font-semibold text-orange-900">{item.pattern}</p><p className="text-sm text-orange-800 mt-1">{item.risk}</p></div>))}</div></div><div><h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7.5a6.472 6.472 0 00-3.5-1M9.5 6.5a6.472 6.472 0 01-3.5 1m-4 5a.48.48 0 00.477.521 5.513 5.513 0 014.046 0 .48.48 0 00.477-.521 5.525 5.525 0 00-5-5.023.48.48 0 00-.477.522 5.513 5.513 0 010 4.002zM18.5 12a.48.48 0 00.477.521 5.513 5.513 0 014.046 0 .48.48 0 00.477-.521 5.525 5.525 0 00-5-5.023.48.48 0 00-.477.522 5.513 5.513 0 010 4.002z" /></svg>رؤى تنبؤية</h4><div className="space-y-3">{incident.predictiveAnalysis!.predictiveInsights.map((item, i) => (<div key={i} className="p-4 bg-purple-400/10 rounded-lg border border-purple-400/20"><p className="font-bold text-purple-900">التنبؤ: {item.prediction}</p><p className="text-sm text-purple-800 mt-2"><strong className='font-semibold'>الأساس المنطقي:</strong> {item.justification}</p><p className="text-sm text-purple-800 mt-2 bg-purple-200/40 p-2 rounded-md"><strong className='font-semibold'>التوصية الاستباقية:</strong> {item.proactiveRecommendation}</p></div>))}</div></div></div></AnalysisSection></div>}
                         {isDeepDiveVisible && <AnalysisSection title="التحليل الأعمق (Deep Dive)" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" /></svg>}>{isGettingQuestions ? (<div className="text-center p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p className="mt-2 text-gray-600">جاري توليد أسئلة للتحليل العميق...</p></div>) : deepDiveQuestions.length > 0 ? (<div className="space-y-4 mt-4"><h4 className="font-bold text-gray-800">اختر سؤالاً للتعمق فيه:</h4>{deepDiveQuestions.map((q, i) => {const resultForQuestion = deepDiveResults.find(r => r.question === q); const isAnswered = !!resultForQuestion; const isLoading = activeDeepDive.loading && activeDeepDive.question === q; return (<div key={i} className="p-3 bg-gray-500/5 rounded-lg transition-all"><Button variant='secondary' onClick={() => handlePerformDeepDive(q)} disabled={isAnswered || activeDeepDive.loading} isLoading={isLoading} className="w-full justify-start text-right">{q} {isAnswered && ' (تمت الإجابة ✓)'}</Button>{resultForQuestion && (<div className="mt-4 p-4 bg-blue-500/5 border-l-4 border-blue-500/50"><p className="font-semibold text-gray-800">الرؤية المكتشفة:</p><p className="mt-2 text-gray-800">{resultForQuestion.result.insight}</p>{resultForQuestion.result.newRecommendations && resultForQuestion.result.newRecommendations.length > 0 && (<div className="mt-4 pt-3 border-t border-blue-900/10"><p className="font-semibold text-gray-800 text-sm">توصيات جديدة نتجت عن هذا التحليل:</p><ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-700">{resultForQuestion.result.newRecommendations.map((rec, recIndex) => (<li key={recIndex}>{rec.action}</li>))}</ul></div>)}</div>)}</div>);})}</div>) : (<p className="text-sm text-gray-500">لم يتمكن الذكاء الاصطناعي من توليد أسئلة. حاول مرة أخرى.</p>)}<div className="mt-6 text-center"><Button variant="secondary" onClick={() => setIsDeepDiveVisible(false)}>إغلاق</Button></div></AnalysisSection>}
                    </Card>
                </div>
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
    {isCaseStudyVisible && (
        <CaseStudyModal 
            incident={incident} 
            onClose={() => setIsCaseStudyVisible(false)} 
        />
    )}
    </>
  );
};

export default IncidentDetail;