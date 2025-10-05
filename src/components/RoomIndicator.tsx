interface RoomIndicatorProps {
  room: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export default function RoomIndicator({ 
  room, 
  size = 'md', 
  showIcon = true, 
  className = '' 
}: RoomIndicatorProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`inline-flex items-center bg-blue-100 text-blue-800 rounded-full font-semibold ${sizeClasses[size]} ${className}`}>
      {showIcon && (
        <svg 
          className={`${iconSizes[size]} mr-1`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" 
          />
        </svg>
      )}
      <span>Salle {room}</span>
    </div>
  );
}


