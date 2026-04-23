import * as React from "react";

// Standardized icon component with consistent props interface
function DressIcon({ width = 24, height = 24, className, ...props }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={width} 
            height={height} 
            viewBox="-12 0 64 64" 
            className={className}
            {...props}
        >
        <title>{"Dress"}</title>
        <g fill="none" fillRule="evenodd" stroke="#6B6C6E" strokeWidth={2}>
            <path d="M26.9 27C30 22.7 32 17 32 13c0-2.6-.2-6.4-2-7.2V2c0-1.1-.8-1-1.9-1h-.2c-1 0-1.9-.1-1.9 1v5.4c-1.7.3-6 1.1-6 5.6 0-4.3-4.3-5.5-6-5.8V2c0-1.1-.8-1-1.9-1h-.2c-1 0-1.9-.1-1.9 1v3.6c-1.8.8-2 4.7-2 7.4 0 4 2 9.7 5.1 14C6 32.9 1 49.1 1 57c0 2.6 8.5 6 19 6s19-3.5 19-6c0-7.9-5-24.1-12.1-30Z" />
            <path d="M12.1 26.9s6.4 2.6 15.9 0" />
        </g>
        </svg>
    );
}

export default DressIcon;
