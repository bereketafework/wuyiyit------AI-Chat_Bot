
import React from 'react';

export const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3.696-3.697C12.716 15.171 11.161 15 9.583 15H4.5A2.25 2.25 0 0 1 2.25 12.75v-4.5A2.25 2.25 0 0 1 4.5 6h7.5c.906 0 1.7.429 2.234 1.085l.104.116Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12h.008v.008H6.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0h.008v.008h-.008V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);