import React from 'react';
import { motion } from 'framer-motion';
import { Home, AlertTriangle, Radio } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/unknown';

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none text-base-content">
      
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 max-w-xl w-full"
      >
        <div className="bg-base-200 border border-base-content/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
             <div className="w-24 h-24 rounded-full bg-base-100 border border-base-content/10 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <Radio size={40} className="text-red-500 animate-pulse" />
             </div>

             <div className="space-y-2">
               <h1 className="text-7xl md:text-8xl font-black text-base-content tracking-tighter" style={{ textShadow: "0 0 20px rgba(128,128,128,0.1)" }}>
                 404
               </h1>
               <div className="flex items-center justify-center gap-3">
                 <AlertTriangle size={16} className="text-red-500" />
                 <span className="text-sm md:text-base font-bold text-red-500 uppercase tracking-[0.3em]">Connection Failed</span>
                 <AlertTriangle size={16} className="text-red-500" />
               </div>
             </div>

             <p className="text-xs md:text-sm text-base-content/50 leading-relaxed max-w-sm mx-auto font-medium border-t border-base-content/5 pt-6 mt-2">
               The neural link to <span className="text-base-content bg-base-content/10 px-1 rounded font-mono break-all">{currentPath}</span> could not be established. The vector you are trying to access does not exist in this dimension.
             </p>

             <button 
               onClick={onGoHome}
               className="btn btn-primary btn-outline mt-6 rounded-full px-8 border-base-content/10 text-base-content hover:bg-base-content hover:text-base-100 hover:border-base-content transition-all uppercase text-xs font-black tracking-widest gap-2 group-hover:scale-105"
             >
               <Home size={14} />
               Re-establish Link
             </button>
          </div>

          {/* Decorative Corners */}
          <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-base-content/20" />
          <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-base-content/20" />
          <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-base-content/20" />
          <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-base-content/20" />
        </div>
        
        <div className="mt-8 text-center space-y-1">
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-base-content/20">System Error: 0x00000404</p>
           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-base-content/10">StreamVibe Neural Network</p>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;