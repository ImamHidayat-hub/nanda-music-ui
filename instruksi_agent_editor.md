# Instruksi Perbaikan Bug (Untuk Agent Code Editor)

Tugas Anda adalah menerapkan perbaikan performa dan logika pada tiga file di bawah ini secara tepat. Perbaikan ini akan mengatasi masalah *UI Freeze* (stuttering pada audio), *Network Timeout*, dan *Queue Mismatch* tanpa memodifikasi fitur di luar skop. Lakukan dengan hati-hati!

---

## 1. Perbaiki Memory Leak di `src/hooks/useSultanMode.js`
**Target File**: `src/hooks/useSultanMode.js`
**Masalah**: Blok `useEffect` pada bagian "OTAK WALKIE-TALKIE 2" tidak memiliki *dependency array* (`[]`), sehingga pendengar `socket.on` dipasang dan dicabut berulang-ulang setiap kali komponen utama di-render (sekitar 4x per detik saat indikator lagu berjalan). Ini memicu *UI Freeze* yang menyebabkan *audio stuttering*.

**Langkah Perbaikan**:
1. Buat sebuah `useRef` (tambahkan import `useRef` dari `react` di atas) di dalam fungsi `useSultanMode` untuk menyimpan fungsi-fungsi *callback* dan *state* terbaru:
   ```javascript
   const refs = useRef({ playSong, handleNext, handlePrev, setCurrentSong, setIsPlaying, setProgress, isRemoteMode });
   ```
2. Buat `useEffect` kecil tepat di bawahnya yang tugasnya hanya memperbarui nilai `.current` dari referensi tersebut pada setiap *render* berjalan:
   ```javascript
   useEffect(() => {
     refs.current = { playSong, handleNext, handlePrev, setCurrentSong, setIsPlaying, setProgress, isRemoteMode };
   });
   ```
3. Cari blok `useEffect` untuk `handleCommand` dan `handleUpdate`. Di dalam kedua fungsi tersebut, ambil fungsi dan state yang diperlukan dengan memanggil `refs.current.xxx` (Contoh: `refs.current.handleNext()`).
4. **PENTING:** Hapus komentar pengabaian eslint (`// eslint-disable-next-line react-hooks/exhaustive-deps`) dan komentar *"RAHASIA NEGARA"* di bagian bawah efek tersebut.
5. **PENTING:** Tambahkan *dependency array* kosong `[]` pada akhir blok `useEffect` tersebut agar efeknya hanya berjalan satu kali saja (saat *mount*).

---

## 2. Perbaiki Logika Sinkronisasi Queue di `src/App.jsx`
**Target File**: `src/App.jsx`
**Masalah**: Terdapat blok `useEffect` berlabel `PENYEGERAKAN AUTO-BARISAN (BUG 3 KILLER)`. Saat ini, blok tersebut langsung menimpa urutan pemutaran (`queue`) secara buta jika panjangnya berbeda dengan playlist yang sedang dilihat (berdasarkan `activeMenu`), meskipun pengguna sedang asyik memutar lagu dari daftar lain (misalnya dari halaman *Search*). Hal ini menyebabkan lagu loncat secara acak (*skip*).

**Langkah Perbaikan**:
1. Cari blok `useEffect` yang memiliki label "PENYEGERAKAN AUTO-BARISAN".
2. Ganti blok logika di dalamnya dengan kode di bawah ini. Kode ini lebih aman karena memastikan *queue* HANYA diperbarui JIKA `currentSong` benar-benar eksis (`!== -1`) di dalam playlist tersebut.
   ```javascript
   // 🔥 PENYEGERAKAN AUTO-BARISAN (BUG 3 KILLER) 🔥
   useEffect(() => {
     if (currentSong && activeMenu !== 'home' && activeMenu !== 'search') {
       const updatedPlaylist = playlists[activeMenu];
       if (updatedPlaylist) {
         // Cek apakah lagu yang lagi jalan beneran ada di playlist ini
         const currentSongIndex = updatedPlaylist.findIndex(s => s.id === currentSong.id);
         
         // HANYA update queue jika lagu saat ini benar-benar ada di dalam playlist yang sedang dilihat 
         if (currentSongIndex !== -1 && updatedPlaylist.length !== queue.length) {
           setQueue(updatedPlaylist);
           setCurrentIndex(currentSongIndex);
         }
       }
     }
   }, [playlists]); 
   ```

---

## 3. Tingkatkan Garbage Collection Backend di `backend/server-musik.js`
**Target File**: `backend/server-musik.js`
**Masalah**: Sistem menghapus *cache buffer* lagu dari RAM jika tidak ada aktivitas (*idle*) selama 5 menit. Jika pengguna menjeda lagu dan pergi ke toilet (lebih dari 5 menit), saat lagu dilanjutkan, lagu akan terdiam lama karena backend membuang lagunya dari RAM dan terpaksa melakukan pengunduhan file ulang dari awal.

**Langkah Perbaikan**:
Cari fungsi `getAudioBuffer(vidId)` di dalam file tersebut.
Temukan pendefinisian objek `setTimeout` yang memiliki tugas membuang RAM.
```javascript
        timer: setTimeout(() => {
            audioBufferCache.delete(vidId);
            console.log(`[GC] 🧹 Membuang buffer RAM untuk ID: ${vidId} (Idle 5 Menit)`);
        }, 5 * 60 * 1000)
```
1. Ubah pengali milidetik `5 * 60 * 1000` menjadi `30 * 60 * 1000` (mengubah dari 5 menit menjadi 30 menit).
2. Sesuaikan pesan `console.log` dari `(Idle 5 Menit)` menjadi `(Idle 30 Menit)`.
3. **PENTING:** Kode `timer: setTimeout` tersebut dipanggil sebanyak **2 kali** di dalam fungsi `getAudioBuffer` (yang pertama di dalam baris pengecekan `.has()`, dan yang kedua pada pembuatan `cacheEntry`). Pastikan Anda **mengubah batas waktunya di kedua tempat tersebut!**

---
*(Instruksi Selesai - Agen editor harap mereviu kode dan mengeksekusi dengan presisi.)*
