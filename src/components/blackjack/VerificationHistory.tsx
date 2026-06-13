'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Shield } from 'lucide-react';

interface VerificationRecord {
  roundId: string;
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  verified: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'zk_casino_verification_history';

function getHistory(): VerificationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecord(record: VerificationRecord) {
  const history = getHistory();
  // Keep last 50 records
  history.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
}

export function recordVerification(
  roundId: string,
  serverSeedHash: string,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  verified: boolean
) {
  addRecord({
    roundId,
    serverSeedHash,
    serverSeed,
    clientSeed,
    nonce,
    verified,
    timestamp: Date.now(),
  });
}

export function VerificationHistory() {
  const [history, setHistory] = useState<VerificationRecord[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const timeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const truncateHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const totalVerified = history.filter(r => r.verified).length;
  const totalFailed = history.filter(r => !r.verified).length;

  return (
    <div className="w-full">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
          bg-gray-800/40 hover:bg-gray-800/60 border border-gray-700/30
          text-gray-300 hover:text-white transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium">Verification History</span>
          <span className="text-[10px] text-gray-500">({history.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {totalVerified > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {totalVerified}
            </span>
          )}
          {totalFailed > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-400">
              <XCircle className="w-2.5 h-2.5" />
              {totalFailed}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* History List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center py-4 text-gray-600 text-xs">
                  No verifications yet
                </div>
              ) : (
                history.map((record) => (
                  <div
                    key={record.roundId}
                    className={`
                      px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200
                      ${record.verified
                        ? 'bg-emerald-900/10 border-emerald-800/20 hover:border-emerald-700/30'
                        : 'bg-red-900/10 border-red-800/20 hover:border-red-700/30'
                      }
                    `}
                    onClick={() => setExpandedId(expandedId === record.roundId ? null : record.roundId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {record.verified ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400" />
                        )}
                        <code className="text-[10px] text-gray-400 font-mono">
                          {truncateHash(record.roundId)}
                        </code>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-600">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(record.timestamp)}
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expandedId === record.roundId && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 pt-2 border-t border-gray-700/20 space-y-1">
                            <div className="flex items-center gap-1 text-[9px]">
                              <Shield className="w-2.5 h-2.5 text-amber-400/60" />
                              <span className="text-gray-500">Hash:</span>
                              <code className="text-amber-300/70 font-mono">{truncateHash(record.serverSeedHash)}</code>
                            </div>
                            <div className="flex items-center gap-1 text-[9px]">
                              <span className="text-gray-500">Seed:</span>
                              <code className="text-emerald-300/70 font-mono">{truncateHash(record.serverSeed)}</code>
                            </div>
                            <div className="flex items-center gap-1 text-[9px]">
                              <span className="text-gray-500">Client:</span>
                              <code className="text-blue-300/70 font-mono">{truncateHash(record.clientSeed)}</code>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
