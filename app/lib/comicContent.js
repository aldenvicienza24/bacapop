export const comicGenre = {
  name: 'Komik',
  slug: 'komik',
  description: 'Koleksi cerita bergambar edukatif dan petualangan yang seru untuk dibaca halaman demi halaman.',
  theme_name: 'Cerita Bergambar',
  theme_color: '#62C6C8',
  accent_color: '#F4D84A',
  icon: 'KM',
  is_active: true,
};

export const mercuryComicPages = Array.from({length: 12}, (_, index) => ({
  page_number: index + 1,
  page_title: index === 0 ? 'Sampul' : index === 1 ? 'Pengenalan Tokoh' : `Halaman Komik ${index - 1}`,
  image_url: `/images/comic/merkuri/page-${String(index + 1).padStart(3, '0')}.webp`,
}));

export const mercuryComicBook = {
  id: 'demo-komik-air-raksa',
  title: 'Air Raksa: Si Jahat Perusak Tubuh dan Alam',
  author: 'PlanetGOLD Indonesia',
  description: 'Komik edukatif tentang bahaya air raksa atau merkuri bagi kesehatan tubuh dan lingkungan.',
  cover_url: mercuryComicPages[0].image_url,
  pdf_url: '/books/komik-merkuri.pdf',
  genre_id: 'komik',
  page_count: mercuryComicPages.length,
  genres: comicGenre,
  is_demo: true,
};

export const wildlifeComicPages = Array.from({length: 24}, (_, index) => ({
  page_number: index + 1,
  page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
  content: '',
}));

export const wildlifeComicBook = {
  id: 'demo-komik-mereka-juga-bertasbih',
  title: 'Mereka Juga Bertasbih',
  author: 'Yesi Maryam dkk.',
  description: 'Komik edukatif tentang kepedulian terhadap satwa liar, ancaman perdagangan ilegal, dan pentingnya menjaga kehidupan di alam.',
  cover_url: '/images/comic/perdagangan-satwa-liar/page-001.webp',
  pdf_url: '/api/comic/perdagangan-satwa-liar',
  genre_id: 'komik',
  page_count: wildlifeComicPages.length,
  genres: comicGenre,
  is_demo: true,
  is_paid: false,
  reader_type: 'pdf',
};

export const dragonBallPages = Array.from({length: 86}, (_, index) => ({
  page_number: index + 1,
  page_title: index === 0 ? 'Sampul dan Jaket Buku' : `Halaman ${index + 1}`,
}));

export const dragonBallBook = {
  id: 'demo-dragon-ball-01',
  title: 'Dragon Ball Vol. 1',
  author: 'Akira Toriyama',
  description: 'Awal petualangan Son Goku bersama Bulma untuk mencari tujuh Dragon Ball, dengan aksi, humor, dan dunia fantasi yang ikonik.',
  cover_url: '/images/comic/dragon-ball/cover.webp',
  pdf_url: '/api/comic/dragon-ball-01',
  genre_id: 'komik',
  page_count: dragonBallPages.length,
  genres: comicGenre,
  is_demo: true,
};

export const dragonBallPages2 = Array.from({length: 92}, (_, index) => ({
  page_number: index + 1,
  page_title: index === 0 ? 'Sampul dan Jaket Buku' : `Halaman ${index + 1}`,
}));

export const dragonBallBook2 = {
  id: 'demo-dragon-ball-02',
  title: 'Dragon Ball Vol. 2',
  author: 'Akira Toriyama',
  description: 'Petualangan Goku dan kawan-kawan berlanjut dengan ancaman baru, aksi yang lebih seru, dan humor khas Dragon Ball.',
  cover_url: '/images/comic/dragon-ball-02/cover.webp',
  pdf_url: '/api/comic/dragon-ball-02',
  genre_id: 'komik',
  page_count: dragonBallPages2.length,
  genres: comicGenre,
  is_demo: true,
};

export const dragonBallPages3 = Array.from({length: 93}, (_, index) => ({
  page_number: index + 1,
  page_title: index === 0 ? 'Sampul dan Jaket Buku' : `Halaman ${index + 1}`,
}));

export const dragonBallBook3 = {
  id: 'demo-dragon-ball-03',
  title: 'Dragon Ball Vol. 3',
  author: 'Akira Toriyama',
  description: 'Goku memasuki petualangan dan pertarungan berikutnya, bertemu lawan tangguh, serta terus mengasah kemampuannya.',
  cover_url: '/images/comic/dragon-ball-03/cover.webp',
  pdf_url: '/api/comic/dragon-ball-03',
  genre_id: 'komik',
  page_count: dragonBallPages3.length,
  genres: comicGenre,
  is_demo: true,
};

export const dragonBallBooks = [dragonBallBook3, dragonBallBook2, dragonBallBook];

export function getDragonBallDefinition(book) {
  const title = book?.title?.trim().toLowerCase();
  const match = dragonBallBooks.find((item) => item.id === book?.id || item.title.toLowerCase() === title);
  if (match === dragonBallBook3 || title === 'dragon ball 03') return {book: dragonBallBook3, pages: dragonBallPages3};
  if (match === dragonBallBook2 || title === 'dragon ball 02') return {book: dragonBallBook2, pages: dragonBallPages2};
  if (match === dragonBallBook || title === 'dragon ball 01') return {book: dragonBallBook, pages: dragonBallPages};
  return null;
}

export function isMercuryComic(book) {
  return book?.id === mercuryComicBook.id || book?.title?.trim().toLowerCase() === mercuryComicBook.title.toLowerCase();
}

export function isWildlifeComic(book) {
  return book?.id === wildlifeComicBook.id
    || book?.title?.trim().toLowerCase() === wildlifeComicBook.title.toLowerCase();
}

export function isDragonBallComic(book) {
  return Boolean(getDragonBallDefinition(book));
}

export function withMercuryComic(book) {
  return {...mercuryComicBook, ...book, is_demo: book?.id === mercuryComicBook.id, genres: book?.genres || comicGenre, page_count: mercuryComicPages.length};
}

export function withWildlifeComic(book) {
  return {
    ...wildlifeComicBook,
    ...book,
    cover_url: wildlifeComicBook.cover_url,
    pdf_url: wildlifeComicBook.pdf_url,
    is_demo: book?.id === wildlifeComicBook.id,
    is_paid: false,
    genres: {...(book?.genres || comicGenre), name: 'Komik', slug: 'komik', icon: 'KM'},
    page_count: wildlifeComicPages.length,
    reader_type: 'pdf',
  };
}

export function withDragonBallComic(book) {
  const definition = getDragonBallDefinition(book) || {book: dragonBallBook, pages: dragonBallPages};
  const fallback = definition.book;
  return {
    ...fallback,
    ...book,
    cover_url: fallback.cover_url,
    pdf_url: book?.pdf_url || fallback.pdf_url,
    is_demo: book?.id === fallback.id,
    genres: book?.genres || comicGenre,
    page_count: definition.pages.length,
  };
}

export function ensureComicBooks(books = []) {
  const nextBooks = books.map((book) => isWildlifeComic(book) ? withWildlifeComic(book) : book);
  dragonBallBooks.slice().reverse().forEach((book) => {
    if (!nextBooks.some((item) => getDragonBallDefinition(item)?.book.id === book.id)) nextBooks.unshift(book);
  });
  if (!nextBooks.some(isMercuryComic)) nextBooks.push(mercuryComicBook);
  if (!nextBooks.some(isWildlifeComic)) nextBooks.unshift(wildlifeComicBook);
  return nextBooks;
}
