import React, { useState, useEffect } from 'react';
import { Recommendation, RecommendationStatus, RecommendationCategory, RecommendationType, RecommendationUpdate } from '../types';
import Tag from './ui/Tag';
import Button from './ui/Button';

interface ActionCardProps {
  action: Recommendation;
  onUpdate: (updatedAction: Recommendation) => void;
  currentUser: string;
  onSuggestAlternative?: (failedAction: Recommendation) => Promise<void>;
  onGeneratePlan?: (action: Recommendation) => Promise<void>;
  viewContext?: 'detail' | 'my-actions';
  incidentDate: string;
  isMeta?: boolean;
}

const baseInputClasses = "text-sm mt-1 font-medium w-full p-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/60 border-gray-300/50 shadow-inner text-gray-800 placeholder-gray-500";

const calculateDaysBetween = (start: string, end: string): number | null => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
    const diffTime = endDate.getTime() - startDate.getTime();
    if (diffTime < 0) return null; // Don't show for past due dates in this context
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const ActionCard: React.FC<ActionCardProps> = ({ action, onUpdate, currentUser, onSuggestAlternative, onGeneratePlan, viewContext = 'detail', incidentDate, isMeta = false }) => {
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isPlanVisible, setIsPlanVisible] = useState(false);

    // Local state for editable fields
    const [editableOwner, setEditableOwner] = useState(action.owner || '');
    const [editableDueDate, setEditableDueDate] = useState(action.dueDate || '');

    // Sync local state with props when the action prop changes from the parent
    useEffect(() => {
        setEditableOwner(action.owner || '');
        setEditableDueDate(action.dueDate || '');
    }, [action.owner, action.dueDate]);

    const handleOwnerUpdate = () => {
        if (editableOwner !== (action.owner || '')) {
            const newUpdate: RecommendationUpdate = {
                date: new Date().toISOString(),
                author: currentUser,
                comment: `تم تغيير المالك من "${action.owner || 'لا يوجد'}" إلى "${editableOwner}".`
            };
            onUpdate({ ...action, owner: editableOwner, updates: [...(action.updates || []), newUpdate] });
        }
    };
    
    const handleDueDateUpdate = () => {
        if (editableDueDate !== (action.dueDate || '')) {
            const newUpdate: RecommendationUpdate = {
                date: new Date().toISOString(),
                author: currentUser,
                comment: editableDueDate 
                    ? `تم تغيير تاريخ الاستحقاق إلى "${new Date(editableDueDate).toLocaleDateString('ar-EG')}".`
                    : `تمت إزالة تاريخ الاستحقاق.`
            };
            onUpdate({ ...action, dueDate: editableDueDate || undefined, updates: [...(action.updates || []), newUpdate] });
        }
    };

    const handleStatusChange = (newStatus: RecommendationStatus) => {
        const newUpdate: RecommendationUpdate = {
            date: new Date().toISOString(),
            author: currentUser,
            comment: `تم تغيير الحالة من "${action.status}" إلى "${newStatus}".`
        };
    
        const updatedAction = {
            ...action,
            status: newStatus,
            updates: [...(action.updates || []), newUpdate],
        };
    
        onUpdate(updatedAction);
    };

    const handleGeneratePlan = async () => {
        if (!onGeneratePlan) return;
        setIsGeneratingPlan(true);
        try {
            await onGeneratePlan(action);
            setIsPlanVisible(true); // Automatically show the plan once generated
        } catch (e) {
            console.error("Failed to generate plan from ActionCard", e);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const isCorrective = action.type === 'إجراء تصحيحي';
    const typeStyle = isCorrective 
        ? 'border-blue-400/30 bg-blue-400/10 text-blue-800'
        : 'border-green-400/30 bg-green-400/10 text-green-800';
    const typeIcon = isCorrective ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.94-3.31.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a11.955 11.955 0 018.618-3.04 11.955 11.955 0 018.618 3.04A12.02 12.02 0 0021 12a11.955 11.955 0 01-2.382-5.016z" /></svg>
    );

    const categoryStyles: Record<string, { bg: string, text: string, border: string }> = {
        [RecommendationCategory.Procedural]: { bg: 'bg-indigo-400/10', text: 'text-indigo-800', border: 'border-indigo-400/20' },
        [RecommendationCategory.Organizational]: { bg: 'bg-purple-400/10', text: 'text-purple-800', border: 'border-purple-400/20' },
        [RecommendationCategory.Training]: { bg: 'bg-yellow-400/10', text: 'text-yellow-800', border: 'border-yellow-400/20' },
        [RecommendationCategory.Technical]: { bg: 'bg-green-400/10', text: 'text-green-800', border: 'border-green-400/20' },
        [RecommendationCategory.Simulation]: { bg: 'bg-rose-400/10', text: 'text-rose-800', border: 'border-rose-400/20' },
        [RecommendationCategory.Strategic]: { bg: 'bg-purple-500/10', text: 'text-purple-800', border: 'border-purple-500/30' },
    };
    
    const style = categoryStyles[action.category] || { bg: 'bg-gray-400/10', text: 'text-gray-800', border: 'border-gray-400/20' };

    const renderStatusTransitionButton = () => {
        switch (action.status) {
            case RecommendationStatus.Proposed:
                return (
                    <Button 
                        variant="primary" 
                        onClick={() => handleStatusChange(RecommendationStatus.InProgress)}
                        className="py-1 px-3 text-xs"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        بدء التنفيذ
                    </Button>
                );

            case RecommendationStatus.InProgress:
                return (
                    <Button 
                        variant="primary" 
                        onClick={() => handleStatusChange(RecommendationStatus.Implemented)}
                        className="py-1 px-3 text-xs"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        تم التطبيق
                    </Button>
                );

            case RecommendationStatus.Implemented:
                return (
                    <div className="flex gap-2 justify-center">
                        <Button 
                            variant="secondary"
                            onClick={() => handleStatusChange(RecommendationStatus.Verified)}
                            className="py-1 px-3 text-xs bg-green-100/60 text-green-800 border-green-200/50 hover:bg-green-200/60"
                        >
                            تم التحقق (فعال)
                        </Button>
                         <Button 
                            variant="secondary" 
                            onClick={() => handleStatusChange(RecommendationStatus.Ineffective)}
                            className="py-1 px-3 text-xs bg-red-100/60 text-red-800 border-red-200/50 hover:bg-red-200/60"
                        >
                            (غير فعال)
                        </Button>
                    </div>
                );
            case RecommendationStatus.Ineffective:
                const handleSuggest = async () => {
                    if (!onSuggestAlternative) return;
                    setIsSuggesting(true);
                    try {
                        await onSuggestAlternative(action);
                    } catch (e) {
                        console.error("Failed to suggest alternative from ActionCard", e);
                        // The parent component is responsible for displaying the error.
                    } finally {
                        setIsSuggesting(false);
                    }
                };
                return (
                    <div>
                        <p className="text-xs text-center text-red-700 mb-3 font-semibold">تم تحديد هذا الإجراء بأنه غير فعال.</p>
                        <Button
                            variant="secondary"
                            onClick={handleSuggest}
                            isLoading={isSuggesting}
                            disabled={!onSuggestAlternative || isSuggesting}
                            className="py-1 px-3 text-xs w-full bg-yellow-100/60 text-yellow-800 border-yellow-200/50 hover:bg-yellow-200/60"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691L7.985 5.644m12.038 0L16.023 9.348" /></svg>
                            {isSuggesting ? 'جاري الاقتراح...' : 'اقتراح حل بديل'}
                        </Button>
                    </div>
                );
            default:
                return null;
        }
    };
    
    const canEditFields = viewContext === 'my-actions' && (action.status === RecommendationStatus.InProgress || (action.status === RecommendationStatus.Proposed));
    const daysCounter = calculateDaysBetween(incidentDate, action.dueDate || '');

    return (
        <div className={`border rounded-xl p-4 mb-4 ${isMeta ? 'bg-purple-500/10 border-purple-500/30' : style.bg} ${isMeta ? 'border-purple-500/30' : style.border} transition-all`}>
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span title={action.type} className={`inline-flex items-center gap-x-1.5 px-2 py-1 text-xs font-semibold rounded-full border ${typeStyle}`}>
                        {typeIcon}
                        <span className="hidden sm:inline">{action.type}</span>
                    </span>
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${isMeta ? 'bg-purple-500/20 text-purple-800 border-purple-500/30' : `${style.bg} ${style.text} border ${style.border}`}`}>{isMeta ? 'إجراء استراتيجي' : action.category}</span>
                </div>
               <Tag type={action.status} />
            </div>

            {/* Action Details */}
            <p className="font-semibold text-gray-900 my-3 flex items-start gap-x-2">
                 {isMeta && <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-purple-600 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                <span>{action.action}</span>
            </p>
            
            {/* Ownership & Due Date */}
            <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t border-gray-900/10 items-start">
                <div>
                    <label htmlFor={`owner-${action.id}`} className="text-xs font-semibold text-gray-500">المالك</label>
                     {canEditFields ? (
                        <input
                            id={`owner-${action.id}`}
                            type="text"
                            value={editableOwner}
                            onChange={(e) => setEditableOwner(e.target.value)}
                            onBlur={handleOwnerUpdate}
                            placeholder="أدخل اسم المالك"
                            className={baseInputClasses}
                        />
                    ) : (
                        <p className="text-sm mt-1 text-gray-800 font-medium h-[35px] flex items-center">{action.owner || 'غير محدد'}</p>
                    )}
                </div>
                <div>
                    <label htmlFor={`dueDate-${action.id}`} className="text-xs font-semibold text-gray-500">تاريخ الاستحقاق</label>
                    {canEditFields ? (
                        <input
                            id={`dueDate-${action.id}`}
                            type="date"
                            value={editableDueDate ? new Date(editableDueDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => setEditableDueDate(e.target.value)}
                            onBlur={handleDueDateUpdate}
                            className={baseInputClasses}
                        />
                    ) : (
                         <p className="text-sm mt-1 text-gray-800 font-medium h-[35px] flex items-center">{action.dueDate ? new Date(action.dueDate).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                    )}
                    {daysCounter !== null && daysCounter >= 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            (المدة: {daysCounter} {daysCounter === 1 ? 'يوم' : 'أيام'})
                        </p>
                    )}
                </div>
            </div>

            {/* Transition Button */}
             {viewContext === 'my-actions' && (
                 <div className="mt-4 pt-3 border-t border-gray-900/10 flex gap-2 items-center justify-center flex-wrap">
                    {renderStatusTransitionButton()}
                    
                    {action.implementationPlan ? (
                        <Button variant="secondary" onClick={() => setIsPlanVisible(!isPlanVisible)} className="py-1 px-3 text-xs">
                            {isPlanVisible ? 'إخفاء الخطة' : 'عرض الخطة'}
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            onClick={handleGeneratePlan}
                            isLoading={isGeneratingPlan}
                            disabled={isGeneratingPlan || !onGeneratePlan}
                            className="py-1 px-3 text-xs"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            احصل على مساعدة ذكية
                        </Button>
                    )}
                 </div>
             )}

             {isPlanVisible && action.implementationPlan && (
                <div className="mt-4 pt-4 border-t border-gray-900/10 space-y-4">
                    <h4 className="font-bold text-sm text-gray-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h.01M15 12h.01M10.5 16.5h3m-6.38-3.38l-1.42-1.42a1 1 0 00-1.41 1.41l1.41 1.41a1 1 0 001.41-1.41zM18.38 16.88l-1.42-1.42a1 1 0 00-1.41 1.41l1.41 1.41a1 1 0 001.41-1.41zM5.62 9.12l1.42 1.42a1 1 0 001.41-1.41L7.04 7.71a1 1 0 00-1.42 1.41z" /></svg>
                        مساعد التنفيذ الذكي
                    </h4>
                    <div>
                        <p className="font-semibold text-xs text-blue-800 mb-1">أدوات مقترحة:</p>
                        <div className="space-y-2">
                             {action.implementationPlan.tools.map((tool, index) => (
                                <div key={index} className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/10 text-xs">
                                    <p className="font-bold text-blue-900">{tool.name}</p>
                                    <p className="text-blue-800/90">{tool.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <p className="font-semibold text-xs text-purple-800 mb-1">سيناريو تنفيذي:</p>
                        <div className="prose prose-xs max-w-none text-gray-700 p-2 bg-purple-500/5 rounded-lg border border-purple-500/10 whitespace-pre-wrap">
                           {action.implementationPlan.scenario}
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};

export default ActionCard;