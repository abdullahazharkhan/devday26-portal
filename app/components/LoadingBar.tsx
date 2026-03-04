'use client'

import { useState, useEffect } from 'react'
import Router from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoadingBar() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const handleStart = () => setVisible(true)
        const handleEnd   = () => setVisible(false)

        Router.events.on('routeChangeStart', handleStart)
        Router.events.on('routeChangeComplete', handleEnd)
        Router.events.on('routeChangeError', handleEnd)

        return () => {
            Router.events.off('routeChangeStart', handleStart)
            Router.events.off('routeChangeComplete', handleEnd)
            Router.events.off('routeChangeError', handleEnd)
        }
    }, [])

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="loading-bar"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    exit={{ opacity: 0 }}
                    transition={{ ease: 'easeOut', duration: 0.5 }}
                    className="fixed top-0 left-0 h-1 bg-primaryred z-50"
                />
            )}
        </AnimatePresence>
    )
}
