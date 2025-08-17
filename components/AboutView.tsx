import React from 'react';
import Card from './ui/Card';
import { CustomFeature } from '../types';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  gradient: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, children, gradient }) => (
  <Card className="flex flex-col h-full transform hover:-translate-y-1 transition-transform duration-300">
    <div className="flex items-start gap-4">
      <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${gradient}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900 font-cairo">{title}</h3>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-900/10 text-gray-600 text-sm space-y-2 flex-grow">
      {children}
    </div>
  </Card>
);

const CheckListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-start">
        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <span>{children}</span>
    </div>
);

const featureStaticData: Record<CustomFeature['id'], { icon: JSX.Element; gradient: string; checklist: JSX.Element[] }> = {
    analysis: {
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
        checklist: [
            <CheckListItem key="1"><strong>تحليل السبب الجذري (RCA):</strong> بنقرة زر، يكشف الذكاء الاصطناعي عن الأسباب الحقيقية، وليس فقط الأعراض.</CheckListItem>,
            <CheckListItem key="2"><strong>فجوة الإجراءات (SOP Gap):</strong> يقارن تلقائيًا بين ما يجب أن يحدث وما حدث فعلاً.</CheckListItem>,
            <CheckListItem key="3"><strong>كبسولة المعرفة:</strong> يلخص كل تحليل في درس موجز لبناء "ذاكرة مؤسسية" قوية.</CheckListItem>,
        ]
    },
    proactive: {
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
        gradient: "bg-gradient-to-br from-purple-500 to-pink-500",
        checklist: [
            <CheckListItem key="1"><strong>تحليل التكرار الذكي:</strong> يكتشف الحوادث المتشابهة حتى لو كانت بوصف مختلف، ويصنف نوع التكرار.</CheckListItem>,
            <CheckListItem key="2"><strong>نظام الإنذار المبكر:</strong> يتنبأ باحتمالية وقوع حوادث مستقبلية بناءً على الأنماط الحالية.</CheckListItem>,
            <CheckListItem key="3"><strong>التحليل التنبؤي:</strong> يكشف "الإشارات الضعيفة" والمخاطر الكامنة قبل أن تتحول إلى حوادث.</CheckListItem>,
        ]
    },
    decision: {
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        gradient: "bg-gradient-to-br from-red-500 to-orange-500",
        checklist: [
            <CheckListItem key="1"><strong>مساعد المدير الذكي:</strong> يقدم توصيات يومية لأهم 3 قرارات يجب اتخاذها لمعالجة المخاطر.</CheckListItem>,
            <CheckListItem key="2"><strong>ذكاء مؤشرات الأداء (KPI):</strong> يربط المشاكل بتأثيرها المالي والتشغيلي، ويقدم الأثر بلغة الأرقام.</CheckListItem>,
            <CheckListItem key="3"><strong>لوحة مؤشرات المخاطر:</strong> تصنف الأقسام والأسباب والأفراد حسب الخطورة التراكمية لدعم القرارات الكبرى.</CheckListItem>,
        ]
    },
    learning: {
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v11.494m-9-5.747h18" /></svg>,
        gradient: "bg-gradient-to-br from-green-500 to-teal-500",
        checklist: [
            <CheckListItem key="1"><strong>محاكي "ماذا لو؟":</strong> يختبر السيناريوهات الافتراضية ويحولها إلى توصيات عملية.</CheckListItem>,
            <CheckListItem key="2"><strong>اقتراح حلول بديلة:</strong> عندما تفشل توصية، يقترح الذكاء الاصطناعي بديلاً مبتكرًا.</CheckListItem>,
            <CheckListItem key="3"><strong>مركز تدريب آلي (Auto LMS):</strong> يحول كل خطأ متكرر إلى محتوى تدريبي مصغر ومخصص.</CheckListItem>,
        ]
    },
};

interface AboutViewProps {
  features: CustomFeature[];
}

const AboutView: React.FC<AboutViewProps> = ({ features }) => {
    const enabledFeatures = features.filter(f => f.enabled);

    return (
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
                 <h1 className="text-5xl font-extrabold font-cairo tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700">
                        لماذا هذا التطبيق هو شريكك الاستراتيجي؟
                    </span>
                </h1>
                <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                    لأننا نؤمن بأن الأخطاء ليست مجرد مشاكل يجب حلها، بل هي أثمن مصدر للبيانات لتحقيق التميز. هذا التطبيق لا يحلل الماضي فقط، بل يبني لك مستقبلاً أكثر مرونة وذكاءً ووقاية. نحن نحول كل حادث إلى فرصة للتعلم والنمو.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {enabledFeatures.map(feature => {
                    const staticData = featureStaticData[feature.id];
                    if (!staticData) return null;
                    return (
                        <FeatureCard key={feature.id} title={feature.title} icon={staticData.icon} gradient={staticData.gradient}>
                            {staticData.checklist}
                        </FeatureCard>
                    );
                })}
            </div>

             <div className="mt-16 text-center">
                 <h2 className="text-3xl font-bold font-cairo text-gray-900">
                    ليس مجرد تطبيق، بل ثقافة جديدة لمنظمتك
                </h2>
                <p className="mt-4 text-md text-gray-600 max-w-3xl mx-auto">
                    مع هذا التطبيق، أنت لا تستثمر في برنامج، بل في نظام بيئي متكامل يؤسس لثقافة الشفافية، والتعلم من الأخطاء، والتحسين المستمر. إنه الأداة التي تحول البيانات الصامتة إلى قرارات استراتيجية، والأخطاء الفردية إلى دروس جماعية.
                </p>
             </div>
        </div>
    );
};

export default AboutView;