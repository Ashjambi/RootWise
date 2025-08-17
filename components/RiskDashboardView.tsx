import React, { useMemo } from 'react';
import { IncidentReport, IncidentSeverity } from '../types';
import Card from './ui/Card';

interface RiskDashboardViewProps {
  incidents: IncidentReport[];
}

type RiskItem = {
    name: string;
    count: number;
    riskScore: number;
    highestSeverity: IncidentSeverity;
}

const RiskCategoryCard: React.FC<{ title: string, items: RiskItem[] }> = ({ title, items }) => {
    const getRiskColor = (score: number, maxScore: number): string => {
        if (maxScore === 0) return 'bg-gray-400';
        const ratio = score / maxScore;
        if (ratio > 0.7) return 'bg-red-500';
        if (ratio > 0.35) return 'bg-orange-500';
        return 'bg-green-500';
    };
    
    const maxScore = items.length > 0 ? Math.max(...items.map(i => i.riskScore)) : 1;

    return (
        <Card>
            <h2 className="text-xl font-bold text-gray-800 font-cairo mb-4">{title}</h2>
            <div className="space-y-3">
                {items.length > 0 ? items.map(item => (
                    <div key={item.name} className="p-3 bg-white/50 rounded-lg shadow-sm transition-all duration-300 hover:shadow-lg hover:bg-white/70">
                        <div className="flex justify-between items-center mb-2">
                            <p className="font-semibold text-gray-800 truncate" title={item.name}>{item.name}</p>
                            <div 
                                className="flex items-center flex-shrink-0 ml-2" 
                                title="درجة الخطورة = (عدد الحوادث × مجموع نقاط الخطورة)"
                            >
                                <span className="text-xs font-semibold text-gray-600 hidden sm:inline mr-2">الخطورة</span>
                                <span className={`text-sm font-bold w-10 text-center py-0.5 rounded-full text-white cursor-help ${getRiskColor(item.riskScore, maxScore)}`}>
                                    {item.riskScore}
                                </span>
                            </div>
                        </div>
                         <div className="relative pt-1">
                            <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-gray-200">
                                <div style={{ width: `${(item.riskScore / (maxScore > 0 ? maxScore : 1)) * 100}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${getRiskColor(item.riskScore, maxScore)}`}></div>
                            </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>{item.count} حوادث</span>
                            <span>أعلى خطورة: {item.highestSeverity}</span>
                        </div>
                    </div>
                )) : <p className="text-sm text-center text-gray-500 py-4">لا توجد بيانات كافية للتحليل.</p>}
            </div>
        </Card>
    );
};


const RiskDashboardView: React.FC<RiskDashboardViewProps> = ({ incidents }) => {

    const riskData = useMemo(() => {
        const severityScores: Record<IncidentSeverity, number> = {
            [IncidentSeverity.Low]: 1,
            [IncidentSeverity.Medium]: 3,
            [IncidentSeverity.High]: 5,
            [IncidentSeverity.Critical]: 10,
        };

        const calculateRisk = (groupedIncidents: Record<string, IncidentReport[]>): RiskItem[] => {
            return Object.entries(groupedIncidents)
                .map(([name, group]) => {
                    if (!name || name === 'N/A') return null;
                    const totalSeverity = group.reduce((sum, inc) => sum + severityScores[inc.severity], 0);
                    const riskScore = group.length * totalSeverity;
                    return {
                        name,
                        count: group.length,
                        riskScore,
                        highestSeverity: group.sort((a,b) => severityScores[b.severity] - severityScores[a.severity])[0].severity,
                    };
                })
                .filter((item): item is RiskItem => item !== null)
                .sort((a, b) => b.riskScore - a.riskScore)
                .slice(0, 10);
        };
        
        const byDepartment = incidents.reduce((acc, inc) => {
            if (inc.department) {
                if (!acc[inc.department]) acc[inc.department] = [];
                acc[inc.department].push(inc);
            }
            return acc;
        }, {} as Record<string, IncidentReport[]>);

        const byRootCause = incidents.reduce((acc, inc) => {
            const cause = inc.analysis?.rootCause?.cause || 'N/A';
            if (!acc[cause]) acc[cause] = [];
            acc[cause].push(inc);
            return acc;
        }, {} as Record<string, IncidentReport[]>);
        
        const byPersonnel = incidents.reduce((acc, inc) => {
            const people = inc.involvedPersonnel.split(',').map(p => p.trim());
            people.forEach(person => {
                 if (person && !acc[person]) acc[person] = [];
                 if (person) acc[person].push(inc);
            });
            return acc;
        }, {} as Record<string, IncidentReport[]>);

        return {
            departments: calculateRisk(byDepartment),
            rootCauses: calculateRisk(byRootCause),
            personnel: calculateRisk(byPersonnel),
        };

    }, [incidents]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">لوحة مؤشرات المخاطر</h1>
                <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                    تحليل وتصنيف المخاطر التراكمية حسب القسم، السبب الجذري، والأفراد لتحديد أولويات التحسين.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <RiskCategoryCard title="الأقسام الأعلى خطورة" items={riskData.departments} />
                <RiskCategoryCard title="الأسباب الجذرية الأعلى خطورة" items={riskData.rootCauses} />
                <RiskCategoryCard title="الأفراد الأكثر ارتباطًا بالحوادث" items={riskData.personnel} />
            </div>
        </div>
    );
};

export default RiskDashboardView;