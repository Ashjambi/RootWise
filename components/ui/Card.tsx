
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/70 p-4 md:p-6 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
