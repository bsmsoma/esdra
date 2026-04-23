import * as React from "react";

// Standardized icon component with consistent props interface
function LogoutIcon({ width = 24, height = 24, className, ...props }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlSpace="preserve"
            width={width}
            height={height}
            viewBox="0 0 24 26"
            className={className}
            {...props}
        >
            <path d="M15 24H0V2h15v8h-2V4H2v18h11v-6h2v8zm3.4-5.3L17 17.3l3.3-3.3H5v-2h15.3L17 8.7l1.4-1.4L24 13l-5.6 5.7z" />
        </svg>
    );
}

export default LogoutIcon;
