import * as React from "react";

// Standardized icon component with consistent props interface
function OkIcon({ width = 24, height = 24, className, ...props }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={width}
            height={height}
            className={className || "icon"}
            viewBox="0 0 1024 1024" 
            {...props}
        >
        <path fill="#4CAF50" d="M64 512a448 448 0 1 0 896 0 448 448 0 1 0-896 0Z" />
        <path
        fill="#CCFF90"
            d="M738.133 311.467 448 601.6 328.533 482.133 268.8 541.867l179.2 179.2L797.867 371.2z"
        />
        </svg>
    );
}

export default OkIcon;
