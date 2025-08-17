import React, { useState } from 'react';
import { IncidentReport, SimulatedAction, Recommendation, AnalysisResult, RecommendationStatus, RecommendationCategory, RecommendationType } from '../types';
import { simulateWhatIf } from '../services/geminiService';
import Button from './ui/Button';

interface WhatIfSimulatorModalProps {
  incident: IncidentReport;
  onClose: () => void;
  onUpdate: (incident: IncidentReport) => void;
}

const baseInputClasses = "mt-1 block w-full px-4 py-2 border rounded-lg shadow-inner-sm placeholder-gray-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500/70 sm:text-sm bg-white/70 border-white/80 transition-shadow duration-200 focus:shadow-md";

const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({ incident, onClose, onUpdate }) => {
    const [scenario, setScenario] = useState('');
    const [results, setResults] = useState<SimulatedAction[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addedActions, setAddedActions] = useState<string[]>([]);

    const handleSimulate = async () => {
        if (!scenario) {
            setError('يرجى إدخال سيناريو للمحاكاة.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const simulationResult = await simulateWhatIf(incident, scenario);
            setResults(simulationResult);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء المحاكاة.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRecommendation = (simulatedAction: SimulatedAction) => {
        const newRecommendation: Recommendation = {
            id: `SIM-REC-${Date.now()}`,
            action: simulatedAction.action,
            type: 'إجراء وقائي',
            rationale: simulatedAction.rationale,
            category: RecommendationCategory.Simulation,
            status: RecommendationStatus.Proposed,
            impact: 'يُحدد لاحقًا',
            ease: 'يُحدد لاحقًا',
            cost: 'يُحدد لاحقًا',
            timeframe: 'يُحدد لاحقًا',
            updates: [],
        };
        
        const currentAnalysis = incident.analysis;
        const updatedRecommendations = [...(currentAnalysis?.recommendations || []), newRecommendation];

        const updatedAnalysis: AnalysisResult = currentAnalysis 
            ? { ...currentAnalysis, recommendations: updatedRecommendations }
            : {
                rootCause: { cause: 'لم يحدد بعد', description: '', contributingFactors: [] },
                sopGap: { expectedProcedure: '', actualAction: '', gapAnalysis: '' },
                roleTree: [],
                knowledgeCapsule: 'تم إنشاؤها من محاكاة ماذا لو.',
                recommendations: updatedRecommendations,
            };

        const updatedIncident: IncidentReport = {
            ...incident,
            analysis: updatedAnalysis,
        };

        onUpdate(updatedIncident);
        setAddedActions(prev => [...prev, simulatedAction.action]);
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white/70 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/80 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-8 flex-grow">
                    <h2 className="text-2xl font-bold text-gray-900 font-cairo">محاكي سيناريو "ماذا لو؟"</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        استكشف النتائج المحتملة وحوّلها إلى إجراءات قابلة للتنفيذ.
                    </p>
                    <div className="mt-6">
                        <label htmlFor="scenario" className="block text-sm font-semibold text-gray-700 font-cairo">
                            السيناريو الافتراضي (مثال: ماذا لو تم تحديث الإجراء الأسبوع الماضي؟)
                        </label>
                        <textarea
                            id="scenario"
                            rows={3}
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            className={baseInputClasses}
                            placeholder="أدخل السيناريو هنا..."
                        />
                    </div>
               
                    {error && <div className="mt-4 p-3 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-sm">{error}</div>}

                    {isLoading && (
                        <div className="text-center p-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600">جاري تشغيل المحاكاة...</p>
                        </div>
                    )}

                    {results && (
                        <div className="mt-6">
                            <h3 className="text-lg font-bold text-gray-800 font-cairo mb-3">الإجراءات المقترحة بناءً على المحاكاة:</h3>
                            <div className="space-y-3">
                                {results.map((result, index) => {
                                    const isAdded = addedActions.includes(result.action);
                                    return (
                                        <div key={index} className="p-4 bg-blue-500/5 border-blue-500/10 border rounded-xl">
                                            <p className="font-semibold text-gray-800">{result.action}</p>
                                            <p className="text-sm text-gray-600 mt-1 mb-3">{result.rationale}</p>
                                            <Button 
                                                variant="secondary"
                                                onClick={() => handleAddRecommendation(result)}
                                                disabled={isAdded}
                                                className="py-1 px-3 text-xs"
                                            >
                                                {isAdded ? 'تمت الإضافة ✓' : 'إضافة كإجراء مقترح'}
                                            </Button>
                                        </div>
                                    );
                                })}
                                 {results.length === 0 && <p className="text-sm text-gray-500 text-center">لم يتمكن الذكاء الاصطناعي من استخلاص إجراءات محددة من هذا السيناريو.</p>}
                            </div>
                        </div>
                    )}
                 </div>

                <div className="bg-white/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse rounded-b-2xl mt-auto">
                    <Button onClick={handleSimulate} isLoading={isLoading} disabled={isLoading}>
                        تشغيل المحاكاة
                    </Button>
                    <Button type="button" variant="secondary" onClick={onClose} className="ml-3">
                        إغلاق
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default WhatIfSimulatorModal;