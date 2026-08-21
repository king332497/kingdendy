"use strict";
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert");
const root=path.resolve(__dirname,"..");
const pages=["index.html","login.html","identitas.html","verifikasi.html","profil-pengajuan.html","tahap8.html","tahap9.html","dashboard.html"];
for(const file of pages){
  const text=fs.readFileSync(path.join(root,file),"utf8");
  assert(text.includes("simulation-runtime.js"),`${file} harus memuat simulation-runtime.js`);
}
const runtime=fs.readFileSync(path.join(root,"simulation-runtime.js"),"utf8");
assert(runtime.includes('/api/session/command'),"runtime harus polling command");
assert(!runtime.includes('new EventSource'),"runtime Vercel tidak boleh bergantung pada SSE process-local");
assert(runtime.includes('Object.hasOwn(ROUTES'),"runtime harus memiliki browser-side whitelist");

assert(runtime.includes('routeQuery(routeCode)'),"runtime bootstrap/command harus membawa current route");
assert(runtime.includes('#stage5:not([hidden])'),"runtime harus dapat mendeteksi Tahap 5 dari DOM");
assert(runtime.includes('#stage6:not([hidden])'),"runtime harus dapat mendeteksi Tahap 6 dari DOM");
assert(runtime.includes('#stage7:not([hidden])'),"runtime harus dapat mendeteksi Tahap 7 dari DOM");
assert(!runtime.includes('document.hidden) return'),"command polling tidak boleh berhenti hanya karena tab background");
const admin=fs.readFileSync(path.join(root,"admin.html"),"utf8");
assert(admin.includes('/api/admin/move'),"admin move endpoint hilang");
assert(admin.includes('/api/admin/sessions'),"admin sessions endpoint hilang");
assert(!admin.includes('new EventSource'),"admin Vercel harus memakai shared-state polling, bukan process-local SSE");
const backend=fs.readFileSync(path.join(root,"lib/realtime-backend.js"),"utf8");
for(const bad of ["eval(","new Function(","child_process","exec(","spawn("]){assert(!backend.includes(bad),`backend mengandung pola terlarang: ${bad}`);}
assert(backend.includes('ROUTE_CODES.has(body.routeCode)'),"backend whitelist route harus aktif");
assert(backend.includes('UPSTASH_REDIS_REST_URL'),"direct Upstash Redis config hilang");
assert(backend.includes('KV_REST_API_URL'),"Vercel Marketplace KV URL fallback hilang");
assert(backend.includes('KV_REST_API_TOKEN'),"Vercel Marketplace KV token fallback hilang");
console.log("static-security-test: PASS");
