import {
  ceritaRakyatNusantara2Book,
  dongengBinatangBook,
  dongengBook,
  dongengSebelumTidur2Book,
  sehariSatuDongengBook,
} from './dongengContent';
import {
  ceritaKknBook,
  horrorBook,
  kunciHitamBook,
  kursiKosongBook,
  misteriPenungguPohonTuaBook,
} from './horrorContent';
import {dragonBallBooks, mercuryComicBook, wildlifeComicBook} from './comicContent';
import {
  antaraCintaBook,
  cintaSejatiBook,
  lautBerceritaBook,
  mySweetDoctorBook,
  perahuKertasBook,
} from './novelContent';

export function getDemoBooks(slug) {
  if (slug === 'dongeng') return [dongengBook, ceritaRakyatNusantara2Book, dongengBinatangBook, sehariSatuDongengBook, dongengSebelumTidur2Book];
  if (slug === 'horror') {
    return [ceritaKknBook, kunciHitamBook, kursiKosongBook, horrorBook, misteriPenungguPohonTuaBook];
  }
  if (slug === 'komik') return [wildlifeComicBook, ...dragonBallBooks, mercuryComicBook];
  if (slug === 'novel') {
    return [mySweetDoctorBook, antaraCintaBook, cintaSejatiBook, lautBerceritaBook, perahuKertasBook];
  }
  if (slug) return [];
  return [mySweetDoctorBook, dongengBinatangBook, sehariSatuDongengBook, kunciHitamBook, kursiKosongBook, antaraCintaBook, cintaSejatiBook, lautBerceritaBook, perahuKertasBook, wildlifeComicBook, ...dragonBallBooks, mercuryComicBook, ceritaKknBook, horrorBook, misteriPenungguPohonTuaBook, dongengBook, ceritaRakyatNusantara2Book, dongengSebelumTidur2Book];
}
