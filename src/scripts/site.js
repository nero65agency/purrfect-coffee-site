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
// Limits come from Café details > Booking rules in the editor.
const MAXG=+DATA.rules.maxGuests||15, MAXK=DATA.rules.maxChildren===undefined?4:+DATA.rules.maxChildren;
// Online booking: live when switched on in the editor, or on any page opened with ?testbooking
const TEST=new URLSearchParams(location.search).has('testbooking');
const LIVE=DATA.bookingOn||TEST;
const pad=h=>String(h).padStart(2,'0')+':00';
let AV=null;
async function loadAvailability(){
 try{const r=await fetch('/api/availability?days=7',{cache:'no-store'});if(!r.ok)throw 0;AV=await r.json()}catch(e){AV={error:true,days:[]}}
 return AV;
}
async function renderChips(){
 const el=document.getElementById('chips');if(!el)return;
 el.hidden=false;const w=document.getElementById('walkin');if(w)w.hidden=true;
 el.innerHTML='<span style="color:var(--soft)">Checking spaces…</span>';
 await loadAvailability();
 const d=AV.days&&AV.days[0];
 if(!d){el.innerHTML='<span style="color:var(--soft)">Call us to check spaces today.</span>';return}
 const list=d.slots.filter(s=>!s.past);
 el.innerHTML=list.length?list.map(s=>`<button type="button" class="chip" ${s.left?'data-book data-slot="'+s.hour+'"':'disabled'}><strong>${pad(s.hour)}</strong><small>${s.left?s.left+' left':s.cap===0?'Closed':'Full'}</small></button>`).join(''):'<span style="color:var(--soft)">No more slots today. See other days.</span>';
}
if(LIVE)renderChips();

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
if(TEST)dlg.classList.remove('off');
const S={day:0,slot:null,adults:2,children:0,wc:false,other:false,agree:false,busy:false,error:''};
const mons=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],dws=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const $=id=>document.getElementById(id);
const dateOf=s=>new Date(s+'T12:00:00');
function render(){
 if(!AV){$('days').innerHTML='<p style="color:var(--soft)">Loading available times…</p>';$('slots').innerHTML='';return}
 if(AV.error||!AV.days.length){$('days').innerHTML='<p class="warn">Sorry, online booking isn\'t working right now. Please call us to book.</p>';$('slots').innerHTML='';$('pay').disabled=true;return}
 $('days').innerHTML=AV.days.map((x,i)=>{const d=dateOf(x.date);return `<button type="button" class="opt" aria-pressed="${S.day===i}" data-day="${i}" ${x.open?'':'disabled'}>${i===0?'Today':dws[d.getDay()]}<br><b style="font-family:var(--serif);font-size:24px">${d.getDate()}</b><small>${x.open?'£'+x.price:'Closed'}</small></button>`}).join('');
 const day=AV.days[S.day],d=dateOf(day.date);
 $('dayNote').textContent=WEEK[d.getDay()].x||'';
 $('slots').innerHTML=day.slots.length?day.slots.map(s=>`<button type="button" class="opt" aria-pressed="${S.slot===s.hour}" data-slot="${s.hour}" ${s.left?'':'disabled'}><b>${pad(s.hour)} – ${pad(s.hour+1)}</b><small>${s.past?'Passed':s.cap===0?'Not available':s.left?s.left+(s.left===1?' place':' places')+(s.childrenLeft?', '+s.childrenLeft+' for children':', no child places'):'Fully booked'}</small></button>`).join(''):'<p style="color:var(--soft)">We\'re closed on this day.</p>';
 const sl=day.slots.find(x=>x.hour===S.slot&&x.left);
 if(!sl)S.slot=null;
 $('adults').textContent=S.adults;$('children').textContent=S.children;
 $('agesWrap').style.display=S.children?'flex':'none';
 const ppl=S.adults+S.children;let cap='';
 if(sl&&ppl>sl.left)cap='Only '+sl.left+' places are left in this slot.';else if(sl&&S.children>sl.childrenLeft)cap='Only '+sl.childrenLeft+' child places are left in this slot. We allow '+MAXK+' children at a time.';
 $('cap').textContent=S.error||cap;
 const unit=day.price;
 $('sDay').textContent=dws[d.getDay()]+' '+d.getDate()+' '+mons[d.getMonth()];
 $('sTime').textContent=sl?pad(sl.hour)+' – '+pad(sl.hour+1):'Not chosen yet';
 $('sGuests').textContent=S.adults+(S.adults===1?' adult':' adults')+(S.children?', '+S.children+(S.children===1?' child':' children'):'');
 const acc=[];if(S.wc)acc.push('Wheelchair space');if(S.other)acc.push('Other needs');$('sAccess').textContent=acc.join(', ')||'None';
 $('sCalc').textContent=(DATA.payOnArrival?'to pay on arrival ':'')+'('+ppl+' × £'+unit+')';$('sTotal').textContent='£'+ppl*unit;
 const name=$('bkName').value.trim(),email=$('bkEmail').value.trim();
 const okDetails=name.length>1&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
 const bad=!sl||cap||!okDetails||!S.agree||S.busy;const pay=$('pay');pay.disabled=!!bad;
 pay.textContent=S.busy?'Booking…':DATA.payOnArrival?'Book my visit':'Pay £'+ppl*unit+' and book';
 $('hint').textContent=!sl?'Choose a time to continue.':cap?'Change the time or number of guests.':!okDetails?'Add your name and email to continue.':!S.agree?'Tick to agree to the disclaimer to continue.':(DATA.payOnArrival?'You pay when you arrive, by cash or card.':'Secure card payment.');
 S._line=$('sGuests').textContent+' on '+$('sDay').textContent+', '+$('sTime').textContent;
}
dlg.addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!AV||AV.error)return;
 if(t.dataset.day!==undefined&&!t.disabled){S.day=+t.dataset.day;S.slot=null;S.error='';render()}
 else if(t.dataset.slot!==undefined&&!t.disabled&&t.classList.contains('opt')){S.slot=+t.dataset.slot;S.error='';render()}
 else if(t.dataset.step){const k=t.dataset.step;S[k]=Math.max(k==='adults'?1:0,Math.min(k==='adults'?MAXG:MAXK,S[k]+ +t.dataset.d));S.error='';render()}});
['wc','other','agree'].forEach(id=>$(id).addEventListener('change',e=>{S[id]=e.target.checked;render()}));
['bkName','bkEmail'].forEach(id=>$(id).addEventListener('input',render));
$('pay').addEventListener('click',async()=>{
 const day=AV.days[S.day];S.busy=true;S.error='';render();
 const acc=[];if(S.wc)acc.push('Wheelchair or mobility aid');if(S.other)acc.push('Other access need');
 let res,data;
 try{res=await fetch('/api/book',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:day.date,hour:S.slot,adults:S.adults,children:S.children,childAges:$('bkAges').value,name:$('bkName').value,email:$('bkEmail').value,phone:$('bkPhone').value,access:acc.join(', '),agree:S.agree})});data=await res.json()}catch(e){data={error:'Something went wrong. Please check your connection and try again.'}}
 S.busy=false;
 if(!res||!res.ok){S.error=data.error||'Something went wrong. Please try again.';await loadAvailability();render();if(LIVE)renderChips();return}
 $('doneLine').innerHTML=S._line+'.<br>Your booking reference is <b>'+data.ref+'</b>. Please give your name or this reference when you arrive. It\'s worth taking a screenshot of this page.';
 $('bkForm').style.display='none';$('bkDone').style.display='flex';renderChips();
});
$('again').addEventListener('click',()=>{Object.assign(S,{day:0,slot:null,adults:2,children:0,agree:false,error:''});$('agree').checked=false;$('bkForm').style.display='';$('bkDone').style.display='none';loadAvailability().then(render)});
async function openBook(slot){S.day=0;S.slot=slot===undefined?null:slot;S.error='';$('bkForm').style.display='';$('bkDone').style.display='none';dlg.showModal();if(!LIVE)return;AV=null;render();await loadAvailability();render()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-book]');if(!b||dlg.contains(b))return;e.preventDefault();openBook(b.dataset.slot!==undefined?+b.dataset.slot:undefined)});
$('bookClose').addEventListener('click',()=>dlg.close());
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
})();
