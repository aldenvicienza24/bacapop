export const BOOK_STATUS = {
  planned: 'Direncanakan',
  reading: 'Sedang Dibaca',
  finished: 'Selesai',
};

export const BOOK_GENRES = [
  'Romance',
  'Self Improvement',
  'Filsafat',
  'Sejarah',
  'Keuangan',
  'Bisnis',
  'Teknologi',
  'Pendidikan',
  'Lainnya',
];

export const RECOMMENDED_BOOKS = [
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    genre: 'Self Improvement',
    total_pages: 320,
    description: 'Panduan membangun kebiasaan kecil yang berdampak besar.',
  },
  {
    title: 'Laskar Pelangi',
    author: 'Andrea Hirata',
    genre: 'Romance',
    total_pages: 534,
    description: 'Kisah persahabatan dan mimpi anak-anak Belitung.',
  },
  {
    title: 'Filosofi Teras',
    author: 'Henry Manampiring',
    genre: 'Filsafat',
    total_pages: 346,
    description: 'Pengenalan stoisisme yang dekat dengan kehidupan sehari-hari.',
  },
  {
    title: 'Bumi Manusia',
    author: 'Pramoedya Ananta Toer',
    genre: 'Sejarah',
    total_pages: 535,
    description: 'Roman sejarah tentang identitas, kolonialisme, dan keberanian.',
  },
  {
    title: 'Rich Dad Poor Dad',
    author: 'Robert T. Kiyosaki',
    genre: 'Keuangan',
    total_pages: 336,
    description: 'Dasar literasi finansial dan cara memandang aset.',
  },
  {
    title: 'Laut Bercerita',
    author: 'Leila S. Chudori',
    genre: 'Romance',
    total_pages: 394,
    description: 'Kisah romance menyentuh tentang ingatan, keluarga, dan aktivisme.',
  },
  {
    title: 'Negeri 5 Menara',
    author: 'Ahmad Fuadi',
    genre: 'Romance',
    total_pages: 423,
    description: 'Cerita perjuangan santri mengejar mimpi besar.',
  },
  {
    title: 'Start With Why',
    author: 'Simon Sinek',
    genre: 'Bisnis',
    total_pages: 256,
    description: 'Cara memulai gagasan, produk, dan gerakan dari alasan yang kuat.',
  },
];

export function getBookStatusLabel(status) {
  return BOOK_STATUS[status] || BOOK_STATUS.planned;
}

export function formatBookDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function calculateBookStats(books) {
  const planned = books.filter((book) => book.status === 'planned').length;
  const reading = books.filter((book) => book.status === 'reading').length;
  const finished = books.filter((book) => book.status === 'finished').length;

  return {
    total: books.length,
    planned,
    reading,
    finished,
    points: finished * 50,
  };
}
