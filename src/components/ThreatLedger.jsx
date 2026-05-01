'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Terminal } from 'lucide-react';

export default function ThreatLedger({ ledger }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [ledger]);

  return (
    <div className="w-[600px] bg-[#020611]/80 backdrop-blur-md border border-[#00d1ff]/20 p-4 rounded-md shadow-[0_0_30px_rgba(0,209,255,0.05)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-[#00d1ff]/30">
        <Terminal size={14} className="text-[#00d1ff] drop-shadow-[0_0_5px_rgba(0,209,255,0.8)]" />
        <h2 className="text-[#00d1ff] text-xs font-bold tracking-widest font-mono drop-shadow-[0_0_5px_rgba(0,209,255,0.8)]">
          THREAT_LEDGER_
        </h2>
        {ledger.length > 0 && (
          <span className="ml-auto font-mono text-[9px] text-[#00d1ff]/50 tracking-wider">
            {ledger.length} ENTRIES
          </span>
        )}
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-[3fr_4fr_4fr_3fr_4fr] gap-2 mb-2 px-3 pb-2 text-[#00d1ff]/60 text-[9px] font-mono tracking-widest uppercase border-b border-[#00d1ff]/10 items-center">
        <span>Time</span>
        <span>Source</span>
        <span>Target</span>
        <span>Prb%</span>
        <span>Class</span>
      </div>

      {/* Scrollable Rows */}
      <div ref={scrollRef} className="max-h-[340px] overflow-y-auto pr-1 scrollbar-hide">
        {ledger.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-[#00d1ff]/30 font-mono text-[10px] tracking-widest">
            <AlertTriangle size={12} className="mr-2" />
            <span>AWAITING_STREAM...</span>
          </div>
        ) : (
          <AnimatePresence>
            {ledger.map((entry, i) => (
              <motion.div
                key={`${entry.time}-${entry.source}-${i}`}
                initial={{ opacity: 0, x: 50, backgroundColor: '#ff003c' }}
                animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,0,60,0.0)' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="grid grid-cols-[3fr_4fr_4fr_3fr_4fr] gap-2 py-2 px-3 mb-1 items-center border-l-4 border-[#ff003c] bg-gradient-to-r from-[#ff003c]/20 to-transparent"
              >
                <span className="text-[#ff003c]/60 text-xs font-mono truncate">
                  {entry.time}
                </span>
                <span className="text-[#ff3366] text-xs font-mono tracking-wider truncate">
                  {entry.source}
                </span>
                <span className="text-[#ff3366] text-xs font-mono tracking-wider truncate">
                  {entry.target}
                </span>
                <span className="flex">
                  <span className="bg-[#ff003c]/20 text-[#ff003c] font-bold px-2 py-0.5 rounded shadow-[0_0_8px_rgba(255,0,60,0.6)]">
                    {entry.probability}%
                  </span>
                </span>
                <span className="flex">
                  <span className="border border-[#ff003c]/50 text-[#ff003c] text-[10px] uppercase tracking-widest px-1.5 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {entry.classification}
                  </span>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
