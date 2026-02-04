
import React from 'react';
import { AnimeSeries } from '../types';
import { Play, Star } from 'lucide-react';

interface AnimeCardProps {
  anime: AnimeSeries;
  onClick: () => void;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick }) => {
  return (
    <div 
      className="group relative cursor-pointer bg-[#111] rounded-[1rem] md:rounded-[1.5rem] overflow-hidden border border-white/5 transition-all duration-500 hover:scale-[1.03] hover:z-20"
      onClick={onClick}
    >
      <div className="aspect-[2/3] overflow-hidden relative">
        {anime.image ? (
          <img 
            src={anime.image} 
            alt={anime.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center p-4 text-center">
            <Star size={14} className="text-white/10" />
            <span className="text-[7px] font-black text-white/20 uppercase mt-2">No Poster</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
           <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
              <Play className="fill-current ml-1" size={16} />
           </div>
        </div>
      </div>
      
      <div className="p-2.5 space-y-0.5">
        <div className="flex items-center gap-1 opacity-40">
           <div className="w-1 h-1 rounded-full bg-primary" />
           <span className="text-[7px] font-black uppercase tracking-widest text-primary">Live</span>
        </div>
        <h3 className="font-bold text-[9px] md:text-[11px] leading-tight text-white/90 line-clamp-2 uppercase tracking-tight">
          {anime.title}
        </h3>
      </div>
    </div>
  );
};

export default AnimeCard;
