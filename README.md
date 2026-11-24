# JavaScript Playground

Playground JavaScript berbasis HTML, CSS, dan JavaScript murni. Proyek ini dibuat sebagai kerangka awal; daftar materi dan tugas sengaja dikosongkan.

## Fitur saat ini

- Editor terpisah untuk `index.html`, `style.css`, dan `script.js`.
- Preview HTML/CSS di dalam iframe sandbox.
- Eksekusi JavaScript melalui tombol **Jalankan** atau `Ctrl + Enter`.
- Console untuk `log`, `info`, `warn`, `error`, error runtime, dan unhandled promise rejection.
- Penyimpanan isi editor secara otomatis menggunakan `localStorage`.
- Tombol untuk membersihkan console dan mengosongkan semua editor.
- Antarmuka responsif untuk desktop, tablet, dan ponsel.
- Tidak membutuhkan Node.js, React, bundler, atau instalasi package.

## Menjalankan secara lokal

1. Unduh atau clone repository.
2. Buka `index.html` menggunakan browser modern.
3. Tulis HTML/CSS/JavaScript pada tab editor.
4. Tekan **Jalankan** atau `Ctrl + Enter`.

Bisa juga dijalankan menggunakan Live Server pada VS Code.

## Materi dan tugas

Belum ada materi atau tugas yang ditambahkan. Area **Materi & Tugas** masih berupa empty state dan siap diisi kemudian.

## Struktur file

```text
javascript-playground/
├── index.html
├── style.css
├── app.js
└── README.md
```

## Catatan teknis dan keamanan

- Kode siswa dijalankan pada iframe dengan atribut `sandbox="allow-scripts"` dan Content Security Policy yang membatasi akses jaringan, objek, dan sumber eksternal.
- Ini adalah playground pembelajaran untuk kode yang ditulis siswa, bukan lingkungan eksekusi kode publik yang sepenuhnya aman. Jangan gunakan untuk menjalankan kode yang tidak tepercaya dari pengguna anonim tanpa isolasi tambahan. Eksekusi sinkron yang tidak berhenti (misalnya `while (true) {}`) dapat membuat tab browser tidak responsif; jangan menguji infinite loop pada browser utama.
- Browser dapat membatasi kemampuan tertentu ketika `index.html` dibuka langsung melalui `file://`. Live Server atau static hosting disarankan untuk pengalaman yang konsisten.
- Kode dan workspace tersimpan di `localStorage` browser saat ini; belum ada login, sinkronisasi cloud, backend, ataupun dashboard guru.
