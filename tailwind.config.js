import forms from '@tailwindcss/forms';
import animate from 'tailwindcss-animate';

// Colors are defined once as RGB channels in resources/css/app.css so
// Tailwind opacity modifiers (e.g. bg-dost-blue/90) keep working.
const color = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['"Google Sans Flex"', 'Roboto', 'Arial', 'sans-serif'],
            },
            colors: {
                // DocuFlow palette (CLAUDE.md)
                paper: color('paper'),
                'paper-dim': color('paper-dim'),
                ink: color('ink'),
                'ink-muted': color('ink-muted'),
                border: color('border'),
                'dost-blue': color('dost-blue'),
                'dost-blue-deep': color('dost-blue-deep'),
                'stamp-green': {
                    DEFAULT: color('stamp-green'),
                    bg: color('stamp-green-bg'),
                },
                'stamp-amber': {
                    DEFAULT: color('stamp-amber'),
                    bg: color('stamp-amber-bg'),
                },
                'stamp-rust': {
                    DEFAULT: color('stamp-rust'),
                    bg: color('stamp-rust-bg'),
                },

                // shadcn/ui semantic tokens, mapped onto the palette above
                background: color('background'),
                foreground: color('foreground'),
                card: {
                    DEFAULT: color('card'),
                    foreground: color('card-foreground'),
                },
                popover: {
                    DEFAULT: color('popover'),
                    foreground: color('popover-foreground'),
                },
                primary: {
                    DEFAULT: color('primary'),
                    foreground: color('primary-foreground'),
                },
                secondary: {
                    DEFAULT: color('secondary'),
                    foreground: color('secondary-foreground'),
                },
                muted: {
                    DEFAULT: color('muted'),
                    foreground: color('muted-foreground'),
                },
                accent: {
                    DEFAULT: color('accent'),
                    foreground: color('accent-foreground'),
                },
                destructive: {
                    DEFAULT: color('destructive'),
                    foreground: color('destructive-foreground'),
                },
                input: color('input'),
                ring: color('ring'),
            },
            borderRadius: {
                // Cards 12px, buttons/inputs/nav items 8px, badges rounded-full.
                lg: '12px',
                md: '8px',
                sm: '6px',
            },
        },
    },

    plugins: [forms, animate],
};
