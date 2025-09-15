
import React from 'react';
import { IncidentReport, ActiveView } from '../types';
import Tag from './ui/Tag';

interface RiskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  incidents: IncidentReport[];
  onNavigate: (view: ActiveView, incidentId?: string) => void;
}

const RiskDetailModal: React.FC<RiskDetailModalProps> = ({ isOpen, onClose, title, incidents, onNavigate }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] border border-white/80 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-900/10 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 font-cairo">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-500/10 hover:text-gray-800 transition-colors"
            aria-label="إغلاق"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="p-4 overflow-y-auto">
          <ul className="space-y-3">
            {incidents
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(incident => (
              <li key={incident.id}>
                <button
                  onClick={() => {
                    onNavigate('incident', incident.id);
                    onClose();
                  }}
                  className="w-full text-right p-3 rounded-lg bg-white/60 hover:bg-white/90 border border-gray-200/80 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <p className="font-semibold text-gray-800">{incident.title}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>{new Date(incident.date).toLocaleDateString('ar-EG')}</span>
                    <div className="flex gap-2">
                        <Tag type={incident.severity} />
                        <Tag type={incident.status} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
};

export default RiskDetailModal;
