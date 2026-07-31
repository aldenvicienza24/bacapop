-- Seed buku dongeng untuk katalog admin BacaPop.
-- Jalankan setelah supabase/sprint2_admin_catalog.sql.

insert into public.genres
  (name, slug, description, theme_name, theme_color, accent_color, icon, is_active)
values
  ('Dongeng', 'dongeng', 'Kumpulan cerita dongeng anak yang ringan, imajinatif, dan cocok untuk latihan membaca.', 'Cerita Anak', '#FFE45E', '#8AE8FF', 'Story', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  theme_name = excluded.theme_name,
  theme_color = excluded.theme_color,
  accent_color = excluded.accent_color,
  icon = excluded.icon,
  is_active = true,
  updated_at = now();

delete from public.books
where title = 'Kumpulan Cerita Dongeng Anak 2';

with inserted_book as (
  insert into public.books
    (genre_id, title, author, description, cover_url, status)
  select
    genres.id,
    'Kumpulan Cerita Dongeng Anak 2',
    'BacaPop Library',
    'Kumpulan cerita dongeng anak yang disusun menjadi halaman bacaan digital.',
    '/images/dongeng/kumpulan-cerita-dongeng-anak-2.png',
    'active'
  from public.genres
  where genres.slug = 'dongeng'
  returning id
)
insert into public.book_pages
  (book_id, page_number, page_title, content)
select id, 1, 'Kancil dan Buaya',
'Pada suatu hari, Kancil ingin menyeberangi sungai untuk mencari buah segar di seberang. Di sungai itu tinggal banyak buaya yang sedang berjemur.

Kancil tahu ia tidak bisa berenang terlalu jauh. Ia lalu berkata, "Hai Buaya, aku membawa pesan dari raja hutan. Raja ingin menghitung jumlah kalian."

Para buaya merasa bangga. Mereka berbaris dari tepi sungai sampai ke seberang. Kancil melompat dari punggung satu buaya ke buaya lain sambil menghitung dengan suara keras.

Setelah sampai di seberang, Kancil tertawa kecil dan berkata, "Terima kasih, Buaya. Berkat kalian aku bisa menyeberang."

Buaya sadar mereka tertipu, tetapi Kancil sudah berlari jauh. Sejak hari itu, Kancil belajar bahwa akal harus digunakan dengan hati-hati, bukan untuk merugikan orang lain.' from inserted_book
union all
select id, 2, 'Timun Mas',
'Timun Mas adalah anak baik hati yang tinggal bersama ibunya di sebuah desa. Suatu hari, raksasa datang menagih janji lama dan ingin membawa Timun Mas pergi.

Ibunya memberikan beberapa benda ajaib: biji mentimun, jarum, garam, dan terasi. Timun Mas berlari melewati hutan sambil dikejar raksasa.

Saat raksasa hampir menangkapnya, Timun Mas melempar biji mentimun. Seketika tumbuh ladang mentimun yang lebat. Raksasa terhambat, tetapi ia terus mengejar.

Timun Mas melempar jarum, lalu tumbuh hutan bambu tajam. Ia melempar garam, lalu muncul lautan luas. Terakhir, ia melempar terasi, dan tanah berubah menjadi lumpur panas.

Raksasa tenggelam, dan Timun Mas pulang ke pelukan ibunya. Keberanian dan kasih sayang membuatnya selamat.' from inserted_book
union all
select id, 3, 'Bawang Merah dan Bawang Putih',
'Bawang Putih adalah gadis rajin dan lembut hati. Ia tinggal bersama ibu tiri dan saudara tirinya, Bawang Merah, yang sering menyuruhnya bekerja tanpa henti.

Suatu hari, kain milik ibu tirinya hanyut di sungai. Bawang Putih menyusuri aliran sungai sampai bertemu seorang nenek tua. Nenek itu meminta bantuan membersihkan rumah.

Bawang Putih membantu dengan tulus. Sebagai hadiah, nenek memberinya labu kecil. Ketika labu itu dibuka di rumah, isinya penuh perhiasan berkilau.

Bawang Merah iri dan meniru perjalanan Bawang Putih, tetapi ia membantu nenek dengan malas dan kasar. Ia memilih labu besar karena serakah.

Saat dibuka, labu itu berisi ular dan hewan berbisa. Bawang Merah menyesal. Dongeng ini mengajarkan bahwa kebaikan hati lebih berharga daripada keserakahan.' from inserted_book
union all
select id, 4, 'Keong Mas',
'Di sebuah kerajaan, hiduplah seorang putri baik hati. Karena iri hati, seorang penyihir mengubahnya menjadi keong berwarna emas dan membuangnya ke sungai.

Seorang nenek pencari ikan menemukan keong itu dan membawanya pulang. Sejak keong emas tinggal di rumahnya, makanan selalu tersedia setiap kali nenek pulang bekerja.

Nenek penasaran. Ia bersembunyi dan melihat seorang putri keluar dari cangkang keong untuk memasak. Nenek menyapa putri itu dengan lembut.

Putri menceritakan kutukan yang menimpanya. Dengan bantuan nenek dan seorang pangeran yang mencarinya, kutukan itu akhirnya hilang.

Putri kembali menjadi manusia. Ia tidak melupakan kebaikan nenek yang telah menolongnya saat tidak ada orang lain peduli.' from inserted_book
union all
select id, 5, 'Semut dan Merpati',
'Seekor semut jatuh ke sungai saat sedang mencari makan. Air mengalir deras, dan semut hampir tenggelam.

Di atas pohon, seekor merpati melihatnya. Merpati menjatuhkan sehelai daun ke air. Semut naik ke daun itu dan berhasil sampai ke tepi sungai.

Beberapa hari kemudian, seorang pemburu datang membawa ketapel. Ia mengarahkannya ke merpati yang sedang bertengger.

Semut melihat bahaya itu. Ia segera menggigit kaki pemburu. Pemburu terkejut, bidikannya meleset, dan merpati terbang menyelamatkan diri.

Merpati berterima kasih kepada semut. Kebaikan kecil ternyata bisa kembali menjadi pertolongan besar.' from inserted_book
union all
select id, 6, 'Pesan dari Buku Dongeng',
'Dongeng bukan hanya cerita sebelum tidur. Di dalamnya ada pesan tentang keberanian, kejujuran, kesabaran, dan kebaikan hati.

Setiap tokoh menghadapi masalah dengan cara berbeda. Ada yang memakai akal, ada yang belajar dari kesalahan, dan ada pula yang menang karena tetap berbuat baik.

Saat membaca dongeng, kita belajar membayangkan dunia lain. Kita juga belajar memahami pilihan tokoh dan akibat dari perbuatannya.

Itulah sebabnya membaca dongeng bisa membuat hati lebih lembut dan pikiran lebih luas. Satu halaman kecil bisa membuka pintu petualangan yang besar.' from inserted_book;
