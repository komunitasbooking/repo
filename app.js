// app.js
// ====================================================================
// GANTI ini dengan URL Web App GAS kamu (yang berakhiran /exec)
// ====================================================================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyRVIJrx6z3nvRHFSd2V8KL_v_8g8FIZQS6yS7CGDuPQNEXmxE0KweAMkijpda8ydlbQQ/exec";

// VAPID key dari Firebase Console -> Project Settings -> Cloud Messaging
const VAPID_KEY = "BPu-CkKjzdXNPh8N-287d2gGxC2dj27HWHdcGvhtDEJ-IMTJGkAlWeJZdsbp8e2QywGAAaR1MUz4owfIwKUnwTQ";

const firebaseConfig = {
  apiKey: "AIzaSyCtxdF_hpk9LgSHzbcjSeCBfGMBesdEXhg",
  authDomain: "bookingalarm-10146.firebaseapp.com",
  projectId: "bookingalarm-10146",
  storageBucket: "bookingalarm-10146.firebasestorage.app",
  messagingSenderId: "507173877394",
  appId: "1:507173877394:web:1620ec6696f1538803584b"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// User yang mengaktifkan suara (dipakai juga sebagai identitas utk simpan token push)
const suaraAktif = JSON.parse(localStorage.getItem("suaraAktif") || "{}");
let dataBookingTerakhir = [];
const alarmSudahBunyi = {};

// =================== Setup Push Notification ===================

async function aktifkanNotifikasi() {
  const namaUser = prompt("Masukkan nama kamu (sesuai data booking):");
  if (!namaUser) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      document.getElementById("statusNotif").innerText = "Izin notifikasi ditolak.";
      return;
    }

    const registration = await navigator.serviceWorker.register("firebase-messaging-sw.js");
    const token = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      document.getElementById("statusNotif").innerText = "Gagal mendapatkan token push.";
      return;
    }

    // Kirim token ke GAS. Pakai text/plain agar tidak memicu CORS preflight.
    await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "simpanFcmToken", nama: namaUser, token: token })
    });

    localStorage.setItem("namaUser", namaUser);
    document.getElementById("statusNotif").innerText = `Notifikasi aktif untuk "${namaUser}" ✅`;
  } catch (err) {
    console.error("Gagal setup push:", err);
    document.getElementById("statusNotif").innerText = "Gagal mengaktifkan notifikasi.";
  }
}

// Tampilkan status awal kalau sebelumnya sudah pernah aktif di device ini
window.addEventListener("load", () => {
  const namaTersimpan = localStorage.getItem("namaUser");
  if (namaTersimpan) {
    document.getElementById("statusNotif").innerText = `Notifikasi aktif untuk "${namaTersimpan}" ✅`;
  }
});

// =================== Ambil & tampilkan data booking ===================

async function muatBookingData() {
  try {
    const res = await fetch(`${GAS_API_URL}?action=getBookingData`);
    const data = await res.json();

    // Normalisasi nama key: getBookingData() di GAS mengambil key dari
    // header kolom Sheet apa adanya (misal "Jam Mulai" -> "jam mulai"),
    // sedangkan kode tampilan di sini mengharapkan key "jam".
    const dataNormalisasi = data.map(row => ({
      ...row,
      jam: row.jam || row["jam mulai"] || row["jam booking"]
    }));

    showBookingList(dataNormalisasi);
  } catch (err) {
    console.error("Gagal memuat data booking:", err);
  }
}

function toggleSuara(nama, tombol) {
  if (suaraAktif[nama]) {
    delete suaraAktif[nama];
    tombol.innerHTML = "🔇";
    tombol.title = "Aktifkan suara";
  } else {
    const suara = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
    suara.play().then(() => suara.pause()).catch(() => {});
    suaraAktif[nama] = true;
    tombol.innerHTML = "🔔";
    tombol.title = "Suara aktif";
  }
  localStorage.setItem("suaraAktif", JSON.stringify(suaraAktif));
}

// Alarm lokal (bonus, jalan kalau tab sedang dibuka & aktif di foreground).
// Untuk kondisi tab/app tertutup atau HP idle, andalkan push dari server.
function checkAlarmTiapDetik() {
  const now = new Date();

  dataBookingTerakhir.forEach(row => {
    if (!row.tanggal || !row.jam || !row.durasi || !row.nama) return;
    if (!suaraAktif[row.nama]) return;

    const [jam, menit] = String(row.jam).split(":").map(Number);
    const [tahun, bulan, tanggal] = String(row.tanggal).split("-").map(Number);
    const durasi = parseInt(row.durasi);
    if ([jam, menit, tahun, bulan, tanggal, durasi].some(isNaN)) return;

    const startTime = new Date(tahun, bulan - 1, tanggal, jam, menit);
    const endTime = new Date(startTime.getTime() + durasi * 60000);
    const sisaMenit = (endTime.getTime() - now.getTime()) / 60000;

    if (sisaMenit <= 2 && sisaMenit > 0 && !alarmSudahBunyi[row.nama]) {
      let jumlahBunyi = 0;
      alarmSudahBunyi[row.nama] = setInterval(() => {
        const suara = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
        suara.play().catch(() => {});
        jumlahBunyi++;
        if (jumlahBunyi >= 1) {
          clearInterval(alarmSudahBunyi[row.nama]);
          delete alarmSudahBunyi[row.nama];
        }
      }, 4000);
    }
  });
}
setInterval(checkAlarmTiapDetik, 1000);

// Notifikasi foreground (saat tab sedang dibuka & aktif)
messaging.onMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Notifikasi";
  const body = (payload.notification && payload.notification.body) || "";
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
});

function showBookingList(data) {
  dataBookingTerakhir = data || [];
  const tbody = document.getElementById("bookingList");
  tbody.innerHTML = "";

  const now = new Date();

  const namaJenis = { HP: "REGULER", PS2: "VIP", PS3: "VVIP", PS4: "ULTRA VIP" };
  const warnaJenis = { HP: "#bdc3c7", PS2: "#3498db", PS3: "#9b59b6", PS4: "#f1c40f" };

  const dataAktif = data
    .map(row => {
      if (!row.tanggal || !row.jam || !row.durasi) return null;

      const [jam, menit] = String(row.jam).split(":").map(Number);
      const [tahun, bulan, tanggal] = String(row.tanggal).split("-").map(Number);
      const durasiMenit = parseInt(row.durasi);

      if ([jam, menit, tahun, bulan, tanggal, durasiMenit].some(isNaN)) return null;

      const startTime = new Date(tahun, bulan - 1, tanggal, jam, menit);
      const endTime = new Date(startTime.getTime() + durasiMenit * 60000);
      const isPlaying = now >= startTime && now <= endTime;

      return { ...row, startTime, endTime, isPlaying };
    })
    .filter(row => row && row.endTime > now)
    .sort((a, b) => a.startTime - b.startTime);

  if (dataAktif.length === 0) {
    tbody.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #aaa; font-size: 13px; border: 1px dashed #444; border-radius: 6px;">
        Tidak ada booking aktif
      </div>
    `;
  } else {
    dataAktif.forEach(row => {
      const endStr = row.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const statusBadge = row.isPlaying ? "🔥 SEDANG MAIN" : "⏳ MENUNGGU";
      const bgCard = row.isPlaying
        ? "background: rgba(46, 204, 113, 0.12); border: 1px solid #2ecc71;"
        : "background: #2c2c3e; border: 1px solid #444;";

      const card = document.createElement("div");
      card.style.cssText = `
        display: flex; flex-direction: column; gap: 6px;
        ${bgCard} padding: 10px; border-radius: 8px; width: 100%; box-sizing: border-box;
      `;

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
          <div style="font-weight:bold;color:#fff;font-size:13px;word-break:break-word;max-width:55%;">
            ${row.nama}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="btnSuara" data-nama="${row.nama}"
              title="${suaraAktif[row.nama] ? 'Suara aktif' : 'Aktifkan suara'}"
              style="background:none;border:none;cursor:pointer;font-size:20px;">
              ${suaraAktif[row.nama] ? "🔔" : "🔇"}
            </button>
            <div style="font-size:10px;font-weight:bold;color:${row.isPlaying ? '#2ecc71' : '#f1c40f'};background:rgba(0,0,0,0.3);padding:3px 6px;border-radius:4px;letter-spacing:.5px;">
              ${statusBadge}
            </div>
          </div>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 11px; color: #bbb; border-top: 1px solid rgba(250,250,250,0.06); padding-top: 6px;">
          <div>Tier: <span style="font-weight:bold; color:${warnaJenis[row.jenis] || '#fff'}">${namaJenis[row.jenis] || row.jenis}</span></div>
          <div style="color: #666;">•</div>
          <div>📅 ${row.tanggal}</div>
          <div style="color: #666;">•</div>
          <div>🕒 ${row.jam} (${row.durasi}m)</div>
          <div style="color: #666;">•</div>
          <div>🏁 Selesai: <span style="color:#00ffcc; font-weight:bold;">${endStr}</span></div>
        </div>
      `;

      tbody.appendChild(card);
      card.querySelector(".btnSuara").onclick = function () {
        toggleSuara(row.nama, this);
      };
    });
  }
}

// Muat data pertama kali, lalu refresh tiap 30 detik
muatBookingData();
setInterval(muatBookingData, 30000);
