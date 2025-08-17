import React, { useRef } from 'react';
import { AppSettings, CustomFeature } from '../types';
import Card from './ui/Card';
import ToggleSwitch from './ui/ToggleSwitch';
import Button from './ui/Button';

interface SettingsViewProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const baseInputClasses = "block w-full px-3 py-2 border rounded-lg shadow-inner-sm placeholder-gray-500/80 focus:outline-none focus:ring-2 focus:ring-blue-500/70 sm:text-sm bg-white/70 border-white/80 transition-shadow duration-200 focus:shadow-md";

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAppNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, appName: e.target.value });
  };
  
  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            onSettingsChange({ ...settings, logo: reader.result as string });
        };
        reader.readAsDataURL(file);
    } else {
        alert("يرجى تحديد ملف صورة صالح (PNG, JPG, SVG).");
    }
  };

  const handleRemoveLogo = () => {
    onSettingsChange({ ...settings, logo: null });
  };

  const handleFeatureChange = (id: CustomFeature['id'], newValues: Partial<CustomFeature>) => {
      const updatedFeatures = settings.features.map(f => 
          f.id === id ? { ...f, ...newValues } : f
      );
      onSettingsChange({ ...settings, features: updatedFeatures });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 font-cairo tracking-tight">إعدادات التخصيص</h1>
        <p className="mt-2 text-lg text-gray-600 max-w-2xl">
          قم بتخصيص مظهر وهوية التطبيق ليتناسب مع علامتك التجارية.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <h2 className="text-xl font-bold text-gray-800 font-cairo mb-4">إعدادات العلامة التجارية</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="appName" className="block text-sm font-semibold text-gray-700 font-cairo mb-1">اسم التطبيق</label>
              <input
                type="text"
                id="appName"
                value={settings.appName}
                onChange={handleAppNameChange}
                className={baseInputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 font-cairo mb-2">شعار الشركة</label>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-xl bg-gray-500/10 flex items-center justify-center border border-dashed border-gray-400/50 overflow-hidden">
                    {settings.logo ? (
                        <img src={settings.logo} alt="الشعار الحالي" className="h-full w-full object-contain" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    )}
                </div>
                <div className="flex flex-col gap-2 self-start">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    />
                    <Button variant="secondary" onClick={handleLogoUploadClick}>
                        تغيير الشعار
                    </Button>
                    {settings.logo && (
                        <Button variant="danger" onClick={handleRemoveLogo} className="py-1.5 px-3 text-xs">
                            إزالة الشعار
                        </Button>
                    )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
           <h2 className="text-xl font-bold text-gray-800 font-cairo mb-4">تخصيص الميزات</h2>
           <p className="text-sm text-gray-600 mb-6">
             تحكم في الميزات التي تظهر في صفحة "عن التطبيق" وقم بتعديل عناوينها لتناسب مصطلحات شركتك.
           </p>
           <div className="space-y-6">
                {settings.features.map(feature => (
                    <div key={feature.id} className="p-4 rounded-xl border border-gray-200/80 bg-white/40">
                       <div className="flex justify-between items-center mb-3">
                           <label htmlFor={`feature-title-${feature.id}`} className="block text-sm font-semibold text-gray-700 font-cairo">عنوان الميزة</label>
                           <div className="flex items-center gap-x-3">
                               <span className="text-sm text-gray-600">{feature.enabled ? 'مفعل' : 'معطل'}</span>
                               <ToggleSwitch
                                  enabled={feature.enabled}
                                  onChange={(enabled) => handleFeatureChange(feature.id, { enabled })}
                               />
                           </div>
                       </div>
                        <input
                            type="text"
                            id={`feature-title-${feature.id}`}
                            value={feature.title}
                            onChange={(e) => handleFeatureChange(feature.id, { title: e.target.value })}
                            className={baseInputClasses}
                        />
                    </div>
                ))}
           </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsView;