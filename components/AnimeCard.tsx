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

  // If the prop image changes (e.g. on search refresh), reset states
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
      className="group relative cursor-pointer bg-base-100 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden border border-base-content/10 shadow-lg shadow-base-content/5 transition-all duration-500 hover:scale-[1.03] hover:z-20 hover:border-primary/40 hover:shadow-xl"
      onClick={onClick}
    >
      <div className="aspect-[2/3] overflow-hidden relative">
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Loader2 size={16} className="text-primary animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-base-content/5 flex flex-col items-center justify-center p-4 text-center">
            <div className="relative">
              <Star size={18} className="text-base-content/10" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <span className="text-[7px] font-black text-base-content/20 uppercase mt-3 tracking-[0.2em]">No Poster Available</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
           <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
              <Play className="fill-current ml-1" size={16} />
           </div>
        </div>
      </div>
      
      <div className="p-2.5 space-y-0.5 bg-gradient-to-b from-transparent to-base-100/40">
        <div className="flex items-center gap-1 opacity-40">
           <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
           <span className="text-[7px] font-black uppercase tracking-widest text-primary">Live Node</span>
        </div>
        <h3 className="font-bold text-[9px] md:text-[11px] leading-tight text-base-content/90 line-clamp-2 uppercase tracking-tight group-hover:text-primary transition-colors">
          {anime.title}
        </h3>
      </div>
    </div>
  );
};

export default AnimeCard;