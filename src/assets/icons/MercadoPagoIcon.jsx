export default function MercadoPagoIcon({ size = 32, className }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <rect width="40" height="40" rx="10" fill="#009EE3" />
            {/* M */}
            <path
                d="M8 27V13l5 8 5-8v14"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {/* P */}
            <path
                d="M22 27V13h5a4 4 0 0 1 0 8h-5"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}
