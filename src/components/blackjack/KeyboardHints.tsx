'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/use-media-query';
import { HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Shortcut {
  key: string;
  action: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'H', action: 'Hit' },
  { key: 'S', action: 'Stand' },
  { key: 'D', action: 'Double Down' },
  { key: 'P', action: 'Split' },
  { key: 'R', action: 'Surrender' },
  { key: 'N', action: 'New Round' },
  { key: 'Space', action: 'Deal' },
  { key: 'B', action: 'Reference Book' },
  { key: 'C', action: 'Toggle Card Counter' },
  { key: 'A', action: 'Toggle Autoplay' },
  { key: 'M', action: 'Toggle Sound' },
  { key: 'Esc', action: 'Close dialogs' },
];

const STORAGE_KEY = 'blackjack-keyboard-hints-dismissed';

export function KeyboardHints() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isOpen, setIsOpen] = useState(false);
  // Initialize to false to match SSR; read localStorage in useEffect to avoid hydration mismatch
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [mounted, setMounted] = useState(false);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionDetected = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- needed for hydration safety
        setDontShowAgain(true);
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  // Auto-dismiss after 5 seconds if no interaction
  useEffect(() => {
    if (isOpen) {
      interactionDetected.current = false;
      autoDismissTimer.current = setTimeout(() => {
        if (!interactionDetected.current) {
          setIsOpen(false);
        }
      }, 5000);
    }
    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    interactionDetected.current = true;
    setIsOpen(prev => !prev);
  }, []);

  const handleDontShowAgain = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDontShowAgain(true);
    setIsOpen(false);
  }, []);

  // Don't render on mobile or if permanently dismissed; defer to after hydration
  if (!mounted || !isDesktop || dontShowAgain) return null;

  return (
    <>
      {/* Floating ? button */}
      <motion.button
        onClick={handleToggle}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-gray-800/90 border border-gray-600/50 text-gray-400 hover:text-white hover:bg-gray-700/90 hover:border-gray-500/70 flex items-center justify-center shadow-lg backdrop-blur-sm transition-colors duration-200"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Keyboard shortcuts"
      >
        <HelpCircle className="w-5 h-5" />
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="fixed bottom-16 right-4 z-50 w-72 bg-gray-900/95 border border-gray-700/60 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden"
              onMouseMove={() => { interactionDetected.current = true; }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/40">
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                  <span className="text-amber-400">⌨</span>
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Shortcuts list */}
              <div className="px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
                {SHORTCUTS.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400">{shortcut.action}</span>
                    <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded bg-gray-800 border border-gray-600/60 border-b-2 border-b-gray-500/60 text-[10px] font-mono font-bold text-gray-300 shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>

              {/* Don't show again */}
              <div className="px-4 py-2.5 border-t border-gray-700/40 bg-gray-900/60">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDontShowAgain}
                  className="text-[10px] text-gray-500 hover:text-gray-300 h-6 px-2"
                >
                  Don&apos;t show again
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
