import horrorPages from './horrorPages.generated';

export const horrorGenre = {
  name: 'Horror',
  slug: 'horror',
  description: 'Kumpulan bacaan misteri yang gelap, menegangkan, dan penuh rahasia.',
  theme_name: 'Midnight Mystery',
  theme_color: '#1B1026',
  accent_color: '#FF4B5C',
  icon: 'HR',
  is_active: true,
};

export const horrorBook = {
  id: 'demo-misteri-rumah-terkutuk',
  title: 'Misteri Rumah Terkutuk',
  author: 'Melyanda Ulan Dari dkk.',
  description: 'Antologi sepuluh cerpen horror tentang rumah tua, kejadian gaib, dan misteri yang menegangkan.',
  cover_url: '/images/horror/rumah-terkutuk.jfif',
  genre_id: 'horror',
  page_count: horrorPages.length,
  genres: horrorGenre,
  is_demo: true,
  reader_type: 'pages',
};

const MISTERI_PENUNGGU_POHON_TUA_PAGE_COUNT = 136;

export const misteriPenungguPohonTuaPages = Array.from(
  {length: MISTERI_PENUNGGU_POHON_TUA_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const misteriPenungguPohonTuaBook = {
  id: 'demo-horror-misteri-penunggu-pohon-tua',
  title: 'Misteri Penunggu Pohon Tua',
  author: 'Vidyāsenā Production',
  description: 'Seri kumpulan cerpen Buddhis tentang misteri, kehidupan sehari-hari, dan nilai kebijaksanaan yang diterbitkan dalam rangka Waisak 2559 TB.',
  cover_url: '/images/horror/misteri-penunggu-pohon-tua.png',
  pdf_url: '/api/horror/misteri-penunggu-pohon-tua',
  genre_id: 'horror',
  page_count: misteriPenungguPohonTuaPages.length,
  genres: horrorGenre,
  is_demo: true,
  reader_type: 'pdf',
};

export const ceritaKknPages = Array.from({length: 73}, (_, index) => ({
  page_number: index + 1,
  page_title: index === 0 ? 'Halaman Judul' : `Halaman ${index + 1}`,
  content: '',
}));

export const ceritaKknBook = {
  id: 'demo-horror-jeritan-tengah-malam',
  title: 'Jeritan Tengah Malam',
  author: 'Kelompok 2',
  description: 'Antologi cerpen horor tentang pengalaman mencekam, teror tengah malam, dan kejadian misterius yang membayangi para tokohnya.',
  cover_url: '/images/horror/cerita-kkn/cover-premium-v2.png',
  pdf_url: '/api/horror/cerita-kkn-kelompok-2',
  genre_id: 'horror',
  page_count: ceritaKknPages.length,
  genres: horrorGenre,
  is_demo: true,
  is_premium: true,
  premium_reward_id: 'premium-horror-jeritan-tengah-malam',
  premium_cost: 750,
  reader_type: 'pdf',
};

const KUNCI_HITAM_PAGE_COUNT = 61;

export const kunciHitamPages = Array.from(
  {length: KUNCI_HITAM_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const kunciHitamBook = {
  id: 'demo-horror-kunci-hitam',
  store_key: 'kunci-hitam',
  title: 'Kunci Hitam',
  author: 'Olvidado Shakur',
  description: 'Novel seram tentang rahasia gelap, teror pembunuhan, dan sebuah kunci yang menyeret para tokohnya menuju kejadian mengerikan.',
  cover_url: '/images/horror/kunci-hitam/cover.webp',
  pdf_url: '/api/horror/kunci-hitam',
  genre_id: 'horror',
  page_count: kunciHitamPages.length,
  genres: horrorGenre,
  is_demo: true,
  is_paid: true,
  price_rupiah: 1000,
  reader_type: 'pdf',
};

const KURSI_KOSONG_PAGE_COUNT = 97;

export const kursiKosongPages = Array.from(
  {length: KURSI_KOSONG_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul dan Judul Buku' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const kursiKosongBook = {
  id: 'demo-horror-kursi-kosong',
  title: 'Kursi Kosong',
  author: 'Sandya Lustika dkk.',
  description: 'Antologi cerpen horor tentang teror, kejadian ganjil, dan rahasia mencekam yang hadir dari balik keheningan.',
  cover_url: '/images/horror/kursi-kosong/cover.jpg',
  pdf_url: '/api/horror/kursi-kosong',
  genre_id: 'horror',
  page_count: kursiKosongPages.length,
  genres: horrorGenre,
  is_demo: true,
  reader_type: 'pdf',
};

export {horrorPages};

export function isMisteriRumahTerkutuk(book) {
  return book?.id === horrorBook.id || book?.title?.trim().toLowerCase() === horrorBook.title.toLowerCase();
}

export function isMisteriPenungguPohonTua(book) {
  return book?.id === misteriPenungguPohonTuaBook.id
    || book?.title?.trim().toLowerCase() === misteriPenungguPohonTuaBook.title.toLowerCase();
}

export function isCeritaKkn(book) {
  const title = book?.title?.trim().toLowerCase();
  return book?.id === ceritaKknBook.id
    || title === ceritaKknBook.title.toLowerCase()
    || title === 'cerita kkn kelompok 2';
}

export function isKunciHitam(book) {
  return book?.id === kunciHitamBook.id
    || book?.store_key === kunciHitamBook.store_key
    || book?.title?.trim().toLowerCase() === kunciHitamBook.title.toLowerCase();
}

export function isKursiKosong(book) {
  return book?.id === kursiKosongBook.id
    || book?.title?.trim().toLowerCase() === kursiKosongBook.title.toLowerCase();
}

export function withKursiKosongContent(book) {
  if (!isKursiKosong(book)) return book;
  return {
    ...kursiKosongBook,
    ...book,
    cover_url: kursiKosongBook.cover_url,
    pdf_url: kursiKosongBook.pdf_url,
    page_count: kursiKosongPages.length,
    genres: {...(book?.genres || horrorGenre), name: 'Horror', slug: 'horror', icon: 'HR'},
    is_demo: book?.id === kursiKosongBook.id,
    is_paid: false,
    is_premium: false,
    reader_type: 'pdf',
  };
}

export function withKunciHitamContent(book) {
  if (!isKunciHitam(book)) return book;
  return {
    ...kunciHitamBook,
    ...book,
    cover_url: kunciHitamBook.cover_url,
    pdf_url: kunciHitamBook.pdf_url,
    page_count: kunciHitamPages.length,
    genres: {...(book?.genres || horrorGenre), name: 'Horror', slug: 'horror', icon: 'HR'},
    is_demo: book?.id === kunciHitamBook.id,
    is_paid: true,
    price_rupiah: kunciHitamBook.price_rupiah,
    store_key: kunciHitamBook.store_key,
    reader_type: 'pdf',
  };
}

export function withCeritaKknContent(book) {
  if (!isCeritaKkn(book)) return book;
  return {
    ...ceritaKknBook,
    ...book,
    cover_url: ceritaKknBook.cover_url,
    pdf_url: ceritaKknBook.pdf_url,
    page_count: ceritaKknPages.length,
    genres: book?.genres || horrorGenre,
    is_demo: book?.id === ceritaKknBook.id,
    is_premium: true,
    premium_reward_id: ceritaKknBook.premium_reward_id,
    reader_type: 'pdf',
  };
}

export function withMisteriPenungguPohonTuaContent(book) {
  if (!isMisteriPenungguPohonTua(book)) return book;
  return {
    ...misteriPenungguPohonTuaBook,
    ...book,
    cover_url: misteriPenungguPohonTuaBook.cover_url,
    pdf_url: misteriPenungguPohonTuaBook.pdf_url,
    page_count: misteriPenungguPohonTuaPages.length,
    genres: book?.genres || horrorGenre,
    is_demo: book?.id === misteriPenungguPohonTuaBook.id,
    reader_type: 'pdf',
  };
}

export function withHorrorContent(book) {
  if (!isMisteriRumahTerkutuk(book)) return book;
  const {pdf_url: _unusedPdfUrl, ...bookWithoutPdf} = book;

  return {
    ...horrorBook,
    ...bookWithoutPdf,
    author: book.author || horrorBook.author,
    description: book.description || horrorBook.description,
    cover_url: book.cover_url || horrorBook.cover_url,
    page_count: horrorBook.page_count,
    genres: book.genres || horrorGenre,
    is_demo: book.id === horrorBook.id,
    reader_type: 'pages',
  };
}

export function ensureHorrorBook(books = []) {
  const normalizedBooks = books.map((book) => isCeritaKkn(book)
    ? withCeritaKknContent(book)
    : isKunciHitam(book)
      ? withKunciHitamContent(book)
    : isKursiKosong(book)
      ? withKursiKosongContent(book)
    : isMisteriPenungguPohonTua(book)
      ? withMisteriPenungguPohonTuaContent(book)
      : withHorrorContent(book));
  if (!normalizedBooks.some((book) => isMisteriRumahTerkutuk(book))) normalizedBooks.unshift(horrorBook);
  if (!normalizedBooks.some((book) => isMisteriPenungguPohonTua(book))) normalizedBooks.push(misteriPenungguPohonTuaBook);
  if (!normalizedBooks.some((book) => isCeritaKkn(book))) normalizedBooks.unshift(ceritaKknBook);
  if (!normalizedBooks.some((book) => isKunciHitam(book))) normalizedBooks.push(kunciHitamBook);
  if (!normalizedBooks.some((book) => isKursiKosong(book))) normalizedBooks.push(kursiKosongBook);
  return normalizedBooks;
}
