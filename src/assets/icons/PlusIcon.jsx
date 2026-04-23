import * as React from "react";

// Standardized icon component with consistent props interface
function PlusIcon({ width = 24, height = 24, className, ...props }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={width} 
            height={height} 
            fill="none" 
            viewBox="0 0 16 16" 
            className={className} 
            {...props}
        >
            <path d="M10 1H6v5H1v4h5v5h4v-5h5V6h-5V1Z" />
        </svg>
    );
}

export default PlusIcon;
