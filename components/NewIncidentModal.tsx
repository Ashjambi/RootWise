import React, { useState } from 'react';
import { IncidentReport, IncidentSeverity, Attachment } from '../types';
import Button from './ui/Button';
import { extractIncidentDetailsFromAttachment } from '../services/geminiService';

interface NewIncidentModalProps {
  onClose: () => void;
  onSubmit: (incident: Omit<IncidentReport, 'id' | 'status'>) => void;
}

const baseInputClasses = "mt-1 block w-full px-4 py-2 border rounded-lg shadow-inner-sm placeholder-gray-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500/70 sm:text-sm bg-white/70 border-white/80 transition-shadow duration-200 focus:shadow-md";

const InputField: React.FC<{ id: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }> = ({ id, label, value, onChange, required }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 font-cairo">{label}</label>
        <input type="text" id={id} name={id} value={value} onChange={onChange} required={required} className={baseInputClasses} />
    </div>
);

const SelectField: React.FC<{ id: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; required?: boolean }> = ({ id, label, value, onChange, children, required }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 font-cairo">{label}</label>
        <select id={id} name={id} value={value} onChange={onChange} required={required} className={`${baseInputClasses} appearance-none`}>
            {children}
        </select>
    </div>
);

const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve({ data: base64Data, mimeType: file.type });
        };
        reader.onerror = error => reject(error);
    });
};

const NewIncidentModal: React.FC<NewIncidentModalProps> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Omit<IncidentReport, 'id' | 'status' | 'immediateAction' | 'attachments'>>({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        department: '',
        severity: IncidentSeverity.Medium,
        involvedPersonnel: '',
    });
    const [files, setFiles] = useState<File[]>([]);
    const [isAnalyzingAttachment, setIsAnalyzingAttachment] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    const handleAnalyzeAttachment = async () => {
        if (files.length === 0) return;
        
        setIsAnalyzingAttachment(true);
        setAnalysisError(null);
        
        try {
            const firstFile = files[0];
            const { data, mimeType } = await fileToBase64(firstFile);

            const result = await extractIncidentDetailsFromAttachment(data, mimeType, formData.description);

            setFormData(prev => ({
                ...prev,
                title: result.title || prev.title,
                description: result.description || prev.description,
                department: result.department || prev.department,
                severity: result.severity || prev.severity,
                involvedPersonnel: result.involvedPersonnel || prev.involvedPersonnel,
            }));

        } catch (e) {
            setAnalysisError(e instanceof Error ? e.message : "فشل تحليل المرفق.");
        } finally {
            setIsAnalyzingAttachment(false);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const attachments: Attachment[] = files.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
        }));

        onSubmit({
            ...formData,
            immediateAction: 'مضمن في الوصف التفصيلي للحادث.',
            attachments,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white/70 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/80" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-gray-900 font-cairo">إنشاء بلاغ حادث جديد</h2>
                        <p className="mt-1 text-sm text-gray-600">أدخل التفاصيل يدويًا أو قم بتحميل مرفق ليقوم الذكاء الاصطناعي بتحليله.</p>
                        <div className="mt-8 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                           <div className="sm:col-span-2">
                             <InputField id="title" label="عنوان الحادث" value={formData.title} onChange={handleChange} required />
                           </div>
                           
                           <div>
                             <InputField id="department" label="القسم المسؤول" value={formData.department} onChange={handleChange} required />
                           </div>
                           <div>
                             <label htmlFor="date" className="block text-sm font-semibold text-gray-700 font-cairo">تاريخ البلاغ</label>
                             <input 
                                 type="date" 
                                 id="date" 
                                 name="date" 
                                 value={formData.date} 
                                 onChange={handleChange} 
                                 required 
                                 className={baseInputClasses} 
                             />
                           </div>
                           <div>
                             <SelectField id="severity" label="مستوى الخطورة" value={formData.severity} onChange={handleChange} required>
                                {Object.values(IncidentSeverity).map(s => <option key={s} value={s}>{s}</option>)}
                             </SelectField>
                           </div>
                           <div>
                            <InputField id="involvedPersonnel" label="الأفراد / الأدوار المعنية" value={formData.involvedPersonnel} onChange={handleChange} required />
                           </div>

                           <div className="sm:col-span-2">
                             <div>
                                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 font-cairo">وصف الحادث</label>
                                <textarea 
                                    id="description" 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={handleChange} 
                                    required 
                                    rows={4} 
                                    className={baseInputClasses}
                                    placeholder="أدخل وصفًا تفصيليًا هنا، أو اترك ملاحظات إضافية للمحلل الذكي عند تحليل مرفق."
                                ></textarea>
                            </div>
                           </div>
                           
                           <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 font-cairo">تحليل المرفقات الذكي (اختياري)</label>
                                <p className="text-xs text-gray-500 mt-1 mb-2">وفر الوقت عن طريق تحميل تقرير الحادث (صورة، PDF)، وسيقوم الذكاء الاصطناعي بتعبئة الحقول تلقائيًا.</p>
                                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300/60 border-dashed rounded-xl bg-white/30">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white/80 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2">
                                                <span>اختر ملفاتك</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept="application/pdf,image/*,video/*" />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500">PDF, PNG, JPG, MP4</p>
                                    </div>
                                </div>
                                {analysisError && <p className="mt-2 text-xs text-red-600 text-center">{analysisError}</p>}
                                {files.length > 0 && (
                                    <div className="mt-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleAnalyzeAttachment}
                                            isLoading={isAnalyzingAttachment}
                                            className="w-full"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                            تحليل المرفق الأول لاستخلاص التفاصيل
                                        </Button>
                                    </div>
                                )}
                            </div>
                            
                            {files.length > 0 && (
                                <div className="sm:col-span-2 -mt-2">
                                    <ul role="list" className="border border-gray-200/80 rounded-md divide-y divide-gray-200/80">
                                        {files.map((file, index) => (
                                            <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                                <div className="w-0 flex-1 flex items-center">
                                                    <svg className="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a3 3 0 003 3h4a3 3 0 003-3V7a3 3 0 00-3-3H8zm-1.5 4a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" /></svg>
                                                    <span className="mr-2 flex-1 w-0 truncate">{file.name}</span>
                                                </div>
                                                <div className="ml-4 flex-shrink-0 flex items-center space-i-4">
                                                    <span className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                    <button type="button" onClick={() => handleRemoveFile(index)} className="font-medium text-red-600 hover:text-red-500 mr-3">
                                                        إزالة
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        </div>
                    </div>
                    <div className="bg-white/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse rounded-b-2xl">
                        <Button type="submit" variant="primary">
                            إرسال البلاغ
                        </Button>
                        <Button type="button" variant="secondary" onClick={onClose} className="ml-3">
                            إلغاء
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewIncidentModal;