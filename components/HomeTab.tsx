import React from 'react';
import { motion } from 'framer-motion';
import { Play, Download, Globe, Zap, Shield, Smartphone } from 'lucide-react';
import { AppTab } from '../types';

interface HomeTabProps {
  setActiveTab: (tab: AppTab) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ setActiveTab }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-16 py-12 px-4">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative inline-block"
        >
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
          <img 
            src="https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png" 
            alt="Logo" 
            className="w-24 h-24 md:w-32 md:h-32 mx-auto relative z-10 drop-shadow-2xl"
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic">
            Stream<span className="text-primary">Vibe</span>
          </h1>
          <p className="text-sm md:text-lg text-white/60 font-medium max-w-2xl mx-auto leading-relaxed">
            The ultimate minimalist streaming hub. Access a massive neural database of Anime, Movies, and TV Shows. 
            Switch seamlessly between high-speed streaming and direct downloads.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 pt-4"
        >
          <button 
            onClick={() => setActiveTab(AppTab.ANIME)}
            className="btn btn-primary rounded-full px-8 h-12 text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(255,46,99,0.3)] hover:scale-105 transition-transform"
          >
            <Play size={14} className="fill-current mr-2" />
            Explore Anime
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.GLOBAL)}
            className="btn btn-outline btn-neutral border-white/20 text-white rounded-full px-8 h-12 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all"
          >
            <Globe size={14} className="mr-2" />
            Browse Global
          </button>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {[
          {
            icon: <Zap size={24} className="text-yellow-400" />,
            title: "Dual Mode Engine",
            desc: "Toggle instantly between streaming mode for immediate playback and download mode for offline archival."
          },
          {
            icon: <Globe size={24} className="text-blue-400" />,
            title: "Global TMDB Network",
            desc: "Powered by The Movie Database API to provide real-time metadata, trending lists, and high-res assets."
          },
          {
            icon: <Smartphone size={24} className="text-purple-400" />,
            title: "PWA Optimized",
            desc: "Install as a native app on iOS and Android. Experience app-like performance with gesture navigation."
          }
        ].map((feature, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 border border-white/5 p-8 rounded-3xl hover:bg-white/10 transition-colors group"
          >
            <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">{feature.title}</h3>
            <p className="text-xs text-white/50 leading-relaxed font-medium">
              {feature.desc}
            </p>
          </motion.div>
        ))}
      </section>

      {/* Info/Stats */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="w-full max-w-4xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-[2.5rem] p-1"
      >
        <div className="bg-[#0c0c0c] rounded-[2.4rem] p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          
          <div className="relative z-10 space-y-4">
             <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
               Ready to Dive In?
             </h2>
             <p className="text-sm text-white/60 max-w-lg mx-auto">
               StreamVibe aggregates content from multiple high-speed nodes including Rive, VidSrc, and Apex. No subscriptions, no sign-ups.
             </p>
             <div className="flex flex-wrap justify-center gap-2 pt-2">
               <span className="badge badge-lg bg-white/5 border-white/10 text-xs font-bold text-white/40 uppercase">AdBlock Recommended</span>
               <span className="badge badge-lg bg-white/5 border-white/10 text-xs font-bold text-white/40 uppercase">1080p Support</span>
               <span className="badge badge-lg bg-white/5 border-white/10 text-xs font-bold text-white/40 uppercase">Fast CDN</span>
             </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default HomeTab;