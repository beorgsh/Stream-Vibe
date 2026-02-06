import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdBlockModalProps {
  onClose: () => void;
}

const AdBlockModal: React.FC<AdBlockModalProps> = ({ onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-[#111] border border-red-500/20 w-full max-w-md rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 ring-1 ring-red-500/20 shadow-lg shadow-red-500/10">
            <ShieldAlert size={32} />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Stream Experience</h2>
            <p className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">Important Recommendation</p>
          </div>
          
          <div className="space-y-4 text-sm text-white/60 leading-relaxed font-medium">
            <p>
              To ensure the best streaming experience on <span className="text-white font-bold">StreamVibe</span>, we strongly recommend using <span className="text-primary font-bold">Brave Browser</span> or installing an <span className="text-primary font-bold">AdBlock</span> extension.
            </p>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-left flex gap-3">
              <div className="w-1 h-full bg-red-500 rounded-full shrink-0 min-h-[40px]" />
              <p className="text-xs opacity-80">
                Third-party providers often include aggressive popups and redirects. An ad blocker will keep your viewing safe, fast, and uninterrupted.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="btn btn-primary w-full rounded-xl font-black uppercase tracking-widest mt-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            I Understand
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdBlockModal;