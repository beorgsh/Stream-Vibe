
import React from 'react';

export const SkeletonCard = () => (
  <div className="flex flex-col gap-3 animate-pulse">
    <div className="aspect-[2/3] bg-white/5 rounded-2xl md:rounded-[2rem]" />
    <div className="space-y-2 px-2">
      <div className="h-2 w-1/3 bg-white/5 rounded-full" />
      <div className="h-3 w-full bg-white/10 rounded-full" />
    </div>
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-3 p-2 animate-pulse">
    <div className="w-6 h-4 bg-white/5 rounded" />
    <div className="w-16 aspect-video bg-white/5 rounded-lg" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-3/4 bg-white/10 rounded-full" />
      <div className="h-2 w-1/4 bg-white/5 rounded-full" />
    </div>
  </div>
);

export const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-3 animate-pulse">
    {[...Array(lines)].map((_, i) => (
      <div key={i} className={`h-3 bg-white/5 rounded-full ${i === lines - 1 ? 'w-1/2' : 'w-full'}`} />
    ))}
  </div>
);
