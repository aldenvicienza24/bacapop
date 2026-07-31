'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useParams, useRouter} from 'next/navigation';
import AdminShell from '../../components/AdminShell';
import {readableTextColor} from '../../../lib/colorContrast';
import {ConfirmButton, Status} from '../../components/ui';
import {supabase} from '../../../lib/supabase';
import styles from '../../admin.module.css';

export default function Detail() {
  const {id} = useParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const {data, error: bookError} = await supabase
        .from('books')
        .select('*,genres(*)')
        .eq('id', id)
        .single();

      if (bookError) {
        setError(bookError.message);
        return;
      }

      const {count, error: countError} = await supabase
        .from('book_pages')
        .select('id', {count: 'exact', head: true})
        .eq('book_id', id);

      if (countError) {
        setError(countError.message);
        return;
      }

      setBook(data);
      setPageCount(count || 0);
    }

    load();
  }, [id]);

  async function remove() {
    const {error: removeError} = await supabase.from('books').delete().eq('id', id);
    if (removeError) {
      setError(removeError.message);
      return;
    }

    router.replace('/admin/books');
  }

  const genre = book?.genres || {};

  return (
    <AdminShell title="Detail Buku">
      {error && <div className={styles.error}>{error}</div>}
      {!book && !error ? <p>Memuat buku...</p> : null}

      {book ? (
        <article className={`${styles.card} ${styles.detail}`} style={{background: genre.theme_color || '#fff', color: readableTextColor(genre.theme_color)}}>
          <div>
            {book.cover_url ? (
              <img className={styles.cover} src={book.cover_url} alt={`Sampul ${book.title}`} />
            ) : (
              <div className={styles.coverPlaceholder}>{genre.icon || 'B'}</div>
            )}
          </div>

          <div>
            <div className={styles.genreTop}>
              <span className={styles.badge} style={{background: genre.accent_color || '#ffe05c'}}>
                {genre.icon} {genre.name || 'Tanpa genre'}
              </span>
              <Status value={book.status} />
            </div>

            <h2>{book.title}</h2>
            <h3>{book.author || 'Penulis tidak dicantumkan'}</h3>
            <p>{book.description || 'Tidak ada deskripsi.'}</p>
            <p>
              <b>{pageCount}</b> halaman &middot; Dibuat {new Date(book.created_at).toLocaleDateString('id-ID')}
            </p>

            <div className={styles.cardActions}>
              <Link className={`${styles.button} ${styles.secondary}`} href="/admin/books">
                Kembali
              </Link>
              <Link className={styles.button} href={`/admin/books/${id}/edit`}>
                Edit
              </Link>
              <Link className={styles.button} href={`/admin/books/${id}/pages`}>
                Kelola Halaman
              </Link>
              <ConfirmButton message="Yakin ingin menghapus buku ini?" onConfirm={remove} />
            </div>
          </div>
        </article>
      ) : null}
    </AdminShell>
  );
}
