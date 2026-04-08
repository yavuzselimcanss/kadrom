// --- SUPABASE ---
const SUPABASE_URL = 'https://ridsezcnmvipaddfghmr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DNQKWZQu1eaPMm205y3E5w_yUZniIm-';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Türkçe büyük/küçük harf duyarsız karşılaştırma
function trLower(str) {
  return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

// --- NOMİNATIM SAHA ARAMA ---
let aramaTimeout = null;
async function sahaAra(query) {
  if (!query || query.length < 3) { document.getElementById('sahaOneri').innerHTML = ''; return; }
  clearTimeout(aramaTimeout);
  aramaTimeout = setTimeout(async () => {
    const oneri = document.getElementById('sahaOneri');
    oneri.innerHTML = '<div style="padding:8px;color:#aaa;font-size:13px">Aranıyor...</div>';
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=tr&accept-language=tr`, {
        headers: { 'Accept-Language': 'tr' }
      });
      const data = await res.json();
      if (!data.length) {
        oneri.innerHTML = '<div style="padding:8px;color:#e57373;font-size:13px">Adres bulunamadı — haritaya tıklayarak manuel konum seçebilirsin</div>';
        return;
      }
      oneri.innerHTML = data.map(d => `
        <div class="oneri-item" data-lat="${d.lat}" data-lng="${d.lon}" data-ad="${d.display_name.split(',')[0]}">
          📍 ${d.display_name.split(',').slice(0,4).join(', ')}
        </div>`).join('');
      oneri.querySelectorAll('.oneri-item').forEach(item => {
        item.addEventListener('click', () => {
          document.getElementById('macKonum').value = item.dataset.ad;
          seciliKoord = { lat: parseFloat(item.dataset.lat), lng: parseFloat(item.dataset.lng) };
          oneri.innerHTML = '';
          if (secimHaritasi) {
            secimHaritasi.setView([seciliKoord.lat, seciliKoord.lng], 17);
            if (secimMarker) secimMarker.setLatLng([seciliKoord.lat, seciliKoord.lng]);
            else secimMarker = L.marker([seciliKoord.lat, seciliKoord.lng]).addTo(secimHaritasi);
            document.getElementById('koordinatBilgi').textContent = `✅ Seçilen: ${item.dataset.ad}`;
          }
        });
      });
    } catch(e) {
      oneri.innerHTML = '<div style="padding:8px;color:#e57373;font-size:13px">Bağlantı hatası, haritadan manuel seç</div>';
    }
  }, 500);
}

// --- HARİTA ---
let secimHaritasi = null;
let secimMarker = null;
let seciliKoord = null;

function haritaBaslat() {
  if (secimHaritasi) return;
  secimHaritasi = L.map('secimHaritasi').setView([39.925, 32.866], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(secimHaritasi);
  secimHaritasi.on('click', function(e) {
    seciliKoord = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (secimMarker) secimMarker.setLatLng(e.latlng);
    else secimMarker = L.marker(e.latlng).addTo(secimHaritasi);
    document.getElementById('koordinatBilgi').textContent =
      `Seçilen konum: ${seciliKoord.lat.toFixed(5)}, ${seciliKoord.lng.toFixed(5)}`;
  });
}

// --- SESSION ---
const getSession = () => JSON.parse(localStorage.getItem('hs_session') || 'null');
const setSession = (u) => localStorage.setItem('hs_session', JSON.stringify(u));
const clearSession = () => localStorage.removeItem('hs_session');

// --- SAYFA STATE ---
let aktifSayfa = 'liste'; // 'liste' | 'detay'
let aktifMacId = null;

// --- RENDER ---
function render() {
  const session = getSession();
  const app = document.getElementById('app');
  if (!session) {
    app.innerHTML = renderAuth();
    bindEvents();
    return;
  }
  if (aktifSayfa === 'detay' && aktifMacId) {
    app.innerHTML = renderNav(session) + '<div class="container"><div id="detayIcerik"><div class="empty">Yükleniyor...</div></div></div>';
    bindEvents();
    detayYukle(aktifMacId, session);
  } else {
    app.innerHTML = renderNav(session) + '<div class="container"><div id="macAlert"></div><div id="macListesi"><div class="empty">Yükleniyor...</div></div></div>';
    bindEvents();
    maclarYukle(session);
  }
}

// --- NAV ---
function renderNav(session) {
  return `
    <nav style="overflow:visible;min-height:60px">
      <div style="cursor:pointer;position:relative;width:120px;height:40px" id="navLogo">
        <img src="logo.png" alt="KADROM" style="height:100px;position:absolute;top:-30px;left:0;filter:drop-shadow(0 6px 16px rgba(0,0,0,0.6))">
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:14px;color:#aaa">Merhaba, <b style="color:#e0e0e0">${session.ad}</b></span>
        <button id="cikisBtn">Çıkış</button>
      </div>
    </nav>`;
}

// --- AUTH ---
function renderAuth(tab = 'giris') {
  return `
    <div class="auth-wrap">
      <div style="display:flex;justify-content:center;margin-bottom:-60px;position:relative;z-index:10">
        <img src="logo.png" alt="KADROM" style="height:140px;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.7))">
      </div>
      <div class="card" style="padding-top:72px">
        <div class="tabs">
          <div class="tab ${tab === 'giris' ? 'active' : ''}" data-tab="giris">Giriş Yap</div>
          <div class="tab ${tab === 'kayit' ? 'active' : ''}" data-tab="kayit">Kayıt Ol</div>
        </div>
        <div id="authAlert"></div>
        ${tab === 'giris' ? renderGirisForm() : renderKayitForm()}
      </div>
    </div>`;
}

function renderGirisForm() {
  return `
    <div class="form-group"><label>Kullanıcı Adı</label><input id="girisAd" type="text" placeholder="kullanıcı adın"></div>
    <div class="form-group"><label>Şifre</label><input id="girisSifre" type="password" placeholder="••••••••"></div>
    <div style="display:flex;justify-content:center;margin-top:12px">
      <button id="girisBtn" class="top-btn" title="Giriş Yap">
        <img src="top-giris.svg" width="160" height="160" alt="Giriş Yap">
      </button>
    </div>`;
}

function renderKayitForm() {
  return `
    <div class="form-group"><label>Ad Soyad</label><input id="kayitAd" type="text" placeholder="adın soyadın"></div>
    <div class="form-group"><label>Kullanıcı Adı</label><input id="kayitKullanici" type="text" placeholder="kullanıcı adı"></div>
    <div class="form-group"><label>Telefon</label><input id="kayitTelefon" type="tel" placeholder="05xx xxx xx xx"></div>
    <div class="form-group"><label>Şifre</label><input id="kayitSifre" type="password" placeholder="••••••••"></div>
    <div style="display:flex;justify-content:center;margin-top:12px">
      <button id="kayitBtn" class="top-btn" title="Kayıt Ol">
        <img src="top-kayit.svg" width="160" height="160" alt="Kayıt Ol">
      </button>
    </div>`;
}

// --- MAÇLAR LİSTESİ ---
const SEHIRLER = ['Tümü','Adana','Ankara','Antalya','Bursa','Diyarbakır','Eskişehir','Gaziantep','İstanbul','İzmir','Kayseri','Kocaeli','Konya','Mersin','Samsun','Trabzon'];

async function maclarYukle(session, sehirFiltre = 'Tümü') {
  const { data, error } = await sb.from('maclar').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('macListesi');
  if (error) { el.innerHTML = '<div class="empty">Maçlar yüklenemedi.</div>'; return; }

  const filtrelenmis = sehirFiltre === 'Tümü' ? data : data.filter(m => m.sehir && trLower(m.sehir).includes(trLower(sehirFiltre)));
  const benimMaclarim = filtrelenmis.filter(m => m.olusturan === session.kullanici);
  const digerMaclar = filtrelenmis.filter(m => m.olusturan !== session.kullanici);

  el.innerHTML = `
    <div style="margin-bottom:12px;position:relative">
      <div style="display:flex;gap:8px">
        <input id="sehirArama" type="text" placeholder="🔍 Şehir ara... (örn: Adana)" 
          style="flex:1;padding:10px 14px;border:1.5px solid #2a2a2a;border-radius:10px;font-size:15px;outline:none;background:#141414;color:#d0d0d0;font-family:inherit"
          value="${sehirFiltre !== 'Tümü' ? sehirFiltre : ''}" autocomplete="off">
        <button id="sehirAramaBtn" class="btn btn-green" style="white-space:nowrap">Ara</button>
      </div>
      <div id="sehirOneri" style="position:absolute;left:0;right:60px;background:white;border:1px solid #ddd;border-radius:8px;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:none"></div>
    </div>
    <div class="sehir-scroll">
      ${SEHIRLER.map(s => `<button class="btn btn-sm ${s === sehirFiltre ? 'btn-green' : 'btn-outline'}" style="margin-right:6px" data-sehir="${s}">${s}</button>`).join('')}
    </div>
    <div class="section-header">
      <h2>Açık Maçlar</h2>
      <button class="btn btn-outline btn-sm" id="yeniMacBtn">+ Maç Oluştur</button>
    </div>
    <div id="yeniMacForm" style="display:none">${renderYeniMacForm()}</div>
    ${digerMaclar.length === 0 ? '<div class="empty">Bu şehirde maç yok.</div>' : digerMaclar.map(m => renderMacKarti(m, session)).join('')}
    ${benimMaclarim.length > 0 ? `<h2 style="color:#16a34a;margin:20px 0 12px">Benim Maçlarım</h2>${benimMaclarim.map(m => renderMacKarti(m, session, true)).join('')}` : ''}
  `;
  bindMacEvents(session, sehirFiltre);
}

function renderYeniMacForm() {
  return `
    <div class="card" style="border:2px solid #22c55e33">
      <h2>Yeni Maç Oluştur</h2>
      <div class="form-group">
        <label>Şehir</label>
        <select id="macSehir">
          ${SEHIRLER.filter(s => s !== 'Tümü').map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="position:relative">
        <label>Saha Adı veya Adres Ara</label>
        <input id="macKonum" type="text" placeholder="örn: Atatürk Cad. No:5 Kadıköy veya saha adı" autocomplete="off">
        <div id="sahaOneri" style="position:absolute;top:100%;left:0;right:0;background:#0e0e0e;border:1.5px solid #252525;border-radius:10px;z-index:999;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.4)"></div>
      </div>
      <div class="form-group">
        <label>Konum — listeden seç veya haritaya tıkla</label>
        <div id="secimHaritasi"></div>
        <p id="koordinatBilgi" style="font-size:13px;color:#555;margin-top:6px">Haritada bir nokta seçin veya yukarıdan arayın</p>
      </div>
      <div class="form-group"><label>Tarih</label><input id="macTarih" type="date"></div>
      <div class="form-group"><label>Saat</label><input id="macSaat" type="time"></div>
      <div style="display:flex;gap:12px">
        <div class="form-group" style="flex:1"><label>Takım 1 Kişi Sayısı</label>
          <select id="macTakim1">${[3,4,5,6,7,8].map(n=>`<option value="${n}" ${n===5?'selected':''}>${n} kişi</option>`).join('')}</select>
        </div>
        <div class="form-group" style="flex:1"><label>Takım 2 Kişi Sayısı</label>
          <select id="macTakim2">${[3,4,5,6,7,8].map(n=>`<option value="${n}" ${n===5?'selected':''}>${n} kişi</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Kişi Başı Fiyat</label><input id="macFiyat" type="text" placeholder="örn: 100₺ veya Ücretsiz"></div>
      <div class="form-group"><label>Açıklama (zorunlu)</label>
        <textarea id="macAciklama" rows="3" style="resize:vertical" placeholder="Maç hakkında bilgi ver, kural, seviye, ekipman vb..."></textarea>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-green" id="macKaydetBtn" style="flex:1">Oluştur</button>
        <button class="btn btn-outline" id="macIptalBtn" style="flex:1">İptal</button>
      </div>
    </div>`;
}

function renderMacKarti(mac, session, benim = false) {
  const katildi = mac.katilimcilar && mac.katilimcilar.includes(session.kullanici);
  const dolu = mac.katilimcilar && mac.katilimcilar.length >= mac.eksik;

  const konumHtml = mac.lat && mac.lng
    ? `<span class="konum-link" onclick="window.open('https://www.google.com/maps?q=${mac.lat},${mac.lng}','_blank')">📍 ${mac.konum} (haritada gör)</span>`
    : `<span>📍 ${mac.konum}</span>`;

  return `
    <div class="mac-card">
      <div class="mac-info">
        <h3>${konumHtml}</h3>
        <p>📅 ${mac.tarih} — ⏰ ${mac.saat}</p>
        <p>👥 ${mac.katilimcilar ? mac.katilimcilar.length : 0} / ${mac.eksik} oyuncu</p>
        <span class="badge ${dolu ? 'dolu' : ''}">
          ${dolu ? 'Kadro Dolu' : `${mac.eksik - (mac.katilimcilar ? mac.katilimcilar.length : 0)} kişi eksik`}
        </span>
      </div>
      <div class="mac-actions">
        <button class="btn btn-outline btn-sm" data-detay="${mac.id}">Detaylar</button>
        ${benim
          ? `<button class="btn btn-red btn-sm" data-sil="${mac.id}">Sil</button>`
          : katildi
            ? `<button class="btn btn-outline btn-sm" data-ayril="${mac.id}">Ayrıl</button>`
            : dolu
              ? `<button class="btn btn-sm" style="background:#333;color:#666;cursor:not-allowed" disabled>Dolu</button>`
              : `<button class="btn btn-green btn-sm" data-istek="${mac.id}">İstek Gönder</button>`
        }
      </div>
    </div>`;
}

// --- DETAY SAYFASI ---
async function detayYukle(macId, session) {
  const [{ data: mac }, { data: yorumlar }, { data: istekler }] = await Promise.all([
    sb.from('maclar').select('*').eq('id', macId).single(),
    sb.from('yorumlar').select('*').eq('mac_id', macId).order('created_at', { ascending: true }),
    sb.from('istekler').select('*').eq('mac_id', macId).order('created_at', { ascending: true })
  ]);

  // 45 dakika geçmiş bekleyen istekleri iptal et
  if (istekler) {
    const simdi = new Date();
    for (const istek of istekler) {
      if (istek.durum === 'bekliyor') {
        const gonderilme = new Date(istek.created_at);
        const dakika = (simdi - gonderilme) / 60000;
        if (dakika > 45) {
          await sb.from('istekler').update({ durum: 'iptal' }).eq('id', istek.id);
          istek.durum = 'iptal';
        }
      }
    }
  }

  let olusturanTelefon = null;
  if (mac && mac.olusturan !== session.kullanici) {
    const { data: olusturan } = await sb.from('kullanicilar').select('telefon').eq('kullanici', mac.olusturan).single();
    if (olusturan) olusturanTelefon = olusturan.telefon;
  }

  const el = document.getElementById('detayIcerik');
  if (!mac) { el.innerHTML = '<div class="empty">Maç bulunamadı.</div>'; return; }

  const katildi = mac.katilimcilar && mac.katilimcilar.includes(session.kullanici);
  const dolu = mac.katilimcilar && mac.katilimcilar.length >= mac.eksik;
  const benim = mac.olusturan === session.kullanici;
  const bekleyenIstek = istekler && istekler.find(i => i.kullanici === session.kullanici && i.durum === 'bekliyor');
  const bekleyenIstekler = istekler && istekler.filter(i => i.durum === 'bekliyor');

  const konumHtml = mac.lat && mac.lng
    ? `<span class="konum-link" onclick="window.open('https://www.google.com/maps?q=${mac.lat},${mac.lng}','_blank')">📍 ${mac.konum} (Google Maps'te aç)</span>`
    : `<span>📍 ${mac.konum}</span>`;

  el.innerHTML = `
    <button class="btn btn-outline btn-sm" id="geriBtn" style="margin-bottom:16px">← Geri</button>
    <div class="card">
      <h2>${konumHtml}</h2>
      <p style="margin:8px 0">📅 ${mac.tarih} — ⏰ ${mac.saat}</p>
      <p style="margin:8px 0">👤 Oluşturan: <b>${mac.olusturan}</b>${olusturanTelefon ? ` — 📞 <a href="tel:${olusturanTelefon}" style="color:#22c55e">${olusturanTelefon}</a>` : ''}</p>
      ${mac.fiyat ? `<p style="margin:8px 0">💰 Kişi başı: <b style="color:#22c55e">${mac.fiyat}</b></p>` : ''}
      ${mac.takim1 && mac.takim2 ? `<p style="margin:8px 0">⚽ Format: <b>${mac.takim1}vs${mac.takim2}</b></p>` : ''}
      ${mac.aciklama ? `<div style="margin:12px 0;padding:12px;background:#0a0a0a;border-radius:10px;border-left:3px solid #22c55e"><p style="font-size:14px;color:#ccc;line-height:1.6">${mac.aciklama}</p></div>` : ''}
      <p style="margin:8px 0">👥 Katılımcılar (${mac.katilimcilar ? mac.katilimcilar.length : 0}/${mac.eksik}):
        ${mac.katilimcilar && mac.katilimcilar.length > 0
          ? mac.katilimcilar.map(k => `<span style="background:#14532d;color:#22c55e;padding:2px 8px;border-radius:20px;font-size:13px;margin:2px">${k}</span>`).join('')
          : '<span style="color:#555">Henüz kimse katılmadı</span>'}
      </p>
      <span class="badge ${dolu ? 'dolu' : ''}" style="margin-top:8px;display:inline-block">
        ${dolu ? 'Kadro Dolu' : `${mac.eksik - (mac.katilimcilar ? mac.katilimcilar.length : 0)} kişi eksik`}
      </span>
      <div style="margin-top:16px;display:flex;gap:8px">
        ${benim
          ? `<button class="btn btn-red btn-sm" id="detaySilBtn">Maçı Sil</button>`
          : katildi
            ? `<button class="btn btn-outline" id="detayAyrilBtn">Ayrıl</button>`
            : bekleyenIstek
              ? `<button class="btn btn-sm" style="background:#333;color:#888;cursor:not-allowed" disabled>⏳ İstek Gönderildi</button>`
              : dolu
                ? `<button class="btn btn-sm" style="background:#333;color:#666;cursor:not-allowed" disabled>Kadro Dolu</button>`
                : `<button class="btn btn-green" id="istekGonderBtn">📨 Katılma İsteği Gönder</button>`
        }
      </div>
    </div>

    ${benim && bekleyenIstekler && bekleyenIstekler.length > 0 ? `
    <div class="card" style="margin-top:16px;border-color:#22c55e33">
      <h2 style="margin-bottom:16px">📬 Bekleyen İstekler (${bekleyenIstekler.length})</h2>
      ${bekleyenIstekler.map(i => `
        <div style="border-bottom:1px solid #1a1a1a;padding:12px 0;display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <span style="font-weight:700;color:#e0e0e0">${i.ad}</span>
            <span style="font-size:12px;color:#555;margin-left:8px">@${i.kullanici}</span>
            ${i.mesaj ? `<p style="font-size:13px;color:#aaa;margin-top:4px">${i.mesaj}</p>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-green btn-sm" data-kabul="${i.id}" data-kullanici="${i.kullanici}">✓ Kabul</button>
            <button class="btn btn-red btn-sm" data-red="${i.id}">✗ Red</button>
          </div>
        </div>`).join('')}
    </div>` : ''}

    <div class="card" style="margin-top:16px">
      <h2 style="margin-bottom:16px">💬 Yorumlar</h2>
      <div id="yorumListesi">
        ${yorumlar && yorumlar.filter(y => !y.sadece_sahibine || benim).length > 0
          ? yorumlar.filter(y => !y.sadece_sahibine || benim).map(y => `
            <div style="border-bottom:1px solid #1a1a1a;padding:10px 0">
              <span style="font-weight:600;color:#22c55e">${y.ad}</span>
              ${y.sadece_sahibine ? '<span style="font-size:11px;background:#14532d;color:#22c55e;padding:2px 6px;border-radius:10px;margin-left:6px">🔒 Gizli Not</span>' : ''}
              <span style="font-size:12px;color:#444;margin-left:8px">${new Date(y.created_at).toLocaleString('tr-TR')}</span>
              <p style="margin-top:4px;font-size:14px;color:#ccc">${y.yorum}</p>
            </div>`).join('')
          : '<div class="empty" style="padding:16px 0">Henüz yorum yok.</div>'
        }
      </div>
      <div style="margin-top:16px">
        <div class="form-group">
          <textarea id="yorumInput" rows="3" style="resize:vertical" placeholder="Yorum yaz..."></textarea>
        </div>
        <button class="btn btn-outline" id="sadeceyorumBtn" style="width:100%">Yorum Yap</button>
      </div>
    </div>
  `;

  document.getElementById('geriBtn').addEventListener('click', () => { aktifSayfa = 'liste'; aktifMacId = null; render(); });

  const detayAyrilBtn = document.getElementById('detayAyrilBtn');
  if (detayAyrilBtn) detayAyrilBtn.addEventListener('click', async () => { await handleAyril(macId, session); detayYukle(macId, session); });

  const detaySilBtn = document.getElementById('detaySilBtn');
  if (detaySilBtn) detaySilBtn.addEventListener('click', async () => {
    if (!confirm('Bu maçı silmek istediğine emin misin?')) return;
    await sb.from('maclar').delete().eq('id', macId);
    aktifSayfa = 'liste'; aktifMacId = null; render();
  });

  const istekGonderBtn = document.getElementById('istekGonderBtn');
  if (istekGonderBtn) istekGonderBtn.addEventListener('click', () => istekPopup(macId, session));

  // Kabul / Red butonları
  document.querySelectorAll('[data-kabul]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const istekId = btn.dataset.kabul;
      const kullanici = btn.dataset.kullanici;
      // Aynı gün kontrolü
      const { data: tumMaclar } = await sb.from('maclar').select('id, tarih, katilimcilar').eq('tarih', mac.tarih);
      const ayniGun = tumMaclar && tumMaclar.some(m => m.id !== macId && m.katilimcilar && m.katilimcilar.includes(kullanici));
      if (ayniGun) { alert('Bu kişi aynı gün başka bir maça kayıtlı.'); return; }
      if (mac.katilimcilar && mac.katilimcilar.length >= mac.eksik) { alert('Kadro dolu.'); return; }
      const yeni = [...(mac.katilimcilar || []), kullanici];
      await sb.from('maclar').update({ katilimcilar: yeni }).eq('id', macId);
      await sb.from('istekler').update({ durum: 'kabul' }).eq('id', istekId);
      detayYukle(macId, session);
    });
  });

  document.querySelectorAll('[data-red]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await sb.from('istekler').update({ durum: 'red' }).eq('id', btn.dataset.red);
      detayYukle(macId, session);
    });
  });

  const sadeceyorumBtn = document.getElementById('sadeceyorumBtn');
  if (sadeceyorumBtn) sadeceyorumBtn.addEventListener('click', async () => {
    const yorum = document.getElementById('yorumInput').value.trim();
    if (!yorum) return alert('Lütfen bir şey yaz.');
    await yorumEkle(macId, session, yorum);
    detayYukle(macId, session);
  });
}

function istekPopup(macId, session) {
  const popup = document.createElement('div');
  popup.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
      <div style="background:#1a1a1a;border:1px solid #22c55e33;border-radius:16px;padding:28px;max-width:400px;width:100%">
        <h3 style="color:#22c55e;margin-bottom:8px">İstek Gönder</h3>
        <p style="color:#888;font-size:13px;margin-bottom:16px">Maç sahibine bir mesaj bırak:</p>
        <div class="form-group">
          <textarea id="istekMesaj" rows="3" style="resize:vertical" placeholder="Kendini tanıt, pozisyonun, tecrüben..."></textarea>
        </div>
        <div id="istekPopupAlert"></div>
        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="btn btn-green" id="istekOnayBtn" style="flex:1">Gönder</button>
          <button class="btn btn-outline" id="istekIptalBtn" style="flex:1">İptal</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(popup);

  popup.querySelector('#istekIptalBtn').addEventListener('click', () => popup.remove());
  popup.querySelector('#istekOnayBtn').addEventListener('click', async () => {
    const mesaj = popup.querySelector('#istekMesaj').value.trim();
    if (!mesaj) { popup.querySelector('#istekPopupAlert').innerHTML = '<div class="alert alert-red">Mesaj yazmak zorunlu.</div>'; return; }
    await sb.from('istekler').insert({ mac_id: macId, kullanici: session.kullanici, ad: session.ad, mesaj, durum: 'bekliyor' });
    popup.remove();
    detayYukle(macId, session);
  });
}

async function yorumEkle(macId, session, yorum) {
  await sb.from('yorumlar').insert({ mac_id: macId, kullanici: session.kullanici, ad: session.ad, yorum });
}

// --- EVENTS ---
function bindEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.getElementById('app').innerHTML = renderAuth(tab.dataset.tab);
      bindEvents();
    });
  });

  const girisBtn = document.getElementById('girisBtn');
  if (girisBtn) girisBtn.addEventListener('click', handleGiris);

  const kayitBtn = document.getElementById('kayitBtn');
  if (kayitBtn) kayitBtn.addEventListener('click', handleKayit);

  const cikisBtn = document.getElementById('cikisBtn');
  if (cikisBtn) cikisBtn.addEventListener('click', () => { clearSession(); aktifSayfa = 'liste'; aktifMacId = null; render(); });

  const navLogo = document.getElementById('navLogo');
  if (navLogo) navLogo.addEventListener('click', () => { aktifSayfa = 'liste'; aktifMacId = null; render(); });

  ['girisAd','girisSifre'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleGiris(); });
  });
}

function bindMacEvents(session, sehirFiltre = 'Tümü') {
  // Şehir filtresi
  document.querySelectorAll('[data-sehir]').forEach(btn => {
    btn.addEventListener('click', () => maclarYukle(session, btn.dataset.sehir));
  });

  // Şehir arama kutusu
  const sehirArama = document.getElementById('sehirArama');
  if (sehirArama) {
    // Yazarken öneri göster
    sehirArama.addEventListener('input', e => {
      const val = e.target.value.trim();
      const oneri = document.getElementById('sehirOneri');
      if (!val) { oneri.style.display = 'none'; return; }
      const eslesenler = SEHIRLER.filter(s => s !== 'Tümü' && trLower(s).includes(trLower(val)));
      if (!eslesenler.length) { oneri.style.display = 'none'; return; }
      oneri.style.display = 'block';
      oneri.innerHTML = eslesenler.map(s =>
        `<div class="oneri-item" data-sehir-sec="${s}">${s}</div>`
      ).join('');
      oneri.querySelectorAll('[data-sehir-sec]').forEach(item => {
        item.addEventListener('click', () => {
          sehirArama.value = item.dataset.sehirSec;
          oneri.style.display = 'none';
        });
      });
    });

    // Enter ile ara
    sehirArama.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        document.getElementById('sehirOneri').style.display = 'none';
        maclarYukle(session, sehirArama.value.trim() || 'Tümü');
      }
    });

    // Ara butonu
    document.getElementById('sehirAramaBtn').addEventListener('click', () => {
      document.getElementById('sehirOneri').style.display = 'none';
      maclarYukle(session, sehirArama.value.trim() || 'Tümü');
    });

    // Dışarı tıklayınca öneriyi kapat
    document.addEventListener('click', e => {
      if (!sehirArama.contains(e.target)) {
        const oneri = document.getElementById('sehirOneri');
        if (oneri) oneri.style.display = 'none';
      }
    });
  }

  const yeniMacBtn = document.getElementById('yeniMacBtn');
  if (yeniMacBtn) yeniMacBtn.addEventListener('click', () => {
    const form = document.getElementById('yeniMacForm');
    const acik = form.style.display === 'none';
    form.style.display = acik ? 'block' : 'none';
    if (acik) {
      secimHaritasi = null; secimMarker = null; seciliKoord = null;
      setTimeout(haritaBaslat, 50);
      // Saha arama
      const macKonum = document.getElementById('macKonum');
      if (macKonum) macKonum.addEventListener('input', e => sahaAra(e.target.value));
    }
  });

  const macIptalBtn = document.getElementById('macIptalBtn');
  if (macIptalBtn) macIptalBtn.addEventListener('click', () => {
    document.getElementById('yeniMacForm').style.display = 'none';
  });

  const macKaydetBtn = document.getElementById('macKaydetBtn');
  if (macKaydetBtn) macKaydetBtn.addEventListener('click', () => handleMacOlustur(session));

  document.querySelectorAll('[data-detay]').forEach(btn => {
    btn.addEventListener('click', () => {
      aktifSayfa = 'detay'; aktifMacId = btn.dataset.detay; render();
    });
  });

  document.querySelectorAll('[data-istek]').forEach(btn => {
    btn.addEventListener('click', () => { aktifSayfa = 'detay'; aktifMacId = btn.dataset.istek; render(); });
  });
  document.querySelectorAll('[data-ayril]').forEach(btn => {
    btn.addEventListener('click', () => handleAyril(btn.dataset.ayril, session));
  });
  document.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', () => handleSil(btn.dataset.sil, session));
  });
}

function golAnimasyonu(callback) {
  const overlay = document.createElement('div');
  overlay.id = 'golOverlay';
  overlay.innerHTML = `
    <div class="gol-saha">
      <div class="gol-kale">
        <div class="kale-ust"></div>
        <div class="kale-ic">
          <div class="kale-ag"></div>
        </div>
      </div>
      <div class="gol-top" id="golTop">⚽</div>
      <div class="gol-yazi" id="golYazi">GOOOL! 🎉</div>
    </div>`;
  document.body.appendChild(overlay);

  setTimeout(() => { document.getElementById('golTop').classList.add('top-ucuyor'); }, 100);
  setTimeout(() => { document.getElementById('golYazi').classList.add('yazi-gorunsun'); }, 900);
  setTimeout(() => {
    overlay.classList.add('overlay-kayboluyor');
    setTimeout(() => { overlay.remove(); callback(); }, 600);
  }, 2400);
}

// --- HANDLERS ---
async function handleGiris() {
  const kullanici = document.getElementById('girisAd').value.trim();
  const sifre = document.getElementById('girisSifre').value;
  const { data, error } = await sb.from('kullanicilar').select('*').eq('kullanici', kullanici).eq('sifre', sifre).single();
  if (error || !data) return showAlert('authAlert', 'Kullanıcı adı veya şifre hatalı.', 'red');
  golAnimasyonu(() => { setSession(data); render(); });
}

async function handleKayit() {
  const ad = document.getElementById('kayitAd').value.trim();
  const kullanici = document.getElementById('kayitKullanici').value.trim();
  const telefon = document.getElementById('kayitTelefon').value.trim();
  const sifre = document.getElementById('kayitSifre').value;
  if (!ad || !kullanici || !telefon || !sifre) return showAlert('authAlert', 'Tüm alanları doldurun.', 'red');

  const { data: mevcut } = await sb.from('kullanicilar').select('id').eq('kullanici', kullanici).single();
  if (mevcut) return showAlert('authAlert', 'Bu kullanıcı adı alınmış.', 'red');

  const { data, error } = await sb.from('kullanicilar').insert({ ad, kullanici, telefon, sifre }).select().single();
  if (error) return showAlert('authAlert', 'Kayıt başarısız, tekrar dene.', 'red');
  golAnimasyonu(() => { setSession(data); render(); });
}

async function handleMacOlustur(session) {
  const konum = document.getElementById('macKonum').value.trim();
  const sehir = document.getElementById('macSehir').value;
  const tarih = document.getElementById('macTarih').value;
  const saat = document.getElementById('macSaat').value;
  const takim1 = parseInt(document.getElementById('macTakim1').value);
  const takim2 = parseInt(document.getElementById('macTakim2').value);
  const fiyat = document.getElementById('macFiyat').value.trim();
  const aciklama = document.getElementById('macAciklama').value.trim();
  const eksik = takim1 + takim2;

  if (!konum || !tarih || !saat) return showAlert('macAlert', 'Konum, tarih ve saat zorunlu.', 'red');
  if (!aciklama) return showAlert('macAlert', 'Açıklama yazmak zorunlu.', 'red');
  if (!seciliKoord) return showAlert('macAlert', 'Lütfen haritadan veya aramadan konum seçin.', 'red');

  const { error } = await sb.from('maclar').insert({
    konum, sehir, tarih, saat, eksik, takim1, takim2, fiyat, aciklama,
    lat: seciliKoord.lat, lng: seciliKoord.lng,
    olusturan: session.kullanici,
    katilimcilar: []
  });
  if (error) return showAlert('macAlert', 'Maç oluşturulamadı.', 'red');
  seciliKoord = null;
  maclarYukle(session);
}

async function handleKatil(id, session) {
  const { data: mac } = await sb.from('maclar').select('katilimcilar, eksik, tarih').eq('id', id).single();
  if (!mac) return;
  if (mac.katilimcilar.includes(session.kullanici)) return;
  if (mac.katilimcilar.length >= mac.eksik) return;

  // Aynı gün başka maça kayıtlı mı kontrol et
  const { data: tumMaclar } = await sb.from('maclar').select('id, tarih, katilimcilar').eq('tarih', mac.tarih);
  const ayniGunKayitli = tumMaclar && tumMaclar.some(m => m.id !== id && m.katilimcilar && m.katilimcilar.includes(session.kullanici));
  if (ayniGunKayitli) {
    showAlert('macAlert', 'Bu tarihte zaten başka bir maça kayıtlısın.', 'red');
    return;
  }

  // Not popup'ı göster
  katilNotPopup(id, session, mac);
}

function katilNotPopup(macId, session, mac) {
  const popup = document.createElement('div');
  popup.id = 'katilPopup';
  popup.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
      <div style="background:#1a1a1a;border:1px solid #22c55e33;border-radius:16px;padding:28px;max-width:400px;width:100%">
        <h3 style="color:#22c55e;margin-bottom:8px">Maça Katıl</h3>
        <p style="color:#888;font-size:13px;margin-bottom:16px">Maç sahibine bir not bırak (zorunlu):</p>
        <div class="form-group">
          <textarea id="katilNot" rows="3" style="resize:vertical" placeholder="Kendini tanıt, pozisyonun, tecrüben..."></textarea>
        </div>
        <div id="katilPopupAlert"></div>
        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="btn btn-green" id="katilOnayBtn" style="flex:1">Katıl</button>
          <button class="btn btn-outline" id="katilIptalBtn" style="flex:1">İptal</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(popup);

  document.getElementById('katilIptalBtn').addEventListener('click', () => popup.remove());
  document.getElementById('katilOnayBtn').addEventListener('click', async () => {
    const not = document.getElementById('katilNot').value.trim();
    if (!not) {
      document.getElementById('katilPopupAlert').innerHTML = '<div class="alert alert-red">Not yazmak zorunlu.</div>';
      return;
    }
    // Notu kaydet (sadece sahibine)
    await sb.from('yorumlar').insert({
      mac_id: macId,
      kullanici: session.kullanici,
      ad: session.ad,
      yorum: not,
      sadece_sahibine: true
    });
    // Maça katıl
    const yeni = [...mac.katilimcilar, session.kullanici];
    await sb.from('maclar').update({ katilimcilar: yeni }).eq('id', macId);
    popup.remove();
    maclarYukle(session);
  });
}

async function handleAyril(id, session) {
  const { data: mac } = await sb.from('maclar').select('katilimcilar').eq('id', id).single();
  if (!mac) return;
  const yeni = mac.katilimcilar.filter(k => k !== session.kullanici);
  await sb.from('maclar').update({ katilimcilar: yeni }).eq('id', id);
  maclarYukle(session);
}

async function handleSil(id, session) {
  if (!confirm('Bu maçı silmek istediğine emin misin?')) return;
  await sb.from('maclar').delete().eq('id', id);
  maclarYukle(session);
}

function showAlert(elId, msg, type) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

// --- INIT ---
render();
