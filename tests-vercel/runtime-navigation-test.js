"use strict";
const http=require("node:http");
const assert=require("node:assert");
const backend=require("../lib/realtime-backend");

function json(res,status,obj){res.statusCode=status;res.setHeader("content-type","application/json");res.end(JSON.stringify(obj));}
function createMockRedis(){
  const values=new Map(), sets=new Map(), lists=new Map(), expiry=new Map();
  function purge(key){const exp=expiry.get(key);if(exp&&exp<=Date.now()){values.delete(key);sets.delete(key);lists.delete(key);expiry.delete(key);}}
  function get(key){purge(key);return values.has(key)?values.get(key):null;}
  function cmd(a){
    const c=String(a[0]||"").toUpperCase();
    if(c==="PING")return"PONG";
    if(c==="GET")return get(a[1]);
    if(c==="SET"){values.set(a[1],String(a[2]));const exIndex=a.findIndex(x=>String(x).toUpperCase()==="EX");if(exIndex>0)expiry.set(a[1],Date.now()+Number(a[exIndex+1])*1000);return"OK";}
    if(c==="DEL"){let n=0;for(const k of a.slice(1)){purge(k);if(values.delete(k)||sets.delete(k)||lists.delete(k))n++;expiry.delete(k);}return n;}
    if(c==="INCR"){const n=Number(get(a[1])||0)+1;values.set(a[1],String(n));return n;}
    if(c==="EXPIRE"){if(get(a[1])===null)return 0;expiry.set(a[1],Date.now()+Number(a[2])*1000);return 1;}
    if(c==="SADD"){const s=sets.get(a[1])||new Set();let n=0;for(const v of a.slice(2)){if(!s.has(String(v))){s.add(String(v));n++;}}sets.set(a[1],s);return n;}
    if(c==="SMEMBERS"){const s=sets.get(a[1])||new Set();return [...s];}
    if(c==="SREM"){const s=sets.get(a[1])||new Set();let n=0;for(const v of a.slice(2)){if(s.delete(String(v)))n++;}sets.set(a[1],s);return n;}
    if(c==="MGET")return a.slice(1).map(get);
    if(c==="LPUSH"){const l=lists.get(a[1])||[];for(const v of a.slice(2))l.unshift(String(v));lists.set(a[1],l);return l.length;}
    if(c==="LTRIM"){const l=lists.get(a[1])||[];const start=Number(a[2]),end=Number(a[3]);lists.set(a[1],l.slice(start,end+1));return"OK";}
    if(c==="LRANGE"){const l=lists.get(a[1])||[];const start=Number(a[2]),end=Number(a[3]);return l.slice(start,end+1);}
    throw new Error(`Unsupported mock command ${c}`);
  }
  const server=http.createServer(async(req,res)=>{
    let raw="";for await(const chunk of req)raw+=chunk;
    try{
      const body=raw?JSON.parse(raw):[];
      if(req.url==="/pipeline")return json(res,200,body.map(x=>({result:cmd(x)})));
      return json(res,200,{result:cmd(body)});
    }catch(e){return json(res,400,{error:e.message});}
  });
  return {server,values,sets,lists,expiry,cmd};
}

function cookieFrom(headers,name){
  const sc=headers.get("set-cookie")||"";
  const m=sc.match(new RegExp(`${name}=([^;]+)`));return m?`${name}=${m[1]}`:"";
}
async function call(base,path,{method="GET",cookie="",body,csrf}={}){
  const headers={"x-forwarded-proto":"http","Origin":base};if(cookie)headers.Cookie=cookie;if(body!==undefined)headers["Content-Type"]="application/json";if(csrf)headers["X-CSRF-Token"]=csrf;
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});
  const data=await r.json();return{r,data};
}

(async()=>{
  const mock=createMockRedis();await new Promise(r=>mock.server.listen(0,"127.0.0.1",r));
  const redisPort=mock.server.address().port;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.KV_REST_API_URL=`http://127.0.0.1:${redisPort}`;
  process.env.KV_REST_API_TOKEN="test-token";
  process.env.ADMIN_PASSWORD="LocalTest#2026";
  process.env.ADMIN_ID="admin-test";

  const routes={
    "/api/health":backend.health,
    "/api/session/bootstrap":backend.sessionBootstrap,
    "/api/session/presence":backend.sessionPresence,
    "/api/session/command":backend.sessionCommand,
    "/api/admin/login":backend.adminLogin,
    "/api/admin/me":backend.adminMe,
    "/api/admin/logout":backend.adminLogout,
    "/api/admin/sessions":backend.adminSessions,
    "/api/admin/audit":backend.adminAudit,
    "/api/admin/move":backend.adminMove
  };
  const app=http.createServer((req,res)=>{const p=new URL(req.url,"http://x").pathname;(routes[p]||((q,s)=>json(s,404,{error:"not found"})))(req,res);});
  await new Promise(r=>app.listen(0,"127.0.0.1",r));
  const base=`http://127.0.0.1:${app.address().port}`;

  let x=await call(base,"/api/health");assert.equal(x.r.status,200);assert.equal(x.data.ok,true);
  x=await call(base,"/api/admin/me");assert.equal(x.r.status,401);

  x=await call(base,"/api/session/bootstrap");assert.equal(x.r.status,200);const userCookie=cookieFrom(x.r.headers,"sim_sid");assert(userCookie);const sid=x.data.sessionId;assert(/^[A-F0-9]{6}$/.test(sid));
  x=await call(base,"/api/session/presence",{method:"POST",cookie:userCookie,body:{routeCode:"VERIFIKASI"}});assert.equal(x.r.status,200);

  x=await call(base,"/api/admin/login",{method:"POST",body:{password:"LocalTest#2026"}});assert.equal(x.r.status,200);const adminCookie=cookieFrom(x.r.headers,"admin_sid");assert(adminCookie);
  x=await call(base,"/api/admin/me",{cookie:adminCookie});assert.equal(x.r.status,200);const csrf=x.data.csrfToken;assert(csrf);
  x=await call(base,"/api/admin/sessions",{cookie:adminCookie});assert.equal(x.r.status,200);const s=x.data.sessions.find(v=>v.sessionId===sid);assert(s&&s.online);assert.equal(s.routeCode,"VERIFIKASI");

  x=await call(base,"/api/admin/move",{method:"POST",cookie:adminCookie,body:{sessionId:sid,routeCode:"TAHAP_8"}});assert.equal(x.r.status,403,"move tanpa CSRF harus ditolak");
  x=await call(base,"/api/admin/move",{method:"POST",cookie:adminCookie,csrf,body:{sessionId:sid,routeCode:"https://evil.example"}});assert.equal(x.r.status,400,"arbitrary URL harus ditolak");
  x=await call(base,"/api/admin/move",{method:"POST",cookie:adminCookie,csrf,body:{sessionId:sid,routeCode:"TAHAP_8"}});assert.equal(x.r.status,202);

  x=await call(base,"/api/session/command",{cookie:userCookie});assert.equal(x.r.status,200);assert.equal(x.data.command.routeCode,"TAHAP_8");
  x=await call(base,"/api/session/presence",{method:"POST",cookie:userCookie,body:{routeCode:"TAHAP_8"}});assert.equal(x.r.status,200);
  x=await call(base,"/api/admin/sessions",{cookie:adminCookie});const s2=x.data.sessions.find(v=>v.sessionId===sid);assert.equal(s2.routeCode,"TAHAP_8");assert.equal(s2.pendingCommand,false);
  x=await call(base,"/api/admin/audit?limit=100",{cookie:adminCookie});assert(x.data.audits.some(a=>a.sessionId===sid&&a.status==="SUCCESS"&&a.toRoute==="TAHAP_8"));
  for(const item of x.data.audits){for(const forbidden of ["password","pin","otp","nik","cvv"]){assert(!Object.keys(item).some(k=>k.toLowerCase().includes(forbidden)));}}

  const raw=await backend._internal.redis(["GET",backend._internal.keys.session(sid)]);const old=JSON.parse(raw);old.lastSeen=Date.now()-60_000;await backend._internal.redis(["SET",backend._internal.keys.session(sid),JSON.stringify(old),"EX",1800]);
  x=await call(base,"/api/admin/move",{method:"POST",cookie:adminCookie,csrf,body:{sessionId:sid,routeCode:"DASHBOARD"}});assert.equal(x.r.status,409);assert.equal(x.data.code,"USER_OFFLINE");

  // Regression: browser yang langsung membuka Tahap 5 harus tercatat sebagai PROFIL,
  // bukan HOME. Current route juga dibawa pada polling GET agar WebView tetap akurat.
  x=await call(base,"/api/session/bootstrap?routeCode=PROFIL");assert.equal(x.r.status,200);
  const user2Cookie=cookieFrom(x.r.headers,"sim_sid");const sid2=x.data.sessionId;assert(user2Cookie);
  x=await call(base,"/api/admin/sessions",{cookie:adminCookie});
  const u2=x.data.sessions.find(v=>v.sessionId===sid2);assert(u2);assert.equal(u2.routeCode,"PROFIL");
  x=await call(base,"/api/session/command?routeCode=DETAIL_PINJAMAN",{cookie:user2Cookie});assert.equal(x.r.status,200);
  x=await call(base,"/api/admin/sessions",{cookie:adminCookie});
  const u2b=x.data.sessions.find(v=>v.sessionId===sid2);assert(u2b);assert.equal(u2b.routeCode,"DETAIL_PINJAMAN");

  x=await call(base,"/api/admin/logout",{method:"POST",cookie:adminCookie,csrf,body:{}});assert.equal(x.r.status,200);
  x=await call(base,"/api/admin/me",{cookie:adminCookie});assert.equal(x.r.status,401);

  await new Promise(r=>app.close(r));await new Promise(r=>mock.server.close(r));
  console.log("runtime-navigation-test: PASS");
})().catch(err=>{console.error(err);process.exitCode=1;});
