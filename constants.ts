
import { IncidentReport, IncidentSeverity, IncidentStatus, RecommendationCategory, RecommendationStatus, AppSettings } from './types';

export const CURRENT_USER = "المستخدم الحالي";

export const DEFAULT_SETTINGS: AppSettings = {
    appName: "RootWise",
    logo: null,
    features: [
        { id: 'analysis', title: "التحليل الذكي والفوري", enabled: true },
        { id: 'proactive', title: "الرؤية الاستباقية والوقاية", enabled: true },
        { id: 'decision', title: "دعم القرار الاستراتيجي", enabled: true },
        { id: 'learning', title: "التحسين المستمر والتعلم", enabled: true },
    ]
};

// All sample incidents have been removed to provide a clean slate for the user.
export const INITIAL_INCIDENTS: IncidentReport[] = [];