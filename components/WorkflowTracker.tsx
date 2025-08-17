import React from 'react';
import { IncidentStatus } from '../types';

interface WorkflowTrackerProps {
  currentStatus: IncidentStatus;
}

const WorkflowTracker: React.FC<WorkflowTrackerProps> = ({ currentStatus }) => {
  const steps = [
    IncidentStatus.Open,
    IncidentStatus.Analyzing,
    IncidentStatus.PendingReview,
    IncidentStatus.SolutionImplemented,
    IncidentStatus.Resolved,
  ];

  const currentStepIndex = steps.indexOf(currentStatus);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-start">
        {steps.map((step, stepIdx) => {
          const status = getStepStatus(stepIdx);
          const isCompleted = status === 'completed';
          const isCurrent = status === 'current';

          return (
            <React.Fragment key={step}>
              <li className="relative flex-shrink-0 flex flex-col items-center group">
                {/* Circle and Icon */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'border-blue-600 bg-blue-600'
                      : isCurrent
                      ? 'border-blue-600 bg-white shadow-lg shadow-blue-500/50'
                      : 'border-gray-300 bg-white group-hover:border-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                     <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300 transition-colors duration-300 group-hover:bg-gray-400" />
                  )}
                </div>
                {/* Label */}
                <p
                  className={`absolute top-full mt-2 text-xs text-center w-28 transition-colors duration-300 ${
                    isCurrent ? 'font-bold text-blue-700' : 'font-medium text-gray-600'
                  }`}
                >
                  {step}
                </p>
              </li>

              {/* Connector */}
              {stepIdx < steps.length - 1 && (
                <div
                  className={`flex-auto border-t-2 transition-colors duration-500 ease-in-out mt-5 ${
                    isCompleted ? 'border-blue-600' : 'border-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default WorkflowTracker;
