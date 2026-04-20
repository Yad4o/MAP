// ALREADY EXISTS AS STUB — implementing content per task instructions

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { logsApi } from "../api/logs";
import { Search, Terminal, Ban, RefreshCw, ChevronRight, Activity, Filter } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * LogsPage displays a real-time stream of system events.
 * 
 * Requirements:
 * - Refresh every 5 seconds.
 * - Filtering by level (ALL, DEBUG, INFO, etc.).
 * - Search by event text.
 * - Auto-scroll to bottom functionality.
 */
export default function LogsPage() {
  const [level, setLevel] = useState("ALL");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, isFetching, isError } = useQuery({
    queryKey: ["logs", level, search],
    queryFn: () => logsApi.getLogs({ level, search }),
    refetchInterval: 5000,
    // Don't treat a 404 as a hard error — backend may not have the table yet
    retry: 1,
  });

  // Handle auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-7xl mx-auto space-y-6">
      {/* Header & Control Bar */}
      <div className="glass-card p-4 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
            <Terminal size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">System Logs</h1>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Stream Active
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 w-full xl:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px] xl:w-80">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder="Search event content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Level Filter Buttons */}
          <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/10 shadow-inner">
            {["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"].map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                  level === l 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20' 
                  : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 group ${
                autoScroll 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5 shadow-lg' 
                : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'
              }`}
            >
              <Activity size={14} className={autoScroll ? 'animate-bounce' : ''} />
              {autoScroll ? 'Sticky' : 'Smooth'}
            </button>
            
            <div className={`p-2 rounded-xl bg-white/5 border border-white/5 transition-opacity duration-300 ${isFetching ? 'opacity-100' : 'opacity-0'}`}>
              <RefreshCw size={14} className="animate-spin text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Feed */}
      <div className="glass-card flex-1 overflow-hidden flex flex-col border-white/10 shadow-2xl relative overflow-hidden">
        {/* Terminal gradient overlay top */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0f172a] to-transparent z-10 pointer-events-none" />
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-1 font-mono text-xs custom-scrollbar scroll-smooth"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                <Terminal className="absolute inset-0 m-auto text-indigo-500 opacity-50" size={18} />
              </div>
              <p className="text-indigo-400 font-bold tracking-widest uppercase">Initializing Stream...</p>
            </div>
          ) : logs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30 text-slate-500">
              <Ban size={48} className="rotate-12" />
              <p className="text-sm font-semibold tracking-widest uppercase">No data units found</p>
            </div>
          ) : (
            logs?.map((log) => (
              <div 
                key={log.id} 
                className="group flex items-start gap-4 p-2.5 hover:bg-white/[0.04] rounded-xl transition-all duration-200 border border-transparent hover:border-white/5"
              >
                <div className="text-slate-600 whitespace-nowrap shrink-0 font-bold tabular-nums">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </div>
                
                <div className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter shrink-0 border shadow-sm ${getLevelStyle(log.level)}`}>
                  {log.level}
                </div>
                
                <div className="text-indigo-400/60 font-black shrink-0 hidden sm:block">
                  {log.logger.split('.').pop()}
                </div>
                
                <div className="text-slate-300 flex-1 leading-relaxed break-all sm:break-normal">
                  {log.event}
                </div>
                
                {log.task_id && (
                  <Link 
                    to={`/tasks/${log.task_id}`}
                    className="flex items-center gap-1.5 text-indigo-400 hover:text-white transition-all bg-indigo-500/10 group-hover:bg-indigo-500 px-3 py-1 rounded-lg shrink-0 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest">Inspect</span>
                    <ChevronRight size={12} />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Terminal gradient overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0f172a] to-transparent z-10 pointer-events-none" />
      </div>

      {/* Status Bar Footer */}
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 px-4 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className={isError ? 'text-red-400' : ''}>
              {isError ? 'Stream Disconnected' : 'Connection Secure'}
            </span>
          </div>
          <div>Buffer Size: {logs?.length ?? 0} Epochs</div>
        </div>
        <div>System Version 2.0.4-LTS</div>
      </div>
    </div>
  );
}

function getLevelStyle(level: string) {
  switch (level) {
    case 'CRITICAL':
    case 'ERROR': return 'bg-red-500/20 text-red-400 border-red-500/20';
    case 'WARNING': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
    case 'DEBUG': return 'bg-slate-500/10 text-slate-500 border-white/5';
    default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  }
}
