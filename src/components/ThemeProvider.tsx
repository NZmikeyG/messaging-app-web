'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSettingsStore((state) => state.settings.theme)

    useEffect(() => {
        const applyTheme = (themeValue: 'dark' | 'light' | 'auto') => {
            let resolvedTheme: 'dark' | 'light' = 'dark'

            if (themeValue === 'auto') {
                // Detect system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                resolvedTheme = prefersDark ? 'dark' : 'light'
            } else {
                resolvedTheme = themeValue
            }

            // Apply theme to document
            document.documentElement.setAttribute('data-theme', resolvedTheme)

            // Also update meta theme-color for mobile browsers
            const metaThemeColor = document.querySelector('meta[name="theme-color"]')
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0a0a0a' : '#f8fafc')
            }
        }

        applyTheme(theme)

        // Listen for system theme changes when in auto mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = () => {
            if (theme === 'auto') {
                applyTheme('auto')
            }
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [theme])

    return <>{children}</>
}
