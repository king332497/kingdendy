"use strict";

const crypto = require("node:crypto");

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
  DASHBOARD:{label:"Dashboard Simulasi",path:"/dashboard.html",progress:10},
  HASIL_PENGAJUAN:{label:"Hasil Simulasi Pengajuan",path:"/hasil-pengajuan.html",progress:10}
});
const ROUTE_CODES = new Set(Object.keys(ROUTES));
const SESSION_TTL = 30 * 60;
const ONLINE_MS = 30_000;
const COMMAND_TTL = 20;
const ADMIN_TTL = 8 * 60 * 60;
const AUDIT_LIMIT = 200;
const SECURE_COOKIE = process.env.VERCEL === "1" || process.env.NODE_ENV === "production" || process.env.FORCE_SECURE_COOKIE === "1";
const PREFIX = "kb-sim:v5";

function nowIso(){ return new Date().toISOString(); }
function randomHex(bytes=24){ return crypto.randomBytes(bytes).toString("hex"); }
function newSessionId(){ return crypto.randomBytes(3).toString("hex").toUpperCase(); }
function safeJson(data){ return JSON.stringify(data).replace(/</g,"\\u003c"); }
function hashText(value){ return crypto.createHash("sha256").update(String(value)).digest("hex"); }
function constantEqual(a,b){
  const x=Buffer.from(String(a||"")), y=Buffer.from(String(b||""));
  return x.length===y.length && crypto.timingSafeEqual(x,y);
}
function parseCookies(req){
  const out={};
  String(req.headers.cookie||"").split(";").forEach(part=>{
    const i=part.indexOf("=");
    if(i>0){
      try{ out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim()); }catch(_){ }
    }
  });
  return out;
}
function requestOrigin(req){
  const proto=String(req.headers["x-forwarded-proto"]||"https").split(",")[0].trim();
  const host=String(req.headers["x-forwarded-host"]||req.headers.host||"").split(",")[0].trim();
  return host ? `${proto}://${host}` : "";
}
function sameOrigin(req){
  const origin=req.headers.origin;
  return !origin || origin===requestOrigin(req);
}
function cookie(name,value,{httpOnly=true,sameSite="Lax",maxAge=null}={}){
  let s=`${name}=${encodeURIComponent(value)}; Path=/; SameSite=${sameSite}`;
  if(SECURE_COOKIE)s+="; Secure";
  if(httpOnly)s+="; HttpOnly";
  if(maxAge!==null)s+=`; Max-Age=${maxAge}`;
  return s;
}
function clearCookie(name){ return `${name}=; Path=/; Max-Age=0; SameSite=Strict${SECURE_COOKIE?"; Secure":""}; HttpOnly`; }
function setSecurityHeaders(res){
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Cache-Control","no-store, max-age=0");
}
function sendJson(res,status,obj,extra={}){
  setSecurityHeaders(res);
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  for(const [k,v] of Object.entries(extra)) res.setHeader(k,v);
  res.end(safeJson(obj));
}
function sendError(res,status,message,code){ sendJson(res,status,{error:message,...(code?{code}:{})}); }
async function readBody(req,max=16_384){
  if(req.body && typeof req.body==="object" && !Buffer.isBuffer(req.body)) return req.body;
  if(typeof req.body==="string"){
    if(Buffer.byteLength(req.body)>max) throw Object.assign(new Error("BODY_TOO_LARGE"),{status:413});
    try{return req.body?JSON.parse(req.body):{};}catch(_){throw Object.assign(new Error("BAD_JSON"),{status:400});}
  }
  return await new Promise((resolve,reject)=>{
    let raw="";
    req.on("data",chunk=>{
      raw+=chunk;
      if(Buffer.byteLength(raw)>max) reject(Object.assign(new Error("BODY_TOO_LARGE"),{status:413}));
    });
    req.on("end",()=>{try{resolve(raw?JSON.parse(raw):{});}catch(_){reject(Object.assign(new Error("BAD_JSON"),{status:400}));}});
    req.on("error",reject);
  });
}

function redisConfig(){
  // Support direct Upstash variable names and Vercel Marketplace KV variable names.
  // Secrets remain server-side inside Vercel Functions.
  const url=String(
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL ||
    ""
  ).replace(/\/$/,"");
  const token=String(
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN ||
    ""
  );
  if(!url||!token) return null;
  return {url,token};
}

async function redis(command){
  const cfg=redisConfig();
  if(!cfg) throw Object.assign(new Error("REDIS_NOT_CONFIGURED"),{status:503});
  const r=await fetch(cfg.url,{method:"POST",headers:{"Authorization":`Bearer ${cfg.token}`,"Content-Type":"application/json","User-Agent":"chatgpt-generated-vercel-demo"},body:JSON.stringify(command),cache:"no-store"});
  const data=await r.json().catch(()=>({error:`Redis HTTP ${r.status}`}));
  if(!r.ok||data.error) throw Object.assign(new Error(data.error||"REDIS_ERROR"),{status:502});
  return data.result;
}
async function pipeline(commands){
  const cfg=redisConfig();
  if(!cfg) throw Object.assign(new Error("REDIS_NOT_CONFIGURED"),{status:503});
  const r=await fetch(`${cfg.url}/pipeline`,{method:"POST",headers:{"Authorization":`Bearer ${cfg.token}`,"Content-Type":"application/json","User-Agent":"chatgpt-generated-vercel-demo"},body:JSON.stringify(commands),cache:"no-store"});
  const data=await r.json().catch(()=>null);
  if(!r.ok||!Array.isArray(data)) throw Object.assign(new Error("REDIS_PIPELINE_ERROR"),{status:502});
  return data.map(item=>{ if(item&&item.error) throw Object.assign(new Error(item.error),{status:502}); return item?.result; });
}

const keys={
  session:sid=>`${PREFIX}:session:${sid}`,
  sessions:`${PREFIX}:sessions`,
  command:sid=>`${PREFIX}:command:${sid}`,
  audit:`${PREFIX}:audit`,
  admin:jti=>`${PREFIX}:admin:${jti}`,
  login:ipHash=>`${PREFIX}:login:${ipHash}`
};

function adminCredentialConfig(){
  const plain=String(process.env.ADMIN_PASSWORD||"");
  if(plain) return {mode:"password",material:plain};
  const hash=String(process.env.ADMIN_PASSWORD_HASH||"");
  if(hash) return {mode:"hash",material:hash};
  return {mode:"none",material:""};
}
function adminSecret(){
  const {material}=adminCredentialConfig();
  if(!material) return "";
  return crypto.createHash("sha256").update(`kb-sim-admin-session|${material}`).digest();
}
function signAdminPayload(payload){
  const secret=adminSecret();
  if(!secret) throw Object.assign(new Error("ADMIN_CREDENTIAL_NOT_CONFIGURED"),{status:503});
  const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig=crypto.createHmac("sha256",secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verifyAdminToken(token){
  if(typeof token!=="string"||!token.includes(".")) return null;
  const [body,sig]=token.split(".");
  const secret=adminSecret();
  if(!secret) return null;
  const expected=crypto.createHmac("sha256",secret).update(body).digest("base64url");
  if(!constantEqual(sig,expected)) return null;
  try{
    const payload=JSON.parse(Buffer.from(body,"base64url").toString("utf8"));
    if(!payload||payload.exp<Date.now()||payload.role!=="admin"||!payload.jti||!payload.csrf) return null;
    return payload;
  }catch(_){return null;}
}
function scryptHash(password,saltHex){return crypto.scryptSync(password,Buffer.from(saltHex,"hex"),64);}
function verifyPassword(password){
  if(typeof password!=="string"||password.length<1||password.length>256) return false;
  const credential=adminCredentialConfig();
  if(credential.mode==="password") return constantEqual(password,credential.material);
  if(credential.mode==="hash"){
    const [kind,saltHex,hashHex]=credential.material.split("$");
    if(kind!=="scrypt"||!saltHex||!hashHex) return false;
    try{
      const a=scryptHash(password,saltHex),b=Buffer.from(hashHex,"hex");
      return a.length===b.length&&crypto.timingSafeEqual(a,b);
    }catch(_){return false;}
  }
  return false;
}
async function requireAdmin(req,res){
  const token=parseCookies(req).admin_sid;
  const payload=verifyAdminToken(token);
  if(!payload){sendError(res,401,"Admin authentication required.","ADMIN_REQUIRED");return null;}
  const alive=await redis(["GET",keys.admin(payload.jti)]);
  if(!alive){sendError(res,401,"Admin session expired.","ADMIN_EXPIRED");return null;}
  return payload;
}
function requireCsrf(req,res,admin){
  if(!sameOrigin(req)||!admin||!constantEqual(req.headers["x-csrf-token"],admin.csrf)){
    sendError(res,403,"CSRF validation failed.","CSRF_FAILED");return false;
  }
  return true;
}
function routePublic(session,pending=false){
  const route=ROUTES[session.routeCode]||null;
  const lastSeen=Number(session.lastSeen||0);
  return {
    sessionId:session.sessionId,
    online:Date.now()-lastSeen<ONLINE_MS,
    routeCode:session.routeCode,
    routeLabel:route?.label||"Unknown",
    lastSeen:new Date(lastSeen||Date.now()).toISOString(),
    progress:route?.progress??0,
    progressLabel:`${route?.progress??0}/10`,
    pendingCommand:Boolean(pending)
  };
}
async function loadSession(sid){
  const raw=await redis(["GET",keys.session(sid)]);
  if(!raw) return null;
  try{return JSON.parse(raw);}catch(_){return null;}
}
async function storeSession(session){
  await pipeline([
    ["SET",keys.session(session.sessionId),safeJson(session),"EX",SESSION_TTL],
    ["SADD",keys.sessions,session.sessionId]
  ]);
}
async function ensureSession(req,res){
  let sid=parseCookies(req).sim_sid;
  let session=sid&&/^[A-F0-9]{6}$/.test(sid)?await loadSession(sid):null;
  if(!session){
    for(let i=0;i<6;i++){
      sid=newSessionId();
      if(!(await loadSession(sid))) break;
    }
    session={sessionId:sid,routeCode:"HOME",lastSeen:Date.now(),createdAt:Date.now()};
    res.setHeader("Set-Cookie",cookie("sim_sid",sid,{sameSite:"Lax",maxAge:SESSION_TTL}));
    await storeSession(session);
  }
  return session;
}
async function appendAudit(entry){
  const clean={adminId:String(entry.adminId||"admin").slice(0,64),sessionId:String(entry.sessionId||"").slice(0,12),fromRoute:String(entry.fromRoute||"UNKNOWN").slice(0,40),toRoute:String(entry.toRoute||"UNKNOWN").slice(0,40),fromLabel:String(entry.fromLabel||"").slice(0,100),toLabel:String(entry.toLabel||"").slice(0,100),timestamp:entry.timestamp||nowIso(),status:String(entry.status||"UNKNOWN").slice(0,40)};
  await pipeline([["LPUSH",keys.audit,safeJson(clean)],["LTRIM",keys.audit,0,AUDIT_LIMIT-1]]);
}
async function auditCommand(command,status){
  const from=ROUTES[command.fromRoute],to=ROUTES[command.toRoute];
  await appendAudit({adminId:command.adminId,sessionId:command.sessionId,fromRoute:command.fromRoute,toRoute:command.toRoute,fromLabel:from?.label||command.fromRoute,toLabel:to?.label||command.toRoute,timestamp:nowIso(),status});
}
async function listSessions(){
  const ids=await redis(["SMEMBERS",keys.sessions])||[];
  if(!ids.length) return [];
  const sessionKeys=ids.map(keys.session), commandKeys=ids.map(keys.command);
  const [sessionValues,commandValues]=await pipeline([["MGET",...sessionKeys],["MGET",...commandKeys]]);
  const stale=[];
  const out=[];
  ids.forEach((sid,i)=>{
    const raw=sessionValues?.[i];
    if(!raw){stale.push(sid);return;}
    try{out.push(routePublic(JSON.parse(raw),Boolean(commandValues?.[i])));}catch(_){stale.push(sid);}
  });
  if(stale.length) redis(["SREM",keys.sessions,...stale]).catch(()=>{});
  return out.sort((a,b)=>new Date(b.lastSeen)-new Date(a.lastSeen));
}
async function getAudits(limit=100){
  const n=Math.min(AUDIT_LIMIT,Math.max(1,Number(limit)||100));
  const rows=await redis(["LRANGE",keys.audit,0,n-1])||[];
  return rows.map(row=>{try{return JSON.parse(row);}catch(_){return null;}}).filter(Boolean).reverse();
}
function configStatus(){
  const credential=adminCredentialConfig();
  return {redis:Boolean(redisConfig()),adminCredential:credential.mode!=="none",adminCredentialMode:credential.mode};
}
function handleError(res,err){
  const status=Number(err?.status)||500;
  if(err?.message==="REDIS_NOT_CONFIGURED") return sendError(res,503,"Realtime storage belum dikonfigurasi. Hubungkan Upstash Redis ke project Vercel atau tambahkan REST URL/token Redis pada Environment Variables.","REDIS_NOT_CONFIGURED");
  if(err?.message==="ADMIN_CREDENTIAL_NOT_CONFIGURED") return sendError(res,503,"Kredensial admin belum dikonfigurasi.","ADMIN_CREDENTIAL_NOT_CONFIGURED");
  if(err?.message==="BAD_JSON") return sendError(res,400,"Invalid JSON.","BAD_JSON");
  if(err?.message==="BODY_TOO_LARGE") return sendError(res,413,"Request body terlalu besar.","BODY_TOO_LARGE");
  console.error("[api]",err?.message||err);
  return sendError(res,status>=400&&status<600?status:500,"Request failed.","REQUEST_FAILED");
}
function method(req,res,allowed){
  if(allowed.includes(req.method)) return true;
  res.setHeader("Allow",allowed.join(", "));
  sendError(res,405,"Method not allowed.","METHOD_NOT_ALLOWED");
  return false;
}

async function applyRouteAndAck(session,routeCode){
  if(!session||!ROUTE_CODES.has(routeCode)) return false;
  session.routeCode=routeCode;
  session.lastSeen=Date.now();
  await storeSession(session);
  const commandRaw=await redis(["GET",keys.command(session.sessionId)]);
  if(commandRaw){
    try{
      const command=JSON.parse(commandRaw);
      if(command.toRoute===routeCode){
        await auditCommand(command,"SUCCESS");
        await redis(["DEL",keys.command(session.sessionId)]);
      }
    }catch(_){ }
  }
  return true;
}
function routeCodeFromRequest(req){
  try{
    const u=new URL(req.url,requestOrigin(req)||"https://local.invalid");
    const routeCode=String(u.searchParams.get("routeCode")||"");
    return ROUTE_CODES.has(routeCode)?routeCode:null;
  }catch(_){return null;}
}

async function sessionBootstrap(req,res){
  try{
    if(!method(req,res,["GET"]))return;
    const session=await ensureSession(req,res);
    const routeCode=routeCodeFromRequest(req);
    if(routeCode) await applyRouteAndAck(session,routeCode);
    else {session.lastSeen=Date.now();await storeSession(session);}
    sendJson(res,200,{sessionId:session.sessionId,routeCode:session.routeCode});
  }catch(e){handleError(res,e);}
}
async function sessionPresence(req,res){
  try{
    if(!method(req,res,["POST"]))return;
    if(!sameOrigin(req))return sendError(res,403,"Origin rejected.","ORIGIN_REJECTED");
    const body=await readBody(req);
    if(!ROUTE_CODES.has(body.routeCode))return sendError(res,400,"Invalid route code.","INVALID_ROUTE");
    const session=await ensureSession(req,res);
    await applyRouteAndAck(session,body.routeCode);
    sendJson(res,200,{ok:true,routeCode:body.routeCode});
  }catch(e){handleError(res,e);}
}
async function sessionCommand(req,res){
  try{
    if(!method(req,res,["GET"]))return;
    const sid=parseCookies(req).sim_sid;
    if(!sid||!/^[A-F0-9]{6}$/.test(sid)) return sendJson(res,200,{command:null});
    const session=await loadSession(sid);
    if(!session)return sendJson(res,200,{command:null});
    const routeCode=routeCodeFromRequest(req);
    if(routeCode) await applyRouteAndAck(session,routeCode);
    else {session.lastSeen=Date.now();await storeSession(session);}
    const raw=await redis(["GET",keys.command(sid)]);
    if(!raw)return sendJson(res,200,{command:null});
    let command=null;try{command=JSON.parse(raw);}catch(_){ }
    if(!command||!ROUTE_CODES.has(command.toRoute))return sendJson(res,200,{command:null});
    sendJson(res,200,{command:{commandId:command.commandId,routeCode:command.toRoute}});
  }catch(e){handleError(res,e);}
}
async function adminLogin(req,res){
  try{
    if(!method(req,res,["POST"]))return;if(!sameOrigin(req))return sendError(res,403,"Origin rejected.","ORIGIN_REJECTED");
    if(!configStatus().adminCredential)return sendError(res,503,"Kredensial admin belum dikonfigurasi.","ADMIN_CREDENTIAL_NOT_CONFIGURED");
    if(!configStatus().redis)return handleError(res,Object.assign(new Error("REDIS_NOT_CONFIGURED"),{status:503}));
    const ip=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].trim();
    const ipHash=hashText(ip).slice(0,24), rateKey=keys.login(ipHash);
    const attempts=Number(await redis(["GET",rateKey])||0);
    if(attempts>=8)return sendError(res,429,"Terlalu banyak percobaan login. Coba lagi nanti.","RATE_LIMITED");
    const body=await readBody(req);
    if(!verifyPassword(body.password)){
      const n=await redis(["INCR",rateKey]);if(Number(n)===1)await redis(["EXPIRE",rateKey,600]);
      return sendError(res,401,"Password admin tidak valid.","INVALID_PASSWORD");
    }
    await redis(["DEL",rateKey]);
    const payload={adminId:String(process.env.ADMIN_ID||"admin").slice(0,64),role:"admin",csrf:randomHex(24),jti:randomHex(20),exp:Date.now()+ADMIN_TTL*1000};
    await redis(["SET",keys.admin(payload.jti),"1","EX",ADMIN_TTL]);
    const token=signAdminPayload(payload);
    sendJson(res,200,{ok:true},{"Set-Cookie":cookie("admin_sid",token,{sameSite:"Strict",maxAge:ADMIN_TTL})});
  }catch(e){handleError(res,e);}
}
async function adminMe(req,res){
  try{if(!method(req,res,["GET"]))return;const admin=await requireAdmin(req,res);if(!admin)return;sendJson(res,200,{adminId:admin.adminId,role:admin.role,csrfToken:admin.csrf});}catch(e){handleError(res,e);}
}
async function adminLogout(req,res){
  try{if(!method(req,res,["POST"]))return;const admin=await requireAdmin(req,res);if(!admin)return;if(!requireCsrf(req,res,admin))return;await redis(["DEL",keys.admin(admin.jti)]);sendJson(res,200,{ok:true},{"Set-Cookie":clearCookie("admin_sid")});}catch(e){handleError(res,e);}
}
async function adminSessions(req,res){
  try{if(!method(req,res,["GET"]))return;const admin=await requireAdmin(req,res);if(!admin)return;sendJson(res,200,{sessions:await listSessions()});}catch(e){handleError(res,e);}
}
async function adminAudit(req,res){
  try{if(!method(req,res,["GET"]))return;const admin=await requireAdmin(req,res);if(!admin)return;const u=new URL(req.url,requestOrigin(req)||"https://local.invalid");sendJson(res,200,{audits:await getAudits(u.searchParams.get("limit")||100)});}catch(e){handleError(res,e);}
}
async function adminMove(req,res){
  try{
    if(!method(req,res,["POST"]))return;const admin=await requireAdmin(req,res);if(!admin)return;if(!requireCsrf(req,res,admin))return;
    const body=await readBody(req);
    if(typeof body.sessionId!=="string"||!/^[A-F0-9]{6}$/.test(body.sessionId))return sendError(res,400,"Invalid session ID.","INVALID_SESSION");
    if(!ROUTE_CODES.has(body.routeCode))return sendError(res,400,"Route tidak ada dalam whitelist.","INVALID_ROUTE");
    const session=await loadSession(body.sessionId);
    const commandBase={adminId:admin.adminId,sessionId:body.sessionId,fromRoute:session?.routeCode||"UNKNOWN",toRoute:body.routeCode};
    if(!session||Date.now()-Number(session.lastSeen||0)>=ONLINE_MS){await auditCommand(commandBase,"OFFLINE_REJECTED");return sendError(res,409,"User Offline — Tidak dapat dipindahkan","USER_OFFLINE");}
    const existing=await redis(["GET",keys.command(body.sessionId)]);if(existing)return sendError(res,409,"Session masih memiliki command navigasi yang aktif.","COMMAND_PENDING");
    const command={...commandBase,commandId:randomHex(12),createdAt:Date.now()};
    await redis(["SET",keys.command(body.sessionId),safeJson(command),"EX",COMMAND_TTL]);
    await auditCommand(command,"SENT");
    sendJson(res,202,{ok:true,commandId:command.commandId,status:"SENT",target:body.routeCode});
  }catch(e){handleError(res,e);}
}
async function health(req,res){
  try{
    if(!method(req,res,["GET"]))return;
    const config=configStatus();
    let redisOk=false;
    if(config.redis){try{redisOk=(await redis(["PING"]))==="PONG";}catch(_){redisOk=false;}}
    sendJson(res,redisOk&&config.adminCredential?200:503,{ok:redisOk&&config.adminCredential,redisConfigured:config.redis,redisReachable:redisOk,adminCredentialConfigured:config.adminCredential,adminCredentialMode:config.adminCredentialMode,routes:Object.keys(ROUTES).length,mode:"vercel-functions+shared-redis+polling",runtimeVersion:"5"});
  }catch(e){handleError(res,e);}
}

module.exports={ROUTES,sessionBootstrap,sessionPresence,sessionCommand,adminLogin,adminMe,adminLogout,adminSessions,adminAudit,adminMove,health,_internal:{redis,pipeline,keys,verifyPassword,verifyAdminToken,routePublic,configStatus,adminCredentialConfig}};
