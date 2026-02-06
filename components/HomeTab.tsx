import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Globe, Zap, Smartphone, Server, Cpu, Activity, HelpCircle, ChevronDown } from 'lucide-react';
import { AppTab } from '../types';

interface HomeTabProps {
  setActiveTab: (tab: AppTab) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ setActiveTab }) => {
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([]);
  
  // Cleaned up tech stack list without duplicates
  const techStack = [
    { name: "React", icon: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" },
    { name: "TypeScript", icon: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" },
    { name: "Tailwind", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg" },
    { name: "Vite", icon: "https://vitejs.dev/logo.svg" },
    { name: "TMDB", icon: "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg" },
    { name: "Framer", icon: "https://cdn.worldvectorlogo.com/logos/framer-motion.svg" }, 
    { name: "Vercel", icon: "https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png" }, 
    { name: "PWA", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Progressive_Web_Apps_Logo.svg" }, 
    { name: "Lucide", icon: "https://lucide.dev/logo.light.svg" }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const faqs = [
    { q: "Is StreamVibe free to use?", a: "Yes, StreamVibe is completely free. We do not require any subscriptions or credit cards." },
    { q: "Do I need to create an account?", a: "No account is required. Your watch history is stored locally on your device for privacy." },
    { q: "How do I install this on my phone?", a: "Use your browser's 'Add to Home Screen' feature to install StreamVibe as a Progressive Web App (PWA)." },
    { q: "Why isn't the video loading?", a: "Try switching servers in the player options. Sometimes specific nodes may be under heavy load." }
  ];

  return (
    <div className="flex flex-col items-center justify-center space-y-20 py-12 px-4">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Systems Online</span>
          </div>
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

      {/* Live Status Bar */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
            { label: "Active Nodes", value: "12", icon: <Server size={14} /> },
            { label: "Latency", value: "~24ms", icon: <Activity size={14} /> },
            { label: "Uptime", value: "99.9%", icon: <Zap size={14} /> },
            { label: "Database", value: "4.2M+", icon: <Cpu size={14} /> },
        ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                <div className="text-white/20 mb-2 group-hover:text-primary transition-colors">{stat.icon}</div>
                <div className="text-lg font-black text-white">{stat.value}</div>
                <div className="text-[9px] uppercase font-bold text-white/40 tracking-widest">{stat.label}</div>
            </div>
        ))}
      </motion.section>

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
            className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl hover:border-primary/20 transition-all group shadow-xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner border border-white/5">
              {feature.icon}
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-3">{feature.title}</h3>
            <p className="text-xs text-white/50 leading-relaxed font-medium">
              {feature.desc}
            </p>
          </motion.div>
        ))}
      </section>

      {/* How it Works */}
      <section className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">How It Works</h2>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Simple. Fast. Efficient.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                { step: "01", title: "Select Content", text: "Choose from our vast library of Anime, Movies, or TV Shows via the global search." },
                { step: "02", title: "Choose Mode", text: "Toggle between 'Watch' for instant streaming or 'Download' for highest quality files." },
                { step: "03", title: "Engage", text: "Enjoy seamless playback in our custom player or save files directly to your device." }
            ].map((item, i) => (
                <div key={i} className="relative p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
                    <div className="absolute -top-4 -left-4 text-4xl font-black text-white/5 italic select-none">{item.step}</div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">{item.title}</h3>
                    <p className="text-xs text-white/50 leading-relaxed">{item.text}</p>
                </div>
            ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-6">
            <HelpCircle size={18} className="text-primary" />
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
            {faqs.map((faq, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-xl overflow-hidden group">
                    <button 
                        onClick={() => toggleFaq(i)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                    >
                        <span className="text-xs md:text-sm font-bold text-white uppercase tracking-wide pr-4">{faq.q}</span>
                        <ChevronDown 
                            size={16} 
                            className={`text-white/40 transition-transform duration-300 ${openFaqIndices.includes(i) ? 'rotate-180 text-primary' : ''}`} 
                        />
                    </button>
                    <AnimatePresence initial={false}>
                        {openFaqIndices.includes(i) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                            >
                                <div className="px-4 pb-4">
                                    <p className="text-xs text-white/60 leading-relaxed border-t border-white/5 pt-3">{faq.a}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
      </section>

      {/* Tech Stack Marquee */}
      <div className="w-full max-w-4xl py-12 border-y border-white/5 overflow-hidden relative">
          {/* Gradients to fade edges */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0c0c0c] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0c0c0c] to-transparent z-10 pointer-events-none" />

          <style>{`
            @keyframes scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-scroll {
              animation: scroll 30s linear infinite;
            }
          `}</style>
          
          <div className="flex animate-scroll w-max hover:[animation-play-state:paused]">
               {[...techStack, ...techStack].map((tech, i) => (
                 <div key={i} className="flex items-center justify-center mx-8 md:mx-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                   <img 
                     src={tech.icon} 
                     alt={tech.name} 
                     className={`h-8 w-auto object-contain ${tech.name === 'Vercel' ? 'invert' : ''}`} 
                     title={tech.name} 
                   />
                 </div>
               ))}
          </div>
      </div>

      {/* CTA */}
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
               Join thousands of users enjoying the next generation of content discovery and consumption.
             </p>
             <button 
                onClick={() => setActiveTab(AppTab.ANIME)} 
                className="btn bg-white text-black border-none hover:bg-gray-200 rounded-full px-8 font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform"
             >
                Start Watching
             </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default HomeTab;