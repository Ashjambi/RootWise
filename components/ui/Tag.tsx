import React from 'react';
import { IncidentSeverity, IncidentStatus, RecommendationStatus } from '../../types';

interface TagProps {
  type: IncidentSeverity | IncidentStatus | RecommendationStatus;
}

const Tag: React.FC<TagProps> = ({ type }) => {
  const severityColors: Record<IncidentSeverity, string> = {
    [IncidentSeverity.Low]: 'bg-green-400/20 text-green-800 border-green-400/30',
    [IncidentSeverity.Medium]: 'bg-yellow-400/20 text-yellow-800 border-yellow-400/30',
    [IncidentSeverity.High]: 'bg-orange-400/20 text-orange-800 border-orange-400/30',
    [IncidentSeverity.Critical]: 'bg-red-400/20 text-red-800 border-red-400/30',
  };

  const statusColors: Record<IncidentStatus, string> = {
    [IncidentStatus.Open]: 'bg-blue-400/20 text-blue-800 border-blue-400/30',
    [IncidentStatus.Analyzing]: 'bg-purple-400/20 text-purple-800 border-purple-400/30',
    [IncidentStatus.PendingReview]: 'bg-yellow-400/20 text-yellow-800 border-yellow-400/30',
    [IncidentStatus.SolutionImplemented]: 'bg-indigo-400/20 text-indigo-800 border-indigo-400/30',
    [IncidentStatus.Resolved]: 'bg-green-400/20 text-green-800 border-green-400/30',
    [IncidentStatus.Archived]: 'bg-gray-400/20 text-gray-800 border-gray-400/30',
  };

  const recommendationStatusColors: Record<RecommendationStatus, string> = {
    [RecommendationStatus.Proposed]: 'bg-gray-400/20 text-gray-800 border-gray-400/30',
    [RecommendationStatus.InProgress]: 'bg-purple-400/20 text-purple-800 border-purple-400/30',
    [RecommendationStatus.Implemented]: 'bg-indigo-400/20 text-indigo-800 border-indigo-400/30',
    [RecommendationStatus.Verified]: 'bg-green-400/20 text-green-800 border-green-400/30',
    [RecommendationStatus.Ineffective]: 'bg-red-400/20 text-red-800 border-red-400/30',
  };

  const colorClass = severityColors[type as IncidentSeverity] || statusColors[type as IncidentStatus] || recommendationStatusColors[type as RecommendationStatus] || 'bg-gray-100/80 text-gray-800 border-gray-200/50';

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {type}
    </span>
  );
};

export default Tag;