import React, { useState, useEffect, useRef } from 'react';
import { IncidentReport, IncidentSeverity } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { Chart } from "chart.js/auto";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const baseInputClasses = "block w-full px-3 py-2 border rounded-lg shadow-inner-sm placeholder-gray-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500/70 sm:text-sm bg-white/70 border-white/80 transition-shadow duration-200 focus:shadow-md";

const ReportsView: React.FC<{ incidents: IncidentReport[] }> = ({ incidents }) => {
    const [filteredIncidents, setFilteredIncidents] = useState<IncidentReport[]>(incidents);
    const [isExporting, setIsExporting] = useState(false);
    
    const severityChartRef = useRef<HTMLCanvasElement>(null);
    const monthlyChartRef = useRef<HTMLCanvasElement>(null);
    const chartsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Data for charts
        const severityCounts = filteredIncidents.reduce((acc, inc) => {
            acc[inc.severity] = (acc[inc.severity] || 0) + 1;
            return acc;
        }, {} as Record<IncidentSeverity, number>);

        const monthlyCounts = filteredIncidents.reduce((acc, inc) => {
            const month = new Date(inc.date).toLocaleString('default', { month: 'long', year: 'numeric' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Destroy previous charts
        Chart.getChart(severityChartRef.current!)?.destroy();
        Chart.getChart(monthlyChartRef.current!)?.destroy();

        // Severity Chart
        if (severityChartRef.current) {
            new Chart(severityChartRef.current, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(severityCounts),
                    datasets: [{
                        label: 'الحوادث حسب الخطورة',
                        data: Object.values(severityCounts),
                        backgroundColor: ['#4ade80', '#facc15', '#fb923c', '#f87171'],
                    }]
                },
                 options: { responsive: true, maintainAspectRatio: false }
            });
        }
        
        // Monthly Chart
        if (monthlyChartRef.current) {
             new Chart(monthlyChartRef.current, {
                type: 'bar',
                data: {
                    labels: Object.keys(monthlyCounts),
                    datasets: [{
                        label: 'الحوادث شهريًا',
                        data: Object.values(monthlyCounts),
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

    }, [filteredIncidents]);
    
    const handleExportToPdf = async () => {
        if (!chartsRef.current) return;
        setIsExporting(true);
        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            // 1. Add charts as an image
            const canvas = await html2canvas(chartsRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#f0f2f5',
            });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            // 2. Add table of incidents on a new page
            if(filteredIncidents.length > 0) {
              pdf.addPage();
            
              pdf.setR2L(true);

              let y = 40;
              const pageHeight = pdf.internal.pageSize.getHeight();
              const margin = 40;
              const rightEdge = pdf.internal.pageSize.getWidth() - margin;

              pdf.setFontSize(18);
              pdf.text("قائمة الحوادث", rightEdge, y, { align: 'right' });
              y += 30;
              
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'bold');
              
              const headers = ['العنوان', 'القسم', 'التاريخ', 'الخطورة'];
              const colWidths = [255, 120, 80, 60]; 
              let x = rightEdge;
              
              headers.forEach((header, i) => {
                  pdf.text(header, x, y, { align: 'right' });
                  x -= colWidths[i];
              });

              y += 15;
              pdf.setDrawColor(200);
              pdf.line(margin, y, pdf.internal.pageSize.getWidth() - margin, y);
              y += 10;

              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'normal');

              filteredIncidents.forEach(inc => {
                  const titleLines = pdf.splitTextToSize(inc.title, colWidths[0] - 5);
                  const rowHeight = (titleLines.length * 10) + 10;

                  if (y + rowHeight > pageHeight - margin) {
                      pdf.addPage();
                      y = margin;
                      // Redraw headers on new page
                      pdf.setFontSize(10);
                      pdf.setFont('helvetica', 'bold');
                      x = rightEdge;
                      headers.forEach((header, i) => {
                          pdf.text(header, x, y, { align: 'right' });
                          x -= colWidths[i];
                      });
                      y += 25;
                      pdf.setFontSize(9);
                      pdf.setFont('helvetica', 'normal');
                  }
                  
                  x = rightEdge;
                  const rowY = y + 10;
                  
                  pdf.text(titleLines, x, rowY, { align: 'right' });
                  x -= colWidths[0];

                  pdf.text(inc.department, x, rowY, { align: 'right' });
                  x -= colWidths[1];

                  pdf.text(new Date(inc.date).toLocaleDateString('ar-EG'), x, rowY, { align: 'right' });
                  x -= colWidths[2];

                  pdf.text(inc.severity, x, rowY, { align: 'right' });

                  y += rowHeight;
              });
            }
    
            pdf.save(`RootWise_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Error exporting to PDF:", error);
        } finally {
            setIsExporting(false);
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                 <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">مركز التقارير</h1>
                    <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                        تحليل الاتجاهات وتصدير تقارير مخصصة لمشاركتها مع أصحاب المصلحة.
                    </p>
                </div>
                 <Button onClick={handleExportToPdf} isLoading={isExporting}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    تصدير إلى PDF
                </Button>
            </div>
            
            <div className="bg-[#f0f2f5] p-4 rounded-lg">
                <div ref={chartsRef}>
                    <Card className="mb-6">
                        <h2 className="text-xl font-bold text-gray-800 font-cairo mb-4">نظرة عامة على الحوادث</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                 <h3 className="font-semibold text-center mb-2">توزيع الحوادث حسب الخطورة</h3>
                                 <div className="h-64 relative">
                                    <canvas ref={severityChartRef}></canvas>
                                 </div>
                            </div>
                            <div>
                                 <h3 className="font-semibold text-center mb-2">عدد الحوادث شهريًا</h3>
                                 <div className="h-64 relative">
                                    <canvas ref={monthlyChartRef}></canvas>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card>
                    <h2 className="text-xl font-bold text-gray-800 font-cairo mb-4">قائمة الحوادث</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-100/50">
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العنوان</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القسم</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الخطورة</th>
                                </tr>
                             </thead>
                             <tbody className="bg-white/50 divide-y divide-gray-200">
                                {filteredIncidents.map(inc => (
                                    <tr key={inc.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inc.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inc.department}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inc.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inc.severity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ReportsView;