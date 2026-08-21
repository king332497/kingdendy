"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {URL} = require("node:url");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const AUDIT_FILE = process.env.AUDIT_FILE ? path.resolve(process.env.AUDIT_FILE) : path.join(DATA_DIR, "admin-audit.log");
fs.mkdirSync(path.dirname(AUDIT_FILE), {recursive:true});

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "127.0.0.1";
const PROD = process.env.NODE_ENV === "production";
const ADMIN_ID = String(process.env.ADMIN_ID || "admin").slice(0,64);
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
if (!ADMIN_PASSWORD_HASH && !ADMIN_PASSWORD) {
  console.error("[startup] Set ADMIN_PASSWORD_HASH (preferred) or ADMIN_PASSWORD before starting the server.");
  process.exit(1);
}
if (PROD && !ADMIN_PASSWORD_HASH) console.warn("[security] Production should use ADMIN_PASSWORD_HASH instead of ADMIN_PASSWORD.");

const ROUTES = Object.freeze({
  HOME:{label:"Halaman Depan",path:"/index.html",progress:0},
  LOGIN:{label:"Login Demo",path:"/login.html",progress:1},
  IDENTITAS:{label:"Tahap 3 — Identitas",path:"/identitas.html",progress:2},
  VERIFIKASI:{label:"Tahap 4 — Verifikasi Demo",path:"/verifikasi.html",progress:3},
  PROFIL:{label:"Tahap 5 — Profil Pengajuan",path:"/profil-pengajuan.html?admin_stage=5#tahap-5",progress:4},
  DETAIL_PINJAMAN:{label:"Tahap 6 — Detail Pinjaman",path:"/profil-pengajuan.html?admin_stage=6#tahap-6",progress:5},
  RINGKASAN:{label:"Tahap 7 — Ringkasan",path:"/profil-pengajuan.html?admin_stage=7#tahap-7",progress:6},
  TAHAP_8:{label:"Tahap 8",path:"/tahap8.html",progress:7},
  PIN_DEMO:{label:"Konfirmasi PIN Demo",path:"/tahap8.html?admin_pin=1#pin-demo",progress:8},
  TAHAP_9:{label:"Tahap 9 — Analisis",path:"/tahap9.html",progress:9},
  DASHBOARD:{label:"Dashboard Simulasi",path:"/dashboard.html",progress:10}
});
const ROUTE_CODES = new Set(Object.keys(ROUTES));
const STATIC = new Map([
  ["/", "index.html"],["/index.html","index.html"],["/login.html","login.html"],["/identitas.html","identitas.html"],
  ["/verifikasi.html","verifikasi.html"],["/profil-pengajuan.html","profil-pengajuan.html"],["/tahap8.html","tahap8.html"],
  ["/tahap9.html","tahap9.html"],["/dashboard.html","dashboard.html"],["/simulation-runtime.js","simulation-runtime.js"],
  ["/admin","admin.html"],["/admin/","admin.html"],["/admin.html","admin.html"]
]);

const userSessions = new Map();
const adminSessions = new Map();
const adminClients = new Set();
const pendingCommands = new Map();
const loginAttempts = new Map();
let auditEntries = [];
try {
  auditEntries = fs.readFileSync(AUDIT_FILE,"utf8").trim().split("\n").filter(Boolean).slice(-200).map(line=>JSON.parse(line));
} catch (_) { auditEntries = []; }

function nowIso(){return new Date().toISOString();}
function safeJson(data){return JSON.stringify(data).replace(/</g,"\\u003c");}
function randomHex(bytes=24){return crypto.randomBytes(bytes).toString("hex");}
function sessionId(){return crypto.randomBytes(3).toString("hex").toUpperCase();}
function parseCookies(req){const out={};String(req.headers.cookie||"").split(";").forEach(part=>{const i=part.indexOf("=");if(i>0)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());});return out;}
function cookie(name,value,{httpOnly=true,sameSite="Lax",maxAge=null}={}){let s=`${name}=${encodeURIComponent(value)}; Path=/; SameSite=${sameSite}`;if(httpOnly)s+="; HttpOnly";if(PROD)s+="; Secure";if(maxAge!==null)s+=`; Max-Age=${maxAge}`;return s;}
function clearCookie(name){return `${name}=; Path=/; Max-Age=0; SameSite=Strict${PROD?"; Secure":""}; HttpOnly`;}
function securityHeaders(res,{admin=false,html=false}={}){
  res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","no-referrer");res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=(), payment=()");res.setHeader("X-Frame-Options","DENY");
  if(admin) res.setHeader("Cache-Control","no-store");
  if(html) res.setHeader("Content-Security-Policy",`default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`);
}
function sendJson(res,status,obj,extra={}){securityHeaders(res,{admin:true});res.writeHead(status,{"Content-Type":"application/json; charset=utf-8",...extra});res.end(safeJson(obj));}
function sendError(res,status,message){sendJson(res,status,{error:message});}
function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;const proto=(req.socket.encrypted?"https":"http");return origin===`${proto}://${req.headers.host}`;}
async function readJson(req,max=16384){return new Promise((resolve,reject)=>{let body="";req.on("data",chunk=>{body+=chunk;if(Buffer.byteLength(body)>max){reject(new Error("BODY_TOO_LARGE"));req.destroy();}});req.on("end",()=>{try{resolve(body?JSON.parse(body):{});}catch(_){reject(new Error("BAD_JSON"));}});req.on("error",reject);});}
function scryptHash(password,saltHex){return crypto.scryptSync(password,Buffer.from(saltHex,"hex"),64);}
function verifyPassword(password){
  if(typeof password!=="string"||password.length<1||password.length>256)return false;
  if(ADMIN_PASSWORD_HASH){const [kind,saltHex,hashHex]=ADMIN_PASSWORD_HASH.split("$");if(kind!=="scrypt"||!saltHex||!hashHex)return false;try{const a=scryptHash(password,saltHex),b=Buffer.from(hashHex,"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b);}catch(_){return false;}}
  const a=Buffer.from(password),b=Buffer.from(ADMIN_PASSWORD);return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function getAdmin(req){const token=parseCookies(req).admin_sid;if(!token)return null;const s=adminSessions.get(token);if(!s||s.expiresAt<Date.now()){if(token)adminSessions.delete(token);return null;}s.expiresAt=Date.now()+8*60*60*1000;return s;}
function requireAdmin(req,res){const a=getAdmin(req);if(!a){sendError(res,401,"Admin authentication required.");return null;}return a;}
function requireCsrf(req,res,admin){if(!sameOrigin(req)||!admin||req.headers["x-csrf-token"]!==admin.csrf){sendError(res,403,"CSRF validation failed.");return false;}return true;}
function getOrCreateUser(req,res){let sid=parseCookies(req).sim_sid;let session=sid&&userSessions.get(sid);if(!session){do{sid=sessionId();}while(userSessions.has(sid));session={sessionId:sid,routeCode:"HOME",lastSeen:Date.now(),clients:new Set(),online:false,createdAt:Date.now()};userSessions.set(sid,session);res.setHeader("Set-Cookie",cookie("sim_sid",sid,{sameSite:"Lax"}));}return session;}
function isOnline(s){return Boolean(s&&s.clients.size>0&&Date.now()-s.lastSeen<15000);}
function publicSession(s){const route=ROUTES[s.routeCode]||null;return{sessionId:s.sessionId,online:isOnline(s),routeCode:s.routeCode,routeLabel:route?.label||"Unknown",lastSeen:new Date(s.lastSeen).toISOString(),progress:route?.progress??0,progressLabel:`${route?.progress??0}/10`,pendingCommand:pendingCommands.has(s.sessionId)};}
function allSessions(){return [...userSessions.values()].sort((a,b)=>b.lastSeen-a.lastSeen).map(publicSession);}
function sseWrite(res,event,data){res.write(`event: ${event}\ndata: ${safeJson(data)}\n\n`);}
function broadcastSessions(){const payload={sessions:allSessions()};for(const res of adminClients){try{sseWrite(res,"sessions",payload);}catch(_){adminClients.delete(res);}}}
function appendAudit(entry){auditEntries.push(entry);if(auditEntries.length>200)auditEntries=auditEntries.slice(-200);fs.appendFile(AUDIT_FILE,safeJson(entry)+"\n",()=>{});for(const res of adminClients){try{sseWrite(res,"audit",entry);}catch(_){adminClients.delete(res);}}}
function auditCommand(cmd,status){const from=ROUTES[cmd.fromRoute],to=ROUTES[cmd.toRoute];appendAudit({adminId:cmd.adminId,sessionId:cmd.sessionId,fromRoute:cmd.fromRoute,toRoute:cmd.toRoute,fromLabel:from?.label||cmd.fromRoute,toLabel:to?.label||cmd.toRoute,timestamp:nowIso(),status});}
function completeIfArrived(session){const cmd=pendingCommands.get(session.sessionId);if(!cmd)return;if(session.routeCode===cmd.toRoute){clearTimeout(cmd.timer);pendingCommands.delete(session.sessionId);auditCommand(cmd,"SUCCESS");broadcastSessions();}}

function serveStatic(req,res,url){const rel=STATIC.get(url.pathname);if(!rel)return false;const file=path.join(ROOT,rel);if(!fs.existsSync(file)){sendError(res,404,"Not found");return true;}const ext=path.extname(file);const html=ext===".html";const admin=rel==="admin.html";securityHeaders(res,{admin,html});res.setHeader("Content-Type",html?"text/html; charset=utf-8":"text/javascript; charset=utf-8");if(!admin)res.setHeader("Cache-Control",ext===".js"?"no-cache":"no-store");fs.createReadStream(file).pipe(res);return true;}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
  try{
    if(req.method==="GET"&&serveStatic(req,res,url))return;

    if(req.method==="GET"&&url.pathname==="/api/session/bootstrap"){
      const s=getOrCreateUser(req,res);s.lastSeen=Date.now();sendJson(res,200,{sessionId:s.sessionId});broadcastSessions();return;
    }
    if(req.method==="POST"&&url.pathname==="/api/session/presence"){
      if(!sameOrigin(req))return sendError(res,403,"Origin rejected.");const s=getOrCreateUser(req,res);const body=await readJson(req);if(!ROUTE_CODES.has(body.routeCode))return sendError(res,400,"Invalid route code.");s.routeCode=body.routeCode;s.lastSeen=Date.now();completeIfArrived(s);sendJson(res,200,{ok:true});broadcastSessions();return;
    }
    if(req.method==="GET"&&url.pathname==="/api/session/events"){
      const s=getOrCreateUser(req,res);securityHeaders(res);res.writeHead(200,{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"});res.write(": connected\n\n");s.clients.add(res);s.online=true;s.lastSeen=Date.now();broadcastSessions();const hb=setInterval(()=>{try{res.write(": heartbeat\n\n");}catch(_){}},20000);req.on("close",()=>{clearInterval(hb);s.clients.delete(res);s.lastSeen=Date.now();setTimeout(broadcastSessions,100);});return;
    }

    if(req.method==="POST"&&url.pathname==="/api/admin/login"){
      if(!sameOrigin(req))return sendError(res,403,"Origin rejected.");const ip=req.socket.remoteAddress||"unknown";const attempt=loginAttempts.get(ip)||{count:0,reset:0};if(attempt.reset<Date.now()){attempt.count=0;attempt.reset=Date.now()+10*60*1000;}if(attempt.count>=8)return sendError(res,429,"Terlalu banyak percobaan login. Coba lagi nanti.");const body=await readJson(req);if(!verifyPassword(body.password)){attempt.count++;loginAttempts.set(ip,attempt);return sendError(res,401,"Password admin tidak valid.");}loginAttempts.delete(ip);const token=randomHex(32),csrf=randomHex(24);adminSessions.set(token,{adminId:ADMIN_ID,role:"admin",csrf,expiresAt:Date.now()+8*60*60*1000});sendJson(res,200,{ok:true},{"Set-Cookie":cookie("admin_sid",token,{sameSite:"Strict"})});return;
    }
    if(req.method==="GET"&&url.pathname==="/api/admin/me"){
      const a=requireAdmin(req,res);if(!a)return;sendJson(res,200,{adminId:a.adminId,role:a.role,csrfToken:a.csrf});return;
    }
    if(req.method==="POST"&&url.pathname==="/api/admin/logout"){
      const a=requireAdmin(req,res);if(!a)return;if(!requireCsrf(req,res,a))return;const token=parseCookies(req).admin_sid;adminSessions.delete(token);sendJson(res,200,{ok:true},{"Set-Cookie":clearCookie("admin_sid")});return;
    }
    if(req.method==="GET"&&url.pathname==="/api/admin/sessions"){
      const a=requireAdmin(req,res);if(!a)return;sendJson(res,200,{sessions:allSessions()});return;
    }
    if(req.method==="GET"&&url.pathname==="/api/admin/audit"){
      const a=requireAdmin(req,res);if(!a)return;const limit=Math.min(200,Math.max(1,Number(url.searchParams.get("limit")||100)));sendJson(res,200,{audits:auditEntries.slice(-limit)});return;
    }
    if(req.method==="GET"&&url.pathname==="/api/admin/events"){
      const a=requireAdmin(req,res);if(!a)return;securityHeaders(res,{admin:true});res.writeHead(200,{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"});res.write(": connected\n\n");adminClients.add(res);sseWrite(res,"snapshot",{sessions:allSessions(),audits:auditEntries.slice(-100)});const hb=setInterval(()=>{try{res.write(": heartbeat\n\n");}catch(_){}},20000);req.on("close",()=>{clearInterval(hb);adminClients.delete(res);});return;
    }
    if(req.method==="POST"&&url.pathname==="/api/admin/move"){
      const a=requireAdmin(req,res);if(!a)return;if(!requireCsrf(req,res,a))return;const body=await readJson(req);if(typeof body.sessionId!=="string"||!/^[A-F0-9]{6}$/.test(body.sessionId))return sendError(res,400,"Invalid session ID.");if(!ROUTE_CODES.has(body.routeCode))return sendError(res,400,"Route tidak ada dalam whitelist.");const s=userSessions.get(body.sessionId);const cmdBase={adminId:a.adminId,sessionId:body.sessionId,fromRoute:s?.routeCode||"UNKNOWN",toRoute:body.routeCode};if(!s||!isOnline(s)){auditCommand(cmdBase,"OFFLINE_REJECTED");return sendError(res,409,"User Offline — Tidak dapat dipindahkan");}
      if(pendingCommands.has(s.sessionId))return sendError(res,409,"Session masih memiliki command yang menunggu konfirmasi navigasi.");
      const commandId=randomHex(12);const cmd={...cmdBase,commandId,createdAt:Date.now(),timer:null};cmd.timer=setTimeout(()=>{if(pendingCommands.get(s.sessionId)?.commandId===commandId){pendingCommands.delete(s.sessionId);auditCommand(cmd,"TIMEOUT");broadcastSessions();}},12000);pendingCommands.set(s.sessionId,cmd);
      let delivered=0;for(const client of s.clients){try{sseWrite(client,"navigate",{commandId,routeCode:body.routeCode});delivered++;}catch(_){} }
      if(!delivered){clearTimeout(cmd.timer);pendingCommands.delete(s.sessionId);auditCommand(cmd,"OFFLINE_REJECTED");return sendError(res,409,"User Offline — Tidak dapat dipindahkan");}
      broadcastSessions();sendJson(res,202,{ok:true,commandId,status:"SENT",target:body.routeCode});return;
    }

    sendError(res,404,"Not found");
  }catch(err){if(!res.headersSent)sendError(res,err.message==="BODY_TOO_LARGE"?413:400,err.message==="BAD_JSON"?"Invalid JSON.":"Request failed.");else try{res.end();}catch(_){} }
});

setInterval(()=>{
  let changed=false;const cutoff=Date.now()-30*60*1000;
  for(const [sid,s] of userSessions){if(!s.clients.size&&s.lastSeen<cutoff&&!pendingCommands.has(sid)){userSessions.delete(sid);changed=true;}}
  for(const [token,a] of adminSessions){if(a.expiresAt<Date.now())adminSessions.delete(token);}
  if(changed)broadcastSessions();
},10000).unref();

server.listen(PORT,HOST,()=>console.log(`Simulation server listening on http://${HOST}:${PORT}`));
