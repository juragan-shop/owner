"use client"
import { ThemeContext } from '@/context/useThemeContext'
import { useContext } from 'react'

export default function useTheme() {
    const theme = useContext(ThemeContext)


    if (!theme) {
        throw new Error("theme not ready")
    }
    return theme

}
