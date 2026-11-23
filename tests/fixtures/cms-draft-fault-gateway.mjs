import { createServer, request } from "node:http";
import { appendFileSync } from "node:fs";
let failingRead;
const injectedReadFailures = new Set();
const ports={auth:54412,rest:54413,storage:54414};
createServer((req,res)=>{
 const match=/^\/(auth|rest|storage)\/v1(?=\/|$)/.exec(req.url);
 if(!match){res.writeHead(404).end();return;}
 const path=req.url.slice(match[0].length)||"/";
 const start=performance.now();
 if(failingRead && req.method==="GET" && path.startsWith("/projects?") && path.includes("revisions.order=")
    && new URL(path,"http://fixture").searchParams.get("id")==="eq."+failingRead) {
   failingRead=undefined;
   res.writeHead(500,{"content-type":"application/json"}).end(JSON.stringify({code:"XX000",message:"Isolated read-back failure"}));
   return;
 }
 const forward=(body)=>{
  const dest=request({hostname:"127.0.0.1", port:ports[match[1]], path, method:req.method, headers:req.headers}, reply=>{
   res.writeHead(reply.statusCode,reply.headers);
   reply.pipe(res);
   reply.on("end",()=>{
    if(path.startsWith("/rpc/cms_save_case_study") || (path.startsWith("/projects?")&&path.includes("revisions.order="))) {
     appendFileSync("/tmp/stage742-db-times.jsonl",JSON.stringify({kind:path.startsWith("/rpc")?"write":"revision-read",status:reply.statusCode,ms:performance.now()-start})+"\n");
    }
   });
  });
  dest.on("error",()=>res.writeHead(502).end());
  if(body)dest.end(body);else req.pipe(dest);
 };
 if(req.method==="POST"&&path.startsWith("/rpc/cms_save_case_study")){
  const parts=[];
  req.on("data",chunk=>parts.push(chunk));
  req.on("end",()=>{
   const body=Buffer.concat(parts);
   let marker;
   try{
     const payload=JSON.parse(body);
     marker=payload.fields?.summary;
     if(marker==="p0-test-readback-error" && !injectedReadFailures.has(payload.project)) {
      injectedReadFailures.add(payload.project);
      failingRead=payload.project;
     }
   }catch{}
   if(marker==="p0-test-rpc-outage"){
    res.writeHead(503,{"content-type":"application/json"}).end(JSON.stringify({code:"PGRST003",message:"Isolated fixture outage"}));
   }else if(marker==="p0-test-rpc-timeout"){
    const timer=setTimeout(()=>res.writeHead(504).end(),20000);
    res.on("close",()=>clearTimeout(timer));
   }else forward(body);
  });
 }else forward();
}).listen(54411,"127.0.0.1");
