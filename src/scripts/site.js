(function(){
if(!document.getElementById('site-data'))return;
// Opening hours and prices come from Tina (content/hours, content/settings) via #site-data.
const DATA=JSON.parse(document.getElementById('site-data').textContent);
const num=t=>{if(!t)return 0;const [H,M]=String(t).split(':').map(Number);return H+(M||0)/60};
const price=v=>parseFloat(String(v||'').replace(/[^0-9.]/g,''))||0;
const NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WEEK=NAMES.map((name,i)=>{
 const r=(DATA.days||[]).find(x=>x.day===name)||{closed:true};
 const p=i===0?price(DATA.entry.sunday):i===6?price(DATA.entry.saturday):price(DATA.entry.weekday);
 if(r.closed)return{d:name,o:'Closed',l:'–',p,x:r.special||'',open:[0,0],slots:[0,-1],closed:true};
 const s=t=>String(t).replace(/^0(\d)/,'$1');
 return{d:name,o:s(r.open)+' – '+s(r.close),l:s(r.lastBooking),p,x:r.special||'',open:[num(r.open),num(r.close)],slots:[Math.ceil(num(r.open)),Math.floor(num(r.lastBooking))]};
});
const order=[1,2,3,4,5,6,0];
const now=new Date(), today=now.getDay(), hr=now.getHours()+now.getMinutes()/60;
const fmt=h=>{const H=Math.floor(h),M=Math.round((h-H)*60);return H+':'+String(M).padStart(2,'0')};
// week table
const hasX=WEEK.some(w=>w.x&&w.x.trim());
let wt='<div class="wrow h"><span>Day</span><span>Open</span><span>Last booking</span><span>Entry</span>'+(hasX?'<span>What\'s special</span>':'')+'</div>';
order.forEach(i=>{const w=WEEK[i];wt+=`<div class="wrow${i===today?' today':''}"><span class="d">${w.d}${i===today?' <small style="font-family:var(--sans);font-size:13px;color:var(--ok);font-weight:800">Today</small>':''}</span><span class="o">${w.o}</span><span class="l">${w.l}</span><span class="p">£${w.p}</span>${hasX?'<span class="x">'+w.x+'</span>':''}</div>`});
const wtEl=document.getElementById('weekTable');wtEl.innerHTML=wt;wtEl.classList.toggle('nox',!hasX);
let ht='';order.forEach(i=>{const w=WEEK[i];ht+=`<tr${i===today?' class="today"':''}><th scope="row">${w.d}</th><td>${w.o}</td><td>${w.l}</td></tr>`});
document.getElementById('hours').innerHTML=ht;
// open status
const T=WEEK[today];let open=hr>=T.open[0]&&hr<T.open[1];
let msg=open?'Open now until '+fmt(T.open[1]):'Closed now';
if(!open){for(let k=0;k<8;k++){const di=(today+k)%7,w=WEEK[di];if(w.closed)continue;if(k===0&&hr<w.open[0]){msg='Opens today at '+fmt(w.open[0]);break}if(k>0){msg='Opens '+(k===1?'tomorrow':w.d)+' at '+fmt(w.open[0]);break}}}
document.getElementById('tbHours').textContent=open?'Open today '+T.o:(hr<T.open[0]?'Open today '+T.o:msg);
['status','status2'].forEach(id=>{const el=document.getElementById(id);el.querySelector('span').textContent=msg;if(!open)el.classList.add('closed')});
// demo availability
// Limits come from Café details > Booking rules in the editor.
const MAXG=+DATA.rules.maxGuests||15, MAXK=+DATA.rules.maxChildren||4;
// Demo availability until the booking system is connected.
const places=(day,h)=>Math.max(0,Math.min(MAXG,((h*7+day*5)%17)-1));
const kids=(day,h)=>Math.min(MAXK,(h+day)%(MAXK+1));
// chips for today
let ch='';let first=null;for(let h=T.slots[0];h<=T.slots[1];h++){if(h+1<=hr)continue;const p=places(0,h);if(p&&first===null)first=h;ch+=`<button type="button" class="chip" ${p?'data-book data-slot="'+h+'"':'disabled'}><strong>${String(h).padStart(2,'0')}:00</strong><small>${p?p+' left':'Full'}</small></button>`}
document.getElementById('chips').innerHTML=ch||'<span style="color:var(--soft)">No more slots today. See other days.</span>';

// nav
const nb=document.getElementById('menuBtn'),nav=document.getElementById('nav');
nb.addEventListener('click',()=>{const o=nav.classList.toggle('open');nb.setAttribute('aria-expanded',o)});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');nb.setAttribute('aria-expanded','false')}));
// cats arrows
const cr=document.getElementById('catrow');document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>cr.scrollBy({left:+b.dataset.scroll*300,behavior:'smooth'})));
// demo forms
document.querySelectorAll('form[data-demo]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();f.querySelector('.thanks').style.display='block'}));
// booking
const dlg=document.getElementById('book');
const S={day:0,slot:null,adults:2,children:0,wc:false,other:false,agree:false};
const mons=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],dws=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function dayInfo(i){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);return{d,wd:d.getDay()}}
function sess(wd,h){return['',WEEK[wd].p]}
function render(){
 let dh='';for(let i=0;i<7;i++){const {d,wd}=dayInfo(i);dh+=`<button type="button" class="opt" aria-pressed="${S.day===i}" data-day="${i}">${i===0?'Today':dws[wd]}<br><b style="font-family:var(--serif);font-size:24px">${d.getDate()}</b><small>£${WEEK[wd].p}</small></button>`}
 document.getElementById('days').innerHTML=dh;
 const {d,wd}=dayInfo(S.day);document.getElementById('dayNote').textContent=WEEK[wd].x;
 let sh='';const list=[];for(let h=WEEK[wd].slots[0];h<=WEEK[wd].slots[1];h++){const past=S.day===0&&h+1<=hr;const p=past?0:places(S.day,h),k=kids(S.day,h);const [lab,price]=sess(wd,h);const end=(wd===3&&h===17)?'19:00':String(h+1).padStart(2,'0')+':00';list.push({h,p,k,lab,price,label:String(h).padStart(2,'0')+':00 – '+end});
  sh+=`<button type="button" class="opt" aria-pressed="${S.slot===h}" data-slot="${h}" ${p?'':'disabled'}><b>${String(h).padStart(2,'0')}:00 – ${end}</b><small>${past?'Passed':p?p+(p===1?' place':' places')+(k?', '+k+' for children':', no child places'):'Fully booked'}</small>${lab?'<small style="font-weight:800">'+lab+'</small>':''}</button>`}
 document.getElementById('slots').innerHTML=sh;
 const sl=list.find(x=>x.h===S.slot);
 document.getElementById('adults').textContent=S.adults;document.getElementById('children').textContent=S.children;
 document.getElementById('agesWrap').style.display=S.children?'flex':'none';
 const ppl=S.adults+S.children;let cap='';
 if(sl&&ppl>sl.p)cap='Only '+sl.p+' places are left in this slot.';else if(sl&&S.children>sl.k)cap='Only '+sl.k+' child places are left in this slot. We allow '+MAXK+' children at a time.';
 document.getElementById('cap').textContent=cap;
 const unit=sl?sl.price:WEEK[wd].p;
 document.getElementById('sDay').textContent=dws[wd]+' '+d.getDate()+' '+mons[d.getMonth()];
 document.getElementById('sTime').textContent=sl?sl.label+(sl.lab?' ('+sl.lab+')':''):'Not chosen yet';
 document.getElementById('sGuests').textContent=S.adults+(S.adults===1?' adult':' adults')+(S.children?', '+S.children+(S.children===1?' child':' children'):'');
 const acc=[];if(S.wc)acc.push('Wheelchair space');if(S.other)acc.push('Other needs');document.getElementById('sAccess').textContent=acc.join(', ')||'None';
 document.getElementById('sCalc').textContent=(DATA.payOnArrival?'to pay on arrival ':'')+'('+ppl+' × £'+unit+')';document.getElementById('sTotal').textContent='£'+ppl*unit;
 const bad=!sl||cap||!S.agree;const pay=document.getElementById('pay');pay.disabled=!!bad;pay.textContent=DATA.payOnArrival?'Book my visit':'Pay £'+ppl*unit+' and book';
 document.getElementById('hint').textContent=!sl?'Choose a time to continue.':cap?'Change the time or number of guests.':!S.agree?'Tick to agree to the disclaimer to continue.':(DATA.payOnArrival?'You pay when you arrive, by cash or card.':'Secure card payment.');
 S._line=document.getElementById('sGuests').textContent+' on '+document.getElementById('sDay').textContent+', '+document.getElementById('sTime').textContent;
}
dlg.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
 if(t.dataset.day!==undefined){S.day=+t.dataset.day;S.slot=null;render()}
 else if(t.dataset.slot!==undefined&&!t.disabled&&t.classList.contains('opt')){S.slot=+t.dataset.slot;render()}
 else if(t.dataset.step){const k=t.dataset.step;S[k]=Math.max(k==='adults'?1:0,Math.min(k==='adults'?MAXG:MAXK,S[k]+ +t.dataset.d));render()}});
['wc','other','agree'].forEach(id=>document.getElementById(id).addEventListener('change',e=>{S[id]=e.target.checked;render()}));
document.getElementById('pay').addEventListener('click',()=>{document.getElementById('doneLine').textContent=S._line+'. We\'ve emailed your confirmation and directions to 18 High Street.';document.getElementById('bkForm').style.display='none';document.getElementById('bkDone').style.display='flex'});
document.getElementById('again').addEventListener('click',()=>{Object.assign(S,{day:0,slot:null,adults:2,children:0,agree:false});document.getElementById('agree').checked=false;document.getElementById('bkForm').style.display='';document.getElementById('bkDone').style.display='none';render()});
function openBook(slot){S.day=0;S.slot=slot===undefined?null:slot;document.getElementById('bkForm').style.display='';document.getElementById('bkDone').style.display='none';render();dlg.showModal()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-book]');if(!b||dlg.contains(b))return;e.preventDefault();openBook(b.dataset.slot!==undefined?+b.dataset.slot:undefined)});
document.getElementById('bookClose').addEventListener('click',()=>dlg.close());
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
render();
})();
