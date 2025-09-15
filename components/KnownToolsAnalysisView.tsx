import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { IncidentReport, FiveWhysAnalysis, FishboneAnalysis, ParetoAnalysis, FmeaAnalysis, FaultTreeAnalysis, FaultTreeEvent, PokaYokeAnalysis, DmaicAnalysis } from '../types';
import { perform5WhysAnalysis, performFishboneAnalysis, performParetoAnalysis, performFmeaAnalysis, performFaultTreeAnalysis, performPokaYokeAnalysis, performDmaicAnalysis } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

interface KnownToolsAnalysisViewProps {
  incidents: IncidentReport[];
  onUpdateIncident: (incident: IncidentReport) => void;
  paretoAnalysis: ParetoAnalysis | null;
  setParetoAnalysis: (analysis: ParetoAnalysis | null) => void;
}

const FishboneCategoryCard: React.FC<{ categoryKey: keyof FishboneAnalysis['causes'], causes: string[] }> = ({ categoryKey, causes }) => {
    const categoryDetails: Record<keyof FishboneAnalysis['causes'], { name: string, icon: JSX.Element, color: string }> = {
        manpower: { name: 'الأشخاص', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, color: 'text-blue-600' },
        methods: { name: 'الأساليب', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, color: 'text-purple-600' },
        machines: { name: 'الآلات', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.94-3.31.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, color: 'text-teal-600' },
        materials: { name: 'المواد', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, color: 'text-orange-600' },
        measurement: { name: 'القياس', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l-6-2m6 2l-3 1m-3-1l-3-1m5.414 7.586a2 2 0 112.828 0 2 2 0 010 2.828 2 2 0 01-2.828 0 2 2 0 010-2.828z" /></svg>, color: 'text-pink-600' },
        motherNature: { name: 'البيئة', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.5l-.5 4.5M16.293 4.5l.5 4.5M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>, color: 'text-green-600' },
    };
    const { name, icon, color } = categoryDetails[categoryKey];

    return (
        <Card className={`!p-3 h-full bg-white/50 border-t-4 ${color.replace('text', 'border')}`}>
            <h4 className={`font-bold text-center mb-3 capitalize flex items-center justify-center gap-x-2 ${color}`}>
                {icon}
                <span>{name}</span>
            </h4>
            <ul className="space-y-1.5">
                {causes.map((cause, index) => (
                    <li key={index} className="text-sm text-gray-700 bg-gray-500/5 p-2 rounded-md border border-gray-500/10 flex items-start">
                        <svg className="h-3 w-3 text-gray-400 mr-2 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                        <span>{cause}</span>
                    </li>
                ))}
                {causes.length === 0 && <li className="text-xs text-center text-gray-500 italic py-2">لا توجد أسباب مقترحة</li>}
            </ul>
        </Card>
    );
};

const KnownToolsAnalysisView: React.FC<KnownToolsAnalysisViewProps> = ({ incidents, onUpdateIncident, paretoAnalysis, setParetoAnalysis }) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  type AnalysisTool = '5whys' | 'fishbone' | 'pareto' | 'fmea' | 'fta' | 'pokayoke' | 'dmaic';
  const [analysisStates, setAnalysisStates] = useState<Record<AnalysisTool, { isLoading: boolean, error: string | null }>>({
    '5whys': { isLoading: false, error: null },
    'fishbone': { isLoading: false, error: null },
    'pareto': { isLoading: false, error: null },
    'fmea': { isLoading: false, error: null },
    'fta': { isLoading: false, error: null },
    'pokayoke': { isLoading: false, error: null },
    'dmaic': { isLoading: false, error: null },
  });
  const [activeTool, setActiveTool] = useState<AnalysisTool>('pareto');
  const paretoChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const analyzableIncidents = useMemo(() => incidents.filter(inc => inc.analysis), [incidents]);
  
  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return null;
    return incidents.find(inc => inc.id === selectedIncidentId) || null;
  }, [selectedIncidentId, incidents]);

  const handleUpdateIncident = useCallback((updatedIncident: IncidentReport) => {
    onUpdateIncident(updatedIncident);
  }, [onUpdateIncident]);

  const setAnalysisState = (tool: AnalysisTool, state: { isLoading: boolean, error: string | null }) => {
    setAnalysisStates(prev => ({ ...prev, [tool]: state }));
  }
  
  const handlePerformIncidentAnalysis = useCallback(async (tool: '5whys' | 'fishbone' | 'fmea' | 'fta' | 'pokayoke' | 'dmaic') => {
    if (!selectedIncident || !selectedIncident.analysis) {
        setAnalysisState(tool, { isLoading: false, error: "يجب إجراء تحليل السبب الجذري أولاً." });
        return;
    }

    setAnalysisState(tool, { isLoading: true, error: null });

    try {
      if (tool === '5whys') {
        const result = await perform5WhysAnalysis(selectedIncident);
        handleUpdateIncident({ ...selectedIncident, fiveWhysAnalysis: result });
      } else if (tool === 'fishbone') {
        const result = await performFishboneAnalysis(selectedIncident);
        handleUpdateIncident({ ...selectedIncident, fishboneAnalysis: result });
      } else if (tool === 'fmea') {
        const result = await performFmeaAnalysis(selectedIncident);
        handleUpdateIncident({ ...selectedIncident, fmeaAnalysis: result });
      } else if (tool === 'fta') {
        const result = await performFaultTreeAnalysis(selectedIncident);
        handleUpdateIncident({ ...selectedIncident, faultTreeAnalysis: result });
      } else if (tool === 'pokayoke') {
        const result = await performPokaYokeAnalysis(selectedIncident);
        handleUpdateIncident({ ...selectedIncident, pokaYokeAnalysis: result });
      } else if (tool === 'dmaic') {
        const result = await performDmaicAnalysis(selectedIncident);
        handleUpdateIncident({ ...selectedIncident, dmaicAnalysis: result });
      }
      setAnalysisState(tool, { isLoading: false, error: null });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : `حدث خطأ غير معروف أثناء تحليل '${tool}'.`;
      setAnalysisState(tool, { isLoading: false, error: errorMessage });
    }
  }, [selectedIncident, handleUpdateIncident]);

  const handlePerformParetoAnalysis = useCallback(async () => {
    setAnalysisState('pareto', { isLoading: true, error: null });
    try {
        const result = await performParetoAnalysis(incidents);
        setParetoAnalysis(result);
        setAnalysisState('pareto', { isLoading: false, error: null });
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "حدث خطأ غير معروف أثناء تحليل باريتو.";
        setAnalysisState('pareto', { isLoading: false, error: errorMessage });
    }
  }, [incidents, setParetoAnalysis]);

  useEffect(() => {
    if (paretoAnalysis && paretoChartRef.current) {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const labels = paretoAnalysis.items.map(item => item.cause);
        const frequencies = paretoAnalysis.items.map(item => item.frequency);
        const cumulativePercentages = paretoAnalysis.items.map(item => item.cumulativePercentage);

        const ctx = paretoChartRef.current.getContext('2d');
        if (ctx) {
            chartInstanceRef.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'تكرار الأسباب',
                            data: frequencies,
                            backgroundColor: 'rgba(59, 130, 246, 0.6)',
                            borderColor: 'rgba(59, 130, 246, 1)',
                            borderWidth: 1,
                            yAxisID: 'y',
                            order: 2,
                        },
                        {
                            label: 'النسبة التراكمية %',
                            data: cumulativePercentages,
                            type: 'line',
                            borderColor: 'rgba(239, 68, 68, 1)',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            fill: false,
                            yAxisID: 'y1',
                            order: 1,
                            tension: 0.1,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'التكرار' },
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'النسبة التراكمية (%)' },
                            min: 0,
                            max: 100,
                            grid: { drawOnChartArea: false },
                        }
                    },
                    plugins: { tooltip: { mode: 'index', intersect: false } }
                }
            });
        }
    }

    return () => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
    }
  }, [paretoAnalysis]);


  const analysisTools = [
      { id: 'pareto', name: "تحليل باريتو (80/20)" },
      { id: 'fmea', name: "تحليل نمط وتأثير الفشل (FMEA)" },
      { id: 'fta', name: "تحليل شجرة الأخطاء (FTA)" },
      { id: 'pokayoke', name: "Poka-Yoke (مقاومة الأخطاء)" },
      { id: 'dmaic', name: "Lean Six Sigma (DMAIC)" },
      { id: '5whys', name: "تحليل 'لماذا' الخمسة" },
      { id: 'fishbone', name: "مخطط هيكل السمكة" },
  ];

  const renderIncidentSpecificTool = (tool: '5whys' | 'fishbone' | 'fmea' | 'fta' | 'pokayoke' | 'dmaic') => {
      const analysis = tool === '5whys' ? selectedIncident?.fiveWhysAnalysis : 
                       (tool === 'fishbone' ? selectedIncident?.fishboneAnalysis : 
                       (tool === 'fmea' ? selectedIncident?.fmeaAnalysis : 
                       (tool === 'fta' ? selectedIncident?.faultTreeAnalysis :
                       (tool === 'pokayoke' ? selectedIncident?.pokaYokeAnalysis : selectedIncident?.dmaicAnalysis)
                       )));
      const error = analysisStates[tool].error;
      const isLoading = analysisStates[tool].isLoading;

      return (
        <Card>
            <div className="mb-4">
                <label htmlFor="incident-select" className="block text-sm font-medium text-gray-700 mb-1">اختر حادثًا لتحليله</label>
                <select 
                    id="incident-select" 
                    value={selectedIncidentId || ''} 
                    onChange={e => setSelectedIncidentId(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white/80"
                >
                    <option value="" disabled>-- اختر حادثًا --</option>
                    {analyzableIncidents.map(inc => (
                        <option key={inc.id} value={inc.id}>{inc.title}</option>
                    ))}
                </select>
            </div>
            {selectedIncident ? (
                <div>
                    {error && <div className="my-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{error}</div>}
                    {analysis ? (
                        tool === '5whys' ? <FiveWhysResult analysis={selectedIncident.fiveWhysAnalysis!} /> : 
                        (tool === 'fishbone' ? <FishboneResult analysis={selectedIncident.fishboneAnalysis!} /> :
                        (tool === 'fmea' ? <FmeaResult analysis={selectedIncident.fmeaAnalysis!} /> : 
                        (tool === 'fta' ? <FaultTreeResult analysis={selectedIncident.faultTreeAnalysis!} /> :
                        (tool === 'pokayoke' ? <PokaYokeResult analysis={selectedIncident.pokaYokeAnalysis!} /> :
                        <DmaicResult analysis={selectedIncident.dmaicAnalysis!} />))))
                    ) : (
                        <div className="text-center p-4">
                            <p className="text-sm text-gray-700 mb-4">الحادث المحدد جاهز للتحليل باستخدام هذه الأداة.</p>
                            <Button onClick={() => handlePerformIncidentAnalysis(tool)} isLoading={isLoading}>
                                {`بدء تحليل '${analysisTools.find(t=>t.id === tool)?.name}'`}
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center p-8 text-gray-500">
                    <p>يرجى اختيار حادث من القائمة أعلاه لبدء التحليل.</p>
                </div>
            )}
        </Card>
      );
  };
  
  const FiveWhysResult: React.FC<{ analysis: FiveWhysAnalysis }> = ({ analysis }) => (
      <div className="not-prose mt-4">
          <div className="border-r-4 border-gray-200/80 ml-6 space-y-8 relative">
              <div className="absolute top-0 right-[-10px] w-0.5 h-full bg-gray-200/80 -z-10"></div>
              <div className="relative pr-8">
                  <div className="absolute -right-[8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full border-4 border-white shadow-md"></div>
                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/10">
                      <p className="font-bold text-red-700">المشكلة:</p>
                      <p className="text-gray-800">{analysis.problemStatement}</p>
                  </div>
              </div>
              {analysis.whys.map((item, index) => (
                  <div key={index} className="relative pr-8">
                      <div className="absolute -right-[8px] top-4 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-md"></div>
                      <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/10">
                          <p className="font-semibold text-blue-800">{index + 1}. {item.why}</p>
                          <p className="text-gray-700 mt-1"><strong className='font-normal text-gray-500'>(لأن)</strong> {item.answer}</p>
                      </div>
                  </div>
              ))}
              <div className="relative pr-8">
                  <div className="absolute -right-[8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-md"></div>
                  <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/10">
                      <p className="font-bold text-green-700">السبب الجذري الحقيقي:</p>
                      <p className="text-gray-800 font-semibold">{analysis.finalRootCause}</p>
                  </div>
              </div>
          </div>
      </div>
  );

  const FishboneResult: React.FC<{ analysis: FishboneAnalysis }> = ({ analysis }) => (
       <div>
          <Card className="mb-6 text-center bg-blue-500/5 border-blue-500/10">
              <h3 className="font-semibold text-blue-800">المشكلة (النتيجة)</h3>
              <p className="text-xl font-bold text-gray-900 font-cairo">{analysis.problem}</p>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(analysis.causes) as Array<keyof typeof analysis.causes>).map((key) => (
                 <FishboneCategoryCard key={key} categoryKey={key} causes={analysis.causes[key]} />
              ))}
          </div>
      </div>
  );
  
  const ParetoResult: React.FC<{ analysis: ParetoAnalysis }> = ({ analysis }) => (
    <div className="space-y-6">
        <Card>
            <h3 className="font-bold text-lg text-center mb-2 text-gray-800">مخطط باريتو</h3>
            <p className="text-sm text-center text-gray-600 mb-4">يوضح هذا المخطط الأسباب الأكثر تأثيرًا (الأعمدة) وتأثيرها التراكمي (الخط الأحمر).</p>
            <div className="h-96 relative">
               <canvas ref={paretoChartRef}></canvas>
            </div>
         </Card>
         <Card>
             <h3 className="font-bold text-lg text-center mb-2 text-gray-800">جدول بيانات باريتو</h3>
             <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-100/50">
                        <tr>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السبب</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التكرار</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النسبة %</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النسبة التراكمية %</th>
                        </tr>
                     </thead>
                     <tbody className="bg-white/50 divide-y divide-gray-200/80">
                         {analysis.items.map((item, index) => (
                             <tr key={index} className="hover:bg-gray-500/5">
                                 <td className="px-4 py-3 whitespace-normal text-sm font-medium text-gray-900">{item.cause}</td>
                                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{item.frequency}</td>
                                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{item.percentage.toFixed(1)}%</td>
                                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{item.cumulativePercentage.toFixed(1)}%</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </Card>
    </div>
  );

  const FmeaResult: React.FC<{ analysis: FmeaAnalysis }> = ({ analysis }) => {
    const getRpnColor = (rpn: number) => {
        if (rpn > 300) return 'bg-red-500 text-white';
        if (rpn > 150) return 'bg-orange-400 text-white';
        if (rpn > 80) return 'bg-yellow-400 text-gray-800';
        return 'bg-green-400 text-white';
    };

    return (
        <Card>
            <h3 className="font-bold text-lg text-center mb-4 text-gray-800">نتائج تحليل نمط وتأثير الفشل (FMEA)</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200/80">
                    <thead className="bg-gray-100/50">
                        <tr>
                            <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">نمط الفشل</th>
                            <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">التأثير</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider" title="الخطورة">S</th>
                            <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">السبب المحتمل</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider" title="الحدوث">O</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider" title="الاكتشاف">D</th>
                            <th scope="col" className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider" title="رقم أولوية المخاطر">RPN</th>
                            <th scope="col" className="px-3 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">الإجراء الموصى به</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white/50 divide-y divide-gray-200/80">
                        {analysis.items.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-500/5">
                                <td className="px-3 py-3 text-sm text-gray-800 whitespace-normal">{item.failureMode}</td>
                                <td className="px-3 py-3 text-sm text-gray-700 whitespace-normal">{item.failureEffect}</td>
                                <td className="px-2 py-3 text-sm text-gray-700 text-center font-medium">{item.severity}</td>
                                <td className="px-3 py-3 text-sm text-gray-700 whitespace-normal">{item.potentialCause}</td>
                                <td className="px-2 py-3 text-sm text-gray-700 text-center font-medium">{item.occurrence}</td>
                                <td className="px-2 py-3 text-sm text-gray-700 text-center font-medium">{item.detection}</td>
                                <td className="px-2 py-3 text-sm text-center font-bold">
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${getRpnColor(item.rpn)}`}>
                                        {item.rpn}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-sm text-blue-800 bg-blue-500/5 whitespace-normal">{item.recommendedAction}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
  };
  
  const FaultTreeNode: React.FC<{ event: FaultTreeEvent, isLast: boolean }> = ({ event, isLast }) => {
    const hasChildren = event.children && event.children.length > 0;
    const gateColors = {
        'AND': 'bg-blue-200 text-blue-800 border-blue-400',
        'OR': 'bg-purple-200 text-purple-800 border-purple-400'
    };

    return (
        <div className="relative pr-8">
            {/* Vertical connector line */}
            {!isLast && <div className="absolute top-6 right-[-2.5px] w-0.5 h-full bg-gray-300"></div>}
            
            <div className="flex items-start">
                {/* Horizontal connector line */}
                <div className="absolute top-6 right-[-2.5px] w-4 h-0.5 bg-gray-300"></div>
                {event.gate && (
                    <div className={`absolute top-6 -right-5 z-10 w-10 h-6 text-xs font-bold flex items-center justify-center rounded-md border ${gateColors[event.gate]}`}>
                        {event.gate}
                    </div>
                )}
                <div className="pl-6 w-full">
                    <div className={`p-3 rounded-lg border ${hasChildren ? 'bg-white' : 'bg-gray-500/10'}`}>
                        {event.name}
                    </div>
                    {hasChildren && (
                        <div className="pt-4 pr-4">
                            {event.children!.map((child, index) => (
                                <FaultTreeNode 
                                    key={index} 
                                    event={child} 
                                    isLast={index === event.children!.length - 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const FaultTreeResult: React.FC<{ analysis: FaultTreeAnalysis }> = ({ analysis }) => {
    return (
        <Card>
            <h3 className="font-bold text-lg text-center mb-4 text-gray-800">نتائج تحليل شجرة الأخطاء (FTA)</h3>
            <div className="p-4 bg-gray-500/5 rounded-lg overflow-x-auto">
                <FaultTreeNode event={analysis.topEvent} isLast={true} />
            </div>
        </Card>
    );
  };

  const PokaYokeResult: React.FC<{ analysis: PokaYokeAnalysis }> = ({ analysis }) => {
    const typeDetails = {
        'Control': { name: 'تحكم', color: 'bg-green-100 text-green-800 border-green-300', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
        'Warning': { name: 'تحذير', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0m-12.728 0a5 5 0 017.072 0" /></svg> },
        'Shutdown': { name: 'إيقاف', color: 'bg-red-100 text-red-800 border-red-300', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
    };
    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg text-center mb-2 text-gray-800">اقتراحات Poka-Yoke (مقاومة الأخطاء)</h3>
            {analysis.items.map((item, index) => (
                <Card key={index} className={`!p-4 border-l-4 ${typeDetails[item.implementationType].color.replace('bg', 'border')}`}>
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-900">{item.suggestion}</p>
                        <span className={`flex items-center gap-x-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${typeDetails[item.implementationType].color}`}>
                          {typeDetails[item.implementationType].icon}
                          {typeDetails[item.implementationType].name}
                        </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{item.explanation}</p>
                </Card>
            ))}
        </div>
    );
  };
  
  const DmaicResult: React.FC<{ analysis: DmaicAnalysis }> = ({ analysis }) => {
    const phases = [
        { key: 'define', name: 'Define (التعريف)', color: 'border-blue-500' },
        { key: 'measure', name: 'Measure (القياس)', color: 'border-purple-500' },
        { key: 'analyze', name: 'Analyze (التحليل)', color: 'border-orange-500' },
        { key: 'improve', name: 'Improve (التحسين)', color: 'border-green-500' },
        { key: 'control', name: 'Control (التحكم)', color: 'border-red-500' },
    ];
    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg text-center mb-2 text-gray-800">مخطط مشروع DMAIC</h3>
            {phases.map(phase => (
                <Card key={phase.key} className={`!p-4 border-l-4 ${phase.color}`}>
                    <h4 className="font-bold text-gray-800 font-cairo">{phase.name}</h4>
                    <p className="mt-1 text-sm text-gray-700">{analysis[phase.key as keyof DmaicAnalysis]}</p>
                </Card>
            ))}
        </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">تحليل بأدوات معروفة</h1>
        <p className="mt-2 text-lg text-gray-600 max-w-2xl">
          طبق أدوات تحليل متقدمة مثل "باريتو" و"لماذا الخمسة" و"مخطط هيكل السمكة" على الحوادث للوصول إلى فهم أعمق.
        </p>
      </div>

      <div className="border-b border-gray-200/80 mb-6">
          <nav className="-mb-px flex space-x-6 rtl:space-x-reverse overflow-x-auto" aria-label="Tabs">
              {analysisTools.map(tool => (
              <button key={tool.id} onClick={() => setActiveTool(tool.id as any)} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-base transition-colors duration-200 focus:outline-none ${activeTool === tool.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  {tool.name}
              </button>
          ))}
          </nav>
      </div>

      <div>
        {activeTool === 'pareto' && (
            <Card>
                {analysisStates['pareto'].error && <div className="my-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{analysisStates['pareto'].error}</div>}
                {paretoAnalysis ? (
                    <ParetoResult analysis={paretoAnalysis} />
                ) : (
                    <div className="text-center p-6">
                        <div className="prose prose-sm max-w-none text-gray-700 mb-6 bg-gray-500/5 p-4 rounded-xl border border-gray-900/10">
                           <p>يعتمد <strong>تحليل باريتو</strong> على مبدأ باريتو (قاعدة 80/20)، الذي ينص على أن 80% من النتائج تأتي من 20% من الأسباب. سيقوم هذا التحليل بفحص جميع الحوادث المحللة لتحديد الأسباب الجذرية القليلة التي تسبب معظم المشاكل، مما يساعد في تركيز جهود التحسين على النقاط الأكثر تأثيرًا.</p>
                        </div>
                        <Button onClick={handlePerformParetoAnalysis} isLoading={analysisStates['pareto'].isLoading}>
                            إجراء تحليل باريتو لجميع الحوادث
                        </Button>
                    </div>
                )}
            </Card>
        )}
        {activeTool === '5whys' && (
            <>
              <div className="prose prose-sm max-w-none text-gray-700 mb-4 bg-gray-500/5 p-4 rounded-xl border border-gray-900/10">
                <p><strong>"لماذا الخمسة"</strong> هي تقنية بسيطة وفعالة لاستكشاف علاقات السبب والنتيجة الكامنة وراء مشكلة معينة. من خلال طرح سؤال "لماذا؟" بشكل متكرر، يمكنك تجاوز الأعراض السطحية والوصول إلى السبب الجذري الحقيقي للمشكلة.</p>
              </div>
              {renderIncidentSpecificTool('5whys')}
            </>
        )}
        {activeTool === 'fishbone' && (
           <>
              <div className="prose prose-sm max-w-none text-gray-700 mb-4 bg-gray-500/5 p-4 rounded-xl border border-gray-900/10">
                 <p><strong>مخطط هيكل السمكة (أو مخطط إيشيكاوا)</strong> هو أداة مرئية تستخدم لتحديد واستكشاف وتصنيف جميع الأسباب المحتملة لمشكلة معينة. يساعد على تنظيم الأفكار في فئات مفيدة (مثل الأشخاص، العمليات، المعدات) لضمان تحليل شامل ومنظم.</p>
              </div>
              {renderIncidentSpecificTool('fishbone')}
            </>
        )}
        {activeTool === 'fmea' && (
            <>
                <div className="prose prose-sm max-w-none text-gray-700 mb-4 bg-gray-500/5 p-4 rounded-xl border border-gray-900/10">
                    <p><strong>تحليل نمط وتأثير الفشل (FMEA)</strong> هو أسلوب استباقي ومنهجي لتحديد أنماط الفشل المحتملة في عملية أو منتج، وتقييم تأثيراتها، وتحديد الإجراءات الوقائية. يساعد هذا التحليل على تحديد المخاطر المحتملة بشكل استباقي وتطوير استراتيجيات للتخفيف منها، مما يقلل من حدوث المشكلات التشغيلية المكلفة.</p>
                </div>
                {renderIncidentSpecificTool('fmea')}
            </>
        )}
        {activeTool === 'fta' && (
            <>
              <div className="prose prose-sm max-w-none text-gray-700 mb-4 bg-gray-500/5 p-4 rounded-xl border border-gray-900/10">
                <p><strong>تحليل شجرة الأخطاء (Fault Tree Analysis - FTA)</strong> هو أسلوب استنباطي رسومي يستخدم لتحليل الأنظمة المعقدة وتحديد مجموعات الأسباب التي يمكن أن تؤدي إلى حدث غير مرغوب فيه (يُسمى "الحدث الأعلى"). يبدأ التحليل بالحدث الأعلى ثم يتفرع إلى الأحداث الأساسية (الأسباب الجذرية) باستخدام بوابات منطقية (مثل AND و OR). يُستخدم هذا الأسلوب بشكل شائع في الصناعات التي تتطلب مستويات عالية من السلامة والموثوقية، مثل الطيران والطاقة النووية.</p>
              </div>
              {renderIncidentSpecificTool('fta')}
            </>
        )}
        {activeTool === 'pokayoke' && (
            <>
              <div className="prose prose-sm max-w-none text-gray-700 mb-4 bg-gray-500/5 p-4 rounded-xl border border-gray-900/10">
                <p>استخدام مبادئ <strong>Poka-Yoke (مقاومة الأخطاء)</strong> لتصميم العمليات بحيث يكون من المستحيل تقريبًا ارتكاب أخطاء أو أن يتم اكتشاف الأخطاء فورًا. يمكن تطبيق ذلك في واجهات إدخال البيانات لمنع القيم غير المنطقية، أو في تصميم إجراءات التحقق الإلزامية التي تتطلب خطوات معينة لا يمكن تجاوزها.</p>
              </div>
              {renderIncidentSpecificTool('pokayoke')}
            </>
        )}
        {activeTool === 'dmaic' && (
            <>
              <div className="prose prose-sm max-w-none text-gray-700 mb-4 bg-gray-500/5 p-4 rounded-xl border border-gray-900/10">
                <p>تعتبر <strong>DMAIC</strong> (Define, Measure, Analyze, Improve, Control) إطار عمل منظم من منهجية Lean Six Sigma. تستخدم لتحليل العمليات الحالية، تحديد نقاط الضعف، تصميم وتنفيذ الحلول، ومراقبة فعالية التغييرات لضمان التحسين المستمر والوصول إلى مستويات جودة عالية وخالية من الأخطاء.</p>
              </div>
              {renderIncidentSpecificTool('dmaic')}
            </>
        )}
      </div>
    </div>
  );
};

export default KnownToolsAnalysisView;