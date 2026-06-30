import React from 'react';

export default function ThemeToggle({ theme, onToggle, className = '' }) {
    const isDark = theme === 'dark';
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <button type="button" className={`theme-toggle ${className}`.trim()} onClick={onToggle} aria-label={label} title={label}>
            {isDark ? (
                <svg className="control-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4.5V2.75" />
                    <path d="M12 21.25V19.5" />
                    <path d="M4.5 12H2.75" />
                    <path d="M21.25 12H19.5" />
                    <path d="M6.7 6.7 5.45 5.45" />
                    <path d="M18.55 18.55 17.3 17.3" />
                    <path d="M17.3 6.7 18.55 5.45" />
                    <path d="M5.45 18.55 6.7 17.3" />
                    <circle cx="12" cy="12" r="4.25" />
                </svg>
            ) : (
                <svg className="control-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.6 14.1A7.6 7.6 0 0 1 9.9 3.4 8.2 8.2 0 1 0 20.6 14.1Z" />
                </svg>
            )}
            <span className="sr-only">{label}</span>
        </button>
    );
}
