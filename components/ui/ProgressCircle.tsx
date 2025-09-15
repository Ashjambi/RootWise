import React from 'react';

interface ProgressCircleProps {
  progress: number;
  size: number;
  strokeWidth: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ progress, size, strokeWidth }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const getProgressColor = () => {
    if (progress >= 85) return 'text-green-500';
    if (progress >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const colorClass = getProgressColor();

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute top-0 left-0" width={size} height={size}>
        <circle
          className="text-gray-200"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClass} transition-all duration-500 ease-in-out`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className={`text-2xl font-bold ${colorClass}`}>{Math.round(progress)}</span>
        <span className={`text-xs font-semibold ${colorClass}`}>%</span>
        <p className="text-xs text-gray-500">توافق</p>
      </div>
    </div>
  );
};

export default ProgressCircle;
