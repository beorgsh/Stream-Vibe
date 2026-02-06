import React from 'react';

// Exact replica of AnimeCard structure
export const SkeletonAnimeCard = () => (
  <div className="bg-base-200 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden border border-base-content/5 animate-pulse h-full flex flex-col">
    <div className="aspect-[2/3] bg-base-content/10 relative w-full" />
    <div className="p-2.5 space-y-2 bg-gradient-to-b from-transparent to-base-300/30 flex-1">
       <div className="flex items-center gap-1">
         <div className="w-1.5 h-1.5 rounded-full bg-base-content/20" />
         <div className="h-1.5 w-8 bg-base-content/20 rounded-full" />
       </div>
       <div className="h-2.5 w-3/4 bg-base-content/20 rounded-full" />
    </div>
  </div>
);

// Exact replica of MediaCard structure
export const SkeletonMediaCard = () => (
  <div className="bg-base-200/50 rounded-2xl md:rounded-[2rem] overflow-hidden border border-base-content/5 animate-pulse h-full flex flex-col">
    <div className="aspect-[2/3] bg-base-content/10 relative w-full" />
    <div className="p-3 md:p-5 space-y-3 flex-1">
       <div className="flex items-center gap-2 opacity-50">
         <div className="h-1.5 w-8 bg-base-content/20 rounded-full" />
         <div className="h-1.5 w-1.5 bg-base-content/20 rounded-full" />
         <div className="h-1.5 w-6 bg-base-content/20 rounded-full" />
       </div>
       <div className="h-3 w-4/5 bg-base-content/20 rounded-full" />
    </div>
  </div>
);

// Generic banner skeleton for Spotlight sections
export const SkeletonBanner = ({ className = "" }: { className?: string }) => (
  <div className={`w-full bg-base-content/10 rounded-2xl animate-pulse ${className}`} />
);

// Row skeleton for Episode lists - Updated with description placeholder
export const SkeletonRow = () => (
  <div className="flex items-start gap-4 p-3 rounded-xl bg-base-content/5 animate-pulse border border-base-content/5">
    <div className="w-20 md:w-28 aspect-video bg-base-content/10 rounded-lg shrink-0" />
    <div className="flex-1 space-y-2 min-w-0">
      <div className="h-2.5 w-1/3 bg-base-content/20 rounded-full" />
      <div className="h-2 w-1/5 bg-base-content/10 rounded-full" />
      <div className="space-y-1.5 pt-1">
        <div className="h-2 w-full bg-base-content/5 rounded-full" />
        <div className="h-2 w-4/5 bg-base-content/5 rounded-full" />
      </div>
    </div>
  </div>
);

// Text skeleton for Descriptions
export const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-3 animate-pulse">
    {[...Array(lines)].map((_, i) => (
      <div key={i} className={`h-2.5 md:h-3.5 bg-base-content/10 rounded-full ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);
