import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-[#020617]">
      {/* Background Mesh */}
      <div className="bg-mesh absolute inset-0 opacity-40" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 text-center w-full max-w-lg"
      >
        <div className="glass-card p-12 border border-white/10 shadow-2xl shadow-violet-500/10 backdrop-blur-xl">
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-500 to-fuchsia-500 mb-2 select-none tracking-tighter">
              404
            </h1>
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Location Not Found</h2>
            <p className="text-slate-400 mb-10 leading-relaxed font-medium">
              The coordinates you requested do not exist in the current grid. 
              The resource may have been decommissioned or moved to a restricted sector.
            </p>
          </motion.div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/tasks" 
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto px-8 group"
            >
              <Home size={18} className="group-hover:scale-110 transition-transform" />
              Return Home
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="px-8 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all w-full sm:w-auto flex items-center justify-center gap-2 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Go Back
            </button>
          </div>
        </div>
        
        <p className="mt-8 text-xs text-slate-600 font-mono tracking-widest uppercase">
          Authorization required for deeper probe
        </p>
      </motion.div>
    </div>
  );
}
