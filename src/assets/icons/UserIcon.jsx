import * as React from "react";

// Standardized icon component with consistent props interface
function UserIcon({ width = 24, height = 24, className, ...props }) {
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
            <g fill="#000">
                <path d="M8 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14 12a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v3h12v-3Z" />
            </g>
        </svg>
    );
}

export default UserIcon;
