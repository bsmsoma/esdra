import * as React from "react";

// Standardized icon component with consistent props interface
function FeedIcon({ width = 24, height = 24, className, ...props }) {
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
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            className={className}
            d="m8 6 13 .001m-13 6h13m-13 6h13M3.5 6h.01m-.01 6h.01m-.01 6h.01M4 6a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm0 6a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm0 6a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"
        />
        </svg>
    );
}

export default FeedIcon;
