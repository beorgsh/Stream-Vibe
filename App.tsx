import React, { useState, useEffect, useCallback } from 'react';
import { AppTab, AnimeSeries, TMDBMedia, WatchHistoryItem, HistoryFilter } from './types';
import Navbar from './components/Navbar';
import HomeTab from './components/HomeTab';
import AnimeTab from './components/AnimeTab';
import GlobalTab from './components/GlobalTab';
import AnimeModal from './components/AnimeModal';
import MediaModal from './components/MediaModal';
import AdBlockModal from './components/AdBlockModal';
import HistoryModal from './components/HistoryModal';
import ErrorBoundary from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [selectedAnime, setSelectedAnime] = useState<AnimeSeries | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  const [mediaMode, setMediaMode] = useState<'watch' | 'download'>('watch');
  const [showAdBlockModal, setShowAdBlockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [isPWA, setIsPWA] = useState(false);
  
  const [resumeData, setResumeData] = useState<{
    episodeId?: string | number;
    seasonNumber?: number;
    episodeNumber?: string | number;
  } | null>(null);

  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsPWA(isStandalone);
      if (isStandalone) {
        setActiveTab(AppTab.ANIME);
      } else {
        setActiveTab(AppTab.HOME);
      }
    };
    checkPWA();

    const hasSeenReminder = localStorage.getItem('sv_adblock_reminder_seen');
    if (!hasSeenReminder) {
      const timer = setTimeout(() => setShowAdBlockModal(true), 1500);
      return () => clearTimeout(timer);
    }

    const savedHistory = localStorage.getItem('sv_watch_history_v2');
    if (savedHistory) {
      try {
        setWatchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sv_watch_history_v2', JSON.stringify(watchHistory));
  }, [watchHistory]);

  const addToHistory = useCallback((item: WatchHistoryItem) => {
    setWatchHistory(prev => {
      const filtered = prev.filter(h => h.id.toString() !== item.id.toString());
      const updated = [item, ...filtered];
      return updated.slice(0, 100);
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
      setMediaMode(item.mode || 'watch');
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
    setResumeData(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.HOME:
        return <HomeTab setActiveTab={setActiveTab} />;
      case AppTab.ANIME:
        return (
          <AnimeTab 
            onSelectAnime={(anime) => { setResumeData(null); setSelectedAnime(anime); }} 
            history={watchHistory.filter(h => h.type === 'anime')}
            onHistorySelect={handleSelectFromHistory}
            onHistoryRemove={removeFromHistory}
            onViewAllHistory={(filter) => {
              setHistoryFilter(filter || 'all');
              setShowHistoryModal(true);
            }}
          />
        );
      case AppTab.GLOBAL:
        return (
          <GlobalTab 
            onSelectMedia={(media, mode) => {
              setResumeData(null);
              setSelectedMedia(media);
              setMediaMode(mode);
            }} 
            history={watchHistory.filter(h => h.type !== 'anime')}
            onHistorySelect={handleSelectFromHistory}
            onHistoryRemove={removeFromHistory}
            onViewAllHistory={(filter) => {
              setHistoryFilter(filter || 'all');
              setShowHistoryModal(true);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0c0c] relative">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isPWA={isPWA} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-8">
        <ErrorBoundary onGoHome={() => setActiveTab(AppTab.HOME)}>
            <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                {renderContent()}
            </motion.div>
            </AnimatePresence>
        </ErrorBoundary>
      </main>

      <footer className="p-8 footer bg-black border-t border-white/5 text-base-content mt-8">
        <aside>
          <div className="flex items-center gap-2">
             <img src="https://img.icons8.com/ios-filled/512/ffffff/play-button-circled--v1.png" className="w-8 h-8 opacity-80" alt="Logo" />
             <div className="text-xl font-bold tracking-tighter text-white">StreamVibe</div>
          </div>
          <p className="text-xs opacity-50 uppercase tracking-widest font-bold mt-1">Neural Engine v4.0</p>
        </aside> 
        <nav>
          <header className="footer-title opacity-40 uppercase text-[10px] tracking-widest">Links</header> 
          {!isPWA && <a className="link link-hover text-xs" onClick={() => setActiveTab(AppTab.HOME)}>Home</a>}
          <a className="link link-hover text-xs" onClick={() => setActiveTab(AppTab.ANIME)}>Anime</a>
          <a className="link link-hover text-xs" onClick={() => setActiveTab(AppTab.GLOBAL)}>Global</a>
          <a className="link link-hover text-xs" onClick={() => {
            setHistoryFilter('all');
            setShowHistoryModal(true);
          }}>History</a>
        </nav>
      </footer>

      <AnimatePresence>
        {showAdBlockModal && (
          <AdBlockModal key="adblock-modal" onClose={handleCloseAdBlockModal} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistoryModal && (
          <HistoryModal 
            key="history-modal"
            history={watchHistory} 
            onClose={() => setShowHistoryModal(false)}
            onSelect={handleSelectFromHistory}
            onRemove={removeFromHistory}
            onClearAll={() => setWatchHistory([])}
            initialFilter={historyFilter}
          />
        )}
      </AnimatePresence>

      <ErrorBoundary onGoHome={() => setActiveTab(AppTab.HOME)}>
        <AnimatePresence>
            {selectedAnime && (
            <AnimeModal 
                key="anime-modal"
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
        </AnimatePresence>
      </ErrorBoundary>

      <ErrorBoundary onGoHome={() => setActiveTab(AppTab.HOME)}>
        <AnimatePresence>
            {selectedMedia && (
            <MediaModal 
                key="media-modal"
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
                    mode: mediaMode,
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
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
};

export default App;