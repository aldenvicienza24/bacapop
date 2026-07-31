'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import AdminShell from '../../../components/AdminShell';
import {readableTextColor} from '../../../../lib/colorContrast';
import {ConfirmButton, EmptyState} from '../../../components/ui';
import {supabase} from '../../../../lib/supabase';
import styles from '../../../admin.module.css';

const blank = {
  page_number: '',
  page_title: '',
  content: '',
};

export default function BookPages() {
  const {id} = useParams();
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const {data: bookData, error: bookError} = await supabase
      .from('books')
      .select('id,title,author,genres(name,icon,theme_color,accent_color)')
      .eq('id', id)
      .single();

    if (bookError) {
      setError(bookError.message);
      return;
    }

    const {data: pageData, error: pageError} = await supabase
      .from('book_pages')
      .select('*')
      .eq('book_id', id)
      .order('page_number', {ascending: true});

    if (pageError) {
      setError(pageError.message);
      return;
    }

    setBook(bookData);
    setPages(pageData || []);
  }

  useEffect(() => {
    load();
  }, [id]);

  const set = (key, value) => setForm((current) => ({...current, [key]: value}));

  function resetForm() {
    setForm(blank);
    setEditingId('');
    setError('');
  }

  function startEdit(page) {
    setEditingId(page.id);
    setForm({
      page_number: String(page.page_number),
      page_title: page.page_title || '',
      content: page.content || '',
    });
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    const pageNumber = Number(form.page_number);
    const content = form.content.trim();

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      setError('Nomor halaman harus lebih dari 0.');
      return;
    }

    if (!content) {
      setError('Isi halaman wajib diisi.');
      return;
    }

    const duplicate = pages.some((page) => page.page_number === pageNumber && page.id !== editingId);
    if (duplicate) {
      setError('Nomor halaman sudah dipakai di buku ini.');
      return;
    }

    setBusy(true);

    const payload = {
      book_id: id,
      page_number: pageNumber,
      page_title: form.page_title.trim() || null,
      content,
    };

    const result = editingId
      ? await supabase.from('book_pages').update(payload).eq('id', editingId)
      : await supabase.from('book_pages').insert(payload);

    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    resetForm();
    load();
  }

  async function remove(pageId) {
    const {error: removeError} = await supabase.from('book_pages').delete().eq('id', pageId);
    if (removeError) {
      setError(removeError.message);
      return;
    }

    if (editingId === pageId) resetForm();
    load();
  }

  const genre = book?.genres || {};

  return (
    <AdminShell title="Kelola Halaman Buku" subtitle="Atur isi yang tampil pada setiap halaman buku.">
      {error && <div className={styles.error}>{error}</div>}

      {book ? (
        <section className={styles.bookInfo} style={{background: genre.theme_color || '#fff', color: readableTextColor(genre.theme_color)}}>
          <div>
            <span className={styles.badge} style={{background: genre.accent_color || '#ffe05c'}}>
              {genre.icon} {genre.name || 'Tanpa genre'}
            </span>
            <h2>{book.title}</h2>
            <p>{book.author || 'Penulis tidak dicantumkan'}</p>
          </div>
          <Link className={`${styles.button} ${styles.secondary}`} href={`/admin/books/${id}`}>
            Kembali ke Detail
          </Link>
        </section>
      ) : (
        <p>Memuat buku...</p>
      )}

      <div className={styles.pageManager}>
        <form className={`${styles.card} ${styles.form}`} onSubmit={submit}>
          <h2>{editingId ? 'Edit Halaman' : 'Tambah Halaman'}</h2>

          <div className={styles.row}>
            <label className={styles.field}>
              Nomor halaman *
              <input
                className={styles.input}
                type="number"
                min="1"
                value={form.page_number}
                onChange={(event) => set('page_number', event.target.value)}
                required
              />
            </label>

            <label className={styles.field}>
              Judul halaman
              <input
                className={styles.input}
                value={form.page_title}
                onChange={(event) => set('page_title', event.target.value)}
              />
            </label>
          </div>

          <label className={styles.field}>
            Isi halaman *
            <textarea
              className={`${styles.textarea} ${styles.pageTextarea}`}
              value={form.content}
              onChange={(event) => set('content', event.target.value)}
              required
            />
          </label>

          <div className={styles.cardActions}>
            <button className={styles.button} disabled={busy}>
              {busy ? 'Menyimpan...' : editingId ? 'Update Halaman' : 'Simpan Halaman'}
            </button>
            {editingId ? (
              <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={resetForm}>
                Batal Edit
              </button>
            ) : null}
          </div>
        </form>

        <section className={styles.pageList}>
          {pages.length ? (
            pages.map((page) => (
              <article className={styles.pageCard} key={page.id}>
                <div className={styles.pageCardTop}>
                  <span className={styles.pageNumber}>Hal. {page.page_number}</span>
                  <div className={styles.cardActions}>
                    <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => startEdit(page)}>
                      Edit
                    </button>
                    <ConfirmButton message="Yakin ingin menghapus halaman ini?" onConfirm={() => remove(page.id)} />
                  </div>
                </div>

                <h3>{page.page_title || `Halaman ${page.page_number}`}</h3>
                <p className={styles.pagePreview}>
                  {page.content.length > 240 ? `${page.content.slice(0, 240)}...` : page.content}
                </p>
              </article>
            ))
          ) : (
            <EmptyState text="Belum ada halaman. Tambahkan halaman pertama agar buku bisa dibaca user." />
          )}
        </section>
      </div>
    </AdminShell>
  );
}
