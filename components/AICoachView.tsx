import React, { useState } from 'react';
import { IncidentReport, ManagerialInsight } from '../types';
import { getManagerialInsights } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';

interface AICoachViewProps {
  incidents: IncidentReport[];
}

const InsightCard: React.FC<{ insight: ManagerialInsight, index: number }> = ({ insight, index }) => {
    const priorityStyles = {
        'عاجل': 'border-red-500/50 bg-red-500/5 text-red-800',
        'هام': 'border-orange-500/50 bg-orange-500/5 text-orange-800',
        'استراتيجي': 'border-purple-500/50 bg-purple-500/5 text-purple-800',
    };
    const style = priorityStyles[insight.priority] || 'border-gray-500/50 bg-gray-500/5 text-gray-800';

    const icons = [
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v11.494m-9-5.747h18" /></svg>,
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    ];

    return (
        <Card className={`flex flex-col h-full border-2 ${style}`}>
            <div className="flex justify-between items-start">
                 <span className={`font-bold text-4xl opacity-10`}>{`0${index + 1}`}</span>
                 <div className="text-right">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${style}`}>{insight.priority}</span>
                 </div>
            </div>
            <div className={`mt-2 ${style.replace('text-', 'text-opacity-60 text-')} `}>
                {icons[index % 3]}
            </div>
            <h3 className="text-xl font-bold font-cairo mt-4">{insight.title}</h3>
            <p className="mt-2 text-sm flex-grow">{insight.recommendation}</p>
            <p className="text-xs italic mt-4 opacity-70"><strong>لماذا:</strong> {insight.rationale}</p>
        </Card>
    );
};


const AICoachView: React.FC<AICoachViewProps> = ({ incidents }) => {
    const [insights, setInsights] = useState<ManagerialInsight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetInsights = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const results = await getManagerialInsights(incidents);
            setInsights(results);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'فشل في الحصول على توصيات.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">مساعد المدير الذكي</h1>
                <p className="mt-2 text-lg text-gray-600 max-w-2xl mx-auto">
                    احصل على أهم 3 قرارات استراتيجية يجب اتخاذها الآن بناءً على تحليل شامل للبيانات التشغيلية.
                </p>
            </div>
            
            <div className="text-center mb-8">
                 <Button onClick={handleGetInsights} isLoading={isLoading} disabled={isLoading} className="px-8 py-3 text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    احصل على توصيات اليوم
                </Button>
            </div>

            {error && <div className="mt-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{error}</div>}
             {isLoading && (
                <div className="text-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">جاري تحليل الوضع واقتراح القرارات...</p>
                </div>
            )}

            {insights.length > 0 && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {insights.map((insight, index) => (
                        <InsightCard key={index} insight={insight} index={index} />
                    ))}
                 </div>
            )}
        </div>
    );
};

export default AICoachView;
