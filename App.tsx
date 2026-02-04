
import React, { useState, useEffect, useCallback } from 'react';
import { AppTab, AnimeSeries, TMDBMedia, WatchHistoryItem } from './types';
import Navbar from './components/Navbar';
import AnimeTab from './components/AnimeTab';
import GlobalTab from './components/GlobalTab';
import AnimeModal from './components/AnimeModal';
import MediaModal from './components/MediaModal';
import AdBlockModal from './components/AdBlockModal';
import HistoryModal from './components/HistoryModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ANIME);
  const [selectedAnime, setSelectedAnime] = useState<AnimeSeries | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  const [mediaMode, setMediaMode] = useState<'watch' | 'download'>('watch');
  const [showAdBlockModal, setShowAdBlockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Track specific episode to resume when modal opens
  const [resumeData, setResumeData] = useState<{
    episodeId?: string | number;
    seasonNumber?: number;
    episodeNumber?: string | number;
  } | null>(null);

  // History State
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

  // Initialize
  useEffect(() => {
    // Adblock Reminder
    const hasSeenReminder = localStorage.getItem('sv_adblock_reminder_seen');
    if (!hasSeenReminder) {
      const timer = setTimeout(() => setShowAdBlockModal(true), 1500);
      return () => clearTimeout(timer);
    }

    // Load History
    const savedHistory = localStorage.getItem('sv_watch_history_v2');
    if (savedHistory) {
      try {
        setWatchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Persist History
  useEffect(() => {
    localStorage.setItem('sv_watch_history_v2', JSON.stringify(watchHistory));
  }, [watchHistory]);

  const addToHistory = useCallback((item: WatchHistoryItem) => {
    setWatchHistory(prev => {
      // Logic: For series (Anime/TV), we only want to keep the LATEST episode in history
      const filtered = prev.filter(h => h.id.toString() !== item.id.toString());
      const updated = [item, ...filtered];
      return updated.slice(0, 50);
    });
  }, []);

  const removeFromHistory = useCallback((id: string | number) => {
    setWatchHistory(prev => prev.filter(item => item.id.toString() !== id.toString()));
  }, []);

  const handleSelectFromHistory = (item: WatchHistoryItem) => {
    setResumeData({
      episodeId: item.episodeId,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber
    });

    if (item.type === 'anime') {
      setActiveTab(AppTab.ANIME);
      const media = { ...item.fullMedia, source: item.source };
      setSelectedAnime(media);
    } else {
      setActiveTab(AppTab.GLOBAL);
      setMediaMode('watch');
      setSelectedMedia(item.fullMedia);
    }
    setShowHistoryModal(false);
  };

  const handleCloseAdBlockModal = () => {
    localStorage.setItem('sv_adblock_reminder_seen', 'true');
    setShowAdBlockModal(false);
  };

  const handleCloseModals = () => {
    setSelectedAnime(null);
    setSelectedMedia(null);
    setResumeData(null); // Clear resume intent when closing
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0c0c] relative">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-8">
        {activeTab === AppTab.ANIME ? (
          <AnimeTab 
            onSelectAnime={(anime) => { setResumeData(null); setSelectedAnime(anime); }} 
            history={watchHistory.filter(h => h.type === 'anime')}
            onHistorySelect={handleSelectFromHistory}
            onHistoryRemove={removeFromHistory}
            onViewAllHistory={() => setShowHistoryModal(true)}
          />
        ) : ( activeTab === AppTab.GLOBAL ? (
          <GlobalTab 
            onSelectMedia={(media, mode) => {
              setResumeData(null);
              setSelectedMedia(media);
              setMediaMode(mode);
            }} 
            history={watchHistory.filter(h => h.type !== 'anime')}
            onHistorySelect={handleSelectFromHistory}
            onHistoryRemove={removeFromHistory}
            onViewAllHistory={() => setShowHistoryModal(true)}
          />
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
          <a className="link link-hover text-xs" onClick={() => setShowHistoryModal(true)}>History</a>
        </nav>
      </footer>

      {showAdBlockModal && (
        <AdBlockModal onClose={handleCloseAdBlockModal} />
      )}

      {showHistoryModal && (
        <HistoryModal 
          history={watchHistory} 
          onClose={() => setShowHistoryModal(false)}
          onSelect={handleSelectFromHistory}
          onRemove={removeFromHistory}
          onClearAll={() => setWatchHistory([])}
        />
      )}

      {selectedAnime && (
        <AnimeModal 
          anime={selectedAnime} 
          onClose={handleCloseModals} 
          initialEpisodeId={resumeData?.episodeId as string}
          onPlay={(ep) => {
            addToHistory({
              id: selectedAnime.session,
              title: selectedAnime.title,
              image: selectedAnime.image,
              type: 'anime',
              source: selectedAnime.source,
              episodeNumber: ep.episode,
              episodeTitle: ep.title,
              episodeId: ep.session,
              timestamp: Date.now(),
              fullMedia: selectedAnime
            });
          }}
        />
      )}

      {selectedMedia && (
        <MediaModal 
          media={selectedMedia} 
          onClose={handleCloseModals} 
          apiKey={TMDB_KEY}
          mode={mediaMode}
          initialResumeData={resumeData}
          onPlay={(ep) => {
            addToHistory({
              id: selectedMedia.id,
              title: selectedMedia.title || selectedMedia.name || 'Untitled',
              image: `https://image.tmdb.org/t/p/w500${selectedMedia.backdrop_path || selectedMedia.poster_path}`,
              type: selectedMedia.media_type,
              episodeNumber: ep?.episode_number,
              episodeTitle: ep?.name,
              seasonNumber: ep?.season_number,
              episodeId: ep?.id,
              timestamp: Date.now(),
              fullMedia: selectedMedia
            });
          }}
        />
      )}
    </div>
  );
};

export default App;
