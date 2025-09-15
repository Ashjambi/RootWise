
import React, { useMemo, useState } from 'react';
import { IncidentReport, IncidentSeverity, ActiveView, IncidentStatus } from '../types';
import Card from './ui/Card';
import RiskTable, { RiskItem } from './RiskTable';
import RiskDetailModal from './RiskDetailModal';
import Button from './ui/Button';

interface RiskDashboardViewProps {
  incidents: IncidentReport[];
  onNavigate: (view: ActiveView, incidentId?: string) => void;
}

const RiskDashboardView: React.FC<RiskDashboardViewProps> = ({ incidents, onNavigate }) => {
    const [modalData, setModalData] = useState<{ title: string; incidents: IncidentReport[] } | null>(null);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        department: 'all',
        severity: 'all',
        status: 'all',
    });

    const uniqueDepartments = useMemo(() => [...new Set(incidents.map(inc => inc.department).filter(Boolean))], [incidents]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            dateFrom: '',
            dateTo: '',
            department: 'all',
            severity: 'all',
            status: 'all',
        });
    };
    
    const filteredIncidents = useMemo(() => {
        return incidents.filter(inc => {
            if (filters.dateFrom) {
                const incidentDate = new Date(inc.date);
                incidentDate.setHours(0,0,0,0);
                if (incidentDate < new Date(filters.dateFrom)) return false;
            }
            if (filters.dateTo) {
                const incidentDate = new Date(inc.date);
                incidentDate.setHours(0,0,0,0);
                if (incidentDate > new Date(filters.dateTo)) return false;
            }
            if (filters.department !== 'all' && inc.department !== filters.department) return false;
            if (filters.severity !== 'all' && inc.severity !== filters.severity) return false;
            if (filters.status !== 'all' && inc.status !== filters.status) return false;
            return true;
        });
    }, [incidents, filters]);

    const { departments, rootCauses, personnel } = useMemo(() => {
        const severityScores: Record<IncidentSeverity, number> = {
            [IncidentSeverity.Low]: 1,
            [IncidentSeverity.Medium]: 3,
            [IncidentSeverity.High]: 5,
            [IncidentSeverity.Critical]: 10,
        };

        const calculateRisk = (groupedIncidents: Record<string, IncidentReport[]>): RiskItem[] => {
            return Object.entries(groupedIncidents)
                .map(([name, group]) => {
                    if (!name || name === 'N/A' || name.trim() === '') return null;
                    const totalSeverity = group.reduce((sum, inc) => sum + severityScores[inc.severity], 0);
                    const riskScore = group.length * totalSeverity;
                    return {
                        name,
                        count: group.length,
                        riskScore,
                        highestSeverity: group.sort((a, b) => severityScores[b.severity] - severityScores[a.severity])[0].severity,
                        incidents: group,
                    };
                })
                .filter((item): item is RiskItem => item !== null)
                .sort((a, b) => b.riskScore - a.riskScore)
                .slice(0, 15);
        };
        
        const byDepartment = filteredIncidents.reduce((acc, inc) => {
            if (inc.department) {
                if (!acc[inc.department]) acc[inc.department] = [];
                acc[inc.department].push(inc);
            }
            return acc;
        }, {} as Record<string, IncidentReport[]>);

        const byRootCause = filteredIncidents.reduce((acc, inc) => {
            const cause = inc.analysis?.rootCause?.cause || 'N/A';
            if (!acc[cause]) acc[cause] = [];
            acc[cause].push(inc);
            return acc;
        }, {} as Record<string, IncidentReport[]>);
        
        const byPersonnel = filteredIncidents.reduce((acc, inc) => {
            const people = inc.involvedPersonnel.split(',').map(p => p.trim()).filter(p => p);
            people.forEach(person => {
                 if (!acc[person]) acc[person] = [];
                 acc[person].push(inc);
            });
            return acc;
        }, {} as Record<string, IncidentReport[]>);

        return {
            departments: calculateRisk(byDepartment),
            rootCauses: calculateRisk(byRootCause),
            personnel: calculateRisk(byPersonnel),
        };

    }, [filteredIncidents]);
    
    const handleItemClick = (item: RiskItem) => {
        setModalData({ title: `الحوادث المتعلقة بـ: ${item.name}`, incidents: item.incidents });
    };

    const handleExportCsv = () => {
        const headers = ['Type', 'Name', 'Incident Count', 'Risk Score', 'Highest Severity'];
        
        const formatCsvRow = (data: (string | number)[]) => {
            return data.map(value => {
                const strValue = String(value);
                if (strValue.includes('"') || strValue.includes(',')) {
                    return `"${strValue.replace(/"/g, '""')}"`;
                }
                return strValue;
            }).join(',');
        };

        const createCsvSection = (title: string, data: RiskItem[]): string[] => {
            if (data.length === 0) return [];
            return [
                title,
                headers.join(','),
                ...data.map(item => formatCsvRow([title, item.name, item.count, item.riskScore, item.highestSeverity]))
            ];
        };
        
        const csvContent = [
            ...createCsvSection('Departments', departments),
            '', 
            ...createCsvSection('Root Causes', rootCauses),
            '',
            ...createCsvSection('Personnel', personnel)
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `RootWise_Risk_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <>
            <div>
                <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">لوحة مؤشرات المخاطر</h1>
                        <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                            تحليل وتصنيف المخاطر التراكمية حسب القسم، السبب الجذري، والأفراد لتحديد أولويات التحسين. انقر على أي صف لعرض الحوادث المرتبطة.
                        </p>
                    </div>
                     <Button onClick={handleExportCsv} disabled={departments.length === 0 && rootCauses.length === 0 && personnel.length === 0}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        تصدير إلى CSV
                    </Button>
                </div>

                <Card className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 font-cairo mb-4">خيارات التصفية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="text-xs font-semibold text-gray-500">من تاريخ</label>
                            <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 border rounded-lg shadow-inner-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/70 border-white/80" />
                        </div>
                         <div>
                            <label className="text-xs font-semibold text-gray-500">إلى تاريخ</label>
                            <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 border rounded-lg shadow-inner-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/70 border-white/80" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500">القسم</label>
                            <select name="department" value={filters.department} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 border rounded-lg shadow-inner-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/70 border-white/80">
                                <option value="all">الكل</option>
                                {uniqueDepartments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500">الخطورة</label>
                            <select name="severity" value={filters.severity} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 border rounded-lg shadow-inner-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/70 border-white/80">
                                <option value="all">الكل</option>
                                {Object.values(IncidentSeverity).map(sev => <option key={sev} value={sev}>{sev}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="text-xs font-semibold text-gray-500">الحالة</label>
                            <select name="status" value={filters.status} onChange={handleFilterChange} className="mt-1 block w-full px-3 py-2 border rounded-lg shadow-inner-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white/70 border-white/80">
                                <option value="all">الكل</option>
                                {Object.values(IncidentStatus).map(stat => <option key={stat} value={stat}>{stat}</option>)}
                            </select>
                        </div>
                        <div className="xl:col-span-5 text-center mt-2">
                             <Button onClick={resetFilters} variant="secondary" className="py-2 px-4 text-sm">
                                إعادة تعيين الفلاتر
                            </Button>
                        </div>
                    </div>
                </Card>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-1">
                        <RiskTable title="الأقسام الأعلى خطورة" items={departments} onItemClick={handleItemClick} />
                    </Card>
                    <Card className="lg:col-span-1">
                        <RiskTable title="الأسباب الجذرية الأعلى خطورة" items={rootCauses} onItemClick={handleItemClick} />
                    </Card>
                    <Card className="lg:col-span-1">
                        <RiskTable title="الأفراد الأكثر ارتباطًا بالحوادث" items={personnel} onItemClick={handleItemClick} />
                    </Card>
                </div>
            </div>

            {modalData && (
                <RiskDetailModal
                    isOpen={!!modalData}
                    onClose={() => setModalData(null)}
                    title={modalData.title}
                    incidents={modalData.incidents}
                    onNavigate={onNavigate}
                />
            )}
        </>
    );
};

export default RiskDashboardView;