import * as React from "react";

// Standardized icon component with consistent props interface
function DeleteIcon({ width = 24, height = 24, className, ...props }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            width={width}
            height={height}
            viewBox="0 0 24 24" 
            className={className} 
            {...props}
        >
            <g strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                <path d="M4 7h16M6 10l1.701 9.358A2 2 0 0 0 9.67 21h4.662a2 2 0 0 0 1.968-1.642L18 10M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2H9V5Z" />
            </g>
        </svg>
    );
}

export default DeleteIcon;
