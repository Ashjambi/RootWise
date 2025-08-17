import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

interface Integration {
    name: string;
    logo: React.ReactNode;
    description: string;
    status: 'disconnected' | 'coming_soon';
}

const integrations: Integration[] = [
    {
        name: 'Jira',
        logo: <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#0052CC]"><title>Jira</title><path d="M11.996 0A12 12 0 0 0 0 12a12 12 0 0 0 12.004 12A12 12 0 0 0 24 12c0-6.627-5.372-12-12.004-12zM11.53 18.52h-2.11L5.59 9.872h2.034l2.45 6.457 2.47-6.457h2.03l-3.83 8.648z"/></svg>,
        description: 'إنشاء تذاكر Jira تلقائيًا من توصيات RootWise لتتبع تنفيذ الحلول بسلاسة.',
        status: 'coming_soon',
    },
    {
        name: 'Slack',
        logo: <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#4A154B]"><title>Slack</title><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52h2.522a2.527 2.527 0 0 1 0 5.042H8.834a2.527 2.527 0 0 1-2.52-2.522zm-1.27-6.324a2.527 2.527 0 0 1 2.52-2.522h2.522a2.527 2.527 0 0 1 2.52 5.042h-2.52a2.527 2.527 0 0 1-2.522-2.52zm15.436-2.522a2.527 2.527 0 0 1-2.52 2.52h-2.52a2.527 2.527 0 0 1 0-5.041h2.52a2.527 2.527 0 0 1 2.52 2.521zM17.717 8.84a2.527 2.527 0 0 1 2.52-2.521H17.717a2.527 2.527 0 0 1 0 5.041h2.521a2.527 2.527 0 0 1-2.521-2.52zm1.27 6.324a2.527 2.527 0 0 1-2.522 2.52h-2.52a2.527 2.527 0 0 1-2.521-5.041h2.52a2.527 2.527 0 0 1 2.522 2.52zm-15.437 2.52a2.527 2.527 0 0 1 2.522-2.52h2.52a2.527 2.527 0 0 1 0 5.041H8.835a2.527 2.527 0 0 1-2.522-2.52zM8.835 5.042a2.527 2.527 0 0 1-2.522 2.52H8.835a2.527 2.527 0 0 1 0-5.042H6.313a2.527 2.527 0 0 1 2.522 2.522z"/></svg>,
        description: 'إرسال إشعارات فورية إلى قنوات Slack المخصصة عند تسجيل حوادث جديدة أو تحديث حالتها.',
        status: 'coming_soon',
    },
    {
        name: 'SAP',
        logo: <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#008FD3]"><title>SAP</title><path d="M12.003 24H1.36L12.01 0h10.63L12.002 24zM22.64 24H12L22.647 0H12L1.353 24h10.64L1.353 0h10.64L1.353 24z"/></svg>,
        description: 'مزامنة بيانات التشغيل من نظام SAP لإثراء سياق الحوادث بمعلومات دقيقة عن الإنتاج والمخزون.',
        status: 'coming_soon',
    },
    {
        name: 'Zendesk',
        logo: <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#03363D]"><title>Zendesk</title><path d="M19.5 0H4.5A4.5 4.5 0 000 4.5v7.625A4.375 4.375 0 004.375 16.5h3.375v3.375A4.125 4.125 0 0012 24a4.125 4.125 0 004.125-4.125V16.5h3.375A4.5 4.5 0 0024 12V4.5A4.5 4.5 0 0019.5 0z"/></svg>,
        description: 'ربط شكاوى العملاء في Zendesk بالحوادث الداخلية في RootWise لفهم أثر الأخطاء على تجربة العميل.',
        status: 'coming_soon',
    },
];

const IntegrationCard: React.FC<{ integration: Integration }> = ({ integration }) => (
    <Card className="flex flex-col text-center items-center h-full">
        <div className="mb-4">{integration.logo}</div>
        <h3 className="text-xl font-bold text-gray-800 font-cairo">{integration.name}</h3>
        <p className="text-gray-600 my-4 flex-grow">{integration.description}</p>
        <Button variant="secondary" disabled>
            {integration.status === 'coming_soon' ? 'قريبًا' : 'ربط'}
        </Button>
    </Card>
);

const IntegrationsView: React.FC = () => {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">التكاملات والربط الخارجي</h1>
                <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                    اربط RootWise مع أنظمتك الأخرى لبناء شبكة بيانات ذكية (Data Mesh) وتحليل شامل متعدد المصادر.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {integrations.map(int => (
                    <IntegrationCard key={int.name} integration={int} />
                ))}
            </div>
        </div>
    );
};

export default IntegrationsView;
