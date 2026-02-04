
export interface AnimeSeries {
  title: string;
  image: string;
  session: string;
  description?: string;
  genre?: string;
  status?: string;
  type?: string;
  episodes?: number;
  score?: number | string;
  source?: 'apex' | 'watch';
}

export interface AnimeEpisode {
  episode: string;
  session: string;
  snapshot: string;
  title?: string;
}

export interface AnimeLink {
  quality: string;
  url: string;
  size?: string;
}

export interface AnimeDetailsResponse {
  title: string;
  total: number;
  page: number;
  total_pages: number;
  next: boolean;
  episodes: AnimeEpisode[];
}

export interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
}

export interface TMDBEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  still_path: string;
  overview: string;
}

export enum AppTab {
  ANIME = 'anime',
  GLOBAL = 'global'
}
