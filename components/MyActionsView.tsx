import React, { useMemo, useState, useCallback } from 'react';
import { ActionItem, IncidentReport, RecommendationStatus, Recommendation, ActiveView, GlobalCase } from '../types';
import Card from './ui/Card';
import ActionCard from './ActionCard';
import { suggestAlternativeAction, searchGlobalCases, generateImplementationPlan, generateMetaRecommendations } from '../services/geminiService';
import Button from './ui/Button';

interface MyActionsViewProps {
  allActionItems: ActionItem[];
  onNavigate: (view: ActiveView, incidentId?: string | null) => void;
  onUpdateIncident: (incident: IncidentReport) => void;
  incidents: IncidentReport[];
  currentUser: string;
}

interface ChainedIncidentGroup {
  isChain: true;
  chainId: string;
  chainTitle: string;
  chainDate: string;
  incidentItems: { incident: IncidentReport; actions: ActionItem[] }[];
  metaActions: ActionItem[];
  totalActionsCount: number;
}

interface StandaloneIncidentGroup {
  isChain: false;
  incident: IncidentReport;
  actions: ActionItem[];
  totalActionsCount: number;
}

type IncidentGroup = ChainedIncidentGroup | StandaloneIncidentGroup;


const MyActionsView: React.FC<MyActionsViewProps> = ({ allActionItems, onNavigate, onUpdateIncident, incidents, currentUser }) => {
    
    const [searchTerm, setSearchTerm] = useState('');
    const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [metaAnalysisState, setMetaAnalysisState] = useState<{ [key: string]: { isLoading: boolean; error: string | null } }>({});


    const incidentGroups = useMemo((): IncidentGroup[] => {
        const incidentMap = new Map(incidents.map(i => [i.id, i]));
        const actionsByIncidentId = allActionItems.filter(a => !a.isMeta).reduce((acc, item) => {
            if (!acc[item.incidentId]) {
                acc[item.incidentId] = [];
            }
            acc[item.incidentId].push(item);
            return acc;
        }, {} as Record<string, ActionItem[]>);
        
        const allIncidentItems = incidents.map(incident => ({
          incident,
          actions: actionsByIncidentId[incident.id] || [],
        })).filter(item => item.actions.length > 0 || (item.incident.recurrenceInfo?.analysis?.metaRecommendations?.length ?? 0) > 0 || item.incident.recurrenceChainId);
    
        const chains = new Map<string, { incidentItems: { incident: IncidentReport; actions: ActionItem[] }[] }>();
        const standalones: StandaloneIncidentGroup[] = [];
    
        for (const item of allIncidentItems) {
          const { incident, actions } = item;
          if (incident.recurrenceChainId) {
            if (!chains.has(incident.recurrenceChainId)) {
              chains.set(incident.recurrenceChainId, { incidentItems: [] });
            }
            chains.get(incident.recurrenceChainId)!.incidentItems.push(item);
          } else {
            if (actions.length > 0) {
              standalones.push({ isChain: false, incident, actions, totalActionsCount: actions.length });
            }
          }
        }
    
        const finalChains: ChainedIncidentGroup[] = Array.from(chains.entries()).map(([chainId, chainData]): ChainedIncidentGroup => {
            chainData.incidentItems.sort((a, b) => new Date(a.incident.date).getTime() - new Date(b.incident.date).getTime());
            const headIncident = chainData.incidentItems[0].incident;
            const headIncidentFull = incidentMap.get(chainId) || headIncident;
            const metaRecommendations = headIncidentFull?.recurrenceInfo?.analysis?.metaRecommendations || [];
            
            const metaActions: ActionItem[] = metaRecommendations.map(rec => ({
                ...rec,
                incidentId: chainId,
                incidentTitle: headIncident.title,
                incidentDate: headIncident.date,
                isMeta: true,
            }));

            return {
                isChain: true,
                chainId: chainId,
                chainTitle: headIncident.title,
                chainDate: headIncident.date,
                incidentItems: chainData.incidentItems,
                metaActions: metaActions,
                totalActionsCount: chainData.incidentItems.reduce((sum, item) => sum + item.actions.length, 0) + metaActions.length,
            };
        }).sort((a, b) => new Date(b.chainDate).getTime() - new Date(a.chainDate).getTime());
    
        standalones.sort((a, b) => new Date(b.incident.date).getTime() - new Date(a.incident.date).getTime());
    
        return [...finalChains, ...standalones];
    }, [allActionItems, incidents]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return incidentGroups;
        const term = searchTerm.toLowerCase();
        return incidentGroups.filter(group => {
            if (group.isChain === false) {
                return group.incident.title.toLowerCase().includes(term) || group.incident.id.toLowerCase().includes(term);
            } else {
                return group.chainTitle.toLowerCase().includes(term) || group.chainId.toLowerCase().includes(term) || group.incidentItems.some(i => i.incident.title.toLowerCase().includes(term));
            }
        });
    }, [incidentGroups, searchTerm]);


    const toggleAccordion = (id: string) => {
        setOpenAccordionId(prev => (prev === id ? null : id));
    };

    const handleGenerateMetaRecs = useCallback(async (chainId: string) => {
        setMetaAnalysisState(prev => ({ ...prev, [chainId]: { isLoading: true, error: null } }));

        const chain = incidentGroups.find(g => g.isChain && g.chainId === chainId) as ChainedIncidentGroup | undefined;
        if (!chain) {
            setMetaAnalysisState(prev => ({ ...prev, [chainId]: { isLoading: false, error: 'لم يتم العثور على السلسلة.' } }));
            return;
        }
        
        const allChainIncidents = chain.incidentItems.map(item => item.incident);

        try {
            const { failurePatternAnalysis, metaRecommendations } = await generateMetaRecommendations(allChainIncidents);
            
            const newRecommendations: Recommendation[] = metaRecommendations.map((rec, index) => ({
                ...rec,
                id: `META-REC-${Date.now()}-${index}`,
                status: RecommendationStatus.Proposed,
                updates: []
            }));

            const headIncident = incidents.find(inc => inc.id === chainId);
            if (!headIncident) throw new Error("لم يتم العثور على الحادث الرئيسي للسلسلة.");

            const updatedHeadIncident: IncidentReport = {
                ...headIncident,
                recurrenceInfo: {
                    ...(headIncident.recurrenceInfo!),
                    analysis: {
                        ...(headIncident.recurrenceInfo!.analysis!),
                        failurePatternAnalysis,
                        metaRecommendations: newRecommendations
                    }
                }
            };
            
            onUpdateIncident(updatedHeadIncident);
            setMetaAnalysisState(prev => ({ ...prev, [chainId]: { isLoading: false, error: null } }));

        } catch (e) {
            const error = e instanceof Error ? e.message : 'فشل في اقتراح الإجراءات الاستراتيجية.';
            setMetaAnalysisState(prev => ({ ...prev, [chainId]: { isLoading: false, error } }));
        }
    }, [incidentGroups, incidents, onUpdateIncident]);

    const handleUpdateAction = (updatedAction: ActionItem) => {
        const targetIncidentId = updatedAction.isMeta 
            ? updatedAction.incidentId // For meta-actions, this is the chain ID (which is the head incident's ID)
            : updatedAction.incidentId;
        
        const targetIncident = incidents.find(inc => inc.id === targetIncidentId);
        if (!targetIncident) return;

        let updatedIncident: IncidentReport;

        if (updatedAction.isMeta) {
             const updatedMetaRecommendations = targetIncident.recurrenceInfo?.analysis?.metaRecommendations?.map(rec =>
                rec.id === updatedAction.id ? updatedAction : rec
            ) || [];
            updatedIncident = {
                ...targetIncident,
                recurrenceInfo: {
                    ...targetIncident.recurrenceInfo!,
                    analysis: {
                        ...targetIncident.recurrenceInfo!.analysis!,
                        metaRecommendations: updatedMetaRecommendations
                    }
                }
            };
        } else {
            if (!targetIncident.analysis) return;
            const { incidentId, incidentTitle, incidentDate, isMeta, ...recommendationToSave } = updatedAction;
            const updatedRecommendations = targetIncident.analysis.recommendations.map(rec =>
                rec.id === updatedAction.id ? recommendationToSave : rec
            );
            updatedIncident = {
                ...targetIncident,
                analysis: {
                    ...targetIncident.analysis,
                    recommendations: updatedRecommendations
                }
            };
        }
        onUpdateIncident(updatedIncident);
    };
    
    const handleGeneratePlanForAction = async (action: ActionItem) => {
        setSuggestionError(null);
        const targetIncident = incidents.find(inc => inc.id === action.incidentId);
        if (!targetIncident) {
            setSuggestionError("لم يتم العثور على الحادث المرتبط.");
            return;
        }

        try {
            const relevantCases: GlobalCase[] = await searchGlobalCases(action.action);
            const plan = await generateImplementationPlan(targetIncident, action, relevantCases);
            const updatedAction = { ...action, implementationPlan: plan };
            handleUpdateAction(updatedAction);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "فشل في إنشاء خطة التنفيذ.";
            setSuggestionError(errorMessage);
        }
    };

    const handleSuggestAlternativeForAction = async (failedAction: ActionItem) => {
        setSuggestionError(null);

        const targetIncident = incidents.find(inc => inc.id === failedAction.incidentId);
        if (!targetIncident || !targetIncident.analysis) {
            setSuggestionError(`خطأ: لم يتم العثور على الحادث المرتبط بالإجراء.`);
            return;
        }

        try {
            const newRecData = await suggestAlternativeAction(targetIncident, failedAction);
            const newRecommendation: Recommendation = {
                ...newRecData,
                id: `ALT-REC-${Date.now()}`,
                status: RecommendationStatus.Proposed,
                updates: [],
                effectivenessNotes: `بديل للإجراء الفاشل: "${failedAction.action}"`,
                replacesActionId: failedAction.id,
            };
            
            const updatedRecommendations = [ ...targetIncident.analysis.recommendations, newRecommendation ];

            onUpdateIncident({
                ...targetIncident,
                analysis: {
                    ...targetIncident.analysis,
                    recommendations: updatedRecommendations
                }
            });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "فشل في اقتراح حل بديل.";
            setSuggestionError(errorMessage);
        }
    };

    const reorderActions = (actions: ActionItem[]): ActionItem[] => {
        const actionMap = new Map(actions.map(a => [a.id, a]));
        const alternativesMap = new Map<string, ActionItem[]>();
        const topLevelActions: ActionItem[] = [];

        for (const action of actions) {
            if (action.replacesActionId && actionMap.has(action.replacesActionId)) {
                if (!alternativesMap.has(action.replacesActionId)) {
                    alternativesMap.set(action.replacesActionId, []);
                }
                const alternatives = alternativesMap.get(action.replacesActionId);
                if (alternatives) {
                    alternatives.push(action);
                }
            } else {
                topLevelActions.push(action);
            }
        }

        const result: ActionItem[] = [];
        for (const action of topLevelActions) {
            result.push(action);
            if (alternativesMap.has(action.id)) {
                result.push(...(alternativesMap.get(action.id) || []));
            }
        }
        return result;
    };


    return (
        <div className="h-full flex flex-col">
            <div className="mb-6">
                <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">كل الإجراءات التصحيحية (CAPA)</h1>
                <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                    جميع الإجراءات التصحيحية والوقائية المقترحة عبر كل الحوادث، لتوفير نظرة شاملة وتسهيل المتابعة على مستوى المنظمة.
                </p>
            </div>
            
            {suggestionError && <div className="mb-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{suggestionError}</div>}

            <Card className="mb-6">
                 <div className="flex items-center gap-x-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="ابحث عن حادث أو سلسلة حوادث بالاسم أو المعرّف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent focus:outline-none text-gray-800 placeholder-gray-500"
                    />
                </div>
            </Card>

            <div className="flex-grow overflow-y-auto space-y-4">
                {filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => {
                        if (group.isChain === false) {
                            const { incident, actions, totalActionsCount } = group;
                            const groupId = incident.id;
                            const isOpen = openAccordionId === groupId;
                            return (
                                <Card key={groupId} className="!p-0 overflow-hidden transition-all duration-300">
                                    <button onClick={() => toggleAccordion(groupId)} className="w-full text-right p-4 flex justify-between items-center hover:bg-gray-500/5" aria-expanded={isOpen}>
                                        <div>
                                            <p className="font-bold text-lg text-gray-900 font-cairo">{incident.title} <span className="text-gray-500 font-mono text-sm">({incident.id})</span></p>
                                            <div className="flex items-center gap-x-4 mt-2 text-sm text-gray-600">
                                                <span className="flex items-center gap-x-1.5"><div className="w-2 h-2 rounded-full bg-gray-400"></div><span><strong>{totalActionsCount}</strong> إجراءات</span></span>
                                            </div>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-500 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {isOpen && (
                                        <div className="p-4 border-t border-gray-900/10 bg-white/20">
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {reorderActions(actions).map(action => (
                                                    <ActionCard
                                                        key={action.id} action={action} incidentDate={action.incidentDate}
                                                        onUpdate={(updatedRecommendation) => handleUpdateAction({ ...action, ...updatedRecommendation })}
                                                        onSuggestAlternative={(failedRec) => handleSuggestAlternativeForAction({ ...action, ...failedRec })}
                                                        onGeneratePlan={(rec) => handleGeneratePlanForAction({ ...action, ...rec })}
                                                        currentUser={currentUser} viewContext="my-actions"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        } else {
                            const groupId = group.chainId;
                            const isOpen = openAccordionId === groupId;
                            const chainHead = incidents.find(i => i.id === groupId);
                            const metaAnalysis = chainHead?.recurrenceInfo?.analysis;
                            const currentMetaState = metaAnalysisState[groupId] || { isLoading: false, error: null };
                            
                            return (
                                <Card key={groupId} className="!p-0 overflow-hidden transition-all duration-300 border-2 border-red-500/20 bg-red-500/5">
                                    <div className="p-4">
                                        <p className="font-bold text-lg text-red-800 font-cairo flex items-center gap-x-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 4.875 4.875 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.092 1.21-.138 2.43-.138 3.662a4.875 4.875 0 007.466 4.472.5.5 0 00.568 0A4.875 4.875 0 0019.5 12z" /></svg>
                                            سلسلة حوادث متكررة: {group.chainTitle}
                                        </p>
                                        <div className="flex items-center gap-x-4 mt-2 text-sm text-red-700">
                                            <span><strong>{group.incidentItems.length}</strong> حوادث مرتبطة</span>
                                            <span className="flex items-center gap-x-1.5"><div className="w-2 h-2 rounded-full bg-red-400"></div><span><strong>{group.totalActionsCount}</strong> إجمالي الإجراءات</span></span>
                                        </div>

                                        {/* Meta-Analysis Section */}
                                        <div className="mt-4 pt-4 border-t border-red-900/10">
                                            <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-x-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                                تحليل نمط التكرار (Meta-Analysis)
                                            </h4>
                                            {currentMetaState.error && <div className="mb-2 p-2 text-xs bg-red-500/10 text-red-700 rounded-md">{currentMetaState.error}</div>}
                                            
                                            {!metaAnalysis?.metaRecommendations ? (
                                                <div className="text-center p-4 bg-purple-500/5 rounded-lg border border-purple-500/10">
                                                    <p className="text-sm text-purple-800 mb-3">لم يتم منع تكرار هذه المشكلة. حلل نمط الفشل واقترح حلولاً استراتيجية لكسر حلقة التكرار.</p>
                                                    <Button onClick={() => handleGenerateMetaRecs(groupId)} isLoading={currentMetaState.isLoading} variant="primary">
                                                        تحليل سبب التكرار
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="p-3 bg-purple-500/10 rounded-lg border-l-4 border-purple-500/20 text-purple-800 text-sm mb-4">
                                                        <p className="font-bold text-purple-900">تحليل نمط الفشل:</p>
                                                        <p>{metaAnalysis.failurePatternAnalysis}</p>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                        {reorderActions(group.metaActions).map(action => (
                                                            <ActionCard
                                                                key={action.id} action={action} incidentDate={action.incidentDate}
                                                                onUpdate={(updatedRecommendation) => handleUpdateAction({ ...action, ...updatedRecommendation, isMeta: true })}
                                                                onSuggestAlternative={(failedRec) => handleSuggestAlternativeForAction({ ...action, ...failedRec, isMeta: true })}
                                                                onGeneratePlan={(rec) => handleGeneratePlanForAction({ ...action, ...rec, isMeta: true })}
                                                                currentUser={currentUser} viewContext="my-actions" isMeta={true}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                    <button onClick={() => toggleAccordion(groupId)} className="w-full text-center p-2 text-sm font-semibold text-gray-600 bg-gray-500/10 hover:bg-gray-500/20" aria-expanded={isOpen}>
                                        {isOpen ? 'إخفاء الإجراءات الفردية' : 'عرض الإجراءات الفردية للحوادث'}
                                    </button>
                                    {isOpen && (
                                        <div className="p-4 border-t border-red-900/10 bg-red-500/5 space-y-4">
                                            {group.incidentItems.map(({ incident, actions }) => (
                                                <div key={incident.id} className="p-4 rounded-lg bg-white/50 border">
                                                    <h4 className="font-bold text-gray-800">{incident.title} <span className="text-gray-500 font-mono text-sm">({incident.id})</span></h4>
                                                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
                                                        {reorderActions(actions).map(action => (
                                                            <ActionCard
                                                                key={action.id} action={action} incidentDate={action.incidentDate}
                                                                onUpdate={(updatedRecommendation) => handleUpdateAction({ ...action, ...updatedRecommendation })}
                                                                onSuggestAlternative={(failedRec) => handleSuggestAlternativeForAction({ ...action, ...failedRec })}
                                                                onGeneratePlan={(rec) => handleGeneratePlanForAction({ ...action, ...rec })}
                                                                currentUser={currentUser} viewContext="my-actions"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            );
                        }
                    })
                ) : (
                    <Card>
                        <p className="text-center text-gray-500 py-8">
                            {searchTerm ? 'لم يتم العثور على حوادث مطابقة لبحثك.' : 'لا توجد إجراءات متاحة حالياً.'}
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default MyActionsView;