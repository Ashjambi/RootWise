import React from 'react';
import { IncidentReport, ActiveView } from '../types';
import Tag from './ui/Tag';

interface SidebarProps {
  incidents: IncidentReport[];
  selectedIncidentId: string | null;
  onNavigate: (view: ActiveView, incidentId?: string | null) => void;
  activeView: ActiveView;
  isOpen: boolean;
}

const NavButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  isFeatured?: boolean;
}> = ({ onClick, isActive, children, icon, isFeatured = false }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center text-right p-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
        isActive
            ? 'bg-blue-500/10 shadow-inner text-blue-800 font-bold'
            : isFeatured 
            ? 'bg-gradient-to-r from-purple-500/5 to-pink-500/5 hover:from-purple-500/10 hover:to-pink-500/10 text-gray-800 font-semibold'
            : 'hover:bg-gray-900/5 text-gray-800 font-semibold'
        }`}
    >
        <span className="ml-3">{icon}</span>
        {children}
    </button>
);

const NavGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-4 pt-4 border-t border-gray-900/10">
        <h3 className="px-3 mb-2 text-xs font-semibold uppercase text-gray-500 tracking-wider">{title}</h3>
        {children}
    </div>
);


const Sidebar: React.FC<SidebarProps> = ({ 
    incidents, 
    selectedIncidentId, 
    onNavigate,
    activeView,
    isOpen 
}) => {
  return (
    <aside className={`
      w-80 flex-shrink-0
      transform transition-transform duration-300 ease-in-out
      fixed md:relative 
      inset-y-0 right-0 z-40 p-2 pl-0
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      md:translate-x-0
    `}>
      <div className="h-full bg-white/50 backdrop-blur-lg rounded-2xl border border-white/60 p-4 flex flex-col">
        <div className="mb-4 space-y-1">
            <h3 className="px-3 mb-2 text-xs font-semibold uppercase text-gray-500 tracking-wider">العمليات اليومية</h3>
            <NavButton onClick={() => onNavigate('dashboard')} isActive={activeView === 'dashboard'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}>
                مركز القيادة
            </NavButton>
            <NavButton onClick={() => onNavigate('my_actions')} isActive={activeView === 'my_actions'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                كل الإجراءات
            </NavButton>

            <NavGroup title="التحليل الاستراتيجي">
                <NavButton onClick={() => onNavigate('risk_dashboard')} isActive={activeView === 'risk_dashboard'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} isFeatured>
                    لوحة مؤشرات المخاطر
                </NavButton>
                <NavButton onClick={() => onNavigate('sop_assistant')} isActive={activeView === 'sop_assistant'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>} isFeatured>
                    مساعد الدليل الذكي
                </NavButton>
                <NavButton onClick={() => onNavigate('known_tools_analysis')} isActive={activeView === 'known_tools_analysis'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V5.75A2.25 2.25 0 0018 3.5H6A2.25 2.25 0 003.75 5.75v12.5A2.25 2.25 0 006 20.25z" /></svg>}>
                    تحليل بأدوات معروفة
                </NavButton>
            </NavGroup>

            <NavGroup title="المعرفة والمراجع">
                 <NavButton onClick={() => onNavigate('reports')} isActive={activeView === 'reports'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 00-4-4H3V9h2a4 4 0 004-4V3l4 4-4 4v2a4 4 0 004 4h2v2h-2a4 4 0 00-4 4z" /></svg>}>
                    التقارير
                </NavButton>
                <NavButton onClick={() => onNavigate('knowledge_base')} isActive={activeView === 'knowledge_base'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.747h18" /></svg>}>
                    قاعدة المعرفة
                </NavButton>
                <NavButton onClick={() => onNavigate('global_cases')} isActive={activeView === 'global_cases'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9M3 12a9 9 0 019-9m0 18a9 9 0 00-9-9" /></svg>}>
                    المكتبة العالمية
                </NavButton>
            </NavGroup>
             <NavGroup title="النظام">
                 <NavButton onClick={() => onNavigate('settings')} isActive={activeView === 'settings'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>
                    الإعدادات
                </NavButton>
                 <NavButton onClick={() => onNavigate('about')} isActive={activeView === 'about'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                    عن التطبيق
                </NavButton>
            </NavGroup>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          <h3 className="px-3 mb-2 text-xs font-semibold uppercase text-gray-500 tracking-wider border-t pt-4 border-gray-900/10">تحليل الحوادث</h3>
          <div className="flex-1 space-y-2 overflow-y-auto">
            <ul>
              {incidents.map((incident) => (
                <li key={incident.id}>
                  <button
                    onClick={() => onNavigate('incident', incident.id)}
                    className={`w-full text-right p-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      selectedIncidentId === incident.id && activeView === 'incident'
                        ? 'bg-blue-500/10 shadow-inner'
                        : 'hover:bg-gray-900/5'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${selectedIncidentId === incident.id && activeView === 'incident' ? 'text-blue-800' : 'text-gray-800'}`}>
                      {incident.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{incident.department}</p>
                     <div className="mt-2 flex items-center flex-wrap gap-2 justify-end">
                        <Tag type={incident.severity} />
                        <Tag type={incident.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;