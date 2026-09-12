(function(){
var API='https://api.anihub.in.ua';
var INTERNAL='https://anihub.in.ua/api';
var UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
var FALLBACK='https://raw.githubusercontent.com/arranoust/MiraiExt-SkyStream/main/banner.jpg';

function H(ref,accept,extra){
  var h={'User-Agent':UA,'Accept':accept||'application/json,text/plain,*/*','Referer':ref||manifest.baseUrl+'/'};
  try{h.Origin=new URL(ref||manifest.baseUrl+'/').origin}catch(e){h.Origin=manifest.baseUrl}
  if(extra)for(var k in extra)h[k]=extra[k];
  return h
}
function dec(s){return String(s==null?'':s).replace(/\\u0026/g,'&').replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#039;/g,"'")}
function txt(s){return dec(s).replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()}
function pick(o,ks,d){for(var i=0;i<ks.length;i++){var v=o&&o[ks[i]];if(v!==undefined&&v!==null&&v!=='')return v}return d}
function n(v,d){var x=parseInt(v,10);return isNaN(x)?d:x}
async function raw(u,h){
  try{
    var r=await http_get(u,h||H()),b=r&&typeof r.body==='string'?r.body:'';
    return{body:b,status:r&&((r.statusCode||r.status))||0}
  }catch(e){return{body:'',status:0,error:String(e)}}
}
async function json(u,h){var r=await raw(u,h||H(manifest.baseUrl+'/'));if(!r.body)throw new Error('HTTP '+r.status+' '+u);return JSON.parse(r.body)}
function abs(u,base){u=dec(u).trim();if(!u)return'';if(/^https?:\/\//i.test(u))return u;if(u.indexOf('//')===0)return'https:'+u;try{return new URL(u,base||manifest.baseUrl+'/').toString()}catch(e){return''}}
function titleOf(x){var t=pick(x,['title_ukrainian','title_ua','name_uk','name','title'],null);if(t)return txt(t);var ts=x&&x.titles||{};return txt(pick(ts,['ukrainian','uk','ua','english','original'],'AniHub'))}
function slugOf(x){return String(pick(x,['slug'],'')||'')}
function idOf(x){return n(pick(x,['id','anime_id'],0),0)}
function pageUrl(x){var id=idOf(x),s=slugOf(x);if(s&&id)return manifest.baseUrl+'/anime/'+s+'-'+id;if(s)return manifest.baseUrl+'/anime/'+s;return manifest.baseUrl+'/anime/'+id}
function posterOf(x){var c=[pick(x,['poster_url','poster','image_url','image','cover_url','cover'],''),x&&x.images&&pick(x.images,['poster','large','medium','original'],'')];for(var i=0;i<c.length;i++){var u=abs(c[i]);if(u)return u}return FALLBACK}
function descOf(x){return txt(pick(x,['description_ukrainian','description_ua','description','synopsis','overview'],'')||'')}
function epCount(x){return n(pick(x,['episodes_count','episodes','episode_count','episodes_total'],1),1)||1}
function item(x){return new MultimediaItem({title:titleOf(x),url:pageUrl(x),posterUrl:posterOf(x),type:'anime'})}
function arrFrom(d){if(Array.isArray(d))return d;if(d&&Array.isArray(d.items))return d.items;if(d&&Array.isArray(d.results))return d.results;if(d&&Array.isArray(d.anime))return d.anime;if(d&&d.data)return arrFrom(d.data);return[]}
async function section(path){try{var a=arrFrom(await json(API+path)),o=[];for(var i=0;i<a.length&&i<20;i++)o.push(item(a[i]));return o}catch(e){console.log('[AniHub v10][section] '+String(e));return[]}}
async function getHome(cb){
  try{
    var j=await Promise.all([
      section('/anime/newest?limit=20'),
      section('/anime/popular?limit=20'),
      section('/anime/seasonal?limit=20'),
      section('/anime?ordering=-updated_at&page=1&page_size=20&has_ukrainian_dub=true')
    ]),d={};
    if(j[0].length)d['🆕 Новинки AniHub']=j[0];
    if(j[1].length)d['🔥 Популярне']=j[1];
    if(j[2].length)d['🌸 Поточний сезон']=j[2];
    if(j[3].length)d['🇺🇦 Українською']=j[3];
    cb({success:true,data:d})
  }catch(e){cb({success:false,error:'AniHub getHome: '+String(e)})}
}
async function search(q,cb){
  try{
    var a=arrFrom(await json(API+'/anime?search='+encodeURIComponent(q)+'&page=1&page_size=20&ordering=-rating')),o=[];
    for(var i=0;i<a.length&&i<20;i++)o.push(item(a[i]));
    if(!o.length)return cb({success:false,error:'Нічого не знайдено.'});
    cb({success:true,data:o})
  }catch(e){cb({success:false,error:'AniHub search: '+String(e)})}
}
function idFromPage(u){var m=String(u||'').match(/-(\d+)(?:[/?#]|$)/);if(m)return n(m[1],0);m=String(u||'').match(/\/anime\/(\d+)(?:[/?#]|$)/);return m?n(m[1],0):0}
function pack(page,ep){return'anihub:episode:'+encodeURIComponent(JSON.stringify({page:page,episode:ep}))}
function unpack(s){try{return JSON.parse(decodeURIComponent(String(s||'').slice('anihub:episode:'.length)))}catch(e){return null}}
function meta(s,p){var m=String(s||'').match(new RegExp('<meta[^>]+property=["\\\']'+p+'["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\']','i'));return m?dec(m[1]):''}
async function load(url,cb){
  try{
    var id=idFromPage(url),x=id?await json(API+'/anime/'+id):null,p=await raw(url,H(url,'text/html,*/*')),html=p.body||'',
      poster=x?posterOf(x):(abs(meta(html,'og:image'))||FALLBACK),count=x?epCount(x):1,eps=[];
    for(var i=1;i<=count;i++)eps.push(new Episode({name:'Серія '+i,url:pack(url,i),season:1,episode:i,dubStatus:'dubbed',posterUrl:poster}));
    cb({success:true,data:new MultimediaItem({
      title:x?titleOf(x):txt(meta(html,'og:title')||'AniHub'),url:url,posterUrl:poster,bannerUrl:poster,
      type:'anime',description:x?descOf(x):'',episodes:eps
    })})
  }catch(e){cb({success:false,error:'AniHub load: '+String(e)})}
}

function sha256(ascii){
  function rr(v,a){return(v>>>a)|(v<<(32-a))}
  var mp=Math.pow,mw=mp(2,32),i,j,res='',w=[],bits=ascii.length*8,h=sha256.h=sha256.h||[],k=sha256.k=sha256.k||[],pc=k.length,c={};
  for(var q=2;pc<64;q++)if(!c[q]){for(i=0;i<313;i+=q)c[i]=q;h[pc]=(mp(q,.5)*mw)|0;k[pc++]=(mp(q,1/3)*mw)|0}
  ascii+='\x80';while(ascii.length%64-56)ascii+='\x00';
  for(i=0;i<ascii.length;i++){j=ascii.charCodeAt(i);if(j>>8)return'';w[i>>2]|=j<<((3-i)%4)*8}
  w[w.length]=(bits/mw)|0;w[w.length]=bits;
  for(j=0;j<w.length;){
    var a=w.slice(j,j+=16),hh=h.slice(0);
    for(i=0;i<64;i++){
      var w15=a[i-15],w2=a[i-2],A=hh[0],E=hh[4],
        t1=hh[7]+(rr(E,6)^rr(E,11)^rr(E,25))+((E&hh[5])^((~E)&hh[6]))+k[i]+
        (a[i]=(i<16)?a[i]:((a[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+a[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0)),
        t2=(rr(A,2)^rr(A,13)^rr(A,22))+((A&hh[1])^(A&hh[2])^(hh[1]&hh[2]));
      hh=[(t1+t2)|0,A,hh[1],hh[2],(hh[3]+t1)|0,hh[4],hh[5],hh[6]]
    }
    for(i=0;i<8;i++)h[i]=(h[i]+hh[i])|0
  }
  for(i=0;i<8;i++)for(j=3;j+1;j--){var b=(h[i]>>(j*8))&255;res+=(b<16?'0':'')+b.toString(16)}
  return res
}
function pad2(v){return v<10?'0'+v:String(v)}
function apiKey(off){var d=new Date(Date.now()+(off||0)*86400000),ds=d.getUTCFullYear()+'-'+pad2(d.getUTCMonth()+1)+'-'+pad2(d.getUTCDate());return sha256('Ukr@in1anAn1me-S3curity-Key-2025_'+ds)}
async function sources(id,season){
  var u=INTERNAL+'/anime/'+id+'/episode-sources?season='+season,ks=[apiKey(0),apiKey(-1),apiKey(1)];
  for(var i=0;i<ks.length;i++){
    var r=await raw(u,H(manifest.baseUrl+'/','application/json,text/plain,*/*',{'X-API-Key':ks[i],'X-Requested-With':'XMLHttpRequest'}));
    if(r.body)try{return JSON.parse(r.body)}catch(e){}
  }
  throw new Error('sources unavailable')
}

function explicitEp(o){
  var v=pick(o,['episode_number','episode','number','ep','episodeNumber'],null);
  if(v===null||v===undefined||v==='')return null;
  var x=parseInt(v,10);return isNaN(x)?null:x
}
function playerKind(u){
  u=String(u||'');
  if(/uacdn\.online/i.test(u))return'uacdn';
  if(/ashdi\.vip/i.test(u))return'ashdi';
  if(/fenix/i.test(u))return'fenix';
  if(/moonanime|moonplayer|moon/i.test(u))return'moon';
  return''
}
function collectPlayers(node,ep,out,seen,label,depth){
  if(depth>12||node==null)return;
  if(Array.isArray(node)){for(var i=0;i<node.length;i++)collectPlayers(node[i],ep,out,seen,label,depth+1);return}
  if(typeof node!=='object')return;
  var oe=explicitEp(node);if(oe!==null&&oe!==ep)return;
  var here=String(pick(node,['studio_name','studio','label','name','provider','player'],label||'AniHub'));
  for(var k in node){
    var v=node[k];
    if(typeof v!=='string')continue;
    if(!/(url|src|link|iframe|player|embed|vod|video)/i.test(k))continue;
    var u=abs(v,manifest.baseUrl+'/'),kind=playerKind(u);
    if(kind&&!seen[u]){seen[u]=1;out.push({url:u,label:here,kind:kind})}
  }
  for(var q in node)collectPlayers(node[q],ep,out,seen,here,depth+1)
}
function urlsFromText(s){
  var out=[],seen={},re=/(https?:\\?\/\\?\/[^"'\\s<>]+)/ig,m;
  while((m=re.exec(String(s||'')))){
    var u=dec(m[1]).replace(/\\\//g,'/').replace(/[),;]+$/,'');
    if(/^https?:\/\//i.test(u)&&!seen[u]){seen[u]=1;out.push(u)}
  }
  return out
}
function directMedia(s){
  var out=[],seen={},re=/(https?:\\?\/\\?\/[^"'\\s<>]+?\.(?:m3u8|mp4)(?:\?[^"'\\s<>]*)?)/ig,m;
  while((m=re.exec(String(s||'')))){
    var u=dec(m[1]).replace(/\\\//g,'/');
    if(!seen[u]){seen[u]=1;out.push(u)}
  }
  return out
}
function streamHeaders(ref,extra){
  var h={'Referer':ref||manifest.baseUrl+'/','User-Agent':UA};
  try{h.Origin=new URL(ref||manifest.baseUrl+'/').origin}catch(e){}
  if(extra)for(var k in extra)h[k]=extra[k];
  return h
}
function candidate(out,u,label,ref,extra){
  u=dec(u).trim().replace(/\\\//g,'/');
  if(/^https?:\/\//i.test(u)&&/\.(m3u8|mp4)(?:[?#]|$)/i.test(u))
    out.push({url:u,source:label||'AniHub',headers:streamHeaders(ref,extra)})
}
function jsonAssignment(s,marker){
  var p=String(s||'').indexOf(marker);if(p<0)return'';
  var a=String(s).slice(p+marker.length),eq=a.indexOf('=');if(eq>=0)a=a.slice(eq+1);
  var st=-1,open='',close='';
  for(var x=0;x<a.length;x++){if(a[x]==='{'){st=x;open='{';close='}';break}if(a[x]==='['){st=x;open='[';close=']';break}}
  if(st<0)return'';
  var d=0,q='',esc=false;
  for(var i=st;i<a.length;i++){
    var c=a.charAt(i);
    if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue}
    if(c==='"'||c==="'"||c==='`'){q=c;continue}
    if(c===open)d++;
    else if(c===close&&--d===0)return a.slice(st,i+1)
  }
  return''
}
function playerFileValue(ph){
  var m=/\bfile\s*:/.exec(ph||'');if(!m)return null;
  var i=m.index+m[0].length,nx=ph.length;while(i<nx&&/\s/.test(ph.charAt(i)))i++;
  if(i>=nx)return null;
  var q=ph.charAt(i);
  if(q==='"'||q==="'"||q==='`'){
    i++;var out='',esc=false;
    for(;i<nx;i++){var c=ph.charAt(i);if(esc){out+=c;esc=false;continue}if(c==='\\'){esc=true;out+=c;continue}if(c===q)break;out+=c}
    return dec(out).replace(/\\(["'\/])/g,'$1')
  }
  if(q==='['){
    var st=i,dep=0,str='',esc2=false;
    for(;i<nx;i++){
      var ch=ph.charAt(i);
      if(str){if(esc2){esc2=false;continue}if(ch==='\\'){esc2=true;continue}if(ch===str)str='';continue}
      if(ch==='"'||ch==="'"||ch==='`'){str=ch;continue}
      if(ch==='[')dep++;else if(ch===']'){dep--;if(dep===0)return dec(ph.slice(st,i+1))}
    }
  }
  var r=ph.slice(i).match(/^(https?:\/\/[^\s,}]+)/i);return r?dec(r[1]):null
}
function normQuality(q,u){
  var s=String(q||'')+' '+String(u||'');
  if(/2160|4k|uhd/i.test(s))return'2160p';
  if(/1440/i.test(s))return'1440p';
  if(/1080|fhd/i.test(s))return'1080p';
  if(/720/i.test(s))return'720p';
  if(/480/i.test(s))return'480p';
  if(/360/i.test(s))return'360p';
  return'Auto'
}
function qRank(q){var m=String(q||'').match(/(2160|1440|1080|720|480|360)/);return m?parseInt(m[1],10):0}
function addFile(out,file,label,ref,extra){
  var r=dec(String(file||'').trim()),m,re=/\[([^\]]+)\](https?:\/\/[^,\s]+)/g,a=[],seen={};
  while((m=re.exec(r))!==null){
    var u=dec(m[2]),q=normQuality(m[1],u);
    if(!seen[u]){seen[u]=1;a.push({u:u,q:q})}
  }
  if(!a.length&&/^https?:\/\//i.test(r))a.push({u:r,q:normQuality('',r)});
  a.sort(function(x,y){return qRank(y.q)-qRank(x.q)});
  for(var i=0;i<a.length;i++)candidate(out,a[i].u,(label||'AniHub')+(a[i].q!=='Auto'?' · '+a[i].q:''),ref,extra)
}
function flat(nod,o,path,pos){
  path=path||[];if(!nod)return;
  if(Array.isArray(nod)){for(var i=0;i<nod.length;i++)flat(nod[i],o,path,i+1);return}
  if(typeof nod!=='object')return;
  var title=txt(nod.title||''),next=path;if(nod.folder&&title)next=path.concat([title]);
  if(nod.file){
    var nums=title.match(/\d{1,3}/g),ep=nums&&nums.length?parseInt(nums[nums.length-1],10):(pos||1);
    o.push({title:title,number:ep,file:dec(nod.file),group:path.join(' › ')})
  }
  if(nod.folder)flat(nod.folder,o,next,1)
}
function uacdnPayload(s){
  var m=String(s||'').match(/window\.__PLAYER_PAYLOAD__\s*=\s*(\{[\s\S]*?\});/);
  if(!m)return null;try{return JSON.parse(m[1])}catch(e){return null}
}

async function resolveUacdn(player,page,ep){
  var out=[],r=await raw(player,H(page,'text/html,application/xhtml+xml,*/*')),p=r.body?uacdnPayload(r.body):null;
  if(!p)return out;
  var tr=Array.isArray(p.translations)?p.translations.slice():[];
  if(!tr.length)tr=[{id:p.translate,title:p.translateTitle||'UA'}];
  for(var i=0;i<tr.length&&i<6;i++){
    var t=tr[i];
    try{
      var body=JSON.stringify({
        id:parseInt(p.id,10)||0,
        translation:parseInt(t.id,10)||parseInt(p.translate,10)||0,
        season_number:p.is_serial?(parseInt(p.season,10)||1):null,
        episode_number:p.is_serial?ep:null,
        force_cdn:String(p.force_cdn||''),
        turnstile_token:''
      }),
      api=new URL('/api/player/files',player).toString(),
      hs={'User-Agent':UA,'Accept':'application/json','Content-Type':'application/json','Referer':player,'Origin':new URL(player).origin},
      rr=await http_post(api,hs,body),text=rr&&typeof rr.body==='string'?rr.body:'';
      if(!text)continue;
      var j=JSON.parse(text),f=String(j.file||'');
      if(f)addFile(out,f,txt(t.title||p.translateTitle||'UACDN'),player)
    }catch(e){console.log('[AniHub v10][uacdn] '+String(e))}
  }
  return out
}
async function resolveAshdi(player,page,ep){
  var out=[],r=await raw(player,H(page,'text/html,application/xhtml+xml,*/*')),pf=r.body?playerFileValue(r.body):null;
  if(!pf)return out;
  if(/^https?:\/\//i.test(pf)){addFile(out,pf,'ASHDI',player);return out}
  try{
    var cfg=JSON.parse(pf),a=[];flat(cfg,a,[],1);
    for(var i=0;i<a.length;i++)if(a[i].number===ep)addFile(out,a[i].file,txt(a[i].group||a[i].title||'ASHDI'),player);
    if(!out.length&&a.length===1)addFile(out,a[0].file,'ASHDI',player)
  }catch(e){console.log('[AniHub v10][ashdi] '+String(e))}
  return out
}
async function resolveFenix(player,label,ep){
  var out=[],r=await raw(player,H(player,'text/html,application/xhtml+xml,*/*')),s=r.body||'';
  if(!s)return out;
  var aj=jsonAssignment(s,'window.FENIX_MEDIA_ACCESS')||jsonAssignment(s,'FENIX_MEDIA_ACCESS'),access={};
  if(aj)try{access=JSON.parse(aj)||{}}catch(e){}
  var token=String(pick(access,['token','access_token','media_token'],'')||''),extra={};
  if(token){extra.Authorization='Bearer '+token;extra['X-Access-Token']=token}
  if(access.headers&&typeof access.headers==='object')for(var hk in access.headers)extra[hk]=String(access.headers[hk]);
  var pj=jsonAssignment(s,'window.FENIX_PLAYLIST')||jsonAssignment(s,'FENIX_PLAYLIST')||jsonAssignment(s,'window.__PLAYER_PAYLOAD__');
  if(pj)try{
    var pl=JSON.parse(pj),eps=[];
    if(Array.isArray(pl))eps=pl;
    else if(Array.isArray(pl.episodes))eps=pl.episodes;
    else if(Array.isArray(pl.items))eps=pl.items;
    else eps=[pl];
    for(var i=0;i<eps.length;i++){
      var e=eps[i],en=explicitEp(e);
      if(en!==null&&en!==ep)continue;
      var tracks=[];
      if(Array.isArray(e.tracks))tracks=e.tracks;
      else if(Array.isArray(e.sources))tracks=e.sources;
      else tracks=[e];
      for(var j=0;j<tracks.length;j++){
        var tr=tracks[j]||{},hu=abs(pick(tr,['hls_url','url','src','file'],'')||'',player);
        if(!hu||!/\.(m3u8|mp4)(?:[?#]|$)/i.test(hu))continue;
        if(token)try{var x=new URL(hu);if(!x.searchParams.get('token'))x.searchParams.append('token',token);hu=x.toString()}catch(e2){}
        candidate(out,hu,label||'Fenix',player,extra)
      }
    }
  }catch(e){console.log('[AniHub v10][fenix json] '+String(e))}
  var dm=directMedia(s);
  for(var z=0;z<dm.length;z++){
    var hu2=dm[z];
    if(token)try{var y=new URL(hu2);if(!y.searchParams.get('token'))y.searchParams.append('token',token);hu2=y.toString()}catch(e3){}
    candidate(out,hu2,label||'Fenix',player,extra)
  }
  return out
}
async function resolveMoon(player,label,ep){
  var out=[],r=await raw(player,H(player,'text/html,application/xhtml+xml,*/*')),s=r.body||'';
  if(!s)return out;
  var dm=directMedia(s);
  for(var i=0;i<dm.length;i++)candidate(out,dm[i],label||'MoonAnime',player);
  return out
}
async function resolvePlayer(c,ep,page){
  if(c.kind==='uacdn')return await resolveUacdn(c.url,page,ep);
  if(c.kind==='ashdi')return await resolveAshdi(c.url,page,ep);
  if(c.kind==='fenix')return await resolveFenix(c.url,c.label,ep);
  if(c.kind==='moon')return await resolveMoon(c.url,c.label,ep);
  return[]
}
async function verifyOne(s){
  var u=String(s&&s.url||'');if(!u)return false;
  if(/\.mp4(?:[?#]|$)/i.test(u))return true;
  if(!/\.m3u8(?:[?#]|$)/i.test(u))return false;
  var hs={};
  var src=s.headers||{};
  for(var k in src)hs[k]=src[k];
  hs.Accept='application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';
  var r=await raw(u,hs);
  var b=String(r.body||'');
  var ok=(r.status===200||r.status===206||r.status===0)&&b.indexOf('#EXTM3U')>=0;
  if(!ok)console.log('[AniHub v10][reject] '+r.status+' '+u.slice(0,140));
  return ok
}
function dedupeCandidates(a){
  var o=[],s={};
  for(var i=0;i<a.length;i++){
    var u=String(a[i]&&a[i].url||'');
    if(u&&!s[u]){s[u]=1;o.push(a[i])}
  }
  return o
}
async function validatedStreams(a){
  a=dedupeCandidates(a);
  var good=[];
  for(var i=0;i<a.length&&i<12;i++){
    if(await verifyOne(a[i])){
      good.push(new StreamResult({url:a[i].url,source:a[i].source||'AniHub',headers:a[i].headers||{}}));
      if(good.length>=3)break
    }
  }
  return good
}

async function loadStreams(url,cb){
  try{
    var info=unpack(String(url||''));
    if(!info||!info.page)return cb({success:false,error:'AniHub v10: bad episode token'});
    var id=idFromPage(info.page),ep=n(info.episode,1),players=[],chosen=0;
    for(var season=1;season<=10;season++){
      try{
        var src=await sources(id,season),cc=[],seen={};
        collectPlayers(src,ep,cc,seen,'AniHub',0);
        if(cc.length){chosen=season;players=cc;break}
      }catch(e){}
    }
    console.log('[AniHub v10][players] id='+id+' season='+chosen+' ep='+ep+' count='+players.length);
    if(!players.length)return cb({success:false,error:'AniHub v10: player не знайдений'});
    var rawStreams=[];
    var preferred=['fenix','uacdn','ashdi','moon'];
    players.sort(function(a,b){return preferred.indexOf(a.kind)-preferred.indexOf(b.kind)});
    for(var i=0;i<players.length&&i<8;i++){
      var got=await resolvePlayer(players[i],ep,info.page);
      for(var g=0;g<got.length;g++)rawStreams.push(got[g]);
      var test=await validatedStreams(rawStreams);
      if(test.length){
        console.log('[AniHub v10][ok] id='+id+' season='+chosen+' ep='+ep+' player='+players[i].kind+' streams='+test.length);
        return cb({success:true,data:test})
      }
    }
    console.log('[AniHub v10][none] id='+id+' season='+chosen+' ep='+ep+' players='+players.length+' candidates='+rawStreams.length);
    cb({success:false,error:'AniHub v10: жоден відеопотік не пройшов перевірку'})
  }catch(e){
    console.log('[AniHub v10][fatal] '+String(e));
    cb({success:false,error:'AniHub v10: '+String(e)})
  }
}

globalThis.getHome=getHome;
globalThis.search=search;
globalThis.load=load;
globalThis.loadStreams=loadStreams;
}());