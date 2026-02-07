import React, { useState, useEffect, memo } from 'react';
import { AnimeSeries } from '../types';
import { Play, Star, Loader2 } from 'lucide-react';

interface AnimeCardProps {
  anime: AnimeSeries;
  onClick: () => void;
}

const TMDB_KEY = "7519c82c82dd0265f5b5d599e59e972a";

const AnimeCard: React.FC<AnimeCardProps> = memo(({ anime, onClick }) => {
  const [displayImage, setDisplayImage] = useState<string>(anime.image);
  const [isFinalError, setIsFinalError] = useState(false);
  const [hasAttemptedFallback, setHasAttemptedFallback] = useState(false);
  const [isSearchingFallback, setIsSearchingFallback] = useState(false);

  useEffect(() => {
    setDisplayImage(anime.image);
    setIsFinalError(false);
    setHasAttemptedFallback(false);
    setIsSearchingFallback(false);
  }, [anime.image, anime.title]);

  const handleImageError = async () => {
    if (!hasAttemptedFallback && anime.title) {
      setHasAttemptedFallback(true);
      setIsSearchingFallback(true);
      
      try {
        const anilistResponse = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query($search: String){ Media(search: $search, type: ANIME){ coverImage { extraLarge large } } }`,
            variables: { search: anime.title }
          })
        });
        const anilistData = await anilistResponse.json();
        const cover = anilistData?.data?.Media?.coverImage?.extraLarge || anilistData?.data?.Media?.coverImage?.large;
        
        if (cover) {
          setDisplayImage(cover);
          setIsSearchingFallback(false);
          return;
        }

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
        console.error("Fallback search failed:", error);
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
      className="group relative cursor-pointer bg-base-100 rounded-[1.2rem] overflow-hidden border border-base-content/10 shadow-lg transition-transform duration-300 hover:scale-[1.04] will-change-transform"
      onClick={onClick}
    >
      <div className="aspect-[2/3] overflow-hidden relative bg-base-content/5">
        {(!isFinalError && displayImage) ? (
          <>
            <img 
              src={displayImage} 
              alt={anime.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${isSearchingFallback ? 'opacity-30' : 'opacity-100'}`}
              loading="lazy"
              onError={handleImageError}
            />
            {isSearchingFallback && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={20} className="text-primary animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <Star size={20} className="text-base-content/10" />
            <span className="text-[8px] font-black text-base-content/30 uppercase mt-3 tracking-[0.2em]">Data Offline</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
           <div className="w-10 h-10 rounded-full bg-base-100 text-base-content flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
              <Play className="fill-current ml-1" size={16} />
           </div>
        </div>
      </div>
      
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-1.5">
           <div className="w-1.5 h-1.5 rounded-full bg-primary" />
           <span className="text-[8px] font-black uppercase tracking-[0.2em] text-base-content/60">Registry</span>
        </div>
        <h3 className="font-bold text-[10px] md:text-[11px] leading-tight text-base-content line-clamp-2 uppercase tracking-tight group-hover:text-primary transition-colors italic">
          {anime.title}
        </h3>
      </div>
    </div>
  );
});

export default AnimeCard;