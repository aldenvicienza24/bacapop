import {supabase} from './supabase';

const WILDLIFE_COMIC = {
  title: 'Mereka Juga Bertasbih',
  author: 'Yesi Maryam dkk.',
  description: 'Komik edukatif tentang kepedulian terhadap satwa liar, ancaman perdagangan ilegal, dan pentingnya menjaga kehidupan di alam.',
  cover_url: '/images/comic/perdagangan-satwa-liar/page-001.webp',
  pdf_url: '/api/comic/perdagangan-satwa-liar',
  status: 'active',
};

export async function ensureWildlifeComicCatalog() {
  const {data: comicGenre, error: genreError} = await supabase
    .from('genres')
    .select('id')
    .eq('slug', 'komik')
    .eq('is_active', true)
    .maybeSingle();
  if (genreError || !comicGenre?.id) return {book: null, error: genreError || new Error('Genre Komik belum tersedia.')};

  const {data: existing, error: findError} = await supabase
    .from('books')
    .select('id')
    .ilike('title', WILDLIFE_COMIC.title)
    .order('created_at', {ascending: true})
    .limit(1)
    .maybeSingle();
  if (findError) return {book: null, error: findError};

  const payload = {...WILDLIFE_COMIC, genre_id: comicGenre.id};
  const result = existing?.id
    ? await supabase.from('books').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('books').insert(payload).select('id').single();
  if (result.error || !result.data?.id) return {book: null, error: result.error || new Error('Buku gagal disimpan.')};

  const pageRows = Array.from({length: 24}, (_, index) => ({
    book_id: result.data.id,
    page_number: index + 1,
    page_title: index === 0 ? 'Sampul' : `Halaman ${index + 1}`,
    content: `${WILDLIFE_COMIC.pdf_url}#page=${index + 1}`,
  }));
  const {error: pagesError} = await supabase
    .from('book_pages')
    .upsert(pageRows, {onConflict: 'book_id,page_number'});

  return {book: result.data, error: pagesError || null};
}
