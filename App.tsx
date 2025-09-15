import React, { useState, useCallback, useMemo } from 'react';
import { IncidentReport, IncidentStatus, SystemicInsight, KnowledgeCapsuleItem, ActionItem, DashboardBriefing, ActiveView, AppSettings, RecommendationStatus, ParetoAnalysis } from './types';
import { INITIAL_INCIDENTS, CURRENT_USER, DEFAULT_SETTINGS } from './constants';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import OverviewDashboard from './components/OverviewDashboard';
import IncidentDetail from './components/IncidentDetail';
import NewIncidentModal from './components/NewIncidentModal';
import GlobalCasesView from './components/GlobalCasesView';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import ReportsView from './components/ReportsView';
// FIX: Corrected import path casing to match file system 'Myactionsview.tsx'.
import MyActionsView from './components/Myactionsview';
import SopAssistantView from './components/AICoachView';
import RiskDashboardView from './components/RiskDashboardView';
import AboutView from './components/AboutView';
import SettingsView from './components/SettingsView';
import KnownToolsAnalysisView from './components/KnownToolsAnalysisView';

const App: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentReport[]>(INITIAL_INCIDENTS);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [systemicInsights, setSystemicInsights] = useState<SystemicInsight[]>([]);
  const [dashboardBriefing, setDashboardBriefing] = useState<DashboardBriefing | null>(null);
  const [currentUser] = useState(CURRENT_USER);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [paretoAnalysis, setParetoAnalysis] = useState<ParetoAnalysis | null>(null);

  const knowledgeBase = useMemo<KnowledgeCapsuleItem[]>(() => {
    return incidents
        .filter(inc => inc.analysis?.knowledgeCapsule)
        .map(inc => ({
            incidentId: inc.id,
            incidentTitle: inc.title,
            capsule: inc.analysis!.knowledgeCapsule,
            date: inc.date,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incidents]);
  
  const allActionItems = useMemo<ActionItem[]>(() => {
    const regularActions = incidents.flatMap(inc =>
      inc.analysis?.recommendations.map(rec => ({
        ...rec,
        incidentId: inc.id,
        incidentTitle: inc.title,
        incidentDate: inc.date,
        isMeta: false,
      })) || []
    );
  
    const metaActions = incidents
      .filter(inc => inc.recurrenceInfo?.analysis?.metaRecommendations)
      .flatMap(inc =>
        inc.recurrenceInfo!.analysis!.metaRecommendations!.map(rec => ({
          ...rec,
          incidentId: inc.id, // The ID of the chain head
          incidentTitle: `سلسلة متكررة: ${inc.title}`,
          incidentDate: inc.date,
          isMeta: true,
        }))
      );
  
    return [...regularActions, ...metaActions].sort((a, b) => (a.dueDate && b.dueDate) ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() : 0);
  }, [incidents]);

  const handleNavigate = (view: ActiveView, incidentId: string | null = null) => {
    setActiveView(view);
    setSelectedIncidentId(incidentId);
    setIsSidebarOpen(false); // Close sidebar on navigation
  }

  const handleAddNewIncident = (newIncident: Omit<IncidentReport, 'id' | 'status'>) => {
    const newId = `INC${(incidents.length + 1).toString().padStart(3, '0')}`;
    const incidentToAdd: IncidentReport = {
      ...newIncident,
      id: newId,
      status: IncidentStatus.Open,
    };
    setIncidents(prevIncidents => [incidentToAdd, ...prevIncidents]);
    handleNavigate('incident', newId);
    setIsModalOpen(false);
  };

  const handleUpdateIncident = useCallback((updatedIncident: IncidentReport) => {
    setIncidents(prevIncidents => {
        const originalIncident = prevIncidents.find(inc => inc.id === updatedIncident.id);

        let newIncidents = prevIncidents.map(inc =>
            inc.id === updatedIncident.id ? updatedIncident : inc
        );

        // --- STRATEGIC RESOLUTION LOGIC ---
        let chainIdToResolve: string | undefined = undefined;
        if (originalIncident && updatedIncident.recurrenceChainId && updatedIncident.recurrenceInfo?.analysis?.metaRecommendations) {
            const originalMetaRecs = originalIncident.recurrenceInfo?.analysis?.metaRecommendations || [];
            const updatedMetaRecs = updatedIncident.recurrenceInfo.analysis.metaRecommendations;

            const newlyVerifiedMetaRec = updatedMetaRecs.find(updatedRec =>
                updatedRec.status === RecommendationStatus.Verified &&
                originalMetaRecs.find(originalRec => originalRec.id === updatedRec.id)?.status !== RecommendationStatus.Verified
            );

            if (newlyVerifiedMetaRec) {
                chainIdToResolve = updatedIncident.recurrenceChainId;
            }
        }
        
        if (chainIdToResolve) {
            newIncidents = newIncidents.map(inc => {
                if (inc.recurrenceChainId === chainIdToResolve && inc.status !== IncidentStatus.Resolved && inc.status !== IncidentStatus.Archived) {
                    return { ...inc, status: IncidentStatus.Resolved };
                }
                return inc;
            });
        }
        // --- END STRATEGIC RESOLUTION LOGIC ---

        // --- REGULAR AUTO-RESOLVE LOGIC ---
        const incidentForAutoResolveCheck = newIncidents.find(inc => inc.id === updatedIncident.id);
        if (incidentForAutoResolveCheck?.analysis?.recommendations.length > 0) {
            const allRecommendationsClosed = incidentForAutoResolveCheck.analysis.recommendations.every(
                rec => rec.status === RecommendationStatus.Verified || rec.status === RecommendationStatus.Ineffective
            );
            if (allRecommendationsClosed && incidentForAutoResolveCheck.status !== IncidentStatus.Resolved && incidentForAutoResolveCheck.status !== IncidentStatus.Archived) {
                const finalUpdatedIncident = { ...incidentForAutoResolveCheck, status: IncidentStatus.Resolved };
                newIncidents = newIncidents.map(inc =>
                    inc.id === finalUpdatedIncident.id ? finalUpdatedIncident : inc
                );
            }
        }
        // --- END REGULAR AUTO-RESOLVE LOGIC ---

        // --- RECURRENCE CHAIN CREATION LOGIC ---
        const incidentForChainCheck = newIncidents.find(i => i.id === updatedIncident.id)!;
        if (incidentForChainCheck.recurrenceInfo?.isRecurrent && !incidentForChainCheck.recurrenceChainId) {
            const chainMemberIds = new Set([
                incidentForChainCheck.id,
                ...(incidentForChainCheck.recurrenceInfo.linkedIncidents.map(i => i.id)),
            ]);
            const chainMembers = newIncidents.filter(i => chainMemberIds.has(i.id));
            if (chainMembers.length > 1) {
                const chainHead = chainMembers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
                const chainId = chainHead.id;
                newIncidents = newIncidents.map(inc => 
                    chainMemberIds.has(inc.id) ? { ...inc, recurrenceChainId: chainId } : inc
                );
            }
        }
        // --- END RECURRENCE CHAIN CREATION LOGIC ---
        
        return newIncidents;
    });
  }, []);
  
  const selectedIncident = incidents.find(inc => inc.id === selectedIncidentId);

  const renderActiveView = () => {
    switch (activeView) {
      case 'incident':
        return selectedIncident ? (
          <IncidentDetail 
            key={selectedIncidentId} 
            incident={selectedIncident} 
            allIncidents={incidents}
            onUpdate={handleUpdateIncident}
            onNavigate={handleNavigate}
            currentUser={currentUser}
          />
        ) : <OverviewDashboard incidents={incidents} onNavigate={handleNavigate} systemicInsights={systemicInsights} setSystemicInsights={setSystemicInsights} dashboardBriefing={dashboardBriefing} setDashboardBriefing={setDashboardBriefing} />;
      case 'dashboard':
        return <OverviewDashboard incidents={incidents} onNavigate={handleNavigate} systemicInsights={systemicInsights} setSystemicInsights={setSystemicInsights} dashboardBriefing={dashboardBriefing} setDashboardBriefing={setDashboardBriefing} />;
      case 'global_cases':
        return <GlobalCasesView />;
      case 'knowledge_base':
        return <KnowledgeBaseView knowledgeBase={knowledgeBase} onNavigate={handleNavigate} />;
      case 'reports':
        return <ReportsView incidents={incidents} />;
      case 'my_actions':
          return <MyActionsView allActionItems={allActionItems} onNavigate={handleNavigate} onUpdateIncident={handleUpdateIncident} incidents={incidents} currentUser={currentUser} />;
      case 'sop_assistant':
          return <SopAssistantView />;
       case 'risk_dashboard':
          return <RiskDashboardView incidents={incidents} onNavigate={handleNavigate} />;
       case 'known_tools_analysis':
          return <KnownToolsAnalysisView incidents={incidents} onUpdateIncident={handleUpdateIncident} paretoAnalysis={paretoAnalysis} setParetoAnalysis={setParetoAnalysis} />;
       case 'about':
          return <AboutView features={settings.features} />;
       case 'settings':
          return <SettingsView settings={settings} onSettingsChange={setSettings} />;
      default:
        return <OverviewDashboard incidents={incidents} onNavigate={handleNavigate} systemicInsights={systemicInsights} setSystemicInsights={setSystemicInsights} dashboardBriefing={dashboardBriefing} setDashboardBriefing={setDashboardBriefing} />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onNewReport={() => setIsModalOpen(true)} settings={settings} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex flex-1 relative">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />}
        <Sidebar
          incidents={incidents}
          selectedIncidentId={selectedIncidentId}
          onNavigate={handleNavigate}
          activeView={activeView}
          isOpen={isSidebarOpen}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {renderActiveView()}
        </main>
      </div>
      {isModalOpen && (
        <NewIncidentModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddNewIncident}
        />
      )}
    </div>
  );
};

export default App;