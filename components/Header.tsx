import React from 'react';
import Button from './ui/Button';
import { AppSettings } from '../types';

interface HeaderProps {
  onNewReport: () => void;
  settings: AppSettings;
  onToggleSidebar: () => void;
}

const DefaultLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.474-4.474c-.048-.58-.026-1.193-.14-1.743m-2.14-2.14a4.5 4.5 0 00-4.474-4.474c-.58.048-1.193.026-1.743.14m-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.474-4.474c-.048-.58-.026-1.193-.14-1.743m-2.14-2.14a4.5 4.5 0 00-4.474-4.474c-.58.048-1.193.026-1.743.14" />
  </svg>
);


const Header: React.FC<HeaderProps> = ({ onNewReport, settings, onToggleSidebar }) => {

  return (
    <header className="sticky top-0 z-20 p-2">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl bg-white/60 backdrop-blur-lg border border-white/70 shadow-md">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
             <div className="md:hidden">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-md text-gray-700 hover:bg-gray-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="افتح القائمة"
                >
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
             {settings.logo ? (
                <img src={settings.logo} alt="شعار التطبيق" className="h-9 w-auto object-contain" />
            ) : (
                <DefaultLogo className="h-8 w-8 text-blue-600 glass-icon" />
            )}
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{settings.appName}</h1>
          </div>
          <div className="flex items-center">
            <Button onClick={onNewReport}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              بلاغ جديد
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;