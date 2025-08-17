import React, { useMemo } from 'react';
import { IncidentReport } from '../types';
import Card from './ui/Card';

// Define log entry structure
interface LogEntry {
    date: string;
    author: string;
    content: string;
    icon: JSX.Element;
    type: 'creation' | 'analysis' | 'update' | 'status_change';
}

// Icon components for different log types
const CreationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AnalysisIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 003.86.517l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 011.022-.547z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a4 4 0 100-8 4 4 0 000 8z" /></svg>;
const UpdateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const StatusChangeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const IconWrapper: React.FC<{ type: LogEntry['type']; children: React.ReactNode }> = ({ type, children }) => {
    const colors = {
        creation: 'bg-green-500',
        analysis: 'bg-purple-500',
        update: 'bg-gray-500',
        status_change: 'bg-blue-500',
    };
    return <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${colors[type]}`}>{children}</span>;
};


const IncidentHistoryLog: React.FC<{ incident: IncidentReport }> = ({ incident }) => {
    const history = useMemo((): LogEntry[] => {
        const log: LogEntry[] = [];

        // 1. Incident Creation
        log.push({
            date: incident.date,
            author: incident.involvedPersonnel.split(',')[0]?.trim() || 'النظام',
            content: `تم إنشاء الحادث.`,
            type: 'creation',
            icon: <CreationIcon />
        });

        // 2. Analysis Performed
        if (incident.analysis) {
             const firstRecDate = incident.analysis.recommendations?.flatMap(r => r.updates || []).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date;
             log.push({
                 date: firstRecDate || new Date(new Date(incident.date).getTime() + 60000).toISOString(), // Estimate date as 1 min after creation
                 author: 'النظام',
                 content: 'تم إجراء التحليل الذكي للسبب الجذري واقتراح الإجراءات.',
                 type: 'analysis',
                 icon: <AnalysisIcon />
             });
        }
        
        // 3. Recommendation Updates and Status Changes
        incident.analysis?.recommendations.forEach(rec => {
            rec.updates?.forEach(update => {
                const isStatusChange = update.comment.includes('تم تغيير الحالة');
                log.push({
                    date: update.date,
                    author: update.author,
                    content: `[${rec.action}]: ${update.comment}`,
                    type: isStatusChange ? 'status_change' : 'update',
                    icon: isStatusChange ? <StatusChangeIcon /> : <UpdateIcon />
                });
            });
        });
        
        return log.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [incident]);

    return (
        <Card>
            <h3 className="text-xl font-bold text-gray-800 font-cairo mb-6">سجل أحداث الحادث</h3>
            {history.length > 0 ? (
                <div className="flow-root">
                    <ul role="list" className="-mb-8">
                        {history.map((item, index) => (
                            <li key={index}>
                                <div className="relative pb-8">
                                    {index !== history.length - 1 && <span className="absolute top-4 right-4 -mr-px h-full w-0.5 bg-gray-200" aria-hidden="true" />}
                                    <div className="relative flex items-start space-x-3 rtl:space-x-reverse">
                                        <div className="relative">
                                            <IconWrapper type={item.type}>{item.icon}</IconWrapper>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div>
                                                <div className="text-sm">
                                                    <span className="font-bold text-gray-900">{item.author}</span>
                                                </div>
                                                <p className="mt-0.5 text-sm text-gray-600">{item.content}</p>
                                            </div>
                                            <div className="mt-2 text-right">
                                                <p className="text-xs text-gray-400">
                                                    <time dateTime={item.date}>{new Date(item.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className='text-center text-gray-500 py-8'>لا يوجد سجل أحداث لهذا الحادث بعد.</p>
            )}
        </Card>
    );
};

export default IncidentHistoryLog;