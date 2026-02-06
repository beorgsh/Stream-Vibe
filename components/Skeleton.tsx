import React from 'react';

// Exact replica of AnimeCard structure
export const SkeletonAnimeCard = () => (
  <div className="bg-[#111] rounded-[1rem] md:rounded-[1.5rem] overflow-hidden border border-white/5 animate-pulse h-full flex flex-col">
    <div className="aspect-[2/3] bg-white/5 relative w-full" />
    <div className="p-2.5 space-y-2 bg-gradient-to-b from-transparent to-black/40 flex-1">
       <div className="flex items-center gap-1">
         <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
         <div className="h-1.5 w-8 bg-white/10 rounded-full" />
       </div>
       <div className="h-2.5 w-3/4 bg-white/10 rounded-full" />
    </div>
  </div>
);

// Exact replica of MediaCard structure
export const SkeletonMediaCard = () => (
  <div className="bg-black/40 rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/5 animate-pulse h-full flex flex-col">
    <div className="aspect-[2/3] bg-white/5 relative w-full" />
    <div className="p-3 md:p-5 space-y-3 flex-1">
       <div className="flex items-center gap-2 opacity-50">
         <div className="h-1.5 w-8 bg-white/10 rounded-full" />
         <div className="h-1.5 w-1.5 bg-white/10 rounded-full" />
         <div className="h-1.5 w-6 bg-white/10 rounded-full" />
       </div>
       <div className="h-3 w-4/5 bg-white/10 rounded-full" />
    </div>
  </div>
);

// Generic banner skeleton for Spotlight sections
export const SkeletonBanner = ({ className = "" }: { className?: string }) => (
  <div className={`w-full bg-white/5 rounded-2xl animate-pulse ${className}`} />
);

// Row skeleton for Episode lists
export const SkeletonRow = () => (
  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 animate-pulse border border-white/5">
    <div className="w-12 h-12 bg-white/10 rounded-lg shrink-0" />
    <div className="flex-1 space-y-2 min-w-0">
      <div className="h-2.5 w-1/3 bg-white/10 rounded-full" />
      <div className="h-2 w-1/5 bg-white/5 rounded-full" />
    </div>
  </div>
);

// Text skeleton for Descriptions
export const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-3 animate-pulse">
    {[...Array(lines)].map((_, i) => (
      <div key={i} className={`h-2.5 md:h-3.5 bg-white/5 rounded-full ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);