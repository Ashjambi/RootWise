
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  isLoading = false,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-opacity-50 transition-all duration-200 ease-in-out transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg";

  const variantClasses = {
    primary: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border border-blue-400/50 focus:ring-blue-300 shadow-blue-500/30 hover:shadow-blue-500/40',
    secondary: 'bg-gradient-to-br from-white/80 to-white/70 text-gray-800 border border-white/90 focus:ring-gray-300 shadow-gray-500/20 hover:shadow-gray-500/30',
    danger: 'bg-gradient-to-br from-red-500 to-red-600 text-white border border-red-400/50 focus:ring-red-300 shadow-red-500/30 hover:shadow-red-500/40',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
