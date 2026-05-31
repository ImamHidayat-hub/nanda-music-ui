require('dotenv').config();
const ngrok = require('@ngrok/ngrok');
const localtunnel = require('localtunnel'); // Taruh di baris 1 atau 2
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const cors = require('cors');
const ytSearch = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const https = require('https'); // Kita pake Tank lagi lerr
const fetch = require('isomorphic-unfetch');
const http = require('http');
const { Server } = require('socket.io');
const { getTracks } = require('spotify-url-info')(fetch);

// ==========================================
// 🔥 PEMBAJAK CONSOLE LOG (AUTO TIMESTAMP) 🔥
// ==========================================
const originalLog = console.log;
const originalError = console.error;

// Fungsi buat ngambil jam sekarang (WIB - Waktu Indonesia Bucin)
const getTimestamp = () => {
  const sekarang = new Date();
  // Format ala hacker: [DD/MM/YYYY, HH:MM:SS]
  return `[${sekarang.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}]`;
};

// Timpa console.log bawaan
console.log = function (...args) {
  originalLog(getTimestamp(), ...args);
};

// Timpa console.error bawaan
console.error = function (...args) {
  originalError(getTimestamp(), ...args);
};

const app = express();
// 🔥 BIKIN SERVER HTTP BARENG SOCKET.IO V1.7 🔥
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Biar HP/PC lu kaga diblokir pas nelpon
        methods: ["GET", "POST"]
    }
});

// 🔥 LOGIKA MESIN WALKIE-TALKIE SULTAN 🔥
io.on('connection', (socket) => {
    console.log(`📡 [SOCKET] Ada yang nyambung lerr! ID: ${socket.id}`);

    // 1. Pas PC/HP masuk bawa Username (Biar Room-nya Kunci-kuncian)
    socket.on('join_room', ({ username, role }) => {
        socket.join(username); // Masukin ke kamar khusus sesuai nama akun lu!
        console.log(`🔑 [SOCKET] ${role.toUpperCase()} masuk ke room: ${username}`);
        
        // Kalo PC lu (Host) yang masuk, server bakal teriak ke HP: "Woy, TV udah nyala!"
        if (role === 'host') {
            socket.to(username).emit('host_online', { message: 'PC Siap Menerima Perintah!' });
        }
    });

    // 2. Pas HP (Remote) ngasih perintah ke PC (Play, Pause, Next)
    socket.on('remote_command', ({ username, command, data }) => {
        console.log(`📱 [SOCKET] HP ngirim perintah [${command}] ke PC lu!`);
        // Server lempar pesannya ke PC yang ada di room lu
        socket.to(username).emit('execute_command', { command, data });
    });

    // 3. Pas PC ngasih tau status lagunya (Biar UI HP lu ikut nyala/update detiknya)
    socket.on('host_status', ({ username, status }) => {
        // Server lempar balik status dari PC ke HP lu
        socket.to(username).emit('update_remote_ui', status);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 [SOCKET] Ada perangkat yang putus koneksi: ${socket.id}`);
    });
});
const PORT = process.env.PORT || 3527;

function resolveDenoBinary() {
    const envPath = process.env.DENO_BIN;
    if (envPath && fs.existsSync(envPath)) return envPath;
    const home = process.env.HOME || '';
    const candidates = [
        `${home}/.deno/bin/deno`,
        '/root/.deno/bin/deno',
        '/usr/local/bin/deno',
    ];
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
}

app.use(cors());
app.use(express.json());

// ==========================================
// ENDPOINT 1: SEARCH ENGINE (Udah Support Halaman/Load More)
// ==========================================
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const page = parseInt(req.query.page) || 1; // Ambil nomor halaman (default 1)
        if (!query) return res.status(400).json({ error: 'Keyword kosong!' });

        console.log(`🔍 Nyari: ${query} (Halaman ${page})`);
        const r = await ytSearch(query + ' official audio');
        
        // yt-search biasanya dapet ~40-50 lagu. Kita potong 10 per halaman.
        const startIndex = (page - 1) * 10;
        const endIndex = page * 10;
        const videos = r.videos.slice(startIndex, endIndex);

        const cleanResults = videos.map(v => ({
            id: v.videoId,
            title: v.title,
            artist: v.author.name,
            duration: v.timestamp,
            thumbnail: v.thumbnail
        }));

        // Kasih tau frontend kalo masih ada sisa lagu di halaman berikutnya
        const hasMore = r.videos.length > endIndex;

        res.json({ success: true, data: cleanResults, hasMore });
    } catch (error) {
        console.error('❌ Error search:', error);
        res.status(500).json({ error: 'Gagal nyari lagu' });
    }
});

// ==========================================
// SISTEM DATABASE JSON (Users & Multi-Playlist)
// ==========================================
const DB_FILE = './database.json';

// Fungsi asisten buat baca/tulis JSON + AUTO-MIGRASI DATA LAMA
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    let db = JSON.parse(data);

    // AUTO-MIGRASI JURUS DEWA: 
    // Kalau ada user lama yang pake format laci jadul, kita buatin lemari baru!
    for (let user in db.users) {
        if (db.users[user].playlist && !db.users[user].playlists) {
            db.users[user].playlists = {
                "Liked Songs": db.users[user].playlist // Pindahin lagu lama ke folder Liked Songs
            };
            delete db.users[user].playlist; // Bakar laci lama
        }
    }
    return db;
};

const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// 1. ENDPOINT LOGIN / AUTO-REGISTER
app.post('/api/login', (req, res) => {
    const { username, pin } = req.body;
    if (!username || !pin) return res.status(400).json({ error: 'Username dan PIN wajib diisi lerr!' });

    const db = readDB();
    const user = db.users[username];

    if (user) {
        if (user.pin !== pin) return res.status(401).json({ error: 'PIN salah anjir, lu siapa?!' });
        writeDB(db); // Save hasil migrasi kalau ada
        console.log(`👤 ${username} berhasil login!`);
        return res.json({ success: true, message: 'Login berhasil!', playlists: user.playlists });
    } else {
        // User baru langsung dikasih lemari yang isinya laci "Liked Songs" default
        db.users[username] = {
            pin: pin,
            playlists: {
                "Liked Songs": [] 
            }
        };
        writeDB(db);
        console.log(`🎉 Akun baru dibikin buat: ${username}`);
        return res.json({ success: true, message: 'Akun baru berhasil dibuat!', playlists: db.users[username].playlists });
    }
});

// 2. ENDPOINT AMBIL SEMUA PLAYLIST
app.get('/api/playlists/:username', (req, res) => {
    const { username } = req.params;
    const db = readDB();
    if (!db.users[username]) return res.status(404).json({ error: 'User nggak ketemu' });
    
    res.json({ success: true, playlists: db.users[username].playlists });
});

// 3. ENDPOINT BIKIN FOLDER PLAYLIST BARU (Galau, Pop Punk, dll)
app.post('/api/playlists/:username/create', (req, res) => {
    const { username } = req.params;
    const { playlistName } = req.body;
    const db = readDB();
    
    if (!db.users[username]) return res.status(404).json({ error: 'User nggak ketemu' });
    if (db.users[username].playlists[playlistName]) return res.status(400).json({ error: 'Nama playlist udah ada sayang, ganti yang lain ya!' });

    db.users[username].playlists[playlistName] = []; // Bikin laci kosong baru
    writeDB(db);
    console.log(`📁 Playlist baru "${playlistName}" dibikin buat ${username}`);
    
    res.json({ success: true, playlists: db.users[username].playlists });
});

// 4. ENDPOINT MASUKIN LAGU KE FOLDER TERTENTU
app.post('/api/playlists/:username/:playlistName', (req, res) => {
    const { username, playlistName } = req.params;
    const song = req.body; 
    const db = readDB();

    if (!db.users[username]) return res.status(404).json({ error: 'User nggak ketemu' });
    if (!db.users[username].playlists[playlistName]) return res.status(404).json({ error: 'Playlist nggak ketemu' });

    // Cek biar nggak dobel di folder yang sama
    const isExist = db.users[username].playlists[playlistName].some(s => s.id === song.id);
    if (!isExist) {
        db.users[username].playlists[playlistName].push(song);
        writeDB(db);
        console.log(`🎵 Lagu ${song.title} masuk ke folder [${playlistName}] punya ${username}`);
    }

    res.json({ success: true, playlists: db.users[username].playlists });
});

// ==========================================
// 5. ENDPOINT HAPUS FOLDER (Wajib di atas hapus lagu biar nggak bentrok!)
// ==========================================
app.delete('/api/playlists/:username/:playlistName/delete-folder', (req, res) => {
    const { username, playlistName } = req.params;
    const db = readDB();

    if (!db.users[username]) return res.status(404).json({ error: 'User nggak ketemu' });
    if (playlistName === "Liked Songs") return res.status(400).json({ error: 'Folder Liked Songs nggak boleh dihapus sayang!' });

    delete db.users[username].playlists[playlistName];
    writeDB(db);
    console.log(`🗑️ Folder [${playlistName}] punya ${username} udah dibakar!`);

    res.json({ success: true, playlists: db.users[username].playlists });
});

// ==========================================
// 6. ENDPOINT HAPUS 1 LAGU
// ==========================================
app.delete('/api/playlists/:username/:playlistName/:songId', (req, res) => {
    const { username, playlistName, songId } = req.params;
    const db = readDB();

    if (db.users[username] && db.users[username].playlists[playlistName]) {
        db.users[username].playlists[playlistName] = db.users[username].playlists[playlistName].filter(s => s.id !== songId);
        writeDB(db);
        console.log(`🗑️ Lagu dihapus dari [${playlistName}]`);
    }
    res.json({ success: true, playlists: db.users[username].playlists });
});


app.post('/api/playlists/:username/:playlistName/import', async (req, res) => {
    const { username, playlistName } = req.params;
    const { url } = req.body;
    
    // Langsung jawab biar cewek lu nggak nunggu loading!
    res.json({ success: true, message: 'Pesanan diterima! Import jalan di background.' });

    // --- PROSES BACKGROUND JALAN DIEM-DIEM ---
    // --- PROSES BACKGROUND JALAN DIEM-DIEM ---
    (async () => {
        try {
            let songsToAdd = [];

            // 1. KALO LINK YOUTUBE (TETEP SAMA)
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const listIdMatch = url.match(/[?&]list=([^&]+)/);
                if (listIdMatch) {
                    console.log(`🔎 Nyedot playlist YouTube: ${listIdMatch[1]}`);
                    const playlist = await ytSearch({ listId: listIdMatch[1] });
                    if (playlist && playlist.videos) {
                        songsToAdd = playlist.videos.map(v => ({
                            id: v.videoId,
                            title: v.title,
                            artist: v.author.name,
                            thumbnail: v.thumbnail,
                            searchQuery: null // YouTube nggak butuh dicari ulang
                        }));
                    }
                }
            } 
            // 2. KALO LINK SPOTIFY 🔥 (JALUR NINJA)
            else if (url.includes('spotify.com/playlist/')) {
                console.log(`🕵️‍♂️ Menyamar dan narik judul dari Spotify...`);
                try {
                    // Narik mentahan teks judul lagu dari web Spotify
                    const tracks = await getTracks(url);
                    
                    if (tracks && tracks.length > 0) {
                        console.log(`✅ Berhasil nyolong ${tracks.length} judul dari Spotify!`);
                        // Kita catet dulu nama lagu + artisnya buat dicari di YouTube nanti
                        songsToAdd = tracks.map(track => {
                            // TRIK NINJA LEVEL 2: Ubrak-abrik semua laci data Spotify buat nyari artis!
                            let artis = 'Unknown Artist';
                            if (track.artists && Array.isArray(track.artists) && track.artists.length > 0) {
                                artis = track.artists.map(a => a.name).join(', ');
                            } else if (track.artist) {
                                artis = typeof track.artist === 'string' ? track.artist : (track.artist.name || 'Unknown Artist');
                            } else if (track.subtitle) {
                                artis = track.subtitle; // Kadang disembunyiin di sini sama Spotify
                            }

                            // Jangan biarin kata "Unknown Artist" masuk ke YouTube, nanti dikasih lagu aneh!
                            const queryArtis = artis !== 'Unknown Artist' ? artis : '';
                            const judulLengkap = `${track.name} ${queryArtis} official audio`.trim();

                            return {
                                id: null, 
                                title: track.name,
                                artist: artis,
                                // Cari gambar di segala pojokan data juga
                                thumbnail: (track.album && track.album.images && track.album.images.length > 0) ? track.album.images[0].url : (track.coverArt?.sources?.[0]?.url || ''),
                                searchQuery: judulLengkap 
                            };
                        });
                    }
                } catch (spoError) {
                    console.error("❌ Gagal nembus Spotify:", spoError.message);
                }
            }

            // --- EKSEKUSI PEMASUKAN KE DATABASE ---
            if (songsToAdd.length > 0) {
                console.log(`🚀 Mulai import ${songsToAdd.length} lagu buat ${username}...`);
                
                for (let i = 0; i < songsToAdd.length; i++) {
                    let songData = songsToAdd[i];
                    
                    // KALAU DARI SPOTIFY: Kita harus nyuruh yt-search nyari ID YouTube-nya dulu
                    if (songData.searchQuery) {
                        console.log(`🔍 [${i+1}/${songsToAdd.length}] Nyari ID YT buat: ${songData.searchQuery}`);
                        const searchResult = await ytSearch(songData.searchQuery);
                        if (searchResult && searchResult.videos.length > 0) {
                            // Ambil hasil pencarian paling atas
                            const topResult = searchResult.videos[0];
                            songData.id = topResult.videoId;
                            
                            // 🔥 FIX NYA DI SINI LERR: TIMPA PAKE DATA YOUTUBE! 🔥
                            songData.thumbnail = topResult.thumbnail; // Ambil gambar dari YouTube
                            
                            // Kalau artisnya nggak dapet dari Spotify, pake nama channel YouTube-nya
                            if (songData.artist === 'Unknown Artist') {
                                songData.artist = topResult.author.name; 
                            }
                        } else {
                            console.log(`❌ Waduh, lagu ${songData.title} nggak ketemu di YT! Di-skip.`);
                            continue; // Skip lagu ini, lanjut ke lagu berikutnya
                        }
                    }

                    // MASUKIN KE DATABASE (Sama kayak tadi)
                    if (songData.id) {
                        let db = readDB(); 
                        if (db.users[username] && db.users[username].playlists[playlistName]) {
                            const isExist = db.users[username].playlists[playlistName].some(s => s.id === songData.id);
                            if (!isExist) {
                                // Buang searchQuery biar nggak nyampah di database
                                delete songData.searchQuery;
                                db.users[username].playlists[playlistName].push(songData);
                                writeDB(db);
                                console.log(`✅ Masuk: ${songData.title} (${songData.id})`);
                            } else {
                                console.log(`⏭️ Skip: ${songData.title} (Udah ada di folder)`);
                            }
                        }
                    }

                    // JEDA 10 DETIK BIAR SATPAM GOOGLE NGGAK MARAH!
                    if (i < songsToAdd.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
                console.log(`🎉 IMPORT PLAYLIST ${playlistName} SELESAI TOTAL!`);
            } else {
                 console.log("Yah, nggak ada lagu yang bisa di-import.");
            }
        } catch (error) {
            console.error("Error pas background import:", error);
        }
    })();
});

// ==========================================
// SISTEM CACHE MEMORI RAM (Global Buffer)
// ==========================================
const audioBufferCache = new Map();
const cooldownList = new Map(); // 🔥 V1.4: Buku tilang satpam YouTube
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getAudioBuffer(vidId) {
    if (audioBufferCache.has(vidId)) {
        const cacheEntry = audioBufferCache.get(vidId);
        clearTimeout(cacheEntry.timer);
        cacheEntry.timer = setTimeout(() => {
            audioBufferCache.delete(vidId);
            console.log(`[GC] 🧹 Membuang buffer RAM untuk ID: ${vidId} (Idle 30 Menit)`);
        }, 30 * 60 * 1000);
        return cacheEntry.promise;
    }

    let resolvePromise, rejectPromise;
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    const cacheEntry = {
        promise,
        timer: setTimeout(() => {
            audioBufferCache.delete(vidId);
            console.log(`[GC] 🧹 Membuang buffer RAM untuk ID: ${vidId} (Idle 30 Menit)`);
        }, 30 * 60 * 1000)
    };
    audioBufferCache.set(vidId, cacheEntry);

    try {
        console.log(`🐌 [DOWNLOAD FULL] Nyuruh yt-dlp nyari ID & narik ke RAM: ${vidId}`);
        const info = await youtubedl(`https://www.youtube.com/watch?v=${vidId}`, {
            dumpSingleJson: true, format: '140', noPlaylist: true,
            cookies: process.env.YT_COOKIES_FILE || undefined
        });
        const directUrl = info.url;
        const reqHeaders = info.http_headers || {};
        delete reqHeaders['accept-encoding']; delete reqHeaders['Accept-Encoding'];
        delete reqHeaders['host']; delete reqHeaders['Host'];
        
        // --- PERUBAHAN BARU: TAMBAHKAN USER-AGENT MODERN & MIME FIX ---
        reqHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        const contentType = 'audio/mp4; codecs="mp4a.40.2"'; 

        // --- PERUBAHAN BARU: CHUNKED DOWNLOADING (BYPASS THROTTLING) ---
        const chunkSize = 5 * 1024 * 1024; // 5MB per chunk (lebih cepat dari 3MB)
        let currentStart = 0;
        let totalFileSize = null;
        const allChunks = [];

        const downloadNextChunk = () => {
            return new Promise((resolve, reject) => {
                const currentEnd = currentStart + chunkSize - 1;
                const chunkHeaders = { ...reqHeaders, 'Range': `bytes=${currentStart}-${currentEnd}` };
                
                https.get(directUrl, { headers: chunkHeaders }, (res) => {
                    if (res.statusCode !== 200 && res.statusCode !== 206) {
                        return reject(new Error(`Status Code ${res.statusCode} pada byte ${currentStart}`));
                    }
                    const data = [];
                    res.on('data', chunk => data.push(chunk));
                    res.on('end', () => {
                        const contentRange = res.headers['content-range'];
                        let isFullFile = (res.statusCode === 200);
                        
                        if (contentRange && !totalFileSize) {
                            const match = contentRange.match(/\/(\d+)$/);
                            if (match) totalFileSize = parseInt(match[1], 10);
                        } else if (isFullFile && !totalFileSize) {
                            totalFileSize = parseInt(res.headers['content-length'] || "0", 10);
                        }
                        
                        const chunkBuffer = Buffer.concat(data);
                        resolve({ chunkBuffer, isFullFile });
                    });
                    res.on('error', reject);
                }).on('error', reject);
            });
        };

        // Loop asinkron untuk menyedot file sepotong-sepotong secara ekstrem
        while (true) {
            const { chunkBuffer, isFullFile } = await downloadNextChunk();
            allChunks.push(chunkBuffer);
            currentStart += chunkBuffer.length;
            
            if (totalFileSize && currentStart >= totalFileSize) break;
            // Jika server membuang Range header atau lagu habis di akhir
            if (isFullFile || chunkBuffer.length < chunkSize) break;
        }

        const finalAudioBuffer = Buffer.concat(allChunks);
        console.log(`✅ [DOWNLOAD SELESAI] Lagu ${vidId} siap di RAM (${(finalAudioBuffer.length / 1024 / 1024).toFixed(2)} MB). Memulai Remuxing Faststart...`);
        
        // --- FINAL BOSS FIX: REMUXING FASTSTART M4A VIA STDIN ---
        const tempFixedPath = path.join(__dirname, `temp_fixed_${vidId}.m4a`);
        
        const ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0', 
            '-c', 'copy', 
            '-movflags', '+faststart', 
            '-y', 
            tempFixedPath
        ]);

        // Suapkan audioBuffer RAM ke input ffmpeg
        ffmpegProcess.stdin.write(finalAudioBuffer);
        ffmpegProcess.stdin.end();

        await new Promise((resolveRemux, rejectRemux) => {
            ffmpegProcess.on('close', (code) => {
                if (code === 0) resolveRemux();
                else rejectRemux(new Error(`FFmpeg remux gagal dengan kode ${code}`));
            });
            ffmpegProcess.on('error', rejectRemux);
        });

        // Baca kembali file hasil faststart ke dalam RAM
        const fixedBuffer = fs.readFileSync(tempFixedPath);
        console.log(`✅ [REMUX SELESAI] moov atom telah dipindah ke depan untuk ${vidId}! Ukuran baru: ${(fixedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Cleanup: Hapus file temporary dari SSD
        if (fs.existsSync(tempFixedPath)) fs.unlinkSync(tempFixedPath);
        
        cacheEntry.promise = Promise.resolve({ buffer: fixedBuffer, contentType });
        resolvePromise({ buffer: fixedBuffer, contentType });

    } catch (err) {
        audioBufferCache.delete(vidId);
        rejectPromise(err);
    }

    return promise;
}

// ==========================================
// ENDPOINT 2: STREAMER V1.5 (AUTO RETRY + DELAY + INTERNAL NINJA)
// ==========================================
app.get('/api/stream/:videoId', async (req, res) => {
    const originalVideoId = req.params.videoId;
    
    // 🔥 SURAT TUGAS DARI FRONTEND 🔥
    const title = req.query.title || '';
    const artist = req.query.artist || '';

    // Fungsi Utama buat nyoba muter lagu (Bisa dipake buat ID Asli atau Ninja)
    const tryStream = async (vidId) => {
        if (cooldownList.has(vidId) && cooldownList.get(vidId) > Date.now()) {
            return false; // Gagal, lagu masih dihukum
        }

        try {
            // Langsung minta dari global cache (Bisa instan kalo udah di-preload!)
            const { buffer, contentType } = await getAudioBuffer(vidId);
            const totalSize = buffer.length;

            if (req.headers.range) {
                const range = req.headers.range;
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

                if (start >= totalSize || end >= totalSize) {
                    res.status(416).setHeader('Content-Range', `bytes */${totalSize}`);
                    res.end();
                    return true;
                }

                const chunksize = (end - start) + 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': contentType
                });
                res.end(buffer.slice(start, end + 1));
            } else {
                res.writeHead(200, {
                    'Content-Length': totalSize,
                    'Content-Type': contentType,
                    'Accept-Ranges': 'bytes'
                });
                res.end(buffer);
            }
            return true;
        } catch (err) {
            console.error(`❌ Gagal dapetin audio buat ${vidId}: ${err.message}`);
            return false;
        }
    };

    // ==========================================
    // 🔥 ALUR EKSEKUSI V1.5 (RETRY + NINJA) 🔥
    // ==========================================
    let success = false;
    
    // 1. Coba Muter Lagu Asli Maksimal 3x
    for (let attempt = 1; attempt <= 3; attempt++) {
        success = await tryStream(originalVideoId);
        if (success) break; // Kalo berhasil, langsung keluar dari loop!
        
        if (attempt < 3) {
            console.log(`⏳ Jeda nafas 1 detik sebelum percobaan ke-${attempt + 1}...`);
            await delay(1000); // Ngasih jeda 1 detik biar satpam lengah
        }
    }

    // 2. Kalo udah 3x nyoba tetep gagal -> BANNED & PANGGIL NINJA!
    if (!success) {
        console.log(`🛑 [BANNED] Udah 3x gagal! ID ${originalVideoId} dihukum 10 menit!`);
        cooldownList.set(originalVideoId, Date.now() + 10 * 60 * 1000);

        if (title) {
            console.log(`🥷 Panggil Ninja! Nyari cadangan buat: ${title} ${artist}`);
            try {
                // Backend nge-search diem-diem pake yt-search
                const searchResult = await ytSearch(`${title} ${artist}`);
                
                // Cari video yang ID-nya beda dan lagi kaga dihukum
                const ninjaVideo = searchResult.videos.find(v => 
                    v.videoId !== originalVideoId && 
                    (!cooldownList.has(v.videoId) || cooldownList.get(v.videoId) < Date.now())
                );

                if (ninjaVideo) {
                    console.log(`🔥 Dapet Ninja: ${ninjaVideo.videoId} (${ninjaVideo.title}). Mencoba eksekusi...`);
                    
                    // Kita kasih Ninja kesempatan 2x hit (pake jeda 1 detik)
                    let ninjaSuccess = false;
                    for (let n = 1; n <= 2; n++) {
                        ninjaSuccess = await tryStream(ninjaVideo.videoId);
                        if (ninjaSuccess) break;
                        if (n < 2) await delay(1000);
                    }

                    if (ninjaSuccess) return; // Ninja berhasil nyelametin muka web lu!
                }
            } catch (err) {
                console.error("Gagal nyari Ninja", err.message);
            }
        }

        // 3. Kalo lagu asli gagal & Ninja juga mati / ga nemu
        if (!res.headersSent) {
            console.log("💀 Nyerah total. Kirim error 503 ke Frontend biar di-skip.");
            res.status(503).json({ error: 'Gagal muter lagu asli dan cadangan' });
        }
    }
});
// ==========================================
// ENDPOINT 3: PRELOADER V1.7 (FULL DOWNLOAD KE RAM)
// ==========================================
app.get('/api/preload/:videoId', async (req, res) => {
    const vidId = req.params.videoId;
    
    if (audioBufferCache.has(vidId)) {
        return res.json({ success: true, message: 'Lagu udah siap di RAM lerr!' });
    }

    console.log(`🚀 [PRELOAD] Sisa 15 detik! Diem-diem ngedownload lagu ke RAM: ${vidId}`);
    
    // Panggil getAudioBuffer tanpa nunggu selesai biar client nggak ngegantung
    getAudioBuffer(vidId).then(() => {
        console.log(`✅ [PRELOAD BACKGROUND SUCCESS] Lagu ${vidId} udah nangkring di RAM! Ntar pas pindah lagu langsung gas 0 detik!`);
    }).catch(err => {
        console.error(`❌ [PRELOAD BACKGROUND FAILED] Gagal nyiapin ${vidId}: ${err.message}`);
    });

    res.json({ success: true, message: 'Preload jalan di background!' });
});
// ==========================================
// ENDPOINT 4: AUTOPLAY RADIO (CARI REKOMENDASI V1.6)
// ==========================================
app.get('/api/recommend', async (req, res) => {
    // Tangkap data judul lagu dan artis dari Frontend
    const currentArtist = req.query.artist || '';
    const currentTitle = req.query.title || '';
    const currentId = req.query.currentId || '';

    if (!currentArtist || !currentTitle) {
        return res.status(400).json({ success: false, message: 'Data lagu kaga lengkap lerr' });
    }

    console.log(`📻 [RADIO] Nyari mix sefrekuensi buat: ${currentTitle} - ${currentArtist}`);

    try {
        // 1. Trik Hacker: Tambahin kata "mix" biar YouTube ngasih playlist radio
        const searchResult = await ytSearch(`${currentTitle} ${currentArtist} mix`);
        
        // 2. Saring: Buang lagu yang ID-nya SAMA PERSIS kayak yang lagi diputer (Biar kaga muter lagu yang itu-itu aja)
        const validSongs = searchResult.videos.filter(v => v.videoId !== currentId);

        if (validSongs.length > 0) {
            // 3. Ambil 8 lagu teratas biar relevansinya tetep dapet (vibes nyambung)
            const topPicks = validSongs.slice(0, 8);
            
            // 4. UNDIAN (Random Pick): Pilih 1 lagu secara acak dari 8 lagu itu!
            const randomIndex = Math.floor(Math.random() * topPicks.length);
            const nextSong = topPicks[randomIndex];
            
            // Format datanya biar sama kayak format lagu di database lu
            const recommendedSong = {
                id: nextSong.videoId,
                title: nextSong.title,
                artist: nextSong.author.name,
                thumbnail: nextSong.thumbnail,
                duration: nextSong.duration.timestamp
            };

            console.log(`✅ [RADIO SUCCESS] Rekomendasi buat selanjutnya: ${recommendedSong.title} (${recommendedSong.artist})`);
            res.json({ success: true, data: recommendedSong });
        } else {
            res.status(404).json({ success: false, message: 'Kaga nemu lagu lerr' });
        }
    } catch (err) {
        console.error(`❌ [RADIO ERROR] Gagal nyari rekomendasi: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

server.listen(PORT, '0.0.0.0', async () => {
    const originalLog = console.log;
console.log = (...args) => {
    // Kalau ada bau-bau log status API, kita cuekin (buang ke tempat sampah)
    if (typeof args[0] === 'string' && 
       (args[0].includes('[200 OK]') || 
        args[0].includes('[304 Not Modified]') || 
        args[0].includes('[404 Not Found]') ||
        args[0].includes('⟶'))) {
        return;
    }
    // Selain itu, baru kita tampilin ke konsol
    originalLog(...args);
};
    console.log(`🚀 Mesin Backend nyala di port ${PORT} dan siap tempur!`);
    
    const cookiePath = process.env.YT_COOKIES_FILE;
    if (cookiePath) {
        if (fs.existsSync(cookiePath)) {
            console.log(`🍪 yt-dlp pakai cookies: ${cookiePath}`);
        } else {
            console.warn(`⚠️ YT_COOKIES_FILE tidak ketemu: ${cookiePath}`);
        }
    } else {
        console.warn('⚠️ YT_COOKIES_FILE kosong — stream VPS bisa kena blok YouTube.');
    }
    
    const denoPath = resolveDenoBinary();
    if (denoPath) {
        console.log(`🦕 yt-dlp pakai Deno (JS challenges): ${denoPath}`);
    } else {
        console.warn('⚠️ Deno tidak ketemu — set DENO_BIN atau install Deno (wiki yt-dlp EJS).');
    }
});