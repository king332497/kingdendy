"use strict";
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','simulation-runtime.js'),'utf8');
let assigned=null;let eventSource=null;const listeners={};
const body={appendChild(){}};
const document={body,hidden:false,getElementById(){return null;},createElement(){return{style:{},setAttribute(){},textContent:''}},addEventListener(){}};
const location={protocol:'http:',pathname:'/index.html',search:'',hash:'',assign(v){assigned=v;}};
const window={addEventListener(){},setInterval(){return 1},setTimeout(fn){fn();}};
class ES{constructor(url){this.url=url;this.handlers={};eventSource=this;}addEventListener(name,fn){this.handlers[name]=fn;}close(){}emit(name,payload){this.handlers[name]?.({data:JSON.stringify(payload)});}}
async function fetchMock(url){if(url==='/api/session/bootstrap')return{ok:true,json:async()=>({sessionId:'A1B2C3'})};if(url==='/api/session/presence')return{ok:true,json:async()=>({ok:true})};return{ok:false,json:async()=>({})};}
const context={window,document,location,EventSource:ES,fetch:fetchMock,URLSearchParams,JSON,Object,Intl,Date,console,setTimeout:window.setTimeout,setInterval:window.setInterval};
context.globalThis=context;
vm.createContext(context);vm.runInContext(code,context);
setTimeout(()=>{
  if(!eventSource)throw new Error('EventSource not created');
  eventSource.emit('navigate',{routeCode:'TAHAP_8',commandId:'x'});
  if(assigned!=='/tahap8.html')throw new Error('whitelisted navigation failed: '+assigned);
  assigned=null;
  eventSource.emit('navigate',{routeCode:'https://evil.example'});
  if(assigned!==null)throw new Error('arbitrary navigation was accepted');
  eventSource.emit('navigate',{routeCode:'PIN_DEMO'});
  if(assigned!=='/tahap8.html?admin_pin=1#pin-demo')throw new Error('PIN route failed: '+assigned);
  console.log(JSON.stringify({whitelist_navigation:true,arbitrary_route_ignored:true,pin_route:true},null,2));
},0);
