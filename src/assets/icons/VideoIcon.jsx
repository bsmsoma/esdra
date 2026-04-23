import * as React from "react";

// Standardized icon component with consistent props interface
function VideoIcon({ width = 24, height = 24, className, ...props }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
            {...props}
        >
        <path
            d="M15 10L19.553 7.276C20.217 6.886 21 7.33 21 8.118V15.882C21 16.67 20.217 17.114 19.553 16.724L15 14V10Z"
            fill="currentColor"
        />
        <rect
            x="3"
            y="6"
            width="10"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
        />
        </svg>
    );
}

export default VideoIcon;
