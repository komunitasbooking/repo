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

// =================== BARU: Katalog kosmetik (border, pet, ornamen) ===================

const BORDER_COLORS = {
  border_default: "#dddddd",
  border_50: "#cd7f32",
  border_100: "#c0c0c0",
  border_200: "#ffd700"
};

const BORDER_STYLES = {
  border_default: `1px solid ${BORDER_COLORS.border_default}`,
  border_50: `1px solid ${BORDER_COLORS.border_50}`,
  border_100: `1px solid ${BORDER_COLORS.border_100}`,
  border_200: `1px solid ${BORDER_COLORS.border_200}`
};

const PET_ANIMASI_CLASS = {
  pet_50: "pet-border-elang",
  pet_100: "pet-border-singa",
  pet_200: "pet-border-naga"
};

const PET_ORNAMEN = {
  pet_50: { icon: "🍃", kelas: "ornamen-elang" },
  pet_100: { icon: "⚡", kelas: "ornamen-singa" },
  pet_200: { icon: "🔥", kelas: "ornamen-naga" }
};

function buatOrnamenSudut(petId) {
  const ornamen = PET_ORNAMEN[petId];
  if (!ornamen) return "";

  const posisi = [
    { top: "-8px", left: "-8px", delay: "0s" },
    { top: "-8px", right: "-8px", delay: "0.3s" },
    { bottom: "-8px", left: "-8px", delay: "0.6s" },
    { bottom: "-8px", right: "-8px", delay: "0.9s" }
  ];

  return posisi.map(p => {
    const posisiCSS = Object.entries(p)
      .filter(([k]) => k !== "delay")
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
    return `<span class="pet-ornamen ${ornamen.kelas}" style="${posisiCSS}; animation-delay:${p.delay};">${ornamen.icon}</span>`;
  }).join("");
}

// Suntik CSS animasi border + ornamen sekali saja saat script dimuat
(function suntikStyleKostum() {
  if (document.getElementById('styleBookingAktif')) return;

  const style = document.createElement('style');
  style.id = 'styleBookingAktif';
  style.textContent = `
    @keyframes windBorder {
      0%   { border-color: var(--warna-kostum); transform: translateX(0) rotate(0deg); filter: brightness(1); }
      25%  { transform: translateX(1px) rotate(0.3deg); filter: brightness(1.3); }
      50%  { transform: translateX(-1px) rotate(-0.3deg); filter: brightness(1); }
      75%  { transform: translateX(1px) rotate(0.2deg); filter: brightness(1.3); }
      100% { border-color: var(--warna-kostum); transform: translateX(0) rotate(0deg); filter: brightness(1); }
    }
    .pet-border-elang { animation: windBorder 2.2s ease-in-out infinite; }

    @keyframes lightningBorder {
      0%, 100% { border-color: var(--warna-kostum); box-shadow: 0 0 4px var(--warna-kostum); }
      3%       { border-color: #ffffff; box-shadow: 0 0 20px var(--warna-kostum); }
      6%       { border-color: var(--warna-kostum); box-shadow: 0 0 4px var(--warna-kostum); }
      45%      { border-color: #ffffff; box-shadow: 0 0 18px var(--warna-kostum); }
      48%      { border-color: var(--warna-kostum); box-shadow: 0 0 4px var(--warna-kostum); }
    }
    .pet-border-singa { animation: lightningBorder 2.4s linear infinite; }

    @keyframes fireBorder {
      0%   { border-color: var(--warna-kostum); box-shadow: 0 0 6px var(--warna-kostum); }
      33%  { box-shadow: 0 0 14px var(--warna-kostum); }
      66%  { box-shadow: 0 0 10px var(--warna-kostum); }
      100% { border-color: var(--warna-kostum); box-shadow: 0 0 6px var(--warna-kostum); }
    }
    .pet-border-naga { animation: fireBorder 1.1s ease-in-out infinite; }

    .card-booking-aktif {
      border-width: 2px;
      border-style: solid;
      position: relative;
      overflow: visible;
    }

    .pet-ornamen {
      position: absolute;
      font-size: 14px;
      pointer-events: none;
      z-index: 2;
    }

    @keyframes daunGoyang {
      0%   { transform: rotate(-15deg) translateY(0); opacity: 0.85; }
      50%  { transform: rotate(15deg) translateY(-2px); opacity: 1; }
      100% { transform: rotate(-15deg) translateY(0); opacity: 0.85; }
    }
    .ornamen-elang { animation: daunGoyang 1.8s ease-in-out infinite; }

    @keyframes kilatMuncul {
      0%, 90%, 100% { opacity: 0; transform: scale(0.7); }
      3%, 6%        { opacity: 1; transform: scale(1.15); }
      45%, 48%      { opacity: 1; transform: scale(1.1); }
    }
    .ornamen-singa { animation: kilatMuncul 2.4s linear infinite; }

    @keyframes apiMenyala {
      0%   { transform: translateY(0) scale(0.9); opacity: 0.8; }
      50%  { transform: translateY(-3px) scale(1.15); opacity: 1; }
      100% { transform: translateY(0) scale(0.9); opacity: 0.8; }
    }
    .ornamen-naga { animation: apiMenyala 1.1s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
})();

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

window.addEventListener("load", () => {
  const namaTersimpan = localStorage.getItem("namaUser");
  if (namaTersimpan) {
    document.getElementById("statusNotif").innerText = `Notifikasi aktif untuk "${namaTersimpan}" ✅`;
  }
});

// =================== Ambil & tampilkan data booking ===================

async function muatBookingData() {
  try {
    const nocache = Date.now(); // 🆕
    const res = await fetch(`${GAS_API_URL}?action=getAllBookingDenganKostum&nocache=${nocache}`);
    const data = await res.json();

    // 🆕 Bersihkan state lama sebelum render baru
    dataBookingTerakhir = [];
    Object.keys(alarmSudahBunyi).forEach(nama => {
      clearInterval(alarmSudahBunyi[nama]);
      delete alarmSudahBunyi[nama];
    });

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

messaging.onMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Notifikasi";
  const body = (payload.notification && payload.notification.body) || "";
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
});

function showBookingList(data) {
  const tbody = document.getElementById("bookingList");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  // 🆕 Bersihkan alarm user yang booking-nya sudah tidak ada
  const namaAktif = new Set((data || []).map(r => r.nama));
  Object.keys(alarmSudahBunyi).forEach(nama => {
    if (!namaAktif.has(nama)) {
      clearInterval(alarmSudahBunyi[nama]);
      delete alarmSudahBunyi[nama];
    }
  });

  // Cuma 3 gaya animasi CSS yang memang ada — ini boleh tetap hardcode
  const GAYA_ANIMASI_CLASS = {
    elang: "pet-border-elang",
    singa: "pet-border-singa",
    naga: "pet-border-naga"
  };

  if (typeof suaraAktif === 'undefined') {
    window.suaraAktif = {};
  }

  // BARU: suntik animasi glow/melayang sekali saja
  if (!document.getElementById('styleBookingAktif')) {
    const style = document.createElement('style');
    style.id = 'styleBookingAktif';
    style.textContent = `
    @keyframes windBorder {
      0%   { border-color: var(--warna-kostum); transform: translateX(0) rotate(0deg); filter: brightness(1); }
      25%  { transform: translateX(1px) rotate(0.3deg); filter: brightness(1.3); }
      50%  { transform: translateX(-1px) rotate(-0.3deg); filter: brightness(1); }
      75%  { transform: translateX(1px) rotate(0.2deg); filter: brightness(1.3); }
      100% { border-color: var(--warna-kostum); transform: translateX(0) rotate(0deg); filter: brightness(1); }
    }
    .pet-border-elang { animation: windBorder 2.2s ease-in-out infinite; }

    @keyframes lightningBorder {
      0%, 100% { border-color: var(--warna-kostum); box-shadow: 0 0 4px var(--warna-kostum); }
      3%       { border-color: #ffffff; box-shadow: 0 0 20px var(--warna-kostum); }
      6%       { border-color: var(--warna-kostum); box-shadow: 0 0 4px var(--warna-kostum); }
      45%      { border-color: #ffffff; box-shadow: 0 0 18px var(--warna-kostum); }
      48%      { border-color: var(--warna-kostum); box-shadow: 0 0 4px var(--warna-kostum); }
    }
    .pet-border-singa { animation: lightningBorder 2.4s linear infinite; }

    @keyframes fireBorder {
      0%   { border-color: var(--warna-kostum); box-shadow: 0 0 6px var(--warna-kostum); }
      33%  { box-shadow: 0 0 14px var(--warna-kostum); }
      66%  { box-shadow: 0 0 10px var(--warna-kostum); }
      100% { border-color: var(--warna-kostum); box-shadow: 0 0 6px var(--warna-kostum); }
    }
    .pet-border-naga { animation: fireBorder 1.1s ease-in-out infinite; }

    .card-booking-aktif { 
        border-width: 2px; 
        border-style: solid; 
        position: relative; /* BARU: perlu relative supaya ornamen sudut bisa absolute */
        overflow: visible;  /* BARU: supaya ornamen tidak terpotong tepi kartu */
      }

      .pet-ornamen {
        position: absolute;
        font-size: 14px;
        pointer-events: none;
        z-index: 2;
      }

      /* Elang: daun/ranting bergoyang pelan di 2 sudut, seolah tertiup angin */
      @keyframes daunGoyang {
        0%   { transform: rotate(-15deg) translateY(0); opacity: 0.85; }
        50%  { transform: rotate(15deg) translateY(-2px); opacity: 1; }
        100% { transform: rotate(-15deg) translateY(0); opacity: 0.85; }
      }
      .ornamen-elang { animation: daunGoyang 1.8s ease-in-out infinite; }

      /* Singa: kilat kecil muncul-hilang cepat di sudut, sinkron rasanya dengan flash border */
      @keyframes kilatMuncul {
        0%, 90%, 100% { opacity: 0; transform: scale(0.7); }
        3%, 6%        { opacity: 1; transform: scale(1.15); }
        45%, 48%      { opacity: 1; transform: scale(1.1); }
      }
      .ornamen-singa { animation: kilatMuncul 2.4s linear infinite; }

      /* Naga: percikan api kecil naik-turun & membesar-mengecil di sudut */
      @keyframes apiMenyala {
        0%   { transform: translateY(0) scale(0.9); opacity: 0.8; }
        50%  { transform: translateY(-3px) scale(1.15); opacity: 1; }
        100% { transform: translateY(0) scale(0.9); opacity: 0.8; }
      }
      .ornamen-naga { animation: apiMenyala 1.1s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }

  const now = new Date();

  const namaJenis = { HP: "REGULER", PS2: "VIP", PS3: "VVIP", PS4: "ULTRA VIP" };
  const warnaJenis = { HP: "#bdc3c7", PS2: "#3498db", PS3: "#9b59b6", PS4: "#f1c40f" };

  const dataAktif = data
    .map(row => {
      if (!row.tanggal || !row.jam || !row.durasi) return null;

      const [jam, menit] = row.jam.split(":").map(Number);
      const [tahun, bulan, tanggal] = row.tanggal.split("-").map(Number);
      const durasiMenit = parseInt(row.durasi);

      if ([jam, menit, tahun, bulan, tanggal, durasiMenit].some(isNaN)) return null;

      const startTime = new Date(tahun, bulan - 1, tanggal, jam, menit);
      const endTime = new Date(startTime.getTime() + durasiMenit * 60000);
      const isPlaying = now >= startTime && now <= endTime;
      return { ...row, startTime, endTime, isPlaying };
    })
    .filter(row => row && row.endTime > now)
    .sort((a, b) => a.startTime - b.startTime);
  dataBookingTerakhir = dataAktif;
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

      // 🆕 GANTI SEMUA baris lama yang pakai BORDER_STYLES_SESI / BORDER_COLORS_SESI jadi ini:
      const warnaBorder = row.borderWarna || "#dddddd";
      const borderCSS = `1px solid ${warnaBorder}`;

      const bgCard = row.isPlaying
        ? `background: rgba(46, 204, 113, 0.12); border: ${borderCSS};`
        : `background: #2c2c3e; border: ${borderCSS};`;

      const card = document.createElement("div");

      const kelasAnimasi = row.isPlaying ? (GAYA_ANIMASI_CLASS[row.petGaya] || "") : "";
      card.className = row.isPlaying ? `card-booking-aktif ${kelasAnimasi}`.trim() : "";

      card.style.cssText = `
        display: flex; flex-direction: column; gap: 6px;
        ${bgCard}
        padding: 10px; border-radius: 8px; width: 100%; box-sizing: border-box;
      `;

      card.style.setProperty('--warna-kostum', warnaBorder);
      const ornamenSudut = row.isPlaying ? buatOrnamenSudut(row.petGaya, row.petIcon) : "";
      const borderBadge = row.borderIcon
      ? `<span style="font-size:14px;" title="Border aktif">${row.borderIcon}</span>`
      : "";
      
      card.innerHTML = `
       ${ornamenSudut}
         <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
        <div style="font-weight:bold; color:#fff; font-size:13px; word-break:break-word; max-width:55%; display:flex; align-items:center; gap:6px;">
          <span>${row.nama}</span>${borderBadge}
        </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="btnSuara" data-nama="${row.nama}" title="${suaraAktif[row.nama] ? 'Suara aktif' : 'Aktifkan suara'}" style="background:none; border:none; cursor:pointer; font-size:20px;">
              ${suaraAktif[row.nama] ? "🔔" : "🔇"}
            </button>
            <div style="font-size:10px; font-weight:bold; color:${row.isPlaying ? '#2ecc71' : '#f1c40f'}; background:rgba(0,0,0,0.3); padding:3px 6px; border-radius:4px; letter-spacing:.5px;">
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
