import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, RefreshCw, ServerCrash, FileQuestion } from 'lucide-react';

interface ErrorPageProps {
  code?: number | string;
  title?: string;
  message?: string;
  onGoHome: () => void;
  onRetry?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ 
  code = 404, 
  title = "Page Not Found", 
  message = "The data node you are looking for seems to be corrupted or does not exist in our neural network.", 
  onGoHome,
  onRetry 
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full bg-[#111] border border-white/10 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
      >
        {/* Background Noise/Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }} 
        />
        
        <div className="relative z-10 flex flex-col items-center space-y-6">
          <motion.div 
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
          >
            {code === 404 ? (
                <FileQuestion size={48} className="text-red-500" />
            ) : (
                <ServerCrash size={48} className="text-red-500" />
            )}
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 tracking-tighter">
              {code}
            </h1>
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">{title}</h2>
          </div>

          <p className="text-sm text-white/50 leading-relaxed max-w-sm">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
            <button 
              onClick={onGoHome}
              className="btn btn-primary flex-1 rounded-xl font-black uppercase tracking-widest"
            >
              <Home size={16} className="mr-2" />
              Return Home
            </button>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="btn btn-ghost border border-white/10 flex-1 rounded-xl font-black uppercase tracking-widest text-white/60 hover:text-white"
              >
                <RefreshCw size={16} className="mr-2" />
                Retry Node
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ErrorPage;