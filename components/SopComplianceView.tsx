import React from 'react';
import { SopComplianceAnalysis, SopComplianceStep } from '../types';
import ProgressCircle from './ui/ProgressCircle';
import Card from './ui/Card';

interface SopComplianceViewProps {
  analysis: SopComplianceAnalysis;
}

const StepCard: React.FC<{ step: SopComplianceStep }> = ({ step }) => {
    const statusStyles = {
        'Compliant': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-800' },
        'Non-Compliant': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-800' },
        'Partially-Compliant': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-800' },
        'Not-Applicable': { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-700' },
    };
    const style = statusStyles[step.complianceStatus];

    return (
        <div className={`p-4 rounded-xl border-l-4 ${style.bg} ${style.border}`}>
            <div className="flex justify-between items-start gap-4 mb-3">
                <h4 className="font-bold text-gray-900">تحليل خطوة إجرائية</h4>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${style.bg} ${style.border} ${style.text}`}>
                    {
                        {
                            'Compliant': 'متوافق',
                            'Non-Compliant': 'غير متوافق',
                            'Partially-Compliant': 'متوافق جزئيًا',
                            'Not-Applicable': 'غير منطبق'
                        }[step.complianceStatus]
                    }
                </span>
            </div>

            {/* Official Procedure Section */}
            <div className="bg-gray-900/5 p-3 rounded-lg border border-gray-900/10">
                <p className="text-xs font-semibold text-gray-500 mb-1">النص الرسمي من الدليل (SOP)</p>
                <p className="text-gray-800 font-medium">{step.procedureStep}</p>
                {step.sopReference && (
                    <p className="mt-2 text-xs font-mono text-gray-500">
                        المرجع: {step.sopReference}
                    </p>
                )}
            </div>
            
            <div className="mt-3 space-y-2 text-sm">
                <p><strong className="font-semibold text-gray-600">الإجراء الفعلي المتخذ:</strong> {step.actualAction}</p>
                {step.complianceStatus !== 'Compliant' && step.complianceStatus !== 'Not-Applicable' && (
                    <>
                        <p className={style.text}><strong className="font-semibold">تحليل الانحراف:</strong> {step.deviationAnalysis}</p>
                        <p className={style.text}><strong className="font-semibold">تقييم المخاطر:</strong> {step.riskAssessment}</p>
                    </>
                )}
            </div>
        </div>
    );
};

const SopComplianceView: React.FC<SopComplianceViewProps> = ({ analysis }) => {
    return (
        <div className="space-y-6">
            <Card className="flex flex-col md:flex-row items-center gap-6 !p-6">
                <div className="flex-shrink-0">
                    <ProgressCircle progress={analysis.overallComplianceScore} size={120} strokeWidth={10} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800 font-cairo">ملخص التحليل</h3>
                    <p className="text-gray-700">{analysis.summary}</p>
                </div>
            </Card>
            <div className="space-y-4">
                {analysis.steps.map((step, index) => (
                    <StepCard key={index} step={step} />
                ))}
            </div>
        </div>
    );
};

export default SopComplianceView;