import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Code, Globe, Terminal, Play, Link, Server, Info, Layers, Cpu, Copy, CheckCircle2 } from 'lucide-react';

const DocsTab: React.FC = () => {
  const [previewId, setPreviewId] = useState('110972'); // Default to a popular anime ID for preview
  const [previewType, setPreviewType] = useState<'movie' | 'tv' | 'anime'>('anime');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const apiDocs = [
    {
      title: "Anime Neural Network (Iota)",
      base: "https://anime-api-iota-six.vercel.app/api/",
      description: "Primary engine for anime metadata, discovery, and episode mapping.",
      endpoints: [
        { path: "", method: "GET", desc: "Homepage discovery data (spotlights, trending, popular)." },
        { path: "search?keyword={query}", method: "GET", desc: "Search the anime database." },
        { path: "episodes/{id}", method: "GET", desc: "Retrieve episode list for a specific anime." },
        { path: "stream?id={ep_id}&server={name}&type={sub/dub}", method: "GET", desc: "Get embed links and streaming sources." }
      ]
    },
    {
      title: "Global Media Core (TMDB)",
      base: "https://api.themoviedb.org/3/",
      description: "The global standard for movie and television metadata.",
      endpoints: [
        { path: "trending/all/week", method: "GET", desc: "Weekly trending globally." },
        { path: "search/multi?query={q}", method: "GET", desc: "Multi-search across movies, TV, and people." },
        { path: "{tv/movie}/{id}", method: "GET", desc: "Detailed metadata for a specific title." },
        { path: "tv/{id}/season/{num}", method: "GET", desc: "Retrieve episode lists for TV seasons." }
      ]
    },
    {
      title: "Archive Hub (Apex Cloud)",
      base: "https://anime.apex-cloud.workers.dev/",
      description: "Direct server-side mapping for high-quality archival access.",
      endpoints: [
        { path: "?method=search&query={q}", method: "GET", desc: "Search the cloud archive." },
        { path: "?method=series&session={id}", method: "GET", desc: "Get archive session details." }
      ]
    }
  ];

  const embedRules = [
    { name: "VidRock", url: "https://vidrock.net/{type}/{id}" },
    { name: "VidNest", url: "https://vidnest.fun/{type}/{id}" },
    { name: "VidSrc", url: "https://vidsrc.to/embed/{type}/{id}" }
  ];

  return (
    <div className="space-y-12 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <section className="text-center space-y-4">
        <div className="inline-flex p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary mb-2">
          <Book size={32} />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-base-content uppercase italic tracking-tighter">Documentation</h1>
        <p className="text-xs md:text-sm text-base-content/60 font-bold uppercase tracking-[0.3em]">StreamVibe Neural Protocol v4.0</p>
      </section>

      {/* Quick Access Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-base-200/50 p-6 rounded-3xl border border-base-content/10 space-y-3">
          <div className="text-primary"><Terminal size={20} /></div>
          <h3 className="font-black text-xs uppercase tracking-widest">Base URLs</h3>
          <p className="text-[10px] text-base-content/60 leading-relaxed font-medium">Mapped endpoints for real-time synchronization with external databases.</p>
        </div>
        <div className="bg-base-200/50 p-6 rounded-3xl border border-base-content/10 space-y-3">
          <div className="text-primary"><Globe size={20} /></div>
          <h3 className="font-black text-xs uppercase tracking-widest">Global CDN</h3>
          <p className="text-[10px] text-base-content/60 leading-relaxed font-medium">Distributed content delivery network for low-latency streaming across all nodes.</p>
        </div>
        <div className="bg-base-200/50 p-6 rounded-3xl border border-base-content/10 space-y-3">
          <div className="text-primary"><Layers size={20} /></div>
          <h3 className="font-black text-xs uppercase tracking-widest">Schema</h3>
          <p className="text-[10px] text-base-content/60 leading-relaxed font-medium">Standardized data objects for seamless integration between Anime and Global modules.</p>
        </div>
      </section>

      {/* Main Docs */}
      <div className="space-y-16">
        {apiDocs.map((doc, idx) => (
          <section key={idx} className="space-y-6">
            <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-base-content uppercase tracking-tight italic">{doc.title}</h2>
                <div 
                  className="group flex items-center gap-2 text-[10px] font-mono text-primary bg-primary/5 px-2 py-1 rounded w-fit cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => copyToClipboard(doc.base, `base-${idx}`)}
                >
                  <Link size={10} /> 
                  <span>{doc.base}</span>
                  <div className="relative">
                    <AnimatePresence mode="wait">
                      {copiedId === `base-${idx}` ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <CheckCircle2 size={10} className="text-emerald-500" />
                        </motion.div>
                      ) : (
                        <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="opacity-0 group-hover:opacity-100">
                          <Copy size={10} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-base-content/70 leading-relaxed max-w-2xl">{doc.description}</p>

            <div className="grid grid-cols-1 gap-3">
              {doc.endpoints.map((ep, eIdx) => {
                const endpointId = `${idx}-${eIdx}`;
                const fullUrl = `${doc.base}${ep.path}`;
                return (
                  <button 
                    key={eIdx} 
                    onClick={() => copyToClipboard(fullUrl, endpointId)}
                    className="bg-base-content/5 border border-base-content/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-base-content/10 transition-all hover:translate-x-1 text-left relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <span className="badge badge-primary badge-outline font-black text-[9px] px-3 py-2 shrink-0">{ep.method}</span>
                      <code className="text-[11px] font-mono text-base-content/80 group-hover:text-base-content transition-colors break-all">
                        {ep.path || '/'}
                      </code>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">{ep.desc}</span>
                      <div className="w-4 h-4 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          {copiedId === endpointId ? (
                            <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              <CheckCircle2 size={14} className="text-emerald-500" />
                            </motion.div>
                          ) : (
                            <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-base-content/20 group-hover:text-primary transition-colors">
                              <Copy size={14} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <AnimatePresence>
                      {copiedId === endpointId && (
                        <motion.div 
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 bg-primary/5 pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Embed Preview Section */}
      <section className="space-y-6 pt-10 border-t border-base-content/10">
        <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-base-content uppercase tracking-tight italic">Embed Player Preview</h2>
            <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest">Neural Visualization Test Node</p>
          </div>
        </div>

        <div className="bg-base-300 rounded-[2.5rem] overflow-hidden border border-base-content/10 shadow-2xl">
          <div className="p-6 bg-base-200 border-b border-base-content/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex p-1 bg-base-content/5 rounded-full border border-base-content/10">
              <button onClick={() => setPreviewType('anime')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${previewType === 'anime' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>Anime</button>
              <button onClick={() => setPreviewType('movie')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${previewType === 'movie' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>Movie</button>
              <button onClick={() => setPreviewType('tv')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${previewType === 'tv' ? 'bg-primary text-primary-content shadow-lg' : 'text-base-content/60'}`}>TV</button>
            </div>
            <div className="flex items-center gap-2 bg-base-content/5 px-4 py-2 rounded-full border border-base-content/10 w-full md:w-auto">
              <span className="text-[9px] font-black text-base-content/40 uppercase">ID:</span>
              <input 
                type="text" 
                value={previewId} 
                onChange={(e) => setPreviewId(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black text-base-content focus:ring-0 w-24 placeholder:text-base-content/20"
                placeholder="e.g. 110972"
              />
            </div>
          </div>

          <div className="aspect-video w-full bg-black relative">
            <iframe 
              src={previewType === 'anime' ? `https://vidnest.fun/animepahe/${previewId}/1/sub` : `https://vidrock.net/${previewType}/${previewId}`} 
              className="w-full h-full border-none"
              allowFullScreen
            />
          </div>

          <div className="p-6 bg-base-200 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-base-content/5">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Cpu size={16} /></div>
               <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-base-content uppercase italic">Neural Buffer Active</p>
                  <p className="text-[8px] font-bold text-base-content/40 uppercase tracking-widest">Previewing ID {previewId} via VidNest Protocol</p>
               </div>
             </div>
             <div className="flex items-center gap-1.5">
               {embedRules.map((rule, idx) => (
                 <div key={idx} className="badge badge-outline text-[8px] font-black uppercase px-3 py-3 border-base-content/10 opacity-50">{rule.name}</div>
               ))}
             </div>
          </div>
        </div>
      </section>

      {/* Security Info */}
      <section className="bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-[2rem] border border-primary/20 space-y-4">
        <div className="flex items-center gap-3">
          <Info size={20} className="text-primary" />
          <h3 className="text-sm font-black text-base-content uppercase tracking-widest">Protocol Notice</h3>
        </div>
        <p className="text-xs text-base-content/70 leading-relaxed font-medium">
          All API requests must be performed over HTTPS. Direct database access is strictly managed through the Neural Middleware to prevent unauthorized injection. StreamVibe does not host any media files locally; all streams are dynamically mapped via external cloud archival protocols.
        </p>
      </section>
    </div>
  );
};

export default DocsTab;