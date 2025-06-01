
import React from 'react';

export const BroomIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125V21h-3.375c-.621 0-1.125-.504-1.125-1.125V10.5h3.375Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5v.75V12c0 .414.336.75.75.75s.75-.336.75-.75V3.75c0-1.243-1.007-2.25-2.25-2.25H3.75c-1.243 0-2.25 1.007-2.25 2.25v16.5M19.5 10.5c.375 0 .75.336.75.75V12c0 .414-.336.75-.75.75s-.75-.336-.75-.75V10.5m0 0h-3.375M3 3h13.5m0 0v7.5M3 3v7.5m0 0h4.5m3.375 0h6.375" />
  </svg>
);
