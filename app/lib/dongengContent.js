export const dongengGenre = {
  name: 'Dongeng',
  slug: 'dongeng',
  description: 'Kumpulan cerita dongeng anak yang ringan, imajinatif, dan cocok untuk latihan membaca.',
  theme_name: 'Cerita Anak',
  theme_color: '#FFE45E',
  accent_color: '#8AE8FF',
  icon: 'DG',
  is_active: true,
};

export const dongengBook = {
  id: 'demo-kumpulan-cerita-dongeng-anak-2',
  title: 'Kumpulan Cerita Dongeng Anak 2',
  author: 'BacaPop Library',
  description: 'Kumpulan cerita dongeng anak yang disusun menjadi halaman bacaan digital.',
  cover_url: '/images/dongeng/kumpulan-cerita-dongeng-anak-2.png',
  genre_id: 'dongeng',
  page_count: 6,
  genres: dongengGenre,
  is_demo: true,
};

const CERITA_RAKYAT_NUSANTARA_2_PAGE_COUNT = 31;

export const ceritaRakyatNusantara2Pages = Array.from(
  {length: CERITA_RAKYAT_NUSANTARA_2_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Daftar Cerita' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const ceritaRakyatNusantara2Book = {
  id: 'demo-dongeng-cerita-rakyat-nusantara-2',
  title: 'Cerita Rakyat Nusantara 2',
  author: 'Cerita Rakyat Nusantara',
  description: 'Kumpulan tujuh cerita rakyat dari berbagai daerah Nusantara, dari Putri Kandita hingga Ki Ageng Pandanaran.',
  cover_url: '/images/dongeng/cerita-rakyat-nusantara-2-cover-v2.png',
  pdf_url: '/api/dongeng/cerita-rakyat-nusantara-2',
  genre_id: 'dongeng',
  page_count: ceritaRakyatNusantara2Pages.length,
  genres: dongengGenre,
  is_demo: true,
};

const DONGENG_BINATANG_PAGE_COUNT = 59;

export const dongengBinatangPages = Array.from(
  {length: DONGENG_BINATANG_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const dongengBinatangBook = {
  id: 'demo-dongeng-dongeng-binatang',
  store_key: 'dongeng-binatang',
  title: 'Dongeng Binatang',
  author: 'Anita Bahar, SS.',
  description: 'Kumpulan 25 cerita binatang inspiratif dari seluruh dunia yang menghadirkan petualangan, persahabatan, kecerdikan, dan pesan moral.',
  cover_url: '/images/dongeng/dongeng-binatang/cover.webp',
  pdf_url: '/api/dongeng/dongeng-binatang',
  genre_id: 'dongeng',
  page_count: dongengBinatangPages.length,
  genres: dongengGenre,
  is_demo: true,
  is_paid: true,
  price_rupiah: 1000,
  reader_type: 'pdf',
};

const SEHARI_SATU_DONGENG_PAGE_COUNT = 119;

export const sehariSatuDongengPages = Array.from(
  {length: SEHARI_SATU_DONGENG_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const sehariSatuDongengBook = {
  id: 'demo-dongeng-sehari-satu-dongeng',
  store_key: 'sehari-satu-dongeng',
  title: 'Sehari Satu Dongeng',
  author: 'Lisma Laurel, dkk.',
  description: 'Kumpulan 30 dongeng Profil Pelajar Pancasila yang menghadirkan cerita penuh imajinasi, keberagaman, keberanian, gotong royong, dan pesan karakter.',
  cover_url: '/images/dongeng/sehari-satu-dongeng/cover.webp',
  pdf_url: '/api/dongeng/sehari-satu-dongeng',
  genre_id: 'dongeng',
  page_count: sehariSatuDongengPages.length,
  genres: dongengGenre,
  is_demo: true,
  is_paid: true,
  price_rupiah: 1000,
  reader_type: 'pdf',
};

const DONGENG_SEBELUM_TIDUR_2_PAGE_COUNT = 140;

export const dongengSebelumTidur2Pages = Array.from(
  {length: DONGENG_SEBELUM_TIDUR_2_PAGE_COUNT},
  (_, index) => ({
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: '',
  }),
);

export const dongengSebelumTidur2Book = {
  id: 'demo-dongeng-sebelum-tidur-2',
  title: 'Dongeng Sebelum Tidur 2',
  author: 'Dini W. Tamam',
  description: 'Kumpulan dongeng sebelum tidur dengan kisah anak, hewan, petualangan, dan pesan kebaikan yang cocok dibaca bersama keluarga.',
  cover_url: '/images/dongeng/dongeng-sebelum-tidur-2/cover.webp',
  pdf_url: '/api/dongeng/dongeng-sebelum-tidur-2',
  genre_id: 'dongeng',
  page_count: dongengSebelumTidur2Pages.length,
  genres: dongengGenre,
  is_demo: true,
  is_paid: false,
  reader_type: 'pdf',
};

export function isCeritaRakyatNusantara2(book) {
  return book?.id === ceritaRakyatNusantara2Book.id
    || book?.title?.trim().toLowerCase() === ceritaRakyatNusantara2Book.title.toLowerCase();
}

export function isDongengBinatang(book) {
  return book?.id === dongengBinatangBook.id
    || book?.store_key === dongengBinatangBook.store_key
    || book?.title?.trim().toLowerCase() === dongengBinatangBook.title.toLowerCase();
}

export function isSehariSatuDongeng(book) {
  return book?.id === sehariSatuDongengBook.id
    || book?.store_key === sehariSatuDongengBook.store_key
    || book?.title?.trim().toLowerCase() === sehariSatuDongengBook.title.toLowerCase();
}

export function isDongengSebelumTidur2(book) {
  return book?.id === dongengSebelumTidur2Book.id
    || book?.title?.trim().toLowerCase() === dongengSebelumTidur2Book.title.toLowerCase();
}

export function withDongengBinatangContent(book) {
  return {
    ...dongengBinatangBook,
    ...book,
    cover_url: dongengBinatangBook.cover_url,
    pdf_url: dongengBinatangBook.pdf_url,
    is_demo: book?.id === dongengBinatangBook.id,
    is_paid: true,
    price_rupiah: dongengBinatangBook.price_rupiah,
    store_key: dongengBinatangBook.store_key,
    genres: {...(book?.genres || dongengGenre), name: 'Dongeng', slug: 'dongeng', icon: 'DG'},
    page_count: dongengBinatangPages.length,
    reader_type: 'pdf',
  };
}

export function withSehariSatuDongengContent(book) {
  return {
    ...sehariSatuDongengBook,
    ...book,
    cover_url: sehariSatuDongengBook.cover_url,
    pdf_url: sehariSatuDongengBook.pdf_url,
    is_demo: book?.id === sehariSatuDongengBook.id,
    is_paid: true,
    price_rupiah: sehariSatuDongengBook.price_rupiah,
    store_key: sehariSatuDongengBook.store_key,
    genres: {...(book?.genres || dongengGenre), name: 'Dongeng', slug: 'dongeng', icon: 'DG'},
    page_count: sehariSatuDongengPages.length,
    reader_type: 'pdf',
  };
}

export function withDongengSebelumTidur2Content(book) {
  return {
    ...dongengSebelumTidur2Book,
    ...book,
    cover_url: dongengSebelumTidur2Book.cover_url,
    pdf_url: dongengSebelumTidur2Book.pdf_url,
    is_demo: book?.id === dongengSebelumTidur2Book.id,
    is_paid: false,
    genres: {...(book?.genres || dongengGenre), name: 'Dongeng', slug: 'dongeng', icon: 'DG'},
    page_count: dongengSebelumTidur2Pages.length,
    reader_type: 'pdf',
  };
}

export function withCeritaRakyatNusantara2Content(book) {
  return {
    ...ceritaRakyatNusantara2Book,
    ...book,
    cover_url: ceritaRakyatNusantara2Book.cover_url,
    pdf_url: ceritaRakyatNusantara2Book.pdf_url,
    is_demo: book?.id === ceritaRakyatNusantara2Book.id,
    genres: {...(book?.genres || dongengGenre), name: 'Dongeng', slug: 'dongeng', icon: 'DG'},
    page_count: ceritaRakyatNusantara2Pages.length,
  };
}

export function ensureDongengBooks(books = []) {
  const normalized = books.map((book) => isCeritaRakyatNusantara2(book)
    ? withCeritaRakyatNusantara2Content(book)
    : isDongengBinatang(book)
      ? withDongengBinatangContent(book)
      : isSehariSatuDongeng(book)
        ? withSehariSatuDongengContent(book)
      : isDongengSebelumTidur2(book)
        ? withDongengSebelumTidur2Content(book)
      : book);

  if (!normalized.some(isCeritaRakyatNusantara2)) normalized.push(ceritaRakyatNusantara2Book);
  if (!normalized.some(isDongengBinatang)) normalized.push(dongengBinatangBook);
  if (!normalized.some(isSehariSatuDongeng)) normalized.push(sehariSatuDongengBook);
  if (!normalized.some(isDongengSebelumTidur2)) normalized.push(dongengSebelumTidur2Book);
  return normalized;
}

export const dongengPages = [
  {
    page_number: 1,
    page_title: 'Kancil dan Buaya',
    content:
      'Pada suatu hari, Kancil ingin menyeberangi sungai untuk mencari buah segar di seberang. Di sungai itu tinggal banyak buaya yang sedang berjemur.\n\nKancil tahu ia tidak bisa berenang terlalu jauh. Ia lalu berkata, "Hai Buaya, aku membawa pesan dari raja hutan. Raja ingin menghitung jumlah kalian."\n\nPara buaya merasa bangga. Mereka berbaris dari tepi sungai sampai ke seberang. Kancil melompat dari punggung satu buaya ke buaya lain sambil menghitung dengan suara keras.\n\nSetelah sampai di seberang, Kancil tertawa kecil dan berkata, "Terima kasih, Buaya. Berkat kalian aku bisa menyeberang."\n\nBuaya sadar mereka tertipu, tetapi Kancil sudah berlari jauh. Sejak hari itu, Kancil belajar bahwa akal harus digunakan dengan hati-hati, bukan untuk merugikan orang lain.',
  },
  {
    page_number: 2,
    page_title: 'Timun Mas',
    content:
      'Timun Mas adalah anak baik hati yang tinggal bersama ibunya di sebuah desa. Suatu hari, raksasa datang menagih janji lama dan ingin membawa Timun Mas pergi.\n\nIbunya memberikan beberapa benda ajaib: biji mentimun, jarum, garam, dan terasi. Timun Mas berlari melewati hutan sambil dikejar raksasa.\n\nSaat raksasa hampir menangkapnya, Timun Mas melempar biji mentimun. Seketika tumbuh ladang mentimun yang lebat. Raksasa terhambat, tetapi ia terus mengejar.\n\nTimun Mas melempar jarum, lalu tumbuh hutan bambu tajam. Ia melempar garam, lalu muncul lautan luas. Terakhir, ia melempar terasi, dan tanah berubah menjadi lumpur panas.\n\nRaksasa tenggelam, dan Timun Mas pulang ke pelukan ibunya. Keberanian dan kasih sayang membuatnya selamat.',
  },
  {
    page_number: 3,
    page_title: 'Bawang Merah dan Bawang Putih',
    content:
      'Bawang Putih adalah gadis rajin dan lembut hati. Ia tinggal bersama ibu tiri dan saudara tirinya, Bawang Merah, yang sering menyuruhnya bekerja tanpa henti.\n\nSuatu hari, kain milik ibu tirinya hanyut di sungai. Bawang Putih menyusuri aliran sungai sampai bertemu seorang nenek tua. Nenek itu meminta bantuan membersihkan rumah.\n\nBawang Putih membantu dengan tulus. Sebagai hadiah, nenek memberinya labu kecil. Ketika labu itu dibuka di rumah, isinya penuh perhiasan berkilau.\n\nBawang Merah iri dan meniru perjalanan Bawang Putih, tetapi ia membantu nenek dengan malas dan kasar. Ia memilih labu besar karena serakah.\n\nSaat dibuka, labu itu berisi ular dan hewan berbisa. Bawang Merah menyesal. Dongeng ini mengajarkan bahwa kebaikan hati lebih berharga daripada keserakahan.',
  },
  {
    page_number: 4,
    page_title: 'Keong Mas',
    content:
      'Di sebuah kerajaan, hiduplah seorang putri baik hati. Karena iri hati, seorang penyihir mengubahnya menjadi keong berwarna emas dan membuangnya ke sungai.\n\nSeorang nenek pencari ikan menemukan keong itu dan membawanya pulang. Sejak keong emas tinggal di rumahnya, makanan selalu tersedia setiap kali nenek pulang bekerja.\n\nNenek penasaran. Ia bersembunyi dan melihat seorang putri keluar dari cangkang keong untuk memasak. Nenek menyapa putri itu dengan lembut.\n\nPutri menceritakan kutukan yang menimpanya. Dengan bantuan nenek dan seorang pangeran yang mencarinya, kutukan itu akhirnya hilang.\n\nPutri kembali menjadi manusia. Ia tidak melupakan kebaikan nenek yang telah menolongnya saat tidak ada orang lain peduli.',
  },
  {
    page_number: 5,
    page_title: 'Semut dan Merpati',
    content:
      'Seekor semut jatuh ke sungai saat sedang mencari makan. Air mengalir deras, dan semut hampir tenggelam.\n\nDi atas pohon, seekor merpati melihatnya. Merpati menjatuhkan sehelai daun ke air. Semut naik ke daun itu dan berhasil sampai ke tepi sungai.\n\nBeberapa hari kemudian, seorang pemburu datang membawa ketapel. Ia mengarahkannya ke merpati yang sedang bertengger.\n\nSemut melihat bahaya itu. Ia segera menggigit kaki pemburu. Pemburu terkejut, bidikannya meleset, dan merpati terbang menyelamatkan diri.\n\nMerpati berterima kasih kepada semut. Kebaikan kecil ternyata bisa kembali menjadi pertolongan besar.',
  },
  {
    page_number: 6,
    page_title: 'Pesan dari Buku Dongeng',
    content:
      'Dongeng bukan hanya cerita sebelum tidur. Di dalamnya ada pesan tentang keberanian, kejujuran, kesabaran, dan kebaikan hati.\n\nSetiap tokoh menghadapi masalah dengan cara berbeda. Ada yang memakai akal, ada yang belajar dari kesalahan, dan ada pula yang menang karena tetap berbuat baik.\n\nSaat membaca dongeng, kita belajar membayangkan dunia lain. Kita juga belajar memahami pilihan tokoh dan akibat dari perbuatannya.\n\nItulah sebabnya membaca dongeng bisa membuat hati lebih lembut dan pikiran lebih luas. Satu halaman kecil bisa membuka pintu petualangan yang besar.',
  },
];
