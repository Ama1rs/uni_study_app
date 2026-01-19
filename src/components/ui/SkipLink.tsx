import React from 'react';

export interface SkipLinkProps {
  target: string;
  children: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ target, children }) => (
  <a
    href={target}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent text-white px-4 py-2 rounded z-50 focus:outline-2 focus:outline-white"
  >
    {children}
  </a>
);

export const visuallyHidden = 'sr-only';