"use client"

import { ReactNode, createContext, useEffect, useState } from "react"

export interface ThemeContextTypes {
    isDark : boolean
    ThemeToggle: () => void 
}


export interface ThemeProvider {
    children : ReactNode
}
export const ThemeContext = createContext<ThemeContextTypes | undefined>(undefined)
export function ThemeContextProvider({ children }: ThemeProvider) {
    const [isDark, setIsDark] = useState(true)

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark)
    }, [isDark])

    const ThemeToggle = () => setIsDark(prev => !prev)
    return (
        <ThemeContext.Provider value={{
            isDark,
            ThemeToggle
        }}>
            {children}
        </ThemeContext.Provider>
    )
}
