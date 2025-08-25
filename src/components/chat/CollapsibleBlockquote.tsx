import React, { useState } from 'react';

interface CollapsibleBlockquoteProps {
  children: React.ReactNode;
}

export const CollapsibleBlockquote: React.FC<CollapsibleBlockquoteProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const expand = () => {
    setIsExpanded(true);
  };

  return (
    <blockquote
      className={`border-l-4 border-gray-300 pl-4 my-2 transition-colors ${
        isExpanded ? '' : 'cursor-pointer hover:bg-gray-50'
      }`}
      onClick={expand}
    >
      <div className={isExpanded ? '' : 'line-clamp-1'}>{children}</div>
    </blockquote>
  );
};
