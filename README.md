# JavaScript Playground

Playground JavaScript untuk latihan pemrograman berbasis browser. Proyek menggunakan HTML, CSS, dan JavaScript murni tanpa bundler atau kebutuhan instalasi Node.js.

## Workspace utama

Halaman awal langsung menampilkan **Code Editor** dan **Preview**. Materi dan Tugas tersedia melalui tombol navigasi terpisah di bagian atas. Keduanya sengaja masih kosong sampai kurikulum disiapkan.

### Editor

- CodeMirror 5 dengan syntax highlighting untuk HTML, CSS, dan JavaScript.
- Tab terpisah untuk `index.html`, `style.css`, dan `script.js`.
- Autocomplete/suggestion melalui `Ctrl + Space`, serta suggestion otomatis saat mengetik.
- Auto-close brackets, matching brackets, line numbers, active-line highlight, dan indentasi dua spasi.
- Prettier 3 standalone untuk format HTML, CSS, dan JavaScript.
- Tombol **Format** memformat file aktif.
- Opsi **Format saat Run** (aktif secara default) memformat seluruh file sebelum preview dijalankan.
- Shortcut format: `Shift + Alt + F`.
- ESLint di browser dengan pemeriksaan `no-undef`, `no-unused-vars`, `no-var`, `prefer-const`, `eqeqeq`, dan sejumlah aturan dasar lain.
- Panel **Problems** menampilkan error/warning dan dapat menavigasikan cursor ke baris terkait.

### Preview dan Console

- Jalankan kode dengan tombol **Jalankan** atau `Ctrl + Enter`.
- HTML dan CSS membentuk tampilan preview.
- JavaScript dieksekusi di dalam iframe sandbox terpisah.
- Console menangkap `log`, `info`, `warn`, `error`, runtime error, dan unhandled promise rejection.
- Console dapat dibuka/tutup dan dibersihkan.

### Penyimpanan

Isi ketiga editor dan tab terakhir disimpan otomatis ke `localStorage`. Penyimpanan hanya berlaku pada browser/perangkat yang sama; belum ada login atau sinkronisasi cloud.

## Materi dan Tugas

Materi dan tugas belum ditambahkan. Tombol **Materi** dan **Tugas** menampilkan empty state. Array data tugas di `app.js` juga masih kosong.

## Menjalankan

1. Clone atau unduh repository.
2. Buka `index.html` dengan browser modern.
3. Untuk pengalaman terbaik, jalankan melalui VS Code Live Server atau static hosting seperti GitHub Pages.

Tidak perlu menjalankan `npm install`, build command, atau backend.

## Dependency browser

Library dimuat dari CDN dan versinya dipatok di `index.html`:

- CodeMirror 5.65.21 — editor, mode bahasa, autocomplete, dan lint gutter.
- Prettier 3.10.1 — formatting HTML/CSS/JavaScript melalui standalone browser build.
- eslint-linter-browserify 10.14.0 — ESLint `Linter` bundle untuk browser.

Koneksi internet diperlukan agar library CDN dapat dimuat. Jika CDN gagal dimuat, editor canggih, formatter, autocomplete, atau linting bisa tidak tersedia.

## Catatan ESLint

ESLint saat ini berjalan di browser untuk file JavaScript aktif. Aturan yang digunakan berfokus pada kesalahan umum dan praktik dasar, bukan konfigurasi ESLint proyek production yang lengkap. Hasil lint adalah bantuan belajar; hasilnya bukan pengganti pengujian program.

## Keamanan dan batasan preview

- Kode siswa dijalankan pada iframe dengan atribut `sandbox="allow-scripts"` dan Content Security Policy yang membatasi jaringan, objek, dan sumber eksternal.
- Preview bukan lingkungan eksekusi publik yang sepenuhnya aman. Jangan menerima dan menjalankan kode dari pengguna anonim tanpa isolasi tambahan.
- Kode sinkron yang tidak pernah berhenti, misalnya `while (true) {}`, dapat membuat tab browser tidak responsif. Jangan menguji infinite loop pada browser utama.
- Kode, nama, dan progres tidak dikirim ke server. Semua penyimpanan workspace berada di browser lokal.

## Struktur

```text
javascript/
├── index.html
├── style.css
├── app.js
└── README.md
```
