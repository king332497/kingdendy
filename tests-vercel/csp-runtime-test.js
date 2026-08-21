"use strict";
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const pages=["index.html","login.html","identitas.html","verifikasi.html","profil-pengajuan.html","tahap8.html","tahap9.html","dashboard.html"];
for(const file of pages){
  const text=fs.readFileSync(path.join(root,file),"utf8");
  if(!text.includes('/simulation-runtime.js?v=5')) throw new Error(`${file}: runtime v5 missing`);
  if(file!=="index.html"){
    const m=text.match(/http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]+)"/i);
    if(!m) throw new Error(`${file}: CSP missing`);
    const csp=m[1];
    if(!/script-src[^;]*'self'/.test(csp)) throw new Error(`${file}: CSP blocks same-origin runtime`);
    if(!/connect-src[^;]*'self'/.test(csp)) throw new Error(`${file}: CSP blocks same-origin API calls`);
  }
}
console.log("csp-runtime-test: PASS");
