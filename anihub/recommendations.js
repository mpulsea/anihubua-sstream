
(function(){
var API='https://api.anihub.in.ua';
var UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
var baseLoad=globalThis.load;
function n(v,d){var x=parseInt(v,10);return isNaN(x)?d:x}
function dec(s){return String(s==null?'':s).replace(/\\u0026/g,'&').replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&quot;/g,'"')}
function txt(s){return dec(s).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()}
function pick(o,keys,d){for(var i=0;i<keys.length;i++){var v=o&&o[keys[i]];if(v!==undefined&&v!==null&&v!=='')return v}return d}
function titleOf(x){var t=pick(x,['title_ukrainian','title_ua','name_uk','name','title'],null);if(t)return txt(t);var ts=x&&x.titles||{};return txt(pick(ts,['ukrainian','uk','ua','english','original'],'AniHub'))}
function idOf(x){return n(pick(x,['id','anime_id'],0),0)}
function slugOf(x){return String(pick(x,['slug'],'')||'')}
function pageUrl(x){var id=idOf(x),slug=slugOf(x);if(slug&&id)return manifest.baseUrl+'/anime/'+slug+'-'+id;if(slug)return manifest.baseUrl+'/anime/'+slug;return manifest.baseUrl+'/anime/'+id}
function posterOf(x){var u=String(pick(x,['poster_url','poster','image_url','image','cover_url','cover'],'')||'');return u||'https://raw.githubusercontent.com/arranoust/MiraiExt-SkyStream/main/banner.jpg'}
async function getJson(u,headers){try{var r=await http_get(u,headers||{'User-Agent':UA,'Accept':'application/json'});if(!r||!r.body)return null;return JSON.parse(r.body)}catch(e){console.log('[AniHub v3][related fetch] '+u+' '+String(e));return null}}
function idFromPage(u){var m=String(u||'').match(/-(\d+)(?:[/?#]|$)/);if(m)return n(m[1],0);var m2=String(u||'').match(/\/anime\/(\d+)(?:[/?#]|$)/);return m2?n(m2[1],0):0}
async function findAniHubByMal(mal){var d=await getJson(API+'/anime?mal_id='+encodeURIComponent(mal)+'&page=1&page_size=1&has_ukrainian_dub=true');var a=d&&Array.isArray(d.items)?d.items:[];return a.length?a[0]:null}
async function recommendationsFor(x){var mal=n(x&&x.mal_id,0);if(!mal)return[];var rel=await getJson('https://api.jikan.moe/v4/anime/'+mal+'/relations',{'User-Agent':UA,'Accept':'application/json'});var groups=rel&&Array.isArray(rel.data)?rel.data:[],targets=[];for(var i=0;i<groups.length;i++){var relation=String(groups[i].relation||'').toLowerCase();if(relation!=='prequel'&&relation!=='sequel')continue;var entries=Array.isArray(groups[i].entry)?groups[i].entry:[];for(var j=0;j<entries.length;j++){if(String(entries[j].type||'').toLowerCase()!=='anime')continue;targets.push({kind:relation,mal:n(entries[j].mal_id,0)})}}
var out=[],seen={};for(var k=0;k<targets.length;k++){var t=targets[k];if(!t.mal||seen[t.kind+':'+t.mal])continue;seen[t.kind+':'+t.mal]=1;var y=await findAniHubByMal(t.mal);if(!y)continue;var prefix=t.kind==='prequel'?'⬅ Попередній сезон · ':'Наступний сезон ➡ · ';out.push(new MultimediaItem({title:prefix+titleOf(y),url:pageUrl(y),posterUrl:posterOf(y),type:'anime'}))}
return out}
globalThis.load=async function(url,cb){var base=null;try{base=await new Promise(function(resolve){baseLoad(url,resolve)});if(!base||!base.success||!base.data)return cb(base);var id=idFromPage(url);if(!id)return cb(base);var x=await getJson(API+'/anime/'+id,{'User-Agent':UA,'Accept':'application/json','Referer':manifest.baseUrl+'/'});if(!x)return cb(base);var recs=await recommendationsFor(x);if(!recs.length)return cb(base);var d=base.data;return cb({success:true,data:new MultimediaItem({title:d.title,url:d.url,posterUrl:d.posterUrl,bannerUrl:d.bannerUrl,type:d.type||'anime',description:d.description,episodes:d.episodes,recommendations:recs})})}catch(e){console.log('[AniHub v3][recommendations] '+String(e));return cb(base||{success:false,error:'AniHub v3: '+String(e)})}}
}());
