import React, { useState, useCallback, useMemo } from 'react';
import { SopComparisonResult, ExtractedProcedure, MindMapNode } from '../types';
import { askSopQuestion, generateTestCaseForProcedure, compareProcedureToSop, generateCreativeIdeasForSop, extractProceduresFromSop, generateMindMapForProcedure } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';

type ActiveTool = 'qa' | 'test' | 'compare' | 'ideas' | 'mindmap';

const MindMapNodeView: React.FC<{ node: MindMapNode }> = ({ node }) => {
    return (
        <li>
            <div className="flex items-center">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-3 ring-4 ring-blue-100 flex-shrink-0"></span>
                <span className="text-gray-800">{node.topic}</span>
            </div>
            {node.children && node.children.length > 0 && (
                <ul className="pl-6 pt-2 border-r-2 border-gray-200 ml-[4px]">
                    {node.children.map((child, index) => (
                        <MindMapNodeView key={index} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
};

const SopAssistantView: React.FC = () => {
    const [sopFile, setSopFile] = useState<{ name: string; content: string; mimeType: string } | null>(null);
    const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);

    // State for different tools
    const [qa, setQa] = useState({ question: '', answer: '', sopReference: '' });
    const [testCase, setTestCase] = useState({ procedure: '', result: { case: '', expectedOutcome: '', sopReference: '' } });
    const [compare, setCompare] = useState({ userProcedure: '', result: null as SopComparisonResult | null });
    const [creativeIdeas, setCreativeIdeas] = useState<{ idea: string, sopReference?: string }[]>([]);
    const [mindMapTool, setMindMapTool] = useState<{
        procedures: ExtractedProcedure[],
        selectedProcedureTitle: string,
        mindMap: MindMapNode | null,
        step: 'initial' | 'procedures_extracted' | 'mindmap_generated'
    }>({ procedures: [], selectedProcedureTitle: '', mindMap: null, step: 'initial' });
    
    // Generic loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isToolRun, setIsToolRun] = useState(false);

    const fileToBase64 = (file: File): Promise<{ content: string; mimeType: string }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const base64Content = result.split(',')[1];
                resolve({ content: base64Content, mimeType: file.type });
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 25 * 1024 * 1024) {
                setError("حجم الملف كبير جدًا. يرجى اختيار ملف أصغر من 25 ميجابايت.");
                e.target.value = ''; // Clear the input to allow re-selection
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const { content, mimeType } = await fileToBase64(file);
                setSopFile({ name: file.name, content, mimeType });
                setActiveTool(null);
                setQa({ question: '', answer: '', sopReference: '' });
                setTestCase({ procedure: '', result: { case: '', expectedOutcome: '', sopReference: '' } });
                setCompare({ userProcedure: '', result: null });
                setCreativeIdeas([]);
                setMindMapTool({ procedures: [], selectedProcedureTitle: '', mindMap: null, step: 'initial' });
                setIsToolRun(false);
            } catch (err) {
                setError("فشل في قراءة الملف.");
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleRunTool = useCallback(async () => {
        if (!sopFile) {
            setError("يرجى رفع ملف الدليل الرسمي أولاً.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setIsToolRun(false);
        const { content, mimeType } = sopFile;

        try {
            switch (activeTool) {
                case 'qa':
                    if (!qa.question) { setError("يرجى كتابة سؤال."); setIsLoading(false); return; }
                    const qaResult = await askSopQuestion(content, mimeType, qa.question);
                    setQa(prev => ({ ...prev, answer: qaResult.answer, sopReference: qaResult.sopReference }));
                    break;
                case 'test':
                    if (!testCase.procedure) { setError("يرجى لصق الإجراء المطلوب اختباره."); setIsLoading(false); return; }
                    const testResult = await generateTestCaseForProcedure(content, mimeType, testCase.procedure);
                    setTestCase(prev => ({ ...prev, result: testResult }));
                    break;
                case 'compare':
                     if (!compare.userProcedure) { setError("يرجى وصف الإجراء الذي تم تطبيقه."); setIsLoading(false); return; }
                    const compareResult = await compareProcedureToSop(content, mimeType, compare.userProcedure);
                    setCompare(prev => ({...prev, result: compareResult}));
                    break;
                case 'ideas':
                    const ideasResult = await generateCreativeIdeasForSop(content, mimeType);
                    setCreativeIdeas(ideasResult);
                    break;
            }
            setIsToolRun(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : `حدث خطأ غير متوقع أثناء تشغيل الأداة.`);
        } finally {
            setIsLoading(false);
        }
    }, [activeTool, sopFile, qa.question, testCase.procedure, compare.userProcedure]);

    const handleExtractProcedures = async () => {
        if (!sopFile) return;
        setIsLoading(true);
        setError(null);
        try {
            const procedures = await extractProceduresFromSop(sopFile.content, sopFile.mimeType);
            setMindMapTool(prev => ({...prev, procedures, step: 'procedures_extracted'}));
        } catch (e) {
            setError(e instanceof Error ? e.message : `فشل في استخلاص الإجراءات.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateMindMap = async () => {
        if (!sopFile || !mindMapTool.selectedProcedureTitle) return;
        setIsLoading(true);
        setError(null);
        try {
            const mindMap = await generateMindMapForProcedure(sopFile.content, sopFile.mimeType, mindMapTool.selectedProcedureTitle);
            setMindMapTool(prev => ({...prev, mindMap, step: 'mindmap_generated'}));
        } catch (e) {
            setError(e instanceof Error ? e.message : `فشل في إنشاء الخريطة الذهنية.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSelectProcedure = (title: string) => {
        setMindMapTool(prev => ({
            ...prev,
            selectedProcedureTitle: title,
            mindMap: null, // Clear previous map
            step: 'procedures_extracted' // Allow generating map
        }));
    };

    if (!sopFile) {
        return (
            <div>
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">مساعد الدليل الذكي</h1>
                    <p className="mt-2 text-lg text-gray-600 max-w-2xl mx-auto">
                        ارفع دليل التشغيل الرسمي (SOP) لتبدأ رحلة الاستكشاف والتفاعل الذكي.
                    </p>
                </div>
                <Card>
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300/60 border-dashed rounded-xl bg-white/30">
                        <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <div className="flex text-sm text-gray-600 justify-center"><label htmlFor="sop-file-upload" className="relative cursor-pointer bg-white/80 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2"><span>اختر ملف الدليل</span><input id="sop-file-upload" name="sop-file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="application/pdf,.doc,.docx,text/plain,.txt" /></label></div>
                            <p className="text-xs text-gray-500">PDF, DOCX, TXT (25MB كحد أقصى)</p>
                             {isLoading && <p className="text-xs text-blue-600 animate-pulse">جاري معالجة الملف...</p>}
                             {error && <p className="text-xs text-red-600">{error}</p>}
                        </div>
                    </div>
                </Card>
            </div>
        );
    }
    
    const toolDetails = {
        qa: { title: "اسأل الدليل", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        test: { title: "حوّل إجراءً إلى حالة اختبار", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
        compare: { title: "قارن تطبيقك بالدليل", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> },
        ideas: { title: "أفكار إبداعية", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
        mindmap: { title: "خريطة ذهنية للإجراءات", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">مساعد الدليل الذكي</h1>
                <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                    أنت تتفاعل الآن مع الدليل الرسمي. استخدم الأدوات أدناه للغوص في محتواه.
                </p>
            </div>
            
            <Card className="mb-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-x-3">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="font-semibold text-gray-800">{sopFile.name}</span>
                    </div>
                    <Button variant="secondary" onClick={() => setSopFile(null)} className="py-1 px-3 text-xs">تغيير الملف</Button>
                </div>
            </Card>

            <Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {(Object.keys(toolDetails) as ActiveTool[]).map(tool => (
                        <Button key={tool} variant={activeTool === tool ? 'primary' : 'secondary'} onClick={() => { setActiveTool(tool); setIsToolRun(false); }} className="flex items-center justify-center gap-x-2">
                          {toolDetails[tool].icon}
                          {toolDetails[tool].title}
                        </Button>
                    ))}
                </div>
            </Card>

            {error && <div className="mt-4 p-4 bg-red-400/20 text-red-800 border border-red-400/30 rounded-xl text-center">{error}</div>}
            
            {activeTool && activeTool !== 'mindmap' && (
                 <Card className="mt-6">
                    <div className="space-y-4">
                        {activeTool === 'qa' && <>
                            <textarea value={qa.question} onChange={(e) => { setQa({ question: e.target.value, answer: '', sopReference: '' }); setIsToolRun(false); }} rows={3} placeholder="اكتب سؤالك هنا عن محتوى الدليل الرسمي..." className="w-full p-2 border rounded-md bg-white/70" />
                            {qa.answer && <div className="p-4 bg-blue-500/10 rounded-md border-l-4 border-blue-500/50 prose max-w-none"><p className="font-semibold">الإجابة:</p><p>{qa.answer}</p>{qa.sopReference && <p className="text-xs font-mono text-gray-500 bg-gray-900/5 p-2 rounded-md mt-2">المرجع: {qa.sopReference}</p>}</div>}
                        </>}
                         {activeTool === 'test' && <>
                            <textarea value={testCase.procedure} onChange={(e) => { setTestCase({ procedure: e.target.value, result: { case: '', expectedOutcome: '', sopReference: '' } }); setIsToolRun(false); }} rows={4} placeholder="انسخ والصق إجراءً محددًا من دليلك هنا لاختباره..." className="w-full p-2 border rounded-md bg-white/70" />
                            {testCase.result.case && <div className="space-y-4"><div className="p-4 bg-yellow-500/10 rounded-md border-l-4 border-yellow-500/50 prose max-w-none"><p className="font-semibold">الحالة الافتراضية:</p><p>{testCase.result.case}</p></div><div className="p-4 bg-green-500/10 rounded-md border-l-4 border-green-500/50 prose max-w-none"><p className="font-semibold">التعامل المتوقع حسب الدليل:</p><p>{testCase.result.expectedOutcome}</p>{testCase.result.sopReference && <p className="text-xs font-mono text-gray-500 bg-gray-900/5 p-2 rounded-md mt-2">المرجع: {testCase.result.sopReference}</p>}</div></div>}
                        </>}
                        {activeTool === 'compare' && <>
                             <textarea value={compare.userProcedure} onChange={(e) => { setCompare({ userProcedure: e.target.value, result: null }); setIsToolRun(false); }} rows={4} placeholder="صف الإجراءات التي قمت بها في موقف معين ليتم مقارنتها بالدليل..." className="w-full p-2 border rounded-md bg-white/70" />
                             {compare.result && <div className="space-y-4">{compare.result.comparisonSummary && <div className="p-4 bg-indigo-500/10 rounded-md border-l-4 border-indigo-500/50 prose max-w-none"><p className="font-semibold">ملخص المقارنة:</p><p>{compare.result.comparisonSummary}</p></div>}{compare.result.compliances?.length > 0 && <div className="p-4 bg-green-500/10 rounded-md prose max-w-none"><p className="font-semibold">نقاط التطابق:</p><ul className="list-disc pr-5">{compare.result.compliances.map((c, i) => <li key={i}>{c.description} {c.sopReference && <span className='text-xs font-mono'>({c.sopReference})</span>}</li>)}</ul></div>}{compare.result.deviations?.length > 0 && <div className="p-4 bg-red-500/10 rounded-md prose max-w-none"><p className="font-semibold">نقاط الانحراف:</p><ul className="list-disc pr-5">{compare.result.deviations.map((d, i) => <li key={i}>{d.description} <br /><span className='text-sm text-gray-600'>المتوقع: {d.expectedProcedure}</span> {d.sopReference && <span className='text-xs font-mono'>({d.sopReference})</span>}</li>)}</ul></div>}{compare.result.improvementSuggestion && <div className="p-4 bg-yellow-500/10 rounded-md border-l-4 border-yellow-500/50 prose max-w-none"><p className="font-semibold">اقتراح للتحسين:</p><p>{compare.result.improvementSuggestion}</p></div>}</div>}
                        </>}
                         {activeTool === 'ideas' && creativeIdeas.length > 0 && <div className="space-y-3">{creativeIdeas.map((item, index) => (<div key={index} className="p-3 bg-teal-500/10 rounded-md border-l-4 border-teal-500/50 flex items-start gap-x-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg><div><p className="text-gray-800">{item.idea}</p>{item.sopReference && <p className="text-xs font-mono text-gray-500 bg-gray-900/5 p-1 rounded-md mt-2 inline-block">مرتبط بـ: {item.sopReference}</p>}</div></div>))}</div>}
                        
                        <Button onClick={handleRunTool} isLoading={isLoading} disabled={isLoading || isToolRun} className="w-full">
                           {isLoading ? 'جاري المعالجة...' : (isToolRun ? 'تم تشغيل الأداة' : 'تشغيل الأداة')}
                        </Button>
                    </div>
                </Card>
            )}

            {activeTool === 'mindmap' && (
                <Card className="mt-6">
                    {mindMapTool.step === 'initial' && (
                        <div className="text-center p-4">
                            <p className="text-sm text-gray-600 mb-4">الخطوة الأولى: استخراج قائمة الإجراءات من المستند لتحويلها إلى خرائط ذهنية.</p>
                            <Button onClick={handleExtractProcedures} isLoading={isLoading} disabled={isLoading}>استخراج الإجراءات</Button>
                        </div>
                    )}

                    {mindMapTool.procedures.length > 0 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-gray-800 mb-3">الخطوة 2: اختر إجراءً</h3>
                                <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-gray-500/5 rounded-lg border">
                                    {mindMapTool.procedures.map(proc => (
                                        <button key={proc.title} onClick={() => handleSelectProcedure(proc.title)} className={`w-full text-right p-3 rounded-md text-sm transition-colors ${mindMapTool.selectedProcedureTitle === proc.title ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-gray-200/50'}`}>
                                            {proc.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {mindMapTool.selectedProcedureTitle && mindMapTool.step !== 'mindmap_generated' && (
                                <div className="text-center border-t pt-4">
                                    <Button onClick={handleGenerateMindMap} isLoading={isLoading} disabled={isLoading}>
                                        إنشاء خريطة ذهنية لـ "{mindMapTool.selectedProcedureTitle}"
                                    </Button>
                                </div>
                            )}

                            {mindMapTool.mindMap && (
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-4 border-t pt-4">الخريطة الذهنية لـ "{mindMapTool.selectedProcedureTitle}"</h3>
                                    <div className="p-4 bg-white/50 rounded-lg">
                                        <ul className="space-y-2">
                                            <MindMapNodeView node={mindMapTool.mindMap} />
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default SopAssistantView;