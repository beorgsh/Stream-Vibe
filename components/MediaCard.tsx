import React, { memo } from 'react';
import { TMDBMedia } from '../types';
import { Star, Play } from 'lucide-react';

interface MediaCardProps {
  media: TMDBMedia;
  onClick: () => void;
}

const MediaCard: React.FC<MediaCardProps> = memo(({ media, onClick }) => {
  const rating = media.vote_average?.toFixed(1) || "N/A";
  const year = (media.release_date || media.first_air_date)?.split('-')[0] || "2024";

  return (
    <div 
      className="group relative cursor-pointer bg-base-100 rounded-2xl md:rounded-[2rem] overflow-hidden border border-base-content/10 shadow-lg transition-transform duration-300 hover:scale-[1.05] will-change-transform"
      onClick={onClick}
    >
      <div className="aspect-[2/3] overflow-hidden relative">
        {media.poster_path ? (
          <img 
            src={`https://image.tmdb.org/t/p/w500${media.poster_path}`} 
            alt={media.title || media.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-base-content/5 flex items-center justify-center text-base-content/20 uppercase font-black text-[10px] tracking-widest italic">No Records</div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 scale-0 group-hover:scale-100 transition-transform duration-300">
          <div className="badge bg-base-100 text-base-content border-none gap-1.5 text-[9px] font-black py-3 px-3 shadow-2xl">
            <Star size={10} className="fill-current text-primary" />
            {rating}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center scale-0 group-hover:scale-100 transition-transform duration-300">
           <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-base-100 text-base-content flex items-center justify-center shadow-2xl">
              <Play className="fill-current ml-1 w-5 h-5 md:w-7 md:h-7" />
           </div>
        </div>
      </div>
      
      <div className="p-3 md:p-5 space-y-1 md:space-y-2 bg-base-100">
        <div className="flex items-center gap-1.5 opacity-60">
           <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-base-content">
             {media.media_type === 'tv' ? 'TV' : 'Film'}
           </span>
           <span className="w-0.5 h-0.5 rounded-full bg-base-content/40" />
           <span className="text-[8px] md:text-[10px] font-bold text-base-content/80">{year}</span>
        </div>
        <h3 className="font-black text-[11px] md:text-sm leading-tight text-base-content group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-tighter italic">
          {media.title || media.name}
        </h3>
      </div>
    </div>
  );
});

export default MediaCard;