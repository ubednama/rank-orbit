import { SVGProps } from 'react';

export default function Logo(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            <circle cx="12" cy="12" r="3" className="text-indigo-500 fill-indigo-500/20" />
            <path d="M12 22v-6" />
            <path d="M22 12c0-5.523-4.477-10-10-10" className="opacity-50" />
        </svg>
    );
}
