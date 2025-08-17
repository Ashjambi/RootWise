import React, { useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { IncidentReport, ActiveView } from '../types';

// Props for the main view
interface CreativeMethodsViewProps {
  onNavigate: (view: ActiveView, incidentId?: string | null) => void;
  setIsModalOpen: (isOpen: boolean) => void;
  incidents: IncidentReport[];
}

// Reusable component for linking to features
const FeatureLink: React.FC<{ title: string; onClick: () => void; description: string; disabled?: boolean; disabledText?: string }> = ({ title, onClick, description, disabled = false, disabledText }) => (
    <div className={`flex justify-between items-center p-3 rounded-lg bg-gray-500/5 transition-colors ${!disabled && 'hover:bg-gray-500/10'}`}>
        <div>
            <h4 className={`font-semibold ${disabled ? 'text-gray-500' : 'text-gray-800'}`}>{title}</h4>
            <p className={`text-xs ${disabled ? 'text-gray-500' : 'text-gray-600'}`}>{disabled ? disabledText : description}</p>
        </div>
        <Button variant="secondary" onClick={onClick} className="py-1 px-3 text-xs flex-shrink-0" disabled={disabled}>
            جرب الآن
        </Button>
    </div>
);

// The main view component
const CreativeMethodsView: React.FC<CreativeMethodsViewProps> = ({ onNavigate, setIsModalOpen, incidents }) => {
    // Find the last incident that has an analysis, to link to it.
    const lastAnalyzedIncident = useMemo(() => 
        [...incidents].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).find(inc => inc.analysis)
    , [incidents]);
    
    // Find an incident that has an alternative suggestion ready
    const incidentWithIneffectiveAction = useMemo(() =>
        incidents.find(inc => inc.analysis?.recommendations.some(r => r.status === 'غير فعال'))
    , [incidents]);

    // Data structure for all stages and their corresponding features
    const stages = [
        {
            stageNumber: '1',
            title: 'التعاطف (Empathize)',
            description: "فهم التجربة الإنسانية وراء المشكلة. الهدف هو بناء فهم عميق وتعاطف حقيقي مع الأشخاص المتأثرين بالمشكلة، وجمع السياق بدلاً من البيانات الجافة فقط.",
            color: 'bg-purple-500',
            features: [
                {
                    title: 'إنشاء بلاغ جديد',
                    description: 'ابدأ بجمع قصة الحادث الكاملة لفهم السياق.',
                    onClick: () => setIsModalOpen(true),
                    disabled: false,
                },
                {
                    title: 'تحليل شجرة الأدوار',
                    description: 'فهم مسؤوليات ومساهمات كل فرد معني.',
                    onClick: () => lastAnalyzedIncident && onNavigate('incident', lastAnalyzedIncident.id),
                    disabled: !lastAnalyzedIncident,
                    disabledText: 'قم بتحليل حادث واحد على الأقل لتجربة هذه الميزة.',
                }
            ]
        },
        {
            stageNumber: '2',
            title: 'التعريف (Define)',
            description: "بعد جمع السياق، يتم تحليل المعلومات لتحديد المشكلة الحقيقية. هذه المرحلة تحول الفهم المتعاطف إلى بيان مشكلة واضح وقابل للتنفيذ.",
            color: 'bg-pink-500',
            features: [
                {
                    title: 'التحليل الذكي للسبب الجذري',
                    description: 'دع الذكاء الاصطناعي يحدد السبب الحقيقي، وليس الأعراض السطحية.',
                    onClick: () => lastAnalyzedIncident && onNavigate('incident', lastAnalyzedIncident.id),
                    disabled: !lastAnalyzedIncident,
                    disabledText: 'قم بتحليل حادث واحد على الأقل لتجربة هذه الميزة.',
                },
                {
                    title: 'تحليل فجوة الإجراءات (SOP)',
                    description: 'قارن بين الإجراء المتوقع والإجراء الفعلي لوضع إطار للتحدي.',
                    onClick: () => lastAnalyzedIncident && onNavigate('incident', lastAnalyzedIncident.id),
                    disabled: !lastAnalyzedIncident,
                    disabledText: 'قم بتحليل حادث واحد على الأقل لتجربة هذه الميزة.',
                }
            ]
        },
        {
            stageNumber: '3',
            title: 'توليد الأفكار (Ideate)',
            description: "مرحلة التفكير الإبداعي لتوليد أكبر عدد ممكن من الحلول. الهدف هو تجاوز الحلول الواضحة واستكشاف مسارات جديدة وغير متوقعة.",
            color: 'bg-orange-500',
            features: [
                {
                    title: 'محاكي "ماذا لو؟"',
                    description: 'استكشف سيناريوهات افتراضية لتوليد حلول مبتكرة.',
                    onClick: () => lastAnalyzedIncident && onNavigate('incident', lastAnalyzedIncident.id),
                    disabled: !lastAnalyzedIncident,
                    disabledText: 'قم بتحليل حادث واحد على الأقل لتجربة هذه الميزة.',
                },
                {
                    title: 'المكتبة العالمية',
                    description: 'ابحث عن حلول لمشكلات مشابهة في صناعات أخرى.',
                    onClick: () => onNavigate('global_cases'),
                    disabled: false,
                },
                {
                    title: 'اقتراح حل بديل',
                    description: 'عندما يفشل حل، دع الذكاء الاصطناعي يقترح فكرة جديدة.',
                    onClick: () => incidentWithIneffectiveAction && onNavigate('incident', incidentWithIneffectiveAction.id),
                    disabled: !incidentWithIneffectiveAction,
                    disabledText: 'ضع علامة "غير فعال" على توصية لتجربة هذه الميزة.',
                }
            ]
        },
        {
            stageNumber: '4',
            title: 'النمذجة الأولية (Prototype)',
            description: "تحويل الأفكار إلى نماذج أولية ملموسة وقابلة للاختبار. في عالم العمليات، يمكن أن يكون النموذج الأولي هو خطة تنفيذ مفصلة أو إجراء مصحح مقترح.",
            color: 'bg-teal-500',
            features: [
                {
                    title: 'الإجراءات التصحيحية (CAPA)',
                    description: 'كل توصية هي بمثابة "نموذج أولي" لحل يمكن تتبعه.',
                    onClick: () => onNavigate('my_actions'),
                    disabled: incidents.length === 0,
                    disabledText: 'لا توجد حوادث لتتبع إجراءاتها.',
                },
                {
                    title: 'مساعد التنفيذ الذكي',
                    description: 'حوّل توصية إلى خطة تنفيذ مفصلة بضغطة زر.',
                    onClick: () => onNavigate('my_actions'),
                    disabled: !lastAnalyzedIncident,
                    disabledText: 'قم بتحليل حادث لتجربة هذه الميزة على توصياته.',
                }
            ]
        },
        {
            stageNumber: '5',
            title: 'الاختبار (Test)',
            description: "اختبار فعالية الحلول في العالم الحقيقي وجمع الملاحظات. الاختبار هو جوهر التحسين المستمر، وهو يكشف ما إذا كان الحل فعالاً على المستوى الجذري.",
            color: 'bg-blue-500',
            features: [
                {
                    title: 'التحقق من الفعالية',
                    description: 'تتبع حالة الإجراءات وتحقق من فعاليتها.',
                    onClick: () => onNavigate('my_actions'),
                    disabled: incidents.length === 0,
                    disabledText: 'لا توجد حوادث لتتبع إجراءاتها.',
                },
                {
                    title: 'تحليل نمط التكرار',
                    description: 'إذا تكرر الحادث، حلل سبب فشل الحلول السابقة.',
                    onClick: () => onNavigate('my_actions'),
                    disabled: !incidents.some(inc => inc.recurrenceChainId),
                    disabledText: 'تظهر هذه الميزة عند وجود سلسلة حوادث متكررة.',
                }
            ]
        }
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                 <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">
                    التطبيق العملي للتفكير التصميمي
                </h1>
                <p className="mt-2 text-lg text-gray-600 max-w-3xl">
                    هذا ليس مجرد شرح نظري، بل هو دليل تفاعلي يوضح كيف تدعم كل ميزة في التطبيق مراحل التفكير التصميمي. جرب الميزات مباشرة من هنا.
                </p>
            </div>
            
            <div className="space-y-6">
                {stages.map(stage => (
                    <Card key={stage.stageNumber}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 items-start">
                            {/* Left Column: Description */}
                            <div>
                                <div className="flex items-center gap-4">
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${stage.color}`}>
                                        {stage.stageNumber}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 font-cairo">{stage.title}</h3>
                                </div>
                                <p className="mt-4 text-gray-700 text-sm leading-relaxed">{stage.description}</p>
                            </div>
                            {/* Right Column: Features */}
                            <div className="space-y-3 bg-white/50 p-4 rounded-xl border border-white/70">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">ميزات داعمة في التطبيق</h4>
                                {stage.features.map(feature => (
                                    <FeatureLink 
                                        key={feature.title}
                                        title={feature.title}
                                        description={feature.description}
                                        onClick={feature.onClick}
                                        disabled={feature.disabled}
                                        disabledText={feature.disabledText}
                                    />
                                ))}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default CreativeMethodsView;