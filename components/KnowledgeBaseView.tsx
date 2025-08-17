import React, { useState, useMemo } from 'react';
import { KnowledgeCapsuleItem, ActiveView } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

interface KnowledgeBaseViewProps {
  knowledgeBase: KnowledgeCapsuleItem[];
  onNavigate: (view: ActiveView, incidentId?: string | null) => void;
}

const baseInputClasses = "mt-1 block w-full px-4 py-3 border rounded-lg shadow-inner-sm placeholder-gray-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500/70 sm:text-sm bg-white/70 border-white/80 transition-shadow duration-200 focus:shadow-md";

const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ knowledgeBase, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredKnowledgeBase = useMemo(() => {
        if (!searchTerm) {
            return knowledgeBase;
        }
        return knowledgeBase.filter(item => 
            item.capsule.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.incidentTitle.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [knowledgeBase, searchTerm]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">قاعدة المعرفة المؤسسية</h1>
                <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                    الدروس المستفادة والكبسولات المعرفية من جميع الحوادث المحللة. تعلم من الماضي لبناء مستقبل أكثر أمانًا.
                </p>
            </div>

            <Card className="mb-8">
                <div className="flex-grow">
                    <label htmlFor="search-query" className="block text-sm font-semibold text-gray-700 font-cairo">
                       ابحث في الدروس المستفادة
                    </label>
                    <input
                        type="text"
                        id="search-query"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={baseInputClasses}
                        placeholder="مثال: 'إجراءات التحقق'، 'التواصل بين الأقسام'..."
                    />
                </div>
            </Card>

            {filteredKnowledgeBase.length > 0 ? (
                <div className="space-y-6">
                    {filteredKnowledgeBase.map(item => (
                         <Card key={item.incidentId}>
                            <p className="italic text-lg text-gray-800 bg-gray-900/5 p-4 rounded-lg">"{item.capsule}"</p>
                            <div className="mt-4 pt-4 border-t border-gray-900/10 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-sm text-gray-800">{item.incidentTitle}</p>
                                    <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString('ar-EG')}</p>
                                </div>
                                <Button variant="secondary" className="py-1 px-3 text-xs" onClick={() => onNavigate('incident', item.incidentId)}>
                                    عرض تفاصيل الحادث
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <p className="text-center text-gray-500 py-8">
                        {knowledgeBase.length === 0 ? 'لا توجد دروس مستفادة بعد. قم بتحليل بعض الحوادث أولاً.' : 'لم يتم العثور على نتائج مطابقة لبحثك.'}
                    </p>
                 </Card>
            )}
        </div>
    );
};

export default KnowledgeBaseView;
