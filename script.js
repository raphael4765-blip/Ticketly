const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let db, currentUser=null, authMode="signin", tickets=[], memorabilia=[];
let selectedSeller=null, selectedItem=null, activeConversation=null;

const $ = id => document.getElementById(id);
const safe = v => String(v ?? "").replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

function say(id,msg,error=false){
  const el=$(id);
  if(el){el.textContent=msg;el.classList.toggle('error-text',error);}
}
function modal(id,show=true){
  const el=$(id);
  if(el)el.hidden=!show;
  document.body.classList.toggle('modal-open',show);
}
function toast(msg){
  const el=$('toast');
  if(el){el.textContent=msg;el.hidden=false;setTimeout(()=>el.hidden=true,3500);}
}
function category(v){
  const s=String(v||'').toLowerCase();
  if(s.includes('football')||s.includes('sport')||s.includes('soccer'))return 'Football';
  if(s.includes('basket'))return 'Basketball';
  if(s.includes('tennis'))return 'Tennis';
  return 'Other';
}

function showPage(id){
  document.querySelectorAll('.market-section,.sell-section,.alerts-section,.hero,.ticker')
    .forEach(x=>x.hidden=true);
  const target=$(id);
  if(target)target.hidden=false;
  if(id==='home'&&$('ticker'))$('ticker').hidden=false;
  document.querySelectorAll('[data-page]').forEach(b=>
    b.classList.toggle('active',b.dataset.page===id)
  );
  if(id==='tickets')renderTickets();
  if(id==='memorabilia')renderMemorabilia();
  if(id==='teams')renderIsraeliTeams();
  window.scrollTo({top:0,behavior:'smooth'});
}

function updateAuth(){
  const signed=!!currentUser;
  const open=$('openAuth');
  if(open)open.textContent=signed?(currentUser.email||'Profile'):'Profile / Sign in';
  if($('signOut'))$('signOut').hidden=!signed;
  if($('authTitle'))$('authTitle').textContent=signed?'Your account':authMode==='signup'?'Create account':'Sign in';
  if($('authSubmit')){
    $('authSubmit').textContent=authMode==='signup'?'Create account':'Sign in';
    $('authSubmit').hidden=signed;
  }
  if($('email'))$('email').disabled=signed;
  if($('password'))$('password').disabled=signed;
  if($('switchAuth'))$('switchAuth').hidden=signed;
  if($('authMsg')&&!$('authMsg').textContent)
    $('authMsg').textContent=signed?`Signed in as ${currentUser.email}`:'Sign in or create an account.';
}

async function authSubmit(e){
  e.preventDefault();
  if(!db)return say('authMsg','Account service is not connected. Refresh and try again.',true);
  const email=$('email').value.trim(),password=$('password').value;
  say('authMsg','Please wait…');
  $('authSubmit').disabled=true;
  try{
    if(authMode==='signup'){
      const {data,error}=await db.auth.signUp({email,password});
      if(error)throw error;
      if(data.session){
        currentUser=data.user;updateAuth();say('authMsg','Account created and signed in.');
      }else{
        say('authMsg','Account created. Check your email if confirmation is enabled.');
      }
    }else{
      const {data,error}=await db.auth.signInWithPassword({email,password});
      if(error)throw error;
      currentUser=data.user;updateAuth();say('authMsg','Signed in successfully.');
      setTimeout(()=>modal('authModal',false),700);
    }
  }catch(err){
    console.error(err);say('authMsg',err.message||'Account action failed.',true);
  }finally{$('authSubmit').disabled=false;}
}

async function signOut(){
  if(!db)return;
  const {error}=await db.auth.signOut();
  if(error)return toast(error.message);
  currentUser=null;updateAuth();toast('Signed out.');
}

function dateText(v){
  if(!v)return 'Date not specified';
  const d=new Date(v+'T12:00:00');
  return isNaN(d)?safe(v):d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
}

function card(item,type){
  const title=type==='ticket'?item.event_name:item.title;
  const place=item.country||'';
  const price=Number(item.price);
  const image=item.image_url
    ?`<img src="${safe(item.image_url)}" alt="${safe(title)}">`
    :`<div class="card-placeholder">${type==='ticket'?'⚽':'★'}</div>`;
  return `<article class="ticket-card listing-card" tabindex="0" role="button"
    data-open-type="${type}" data-open-id="${safe(item.id)}">
    ${image}
    <div class="ticket-card-inner">
      <div class="ticket-card-top">
        <span class="ticket-category">${safe(type==='ticket'?category(item.category):(item.category||'Memorabilia'))}</span>
        <span class="ticket-date">${type==='ticket'?safe(dateText(item.event_date)):'Collectible'}</span>
      </div>
      <h3>${safe(title||'Untitled listing')}</h3>
      <p class="ticket-country">📍 ${safe(place)}</p>
      <div class="ticket-card-bottom">
        <strong>€${Number.isFinite(price)?price.toFixed(2):'—'}</strong>
        <span class="ticket-label">View details →</span>
      </div>
    </div>
  </article>`;
}

function renderTickets(){
  const grid=$('ticketGrid');
  if(!grid)return;
  const q=($('ts')?.value||'').toLowerCase(),f=$('tf')?.value||'All';
  const rows=tickets.filter(t=>
    ['Football','Basketball','Tennis','Other'].includes(category(t.category))&&
    (f==='All'||category(t.category)===f)&&
    `${t.event_name} ${t.country} ${t.description||''}`.toLowerCase().includes(q)
  );
  grid.innerHTML=rows.map(t=>card(t,'ticket')).join('');
  if(!rows.length)grid.innerHTML='<p>No tickets found yet. Try another search or list the first ticket.</p>';
}

function renderMemorabilia(){
  const grid=$('memGrid');
  if(!grid)return;
  const q=($('ms')?.value||'').toLowerCase(),f=$('mf')?.value||'All';
  const rows=memorabilia.filter(m=>
    (f==='All'||m.category===f)&&
    `${m.title} ${m.country} ${m.description||''} ${m.category||''}`.toLowerCase().includes(q)
  );
  grid.innerHTML=rows.map(m=>card(m,'mem')).join('');
  if(!rows.length)grid.innerHTML='<p>No memorabilia listings found yet. Be the first to list one.</p>';
}

async function loadTickets(){
  const {data,error}=await db.from('tickets').select('*').order('created_at',{ascending:false});
  if(error)throw error;
  tickets=(data||[]).filter(t=>['Football','Basketball','Tennis','Other'].includes(category(t.category)));
  renderTickets();
}

async function loadMemorabilia(){
  const {data,error}=await db.from('memorabilia').select('*').order('created_at',{ascending:false});
  if(error){
    memorabilia=[];
    say('memError','Memorabilia table is not available yet. Check the Supabase setup SQL.',true);
    renderMemorabilia();return;
  }
  memorabilia=data||[];say('memError','');renderMemorabilia();
}

async function uploadPhoto(input){
  const file=input?.files?.[0];
  if(!file)return null;
  if(!currentUser)throw Error('Please sign in before uploading a photo.');
  if(file.size>5*1024*1024)throw Error('Please choose an image smaller than 5 MB.');
  const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
  const path=`${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const {error}=await db.storage.from('ticket-photos').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
  if(error)throw error;
  return db.storage.from('ticket-photos').getPublicUrl(path).data.publicUrl;
}

async function publish(e,type){
  e.preventDefault();
  if(!currentUser){
    authMode='signin';updateAuth();modal('authModal');
    return say(type==='ticket'?'ticketMsg':'memMsg','Please sign in before publishing.',true);
  }
  const isT=type==='ticket',form=$(isT?'ticketForm':'memForm');
  const msg=isT?'ticketMsg':'memMsg',btn=$(isT?'ticketSubmit':'memSubmit');
  btn.disabled=true;say(msg,'Publishing…');
  try{
    const image_url=await uploadPhoto($(isT?'ticketPhoto':'memPhoto'));
    let row;
    if(isT){
      row={
        event_name:$('eventName').value.trim(),category:$('eventCategory').value,
        country:$('eventCountry').value.trim(),event_date:$('eventDate').value,
        price:Number($('ticketPrice').value),description:$('ticketDescription').value.trim(),
        image_url,user_id:currentUser.id
      };
    }else{
      row={
        title:$('memTitle').value.trim(),category:$('memCategory').value,
        country:$('memCountry').value.trim(),price:Number($('memPrice').value),
        description:$('memDescription').value.trim(),image_url,user_id:currentUser.id
      };
    }
    const {error}=await db.from(isT?'tickets':'memorabilia').insert(row);
    if(error)throw error;
    form.reset();say(msg,'Published successfully!');
    if(isT){await loadTickets();showPage('tickets');}
    else{await loadMemorabilia();showPage('memorabilia');}
  }catch(err){
    console.error(err);say(msg,`Could not publish: ${err.message}`,true);
  }finally{btn.disabled=false;}
}

function openDetails(type,id){
  const item=(type==='ticket'?tickets:memorabilia).find(x=>String(x.id)===String(id));
  if(!item)return;
  selectedItem={type,item};
  const title=type==='ticket'?item.event_name:item.title;
  $('detailContent').innerHTML=`
    <div class="detail-layout">
      ${item.image_url?`<img class="detail-image" src="${safe(item.image_url)}" alt="${safe(title)}">`:`<div class="detail-art">${type==='ticket'?'90′':'MEMORABILIA'}</div>`}
      <div class="detail-info">
        <p class="eyebrow">${safe(type==='ticket'?category(item.category):(item.category||'Memorabilia'))} · LISTING</p>
        <h2>${safe(title)}</h2>
        ${type==='ticket'?`<p>📅 ${safe(dateText(item.event_date))}</p>`:''}
        <p>📍 ${safe(item.country||'Location not specified')}</p>
        <hr><p>${safe(item.description||'No additional description provided.')}</p>
        <h2>€${Number(item.price).toFixed(2)}</h2>
        <button class="primary full" id="detailContact">Contact seller</button>
      </div>
    </div>`;
  modal('detailModal');
  $('detailContact').onclick=()=>{
    if(!currentUser){
      modal('detailModal',false);authMode='signin';updateAuth();modal('authModal');return;
    }
    if(!item.user_id){toast('Seller account unavailable for this listing.');return;}
    if(item.user_id===currentUser.id){toast('This is your own listing.');return;}
    selectedSeller={id:item.user_id,type,item};
    $('contactTitle').textContent=`Message seller about ${title}`;
    modal('detailModal',false);modal('contactModal');
  };
}

async function beginContact(e){
  e.preventDefault();
  if(!currentUser)return say('contactMsg','Please sign in first.',true);
  if(!selectedSeller)return;
  const {id:sellerId,type,item}=selectedSeller;
  say('contactMsg','Sending…');
  try{
    const table=type==='ticket'?'conversations':'mem_conversations';
    const foreign=type==='ticket'?'ticket_id':'item_id';
    let {data:conv,error}=await db.from(table).select('*')
      .contains('participant_ids',[currentUser.id,sellerId])
      .eq(foreign,item.id).limit(1).maybeSingle();
    if(error)throw error;
    if(!conv){
      const res=await db.from(table).insert({
        [foreign]:item.id,participant_ids:[currentUser.id,sellerId]
      }).select('*').single();
      if(res.error)throw res.error;
      conv=res.data;
    }
    const msgTable=type==='ticket'?'messages':'mem_messages';
    const {error:me}=await db.from(msgTable).insert({
      conversation_id:conv.id,sender_id:currentUser.id,body:$('firstMessage').value.trim()
    });
    if(me)throw me;
    $('contactForm').reset();modal('contactModal',false);
    toast('Message sent. Open Messages to continue.');
  }catch(err){say('contactMsg',`Could not send message: ${err.message}`,true);}
}

async function openMessages(){
  if(!currentUser){authMode='signin';updateAuth();modal('authModal');return;}
  modal('messagesModal');say('messagesMsg','Loading messages…');
  $('conversationList').innerHTML='';
  $('chat').hidden=true;
  try{
    const all=[];
    for(const type of ['ticket','mem']){
      const table=type==='ticket'?'conversations':'mem_conversations';
      const {data,error}=await db.from(table).select('*')
        .contains('participant_ids',[currentUser.id])
        .order('updated_at',{ascending:false});
      if(error){console.warn(error);continue;}
      (data||[]).forEach(c=>all.push({...c,_type:type}));
    }
    if(!all.length)say('messagesMsg','No conversations yet. Open a listing and contact its seller.');
    else{
      say('messagesMsg','');
      $('conversationList').innerHTML=all.map(c=>
        `<button class="conversation-item" data-conv="${safe(c.id)}" data-type="${c._type}">Conversation · ${new Date(c.updated_at||c.created_at).toLocaleDateString()}</button>`
      ).join('');
      $('conversationList').querySelectorAll('[data-conv]').forEach(b=>
        b.onclick=()=>loadChat(b.dataset.type,b.dataset.conv)
      );
    }
  }catch(err){say('messagesMsg',err.message,true);}
}

async function loadChat(type,id){
  activeConversation={type,id};
  const table=type==='ticket'?'messages':'mem_messages';
  const {data,error}=await db.from(table).select('*')
    .eq('conversation_id',id).order('created_at',{ascending:true});
  if(error)return say('messagesMsg',error.message,true);
  $('chat').hidden=false;
  $('chatBody').innerHTML=(data||[]).map(m=>
    `<div class="bubble ${m.sender_id===currentUser.id?'mine':''}">${safe(m.body)}<small>${new Date(m.created_at).toLocaleString()}</small></div>`
  ).join('');
  $('chatBody').scrollTop=$('chatBody').scrollHeight;
}

async function reply(e){
  e.preventDefault();
  if(!activeConversation||!currentUser)return;
  const body=$('replyText').value.trim();
  if(!body)return;
  const table=activeConversation.type==='ticket'?'messages':'mem_messages';
  const {error}=await db.from(table).insert({
    conversation_id:activeConversation.id,sender_id:currentUser.id,body
  });
  if(error)return say('messagesMsg',error.message,true);
  $('replyText').value='';
  await loadChat(activeConversation.type,activeConversation.id);
}

/* Israeli first-division club directory.
   This directory is display-only: it does not require a database table. */
const israeliTeams={
  football:[
    "Beitar Jerusalem","Bnei Sakhnin","Hapoel Be'er Sheva","Hapoel Haifa",
    "Hapoel Ironi Kiryat Shmona","Hapoel Petah Tikva","Hapoel Ramat Gan",
    "Hapoel Tel Aviv","Hapoel Jerusalem","Ironi Tiberias","Maccabi Haifa",
    "Maccabi Netanya","Maccabi Petah Tikva","Maccabi Tel Aviv"
  ],
  basketball:[
    "Bnei Herzliya","Hapoel Be'er Sheva/Dimona","Hapoel Galil Elyon",
    "Hapoel HaEmek","Hapoel Holon","Hapoel Ironi Eilat",
    "Hapoel Jerusalem","Hapoel Tel Aviv","Ironi Kiryat Ata",
    "Ironi Ness Ziona","Maccabi Ashdod","Maccabi Ironi Ramat Gan",
    "Maccabi Rishon LeZion","Maccabi Tel Aviv"
  ]
};
let activeTeamSport='football';

function renderIsraeliTeams(){
  const grid=$('teamGrid');
  if(!grid)return;
  const query=($('teamSearch')?.value||'').trim().toLowerCase();
  const teams=israeliTeams[activeTeamSport].filter(team=>
    team.toLowerCase().includes(query)
  );
  grid.innerHTML=teams.map(team=>`
    <article class="team-card">
      <div class="team-crest">${activeTeamSport==='football'?'⚽':'🏀'}</div>
      <div class="team-info">
        <h3>${safe(team)}</h3>
        <p>${activeTeamSport==='football'?'Israeli Premier League':'Israeli Basketball Premier League'}</p>
      </div>
      <span class="team-country">🇮🇱</span>
    </article>
  `).join('');
  if(!teams.length)grid.innerHTML='<p>No clubs match your search.</p>';
  if($('teamCount'))$('teamCount').textContent=`${teams.length} clubs`;
  $('footballTab')?.classList.toggle('primary',activeTeamSport==='football');
  $('footballTab')?.classList.toggle('team-tab',activeTeamSport!=='football');
  $('basketballTab')?.classList.toggle('primary',activeTeamSport==='basketball');
  $('basketballTab')?.classList.toggle('team-tab',activeTeamSport!=='basketball');
}

function initialiseTeams(){
  $('footballTab')?.addEventListener('click',()=>{
    activeTeamSport='football';renderIsraeliTeams();
  });
  $('basketballTab')?.addEventListener('click',()=>{
    activeTeamSport='basketball';renderIsraeliTeams();
  });
  $('teamSearch')?.addEventListener('input',renderIsraeliTeams);
  renderIsraeliTeams();
}

document.addEventListener('DOMContentLoaded',async()=>{
  document.querySelectorAll('[data-page]').forEach(b=>
    b.addEventListener('click',()=>showPage(b.dataset.page))
  );
  $('openAuth')?.addEventListener('click',()=>{updateAuth();modal('authModal');});
  $('signOut')?.addEventListener('click',signOut);
  $('authForm')?.addEventListener('submit',authSubmit);
  $('switchAuth')?.addEventListener('click',()=>{
    authMode=authMode==='signup'?'signin':'signup';say('authMsg','');updateAuth();
  });
  document.querySelectorAll('[data-close]').forEach(b=>
    b.addEventListener('click',()=>modal(b.dataset.close,false))
  );
  $('chooseTicket')?.addEventListener('click',()=>{
    $('sellChoices').hidden=true;$('sellForms').hidden=false;
    $('ticketForm').hidden=false;$('memForm').hidden=true;
  });
  $('chooseMem')?.addEventListener('click',()=>{
    $('sellChoices').hidden=true;$('sellForms').hidden=false;
    $('ticketForm').hidden=true;$('memForm').hidden=false;
  });
  $('backSell')?.addEventListener('click',()=>{
    $('sellChoices').hidden=false;$('sellForms').hidden=true;
  });
  $('ticketForm')?.addEventListener('submit',e=>publish(e,'ticket'));
  $('memForm')?.addEventListener('submit',e=>publish(e,'mem'));
  $('contactForm')?.addEventListener('submit',beginContact);
  $('messagesOpen')?.addEventListener('click',openMessages);
  $('replyForm')?.addEventListener('submit',reply);
  $('ts')?.addEventListener('input',renderTickets);
  $('tf')?.addEventListener('change',renderTickets);
  $('ms')?.addEventListener('input',renderMemorabilia);
  $('mf')?.addEventListener('change',renderMemorabilia);
  $('heroSearch')?.addEventListener('submit',e=>{
    e.preventDefault();$('ts').value=$('heroQuery').value;showPage('tickets');
  });
  $('alertsSignIn')?.addEventListener('click',()=>{
    authMode='signin';updateAuth();modal('authModal');
  });
  initialiseTeams();

  document.addEventListener('click',e=>{
    const c=e.target.closest('[data-open-type]');
    if(c)openDetails(c.dataset.openType,c.dataset.openId);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')document.querySelectorAll('.modal').forEach(m=>m.hidden=true);
  });
  $('lang')?.addEventListener('click',()=>{
    const next=document.documentElement.lang==='en'?'he':'en';
    document.documentElement.lang=next;
    document.documentElement.dir=next==='he'?'rtl':'ltr';
    document.querySelectorAll('[data-en][data-he]').forEach(el=>el.innerHTML=el.dataset[next]);
    document.querySelectorAll('[data-en-placeholder][data-he-placeholder]').forEach(el=>
      el.placeholder=el.dataset[next+'Placeholder']
    );
    $('lang').textContent=next==='he'?'English':'עברית';
  });

  try{
    if(!window.supabase?.createClient)
      throw Error('Supabase did not load. Check your internet connection and refresh.');
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data,error}=await db.auth.getSession();
    if(error)throw error;
    currentUser=data.session?.user||null;
    updateAuth();
    db.auth.onAuthStateChange((_event,session)=>{
      currentUser=session?.user||null;updateAuth();
    });
    await loadTickets();
    await loadMemorabilia();
  }catch(err){
    console.error(err);
    say('ticketError',`Ticketly connection error: ${err.message}`,true);
    say('memError',`Ticketly connection error: ${err.message}`,true);
  }
});
