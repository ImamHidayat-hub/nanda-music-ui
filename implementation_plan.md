# Rencana Implementasi: UI/UX Spotify, Drag & Drop Queue, & Refactoring `App.jsx`

Rencana ini telah diperbarui untuk mencakup permintaan khusus Anda: penambahan fitur Shuffle, manajemen Antrean (Up Next) dengan Drag & Drop, perombakan antarmuka menjadi lebih premium, serta penyelesaian masalah *App.jsx* yang obesitas.

## ⚠️ User Review Required
Mohon tinjau rencana *refactoring* raksasa ini. Karena ini akan merombak banyak komponen sekaligus, persetujuan Anda diperlukan sebelum saya mengeksekusinya.

## 1. Fitur Baru: Shuffle (Acak) & Manajemen Antrean (Up Next)
Berdasarkan permintaan Anda dan kebutuhan pasangan Anda:
- **Tombol Shuffle (Mix)**: Akan ditambahkan pada kontrol utama (bersandingan dengan tombol Repeat). Saat diaktifkan, sisa daftar putar akan diacak, namun lagu yang sedang diputar tetap berada di posisinya saat ini.
- **Antarmuka "Up Next" (Antrean)**: Pada mode *Expanded Player*, akan ada tombol khusus untuk membuka laci/layar sekunder yang menampilkan daftar lagu apa saja yang akan diputar selanjutnya.
- **Drag & Drop Rearrangement**: Di dalam layar "Up Next" ini, Anda atau pasangan bisa menekan, menahan, dan menggeser (Drag & Drop) lagu apapun untuk memindahkannya ke atas/bawah, sehingga Anda bisa menentukan lagu apa yang harus diputar persis setelah ini.

## 2. Refactoring Obesitas `App.jsx` (Arsitektur Context)
- **`src/context/PlayerContext.jsx`**: Menangani seluruh State pemutaran, *Queue* (antrean), urutan, *Shuffle*, fungsi *Drag & Drop*, *Volume*, dan pemanggil Audio.
- **`src/context/UIContext.jsx`**: Menangani manajemen *Modal*, *Toast Notification* (Notifikasi mengambang), dan pembukaan panel *Sidebar/Up Next*.
- `App.jsx` akan "diet ketat" dan kembali menjadi kerangka utama murni yang hanya mengatur *Routing* atau *Layouting* tanpa dipenuhi logika internal.

## 3. Peningkatan UI/UX Ekstra (Rekomendasi Tambahan)
Selain tombol tengah yang lebih presisi, ini adalah ide-ide UI/UX tambahan yang akan disuntikkan:
- **Dynamic Glassmorphism Background**: Saat *Expanded Player* terbuka, latar belakangnya tidak hanya gelap polos, melainkan menggunakan bayangan raksasa dari gambar *cover* (Thumbnail) lagu tersebut yang diblurkan secara ekstrem (efek `backdrop-blur-3xl`). Ini persis seperti Spotify dan Apple Music.
- **Animated EQ Icon (Indikator Putar)**: Di daftar lagu utama atau *Up Next*, lagu yang sedang aktif diputar akan memiliki ikon animasi berupa *Equalizer Bar* (grafik batang berjoget) kecil yang menggantikan nomor urut, bukan sekadar teks hijau.
- **Toast Notifications**: Mengganti `showAlert` yang terlalu agresif (menutupi layar) untuk hal-hal sepele. Tindakan seperti "Berhasil masuk ke playlist" atau "Shuffle Nyala" akan memunculkan *Toast* elegan di bawah layar yang otomatis hilang dalam 3 detik.
- **Volume Slider (Desktop)**: Menambahkan pengatur volume suara bagi pengguna PC/Laptop, yang biasanya sangat dibutuhkan.
- **Progress Bar Spotify-style**: Garis waktu yang tipis (2px) dan langsung melebar/menebal serta memunculkan titik kontrol hanya saat jempol/mouse Anda mendekatinya (*hover*).

## Proposed Changes

### Komponen Context
#### [NEW] `src/context/PlayerContext.jsx`
- State: `queue`, `currentSong`, `isPlaying`, `isShuffle`, `volume`, dll.
- Fungsi: `onDragEnd` (Logika geser urutan lagu), `toggleShuffle`, `handleNext`.

#### [NEW] `src/context/UIContext.jsx`
- State: `isQueueOpen` (Buka tutup laci antrean), `toastMessage`.

### Komponen Utama
#### [MODIFY] `src/App.jsx`
- Memindahkan semua keruwetan state ke Context dan hanya merender struktur utama.

#### [MODIFY] `src/components/Player.jsx`
- Menambahkan ikon **Shuffle** dan **Up Next**.
- Memperbaiki tata letak *flex-1* untuk *Absolute Center* pada tombol *Play/Pause*.
- Memasukkan lapisan latar belakang dinamis (*Dynamic Background*) yang terikat dengan gambar *Thumbnail* lagu.

#### [NEW] `src/components/QueueDrawer.jsx`
- Membuat komponen panel baru untuk merender daftar "Up Next".
- Menggunakan HTML5 Native Drag & Drop API (atau library DND ringan yang didukung React) untuk membuat baris lagu bisa ditarik dan digeser sesuka hati.

#### [MODIFY] `src/index.css`
- Menambahkan styling animasi *Equalizer* dan *Progress Bar* tipis.

## Verification Plan
1. **Fungsi Pemutaran & Shuffle**: Memastikan fungsi acak bekerja murni pada antrean selanjutnya, tanpa mengganggu lagu saat ini.
2. **Drag & Drop**: Menggeser lagu di *Up Next*, lalu membiarkan lagu saat ini habis untuk memastikan bahwa pemutar membaca urutan antrean yang baru saja digeser.
3. **Penyempurnaan Antarmuka**: Memastikan *Dynamic Background*, tombol tengah, dan notifikasi *Toast* dirender sempurna di Desktop dan Mobile.
