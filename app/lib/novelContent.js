import novelPages from './novelPages.generated';

export const novelGenre = {
  id: 'novel',
  name: 'Romance',
  slug: 'novel',
  description: 'Koleksi romance dengan kisah emosional, hubungan antarmanusia, dan perjalanan hati yang membekas.',
  theme_name: 'Romance Library',
  theme_color: '#F6C1CC',
  accent_color: '#B23A5B',
  icon: 'RC',
};

export const lautBerceritaBook = {
  id: 'demo-novel-laut-bercerita',
  title: 'Laut Bercerita',
  author: 'Leila S. Chudori',
  description: 'Kisah romance tentang persahabatan, keluarga, kehilangan, dan perjuangan para aktivis pada masa Orde Baru.',
  cover_url: '/images/novel/laut-bercerita.webp',
  pdf_url: '/api/novel/laut-bercerita',
  genre_id: 'novel',
  is_demo: true,
  genres: novelGenre,
  page_count: novelPages.length,
};

const PERAHU_KERTAS_PAGE_COUNT = 456;

export const perahuKertasPages = Array.from(
  {length: PERAHU_KERTAS_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const perahuKertasBook = {
  id: 'demo-novel-perahu-kertas',
  title: 'Perahu Kertas',
  author: 'Dee Lestari',
  description: 'Kisah Kugy dan Keenan tentang mimpi, persahabatan, pilihan hidup, dan perasaan yang menemukan jalannya kembali.',
  cover_url: '/images/novel/perahu-kertas-premium-v2.png',
  pdf_url: '/api/novel/perahu-kertas',
  genre_id: 'novel',
  is_demo: true,
  genres: novelGenre,
  page_count: perahuKertasPages.length,
};

export const antaraCintaPages = Array.from({length: 14}, (_, index) => ({
  page_number: index + 1,
  page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
  content: '',
}));

export const antaraCintaBook = {
  id: 'demo-novel-antara-cinta-atau-sekadar-rasa',
  title: 'Antara Cinta atau Sekadar Rasa',
  author: 'Fitri Lusiana Kurniasari',
  description: 'Cerita romance tentang perasaan yang tumbuh, keraguan hati, dan pencarian makna antara cinta yang sungguh-sungguh atau sekadar rasa.',
  cover_url: '/images/novel/antara-cinta-atau-sekadar-rasa/cover.webp',
  pdf_url: '/api/novel/antara-cinta-atau-sekadar-rasa',
  genre_id: 'novel',
  is_demo: true,
  genres: novelGenre,
  page_count: antaraCintaPages.length,
  reader_type: 'pdf',
};

const CINTA_SEJATI_PAGE_COUNT = 155;

export const cintaSejatiPages = Array.from(
  {length: CINTA_SEJATI_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const cintaSejatiBook = {
  id: 'demo-novel-cinta-dan-cinta-sejati',
  title: 'Cinta dan Cinta Sejati',
  author: 'Shadiq Jalal Al-Adzm',
  description: 'Refleksi tentang cinta, cinta sejati, hasrat, dan berbagai makna hubungan manusia yang diterjemahkan oleh Dedy Wahyudin.',
  cover_url: '/images/novel/cinta-dan-cinta-sejati/cover.jpg',
  pdf_url: '/api/novel/cinta-dan-cinta-sejati',
  genre_id: 'novel',
  is_demo: true,
  genres: novelGenre,
  page_count: cintaSejatiPages.length,
  reader_type: 'pdf',
};

const MY_SWEET_DOCTOR_PAGE_COUNT = 441;

export const mySweetDoctorPages = Array.from(
  {length: MY_SWEET_DOCTOR_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const mySweetDoctorBook = {
  id: 'demo-novel-my-sweet-doctor',
  store_key: 'my-sweet-doctor',
  title: 'My Sweet Doctor',
  author: 'Azhara Natasya',
  description: 'Novel romance tentang pertemuan, perhatian, dan perjalanan perasaan yang tumbuh di antara dunia medis dan kehidupan pribadi.',
  cover_url: '/images/novel/my-sweet-doctor/cover.webp',
  pdf_url: '/api/novel/my-sweet-doctor',
  genre_id: 'novel',
  is_demo: true,
  is_paid: true,
  price_rupiah: 1000,
  genres: novelGenre,
  page_count: mySweetDoctorPages.length,
  reader_type: 'pdf',
};

export function isLautBercerita(book) {
  return book?.id === lautBerceritaBook.id || book?.title?.trim().toLowerCase() === lautBerceritaBook.title.toLowerCase();
}

export function isPerahuKertas(book) {
  return book?.id === perahuKertasBook.id || book?.title?.trim().toLowerCase() === perahuKertasBook.title.toLowerCase();
}

export function isAntaraCinta(book) {
  const title = book?.title?.trim().toLowerCase();
  return book?.id === antaraCintaBook.id
    || title === antaraCintaBook.title.toLowerCase()
    || title === 'antara cinta atau sekedar rasa';
}

export function isMySweetDoctor(book) {
  return book?.id === mySweetDoctorBook.id
    || book?.store_key === mySweetDoctorBook.store_key
    || book?.title?.trim().toLowerCase() === mySweetDoctorBook.title.toLowerCase();
}

export function isCintaSejati(book) {
  return book?.id === cintaSejatiBook.id
    || book?.title?.trim().toLowerCase() === cintaSejatiBook.title.toLowerCase();
}

export function withNovelContent(book) {
  return {
    ...lautBerceritaBook,
    ...book,
    pdf_url: lautBerceritaBook.pdf_url,
    is_demo: book?.id === lautBerceritaBook.id,
    genres: {...(book?.genres || novelGenre), name: 'Romance', theme_name: 'Romance Library', icon: 'RC'},
    page_count: novelPages.length,
    reader_type: 'pdf',
  };
}

export function withPerahuKertasContent(book) {
  return {
    ...perahuKertasBook,
    ...book,
    cover_url: perahuKertasBook.cover_url,
    is_demo: book?.id === perahuKertasBook.id,
    genres: {...(book?.genres || novelGenre), name: 'Romance', theme_name: 'Romance Library', icon: 'RC'},
    page_count: perahuKertasPages.length,
  };
}

export function withAntaraCintaContent(book) {
  return {
    ...antaraCintaBook,
    ...book,
    cover_url: antaraCintaBook.cover_url,
    pdf_url: antaraCintaBook.pdf_url,
    is_demo: book?.id === antaraCintaBook.id,
    genres: {...(book?.genres || novelGenre), name: 'Romance', theme_name: 'Romance Library', icon: 'RC'},
    page_count: antaraCintaPages.length,
    reader_type: 'pdf',
  };
}

export function withMySweetDoctorContent(book) {
  return {
    ...mySweetDoctorBook,
    ...book,
    cover_url: mySweetDoctorBook.cover_url,
    pdf_url: mySweetDoctorBook.pdf_url,
    is_demo: book?.id === mySweetDoctorBook.id,
    is_paid: true,
    price_rupiah: mySweetDoctorBook.price_rupiah,
    store_key: mySweetDoctorBook.store_key,
    genres: {...(book?.genres || novelGenre), name: 'Romance', theme_name: 'Romance Library', icon: 'RC'},
    page_count: mySweetDoctorPages.length,
    reader_type: 'pdf',
  };
}

export function withCintaSejatiContent(book) {
  if (!isCintaSejati(book)) return book;
  return {
    ...cintaSejatiBook,
    ...book,
    cover_url: cintaSejatiBook.cover_url,
    pdf_url: cintaSejatiBook.pdf_url,
    is_demo: book?.id === cintaSejatiBook.id,
    is_paid: false,
    is_premium: false,
    genres: {...(book?.genres || novelGenre), name: 'Romance', theme_name: 'Romance Library', icon: 'RC'},
    page_count: cintaSejatiPages.length,
    reader_type: 'pdf',
  };
}

export function ensureRomanceBooks(books = []) {
  const normalized = books.map((book) => isLautBercerita(book)
    ? withNovelContent(book)
    : isPerahuKertas(book)
      ? withPerahuKertasContent(book)
      : isAntaraCinta(book)
        ? withAntaraCintaContent(book)
        : isMySweetDoctor(book)
          ? withMySweetDoctorContent(book)
          : isCintaSejati(book)
            ? withCintaSejatiContent(book)
          : book);

  if (!normalized.some(isLautBercerita)) normalized.unshift(lautBerceritaBook);
  if (!normalized.some(isPerahuKertas)) normalized.push(perahuKertasBook);
  if (!normalized.some(isAntaraCinta)) normalized.unshift(antaraCintaBook);
  if (!normalized.some(isMySweetDoctor)) normalized.unshift(mySweetDoctorBook);
  if (!normalized.some(isCintaSejati)) normalized.push(cintaSejatiBook);
  return normalized;
}

export {novelPages};
