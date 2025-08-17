import React, { useState } from 'react';
import { GlobalCase } from '../types';
import { searchGlobalCases } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';

const baseInputClasses = "mt-1 block w-full px-4 py-3 border rounded-lg shadow-inner-sm placeholder-gray-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500/70 sm:text-sm bg-white/70 border-white/80 transition-shadow duration-200 focus:shadow-md";

const GlobalCaseCard: React.FC<{ aCase: GlobalCase }> = ({ aCase }) => (
    <Card className="mb-4">
        <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-gray-800 font-cairo">{aCase.title}</h3>
            <span className="text-sm font-semibold bg-blue-100/60 text-blue-800 px-3 py-1 rounded-full border border-blue-200/50">{aCase.industry}</span>
        </div>
        <div className="mt-4 border-t border-gray-900/10 pt-4">
             <p className="mb-3 text-gray-700">{aCase.summary}</p>
             <div className="bg-gray-900/5 p-4 rounded-lg">
                <p className="font-semibold text-gray-800">الدرس المستفاد:</p>
                <p className="italic text-gray-700">{aCase.lesson}</p>
             </div>
             <p className="text-xs text-gray-500 mt-3 text-left">المصدر: {aCase.source}</p>
        </div>
    </Card>
);

const GlobalCasesView: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GlobalCase[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!query) {
            setError('يرجى إدخال مصطلح للبحث.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResults([]);
        setSearched(true);
        try {
            const searchResult = await searchGlobalCases(query);
            setResults(searchResult);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء البحث.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">المكتبة العالمية للحالات الدراسية</h1>
                <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                    ابحث عن حوادث مشابهة وأفضل الممارسات من مختلف الصناعات حول العالم للتعلم وتطبيق حلول مثبتة.
                </p>
            </div>

            <Card className="mb-8">
                <div className="flex gap-4 items-end">
                    <div className="flex-grow">
                        <label htmlFor="search-query" className="block text-sm font-semibold text-gray-700 font-cairo">
                            صف الحادث أو المشكلة التي تبحث عنها
                        </label>
                        <input
                            type="text"
                            id="search-query"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className={baseInputClasses}
                            placeholder="مثال: فشل في مراقبة جودة الأدوية، خطأ في تسليم البرمجيات..."
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch} isLoading={isLoading} disabled={isLoading}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        بحث
                    </Button>
                </div>
            </Card>

            {error && <div className="mt-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{error}</div>}

            {isLoading && (
                <div className="text-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">جاري البحث في قواعد المعرفة العالمية...</p>
                </div>
            )}
            
            {!isLoading && searched && results.length === 0 && !error && (
                 <Card>
                    <p className="text-center text-gray-500 py-8">لم يتم العثور على حالات مطابقة. حاول استخدام مصطلحات بحث مختلفة أو أكثر عمومية.</p>
                 </Card>
            )}

            {!isLoading && results.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 font-cairo mb-4">نتائج البحث</h2>
                    {results.map((r, i) => (
                        <GlobalCaseCard key={i} aCase={r} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default GlobalCasesView;
