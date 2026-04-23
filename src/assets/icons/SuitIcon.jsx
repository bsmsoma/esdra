import * as React from "react";

// Standardized icon component with consistent props interface
function SuitIcon({ width = 24, height = 24, className, ...props }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            xmlSpace="preserve" 
            width={width} 
            height={height} 
            className={className}
            {...props}
        >
        <path d="M52 3h-6.667L41.6.2a.985.985 0 0 0-.6-.192V0H23v.009a.993.993 0 0 0-.6.192L18.667 3H12c-4.963 0-9 4.038-9 9v34a1 1 0 0 0 1 1h8a5.01 5.01 0 0 0 4 4.899V64h2V52h10a1 1 0 0 0 1-1v-4h6v4a1 1 0 0 0 1 1h11v12h2V51.576A5.003 5.003 0 0 0 52 47h8a1 1 0 0 0 1-1V12c0-4.962-4.037-9-9-9zM41.923 15.385A.998.998 0 0 0 42 15V3l2 1.5v12.116l-4.823 5.359 2.746-6.59zm-6.846 11.23a.995.995 0 0 0-.071.385H35v11h-6V27h-.006a.998.998 0 0 0-.071-.385L24 14.8V6h2v6a.998.998 0 0 0 1.515.857L32 10.166l4.485 2.691a.994.994 0 0 0 1.008.013A.998.998 0 0 0 38 12V6h2v8.8l-4.923 11.815zM40 4h-3v.001a.993.993 0 0 0-.515.142L32 6.834l-4.485-2.691A.993.993 0 0 0 27 4.001V4h-3V2h16v2zm-4 2.766v3.468L33.11 8.5 36 6.766zM30.89 8.5 28 10.234V6.766L30.89 8.5zM20 4.5 22 3v12c0 .132.026.263.077.385l2.746 6.59L20 16.616V4.5zM17 50c-1.654 0-3-1.346-3-3V15h-2v30H5V12c0-3.86 3.141-7 7-7h6v12c0 .247.092.485.257.669L27 27.383V50H17zm12-5v-5h6v5h-6zm30 0h-7V15h-2v32c0 1.654-1.346 3-3 3H37V27.383l8.743-9.715A.998.998 0 0 0 46 17V5h6c3.859 0 7 3.14 7 7v33z" />
        <path d="M34.293 56.293 32 58.586l-2.293-2.293-1.414 1.414L31 60.414V64h2v-3.586l2.707-2.707z" />
        <circle cx={32} cy={15} r={1} />
        <circle cx={32} cy={20} r={1} />
        <circle cx={32} cy={25} r={1} />
        <circle cx={32} cy={30} r={1} />
        <circle cx={32} cy={35} r={1} />
        <path d="M40 38h7v2h-7zM17 38h7v2h-7z" />
        </svg>
    );
}

export default SuitIcon;
