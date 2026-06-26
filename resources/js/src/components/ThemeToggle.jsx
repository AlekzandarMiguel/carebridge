import React from 'react';

export default function ThemeToggle({ theme, onToggle, className = '' }) {
    return (
        <button type="button" className={`theme-toggle ${className}`.trim()} onClick={onToggle}>
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
    );
}
