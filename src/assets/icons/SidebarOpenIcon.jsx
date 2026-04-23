import * as React from "react";

// Standardized icon component with consistent props interface
function SidebarOpenIcon({ width = 24, height = 24, className, ...props }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={width} 
            height={height} 
            className={className} 
            {...props}
        >
        <rect width={18} height={18} x={3} y={3} stroke="#000" rx={4} />
        <path stroke="#000" d="M8 3v18M15 9l-4 3 4 3" />
        </svg>
    );
}

export default SidebarOpenIcon;
