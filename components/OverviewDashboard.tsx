import React, { useState } from 'react';
import { IncidentReport, RecommendationStatus, IncidentStatus, SystemicInsight, IncidentSeverity, DashboardBriefing, ActiveView } from '../types';
import { generateSystemicInsights, getDashboardBriefing } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';
import Tag from './ui/Tag';

interface OverviewDashboardProps {
  incidents: IncidentReport[];
  onNavigate: (view: ActiveView, incidentId?: string | null) => void;
  systemicInsights: SystemicInsight[];
  setSystemicInsights: (insights: SystemicInsight[]) => void;
  dashboardBriefing: DashboardBriefing | null;
  setDashboardBriefing: (briefing: DashboardBriefing | null) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-center p-4">
        <div className="p-3 rounded-full text-white bg-gradient-to-br from-blue-500 to-indigo-600 ml-4 shadow-lg shadow-blue-500/30">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </Card>
);

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ 
    incidents, 
    onNavigate, 
    systemicInsights, 
    setSystemicInsights,
    dashboardBriefing,
    setDashboardBriefing,
}) => {
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateInsights = async () => {
        setIsLoadingInsights(true);
        setError(null);
        try {
            const results = await generateSystemicInsights(incidents);
            setSystemicInsights(results);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
        } finally {
            setIsLoadingInsights(false);
        }
    };
    
    const handleGenerateBriefing = async () => {
        setIsLoadingBriefing(true);
        setError(null);
        try {
            const results = await getDashboardBriefing(incidents);
            setDashboardBriefing(results);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
        } finally {
            setIsLoadingBriefing(false);
        }
    };

    const openIncidents = incidents.filter(inc => inc.status !== IncidentStatus.Resolved && inc.status !== IncidentStatus.Archived).length;
    const solutionsInProgress = incidents
        .flatMap(inc => inc.analysis?.recommendations || [])
        .filter(rec => rec.status === RecommendationStatus.InProgress || rec.status === RecommendationStatus.Implemented).length;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">مركز القيادة</h1>
                <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                    نظرة شاملة وذكية على الأداء التشغيلي، المخاطر المحتملة، والأنماط الخفية.
                </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <StatCard title="إجمالي الحوادث" value={incidents.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 00-4-4H3V9h2a4 4 0 004-4V3l4 4-4 4v2a4 4 0 004 4h2v2h-2a4 4 0 00-4 4z" /></svg>} />
                <StatCard title="الحوادث المفتوحة" value={openIncidents} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="حلول قيد المتابعة" value={solutionsInProgress} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5V4H4zm0 11v5h5v-5H4zm11-11v5h5V4h-5zm0 11v5h5v-5h-5z" /></svg>} />
            </div>

            {error && <div className="my-4 p-3 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-sm">{error}</div>}
            
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Intelligence Briefing */}
                <Card className="lg:col-span-2">
                     <h2 className="text-xl font-bold text-gray-800 font-cairo mb-4">الموجز الاستخباري</h2>
                     <Button onClick={handleGenerateBriefing} isLoading={isLoadingBriefing} variant='primary' className="w-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        إنشاء موجز استخباري
                     </Button>
                     {dashboardBriefing && (
                         <div className="mt-4 space-y-6">
                            {dashboardBriefing.earlyWarnings.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>الإنذارات المبكرة</h3>
                                    <div className="space-y-3">
                                        {dashboardBriefing.earlyWarnings.map((warning, i) => (
                                            <div key={i} className="p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                                                <p className="font-semibold text-yellow-900">{warning.prediction}</p>
                                                <p className="text-sm text-yellow-800 mt-1">{warning.reasoning}</p>
                                                <div className="text-xs mt-2 flex justify-between items-center">
                                                <span className="font-bold text-yellow-900">{(warning.probability * 100).toFixed(0)}% احتمال</span>
                                                    <button onClick={() => onNavigate('incident', warning.linkedIncidentId)} className="text-blue-600 hover:underline">الحادث المشابه</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                             {dashboardBriefing.kpiImpacts.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>تأثير الأداء (KPI)</h3>
                                    <div className="space-y-4">
                                        {dashboardBriefing.kpiImpacts.map((impact, i) => (
                                            <div key={i} className="p-4 bg-red-400/10 rounded-lg border border-red-400/20">
                                                <p className="font-bold text-red-900 text-lg">{impact.impactStatement}</p>
                                                <p className="text-sm text-red-800 mt-1">
                                                    <span className="font-semibold">{impact.kpi}</span> - بسبب: <span className="italic">"{impact.issue}"</span>
                                                </p>
                                                <p className="text-xs text-gray-600 mt-2 p-2 bg-red-200/20 rounded-md">
                                                    <span className="font-semibold">أساس التقدير:</span> {impact.reasoning}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             )}
                         </div>
                     )}
                </Card>

                {/* Systemic Insights */}
                <Card className="lg:col-span-1">
                     <h2 className="text-xl font-bold text-gray-800 font-cairo mb-4">تحليل على مستوى المنظومة</h2>
                     <p className="text-sm text-gray-600 mb-4">اكشف عن المخاطر النظامية والأنماط العابرة للحوادث المختلفة.</p>
                     <Button onClick={handleGenerateInsights} isLoading={isLoadingInsights} variant='secondary' className="w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        توليد رؤى نظامية
                    </Button>
                     {systemicInsights.length > 0 && (
                        <div className="mt-6 space-y-4">
                            {systemicInsights.map((insight, index) => (
                                <div key={index} className="p-4 bg-purple-400/10 rounded-lg border border-purple-400/20">
                                <p className="font-bold text-purple-900">{insight.title}</p>
                                <p className="text-sm text-purple-800 mt-2">{insight.description}</p>
                                <p className="text-sm text-purple-800 mt-3 bg-purple-200/40 p-2 rounded-md"><strong className='font-semibold'>توصية:</strong> {insight.proactiveRecommendation}</p>
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-purple-700">حوادث داعمة:</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {insight.supportingIncidents.map(id => (
                                            <button key={id} onClick={() => onNavigate('incident', id)} className="text-xs bg-purple-200/50 text-purple-900 px-2 py-0.5 rounded-full hover:bg-purple-300/50">{id}</button>
                                        ))}
                                    </div>
                                </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default OverviewDashboard;