import {dongengGenre} from './dongengContent';
import {horrorGenre} from './horrorContent';
import {comicGenre} from './comicContent';
import {novelGenre} from './novelContent';

export const defaultGenres = [dongengGenre, horrorGenre, comicGenre, novelGenre];

export function normalizeGenreLabel(genre) {
  if (!genre || genre.slug !== 'novel') return genre;
  return {
    ...genre,
    name: 'Romance',
    description: 'Koleksi romance dengan kisah emosional, hubungan antarmanusia, dan perjalanan hati yang membekas.',
    theme_name: 'Romance Library',
    icon: 'RC',
  };
}

export function mergeWithDefaultGenres(genres = []) {
  const usedSlugs = new Set(genres.map((genre) => genre.slug));
  return [
    ...genres.map(normalizeGenreLabel),
    ...defaultGenres.filter((genre) => !usedSlugs.has(genre.slug)),
  ];
}
