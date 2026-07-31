'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {supabase} from '../../lib/supabase';
import {defaultGenres} from '../../lib/defaultGenres';
import styles from '../admin.module.css';

const blank = {
  title: '',
  author: '',
  genre_id: '',
  description: '',
  cover_url: '',
  status: 'active',
};

export default function BookForm({id}) {
  const router = useRouter();
  const [form, setForm] = useState(blank);
  const [genres, setGenres] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('genres')
      .select('id,name,icon,is_active')
      .order('name')
      .then(({data}) => setGenres(data || []));

    if (!id) return;

    supabase
      .from('books')
      .select('title,author,genre_id,description,cover_url,status')
      .eq('id', id)
      .single()
      .then(({data, error: loadError}) => {
        if (loadError) {
          setError(loadError.message);
          return;
        }

        setForm({
          title: data.title || '',
          author: data.author || '',
          genre_id: data.genre_id || '',
          description: data.description || '',
          cover_url: data.cover_url || '',
          status: data.status || 'active',
        });
      });
  }, [id]);

  const set = (key, value) => setForm((current) => ({...current, [key]: value}));
  const genreOptions = genres.length ? genres : defaultGenres.map((genre) => ({...genre, id: genre.slug, fallback: true}));

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Judul buku wajib diisi.');
      return;
    }

    if (!form.genre_id) {
      setError('Genre buku wajib dipilih. Kalau pilihan masih mode contoh, buka menu Genre lalu klik Seed Genre Default dulu.');
      return;
    }

    if (!genres.length) {
      setError('Genre database masih kosong. Buka menu Genre lalu klik Seed Genre Default agar buku bisa disimpan.');
      return;
    }

    setBusy(true);

    const payload = {
      title: form.title.trim(),
      author: form.author.trim() || null,
      genre_id: form.genre_id,
      description: form.description.trim() || null,
      cover_url: form.cover_url.trim() || null,
      status: form.status,
    };

    let result;

    if (id) {
      result = await supabase.from('books').update(payload).eq('id', id);
    } else {
      const {data: authData} = await supabase.auth.getUser();
      result = await supabase
        .from('books')
        .insert({...payload, created_by: authData.user?.id || null})
        .select('id')
        .single();
    }

    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push(id ? '/admin/books?success=updated' : `/admin/books/${result.data.id}/pages`);
    router.refresh();
  }

  return (
    <form className={`${styles.card} ${styles.form}`} onSubmit={submit}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.row}>
        <label className={styles.field}>
          Judul buku *
          <input
            className={styles.input}
            value={form.title}
            onChange={(event) => set('title', event.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          Penulis
          <input
            className={styles.input}
            value={form.author}
            onChange={(event) => set('author', event.target.value)}
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          Genre *
          <select
            className={styles.select}
            value={form.genre_id}
            onChange={(event) => set('genre_id', event.target.value)}
            required
          >
            <option value="">Pilih genre</option>
            {genreOptions.map((genre) => (
              <option value={genre.id} key={genre.id} disabled={!genre.is_active && !id}>
                {genre.name}{genre.theme_name ? ` - ${genre.theme_name}` : ''}{genre.fallback ? ' (contoh)' : ''}{!genre.is_active ? ' - nonaktif' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Status
          <select
            className={styles.select}
            value={form.status}
            onChange={(event) => set('status', event.target.value)}
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </label>
      </div>

      {!genres.length && (
        <div className={styles.error}>
          Pilihan genre di atas masih contoh. Masuk ke menu Genre lalu klik Seed Genre Default supaya data genre tersimpan di Supabase.
        </div>
      )}

      <label className={styles.field}>
        Deskripsi
        <textarea
          className={styles.textarea}
          value={form.description}
          onChange={(event) => set('description', event.target.value)}
        />
      </label>

      <label className={styles.field}>
        Cover URL
        <input
          className={styles.input}
          type="url"
          value={form.cover_url}
          onChange={(event) => set('cover_url', event.target.value)}
          placeholder="https://..."
        />
      </label>

      <div className={styles.cardActions}>
        <button className={styles.button} disabled={busy}>
          {busy ? 'Menyimpan...' : 'Simpan Buku'}
        </button>
        <Link className={`${styles.button} ${styles.secondary}`} href="/admin/books">
          Kembali
        </Link>
      </div>
    </form>
  );
}
