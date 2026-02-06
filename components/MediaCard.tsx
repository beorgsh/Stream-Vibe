
import React from 'react';
import { TMDBMedia } from '../types';
import { Star, Play } from 'lucide-react';

interface MediaCardProps {
  media: TMDBMedia;
  onClick: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ media, onClick }) => {
  const rating = media.vote_average?.toFixed(1) || "N/A";
  const year = (media.release_date || media.first_air_date)?.split('-')[0] || "2024";

  return (
    <div 
      className="group relative cursor-pointer bg-black/40 rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/5 transition-all duration-700 hover:scale-[1.08] hover:shadow-[0_15px_45px_-10px_rgba(255,46,99,0.3)] hover:z-20"
      onClick={onClick}
    >
      <div className="aspect-[2/3] overflow-hidden relative">
        {media.poster_path ? (
          <img 
            src={`https://image.tmdb.org/t/p/w500${media.poster_path}`} 
            alt={media.title || media.name}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-neutral-focus flex items-center justify-center text-white/10 uppercase font-black text-[10px] tracking-widest italic">No Img</div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Rating Badge */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 scale-0 group-hover:scale-100 transition-transform duration-500">
          <div className="badge badge-neutral bg-black/80 backdrop-blur-xl border-white/10 gap-1.5 md:gap-2 text-[10px] font-black py-3 px-3 md:py-4 md:px-4 shadow-2xl">
            <Star size={10} className="fill-yellow-500 text-yellow-500" />
            {rating}
          </div>
        </div>

        {/* Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center scale-0 group-hover:scale-100 transition-transform duration-500">
           <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-2xl">
              <Play className="fill-current ml-1 w-5 h-5 md:w-7 md:h-7" />
           </div>
        </div>
      </div>
      
      <div className="p-3 md:p-5 space-y-1 md:space-y-2">
        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
           <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary">
             {media.media_type === 'tv' ? 'TV' : 'Film'}
           </span>
           <span className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-white/20" />
           <span className="text-[8px] md:text-[10px] font-bold text-white/60">{year}</span>
        </div>
        <h3 className="font-black text-[11px] md:text-sm leading-tight text-white/90 group-hover:text-white transition-colors line-clamp-2 uppercase tracking-tighter">
          {media.title || media.name}
        </h3>
      </div>
    </div>
  );
};

export default MediaCard;
