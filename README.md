# JavaScript Playground

Playground JavaScript untuk latihan pemrograman berbasis browser. Proyek menggunakan HTML, CSS, dan JavaScript murni tanpa bundler atau kebutuhan instalasi Node.js.

## Workspace utama

Halaman awal langsung menampilkan **Code Editor** dan **Preview**. Tombol **Jalankan** berada di toolbar editor agar dekat dengan area kerja. Materi dan Tugas tersedia melalui tombol navigasi terpisah di bagian atas. Keduanya sengaja masih kosong sampai kurikulum disiapkan.

### Editor

- CodeMirror 5 dengan syntax highlighting untuk HTML, CSS, dan JavaScript.
- Tab terpisah untuk `index.html`, `style.css`, dan `script.js`.
- Autocomplete/suggestion melalui `Ctrl + Space`, serta suggestion otomatis saat mengetik.
- Auto-close brackets, matching brackets, line numbers, active-line highlight, dan indentasi dua spasi.
- Prettier 3 standalone untuk format HTML, CSS, dan JavaScript.
- Tombol **Format** memformat file aktif tanpa harus menjalankan ulang preview.
- Opsi **Format saat Run** (nonaktif secara default) memformat hanya file yang sedang dibuka sebelum preview dijalankan. Dengan demikian, eksekusi kode tidak harus menunggu Prettier memproses semua file.
- Shortcut format: `Shift + Alt + F`.
- ESLint di browser dengan pemeriksaan `no-undef`, `no-unused-vars`, `no-var`, `prefer-const`, `eqeqeq`, dan sejumlah aturan dasar lain.
- Panel **Problems** menampilkan error/warning dan dapat menavigasikan cursor ke baris terkait.


### Shortcut editor

| Shortcut | Aksi |
|---|---|
| `Ctrl + Enter` | Jalankan kode |
| `Ctrl + Space` | Autocomplete |
| `Ctrl + /` | Comment/uncomment baris atau seleksi |
| `Ctrl + G` | Lompat ke baris |
| `Ctrl + D` | Pilih kemunculan berikutnya dari teks/identifier |
| `Ctrl + L` | Pilih baris aktif |
| `Ctrl + Shift + K` | Hapus baris aktif/seleksi baris |
| `Alt + ↑ / ↓` | Pindahkan baris/seleksi |
| `Shift + Alt + ↑ / ↓` | Duplikasi baris/seleksi |
| `Tab / Shift + Tab` | Indentasi / outdent |
| `Shift + Alt + F` | Format kode |
| `Ctrl + S` | Simpan workspace lokal |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + [` / `Ctrl + ]` | Outdent / indent |

Shortcut memakai tombol Ctrl pada Windows/Linux. Pada macOS, beberapa shortcut memakai Cmd yang juga didukung oleh editor.

### Preview dan Console

- Jalankan kode dengan tombol **Jalankan** atau `Ctrl + Enter`.
- HTML dan CSS membentuk tampilan preview.
- JavaScript dieksekusi di dalam iframe sandbox terpisah.
- Console menampilkan nilai `console.log()` secara langsung tanpa label `LOG`/`RUN`/`DONE`, dengan penanda dan warna berbeda untuk `info`, `warn`, dan `error`.
- Command prompt interaktif menerima perintah JavaScript langsung di runtime Preview yang sedang aktif. Tekan `Enter` untuk menjalankan dan `Shift + Enter` untuk membuat baris baru.
- Riwayat perintah tersedia dengan tombol panah `↑` dan `↓`. Nilai ekspresi, hasil Promise, dan error perintah ditampilkan di Console.
- Autocomplete Console mengenali global JavaScript, keyword, variabel yang dideklarasikan di editor, serta properti umum seperti `console.`, `Math.`, `document.`, `document.body.`, `window.`, dan `localStorage.`. Gunakan `Tab` untuk menerima saran dan panah untuk memilih saran.
- Objek dan array pada console dapat dibuka untuk melihat rincian propertinya; status eksekusi dan durasi ditampilkan terpisah pada toolbar console.
- Console menangkap `log`, `info`, `warn`, `error`, runtime error, dan unhandled promise rejection.
- **Live Environment** menggunakan dua tab: **Preview** dan **Console**. Masing-masing memakai area tampilan yang sama sehingga Preview dapat dilihat penuh tanpa panel Console, dan sebaliknya.
- Console tetap merekam output meskipun tab Console tidak sedang aktif; jumlah output ditampilkan pada badge tab.
- Area log Console memiliki scroll vertikal sendiri; command input dan toolbar tetap terlihat saat output bertambah.

### Penyimpanan

Isi ketiga editor dan tab terakhir disimpan otomatis ke `localStorage`. Penyimpanan hanya berlaku pada browser/perangkat yang sama; belum ada login atau sinkronisasi cloud.

## Materi dan Tugas

Modul pertama adalah **JavaScript Syntax**, diringkas dan diadaptasi dari [W3Schools — JavaScript Syntax](https://www.w3schools.com/js/js_syntax.asp). Materi membahas aturan sintaks dan komentar, values, literals, keywords, variables, identifiers, operators, expressions, case sensitivity, serta camel case.

Tersedia lima tugas praktik dari tingkat dasar hingga menengah. Tombol **Buka di editor** memuat kerangka tugas ke tab JavaScript. Jika editor JavaScript sudah berisi kode, aplikasi meminta konfirmasi sebelum menggantinya. Tombol **Periksa Jawaban** menjalankan pemeriksaan terpisah untuk tiap tugas: variabel dan hasil operasi, tipe nilai dan output, identifier valid, hasil ekspresi, serta case sensitivity dan camel case. Kode diperiksa di Web Worker terpisah dengan batas waktu 1,5 detik. Status dan rincian kriteria yang terpenuhi disimpan di localStorage browser tersebut; belum ada sinkronisasi ke akun guru atau server.

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

- Kode siswa dijalankan pada iframe dengan atribut `sandbox="allow-scripts"` dan Content Security Policy yang membatasi jaringan, objek, dan sumber eksternal. `unsafe-eval` diizinkan hanya di dalam dokumen sandbox untuk mendukung command prompt interaktif; iframe tidak diberi akses same-origin dan koneksi jaringan tetap diblokir.
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
