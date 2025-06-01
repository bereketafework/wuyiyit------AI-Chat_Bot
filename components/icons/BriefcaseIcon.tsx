
import React from 'react';

export const BriefcaseIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.075c0 1.313-.964 2.505-2.33 2.751h-11.84c-1.366-.246-2.33-1.438-2.33-2.75V14.15M16.5 6.75h-9v4.5h9v-4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3V6.75m0 0H6.75m5.25 0H17.25M6.75 6.75A1.125 1.125 0 0 1 5.625 5.625v-1.5A1.125 1.125 0 0 1 6.75 3h10.5A1.125 1.125 0 0 1 18.375 4.125v1.5A1.125 1.125 0 0 1 17.25 6.75m-10.5 0h10.5" />
  </svg>
);