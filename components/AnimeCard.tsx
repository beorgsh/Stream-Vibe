import React, { useState, useEffect } from 'react';
import { AnimeSeries } from '../types';
import { Play, Star, Loader2 } from 'lucide-react';

interface AnimeCardProps {
  anime: AnimeSeries;
  onClick: () => void;
}

const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick }) => {
  const [displayImage, setDisplayImage] = useState<string>(anime.image);
  const [isFinalError, setIsFinalError] = useState(false);
  const [hasAttemptedTMDB, setHasAttemptedTMDB] = useState(false);
  const [isSearchingFallback, setIsSearchingFallback] = useState(false);

  useEffect(() => {
    setDisplayImage(anime.image);
    setIsFinalError(false);
    setHasAttemptedTMDB(false);
    setIsSearchingFallback(false);
  }, [anime.image, anime.title]);

  const handleImageError = async () => {
    if (!hasAttemptedTMDB && anime.title) {
      setHasAttemptedTMDB(true);
      setIsSearchingFallback(true);
      
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(anime.title)}`
        );
        const data = await response.json();
        const match = data.results?.find((item: any) => item.poster_path);
        
        if (match) {
          setDisplayImage(`https://image.tmdb.org/t/p/w500${match.poster_path}`);
        } else {
          setIsFinalError(true);
        }
      } catch (error) {
        console.error("TMDB Fallback search failed:", error);
        setIsFinalError(true);
      } finally {
        setIsSearchingFallback(false);
      }
    } else {
      setIsFinalError(true);
      setIsSearchingFallback(false);
    }
  };

  return (
    <div 
      className="group relative cursor-pointer bg-black rounded-[1.2rem] overflow-hidden border border-white/10 shadow-lg transition-all duration-500 hover:scale-[1.04] hover:z-20 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
      onClick={onClick}
    >
      <div className="aspect-[2/3] overflow-hidden relative bg-white/5">
        {(!isFinalError && displayImage) ? (
          <>
            <img 
              src={displayImage} 
              alt={anime.title}
              className={`w-full h-full object-cover transition-all duration-700 ${isSearchingFallback ? 'blur-sm grayscale opacity-50' : 'group-hover:scale-105'}`}
              loading="lazy"
              onError={handleImageError}
            />
            {isSearchingFallback && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 size={20} className="text-white animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <Star size={20} className="text-white/10" />
            <span className="text-[8px] font-black text-white/30 uppercase mt-3 tracking-[0.2em]">Offline Record</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40 group-hover:opacity-70 transition-opacity" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
           <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
              <Play className="fill-current ml-1" size={16} />
           </div>
        </div>
      </div>
      
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-1.5">
           <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
           <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/80">Active</span>
        </div>
        <h3 className="font-bold text-[10px] md:text-[11px] leading-tight text-white line-clamp-2 uppercase tracking-tight group-hover:text-white transition-colors italic">
          {anime.title}
        </h3>
      </div>
    </div>
  );
};

export default AnimeCard;