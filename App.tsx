
import React, { useState, useEffect } from 'react';
import { AppTab, AnimeSeries, TMDBMedia } from './types';
import Navbar from './components/Navbar';
import AnimeTab from './components/AnimeTab';
import GlobalTab from './components/GlobalTab';
import AnimeModal from './components/AnimeModal';
import MediaModal from './components/MediaModal';
import AdBlockModal from './components/AdBlockModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ANIME);
  const [selectedAnime, setSelectedAnime] = useState<AnimeSeries | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  const [mediaMode, setMediaMode] = useState<'watch' | 'download'>('watch');
  const [showAdBlockModal, setShowAdBlockModal] = useState(false);

  const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

  useEffect(() => {
    // Check if user has seen the adblock reminder in cache/localStorage
    const hasSeenReminder = localStorage.getItem('sv_adblock_reminder_seen');
    if (!hasSeenReminder) {
      // Small delay for better UX on initial load
      const timer = setTimeout(() => {
        setShowAdBlockModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseAdBlockModal = () => {
    localStorage.setItem('sv_adblock_reminder_seen', 'true');
    setShowAdBlockModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0c0c] relative">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-8">
        {activeTab === AppTab.ANIME ? (
          <AnimeTab onSelectAnime={setSelectedAnime} />
        ) : ( activeTab === AppTab.GLOBAL ? (
          <GlobalTab onSelectMedia={(media, mode) => {
            setSelectedMedia(media);
            setMediaMode(mode);
          }} />
        ) : null)}
      </main>

      <footer className="p-8 footer bg-black border-t border-white/5 text-base-content mt-8">
        <aside>
          <div className="text-xl font-bold tracking-tighter text-white">StreamVibe</div>
          <p className="text-xs opacity-50 uppercase tracking-widest font-bold">Neural Engine v4.0</p>
        </aside> 
        <nav>
          <header className="footer-title opacity-40 uppercase text-[10px] tracking-widest">Links</header> 
          <a className="link link-hover text-xs" onClick={() => setActiveTab(AppTab.ANIME)}>Anime</a>
          <a className="link link-hover text-xs" onClick={() => setActiveTab(AppTab.GLOBAL)}>Global</a>
        </nav>
      </footer>

      {/* Global Modals rendered at root to ensure z-index priority over Navbar */}
      {showAdBlockModal && (
        <AdBlockModal onClose={handleCloseAdBlockModal} />
      )}

      {selectedAnime && (
        <AnimeModal 
          anime={selectedAnime} 
          onClose={() => setSelectedAnime(null)} 
        />
      )}

      {selectedMedia && (
        <MediaModal 
          media={selectedMedia} 
          onClose={() => setSelectedMedia(null)} 
          apiKey={TMDB_KEY}
          mode={mediaMode}
        />
      )}
    </div>
  );
};

export default App;
