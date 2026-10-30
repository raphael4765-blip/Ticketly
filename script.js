const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

const $ = id => document.getElementById(id);
let db, currentUser = null, authMode = "signin";
let tickets = [], memorabilia = [], selectedItem = null;
let selectedSeller = null, activeConversation = null;
let clubDirectory = [];

const ISRAELI_CLUBS = [
  {name:"Maccabi Tel Aviv",sport:"Football",league:"Israeli Premier League",logo:"https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Maccabi_Tel_Aviv_FC_logo.svg/200px-Maccabi_Tel_Aviv_FC_logo.svg.png"},
  {name:"Hapoel Tel Aviv",sport:"Football",league:"Israeli Premier League",logo:"https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Hapoel_Tel_Aviv_FC.png/200px-Hapoel_Tel_Aviv_FC.png"},
  {name:"Maccabi Haifa",sport:"Football",league:"Israeli Premier League",logo:"https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Maccabi_Haifa_FC_logo.svg/200px-Maccabi_Haifa_FC_logo.svg.png"},
  {name:"Beitar Jerusalem",sport:"Football",league:"Israeli Premier League",logo:"https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Beitar_Jerusalem_FC_logo.svg/200px-Beitar_Jerusalem_FC_logo.svg.png"},
  {name:"Hapoel Be'er Sheva",sport:"Football",league:"Israeli Premier League",logo:"https://upload.wikimedia.org/wikipedia/en/thumb/7/7d/Hapoel_Beer_Sheva_FC.png/200px-Hapoel_Beer_Sheva_FC.png"},
  {name:"Maccabi Netanya",sport:"Football",league:"Israeli Premier League",logo:"https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Maccabi_Netanya_FC_logo.png/200px-Maccabi_Netanya_FC_logo.png"},
  {name:"Bnei Sakhnin",sport:"Football",league:"Israeli Premier League",logo:""},
  {name:"Ironi Kiryat Shmona",sport:"Football",league:"Israeli Premier League",logo:""},
  {name:"Hapoel Haifa",sport:"Football",league:"Israeli Premier League",logo:""},
  {name:"Maccabi Petah Tikva",sport:"Football",league:"Israeli Premier League",logo:""},
  {name:"Hapoel Jerusalem",sport:"Football",league:"Israeli Premier League",logo:""},
  {name:"Ashdod SC",sport:"Football",league:"Israeli Premier League",logo:""},
  {name:"Maccabi Bnei Reineh",sport:"Football",league:"Israeli Premier League",logo:""},
  {name:"Ironi Tiberias",sport:"Football",league:"Israeli Premier League",logo:""},
  {name:"Maccabi Tel Aviv",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""},
  {name:"Hapoel Tel Aviv",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""},
  {name:"Hapoel Jerusalem",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""},
  {name:"Maccabi Haifa",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""},
  {name:"Hapoel Holon",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""},
  {name:"Bnei Herzliya",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""},
  {name:"Ironi Ness Ziona",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""},
  {name:"Hapoel Galil Elyon",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""},
  {name:"Hapoel Beer Sheva",sport:"Basketball",league:"Israeli Basketball Premier League",logo:""}
].map((c,i)=>({...c,id:"israel-"+i}));

function safe(v=""){
  return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function say(id,msg,error=false){const el=$(id);if(el){el.textContent=msg;el.className=error?"error":""}}
function toast(msg){const el=$("toast");el.textContent=msg;el.style.display="block";setTimeout(()=>el.style.display="none",2800)}
function modal(id,open=true){$(id).hidden=!open}
function showPage(id){
  document.querySelectorAll(".page").forEach(s=>s.hidden=s.id!==id);
  document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  if(id==="teamHub")renderClubs();
  if(id==="reviews")loadCommunityReviews();
  window.scrollTo({top:0,behavior:"smooth"});
}
function category(c){return ["Football","Basketball","Tennis","Other"].includes(c)?c:"Other"}
function dateText(d){if(!d)return "Date not specified";return new Date(d+"T12:00:00").toLocaleDateString()}
function updateAuth(){
  $("openAuth").textContent=currentUser?(currentUser.email||"My account"):"Profile / Sign in";
  $("signOut").hidden=!currentUser;
  $("authTitle").textContent=authMode==="signin"?"Sign in":"Create account";
  $("authSubmit").textContent=authMode==="signin"?"Sign in":"Create account";
  $("switchAuth").textContent=authMode==="signin"?"Create an account":"Already have an account? Sign in";
}
async function authSubmit(e){
  e.preventDefault();
  const email=$("email").value.trim(),password=$("password").value;
  try{
    const result=authMode==="signup"
      ?await db.auth.signUp({email,password})
      :await db.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    currentUser=result.data.user;
    updateAuth();
    say("authMsg",authMode==="signup"?"Account created. Check your email if confirmation is required.":"Signed in successfully.");
    if(result.data.session)setTimeout(()=>modal("authModal",false),700);
  }catch(err){say("authMsg",err.message,true)}
}
async function signOut(){
  const {error}=await db.auth.signOut();
  if(error)return toast(error.message);
  currentUser=null;updateAuth();toast("Signed out.");
}
async function saveProfile(e){
  e.preventDefault();
  if(!currentUser)return toast("Please sign in first.");
  const display_name=$("displayName").value.trim();
  const {error}=await db.from("seller_profiles").upsert({
    user_id:currentUser.id,display_name
  },{onConflict:"user_id"});
  if(error)return say("profileMsg",error.message,true);
  say("profileMsg","Your seller profile has been saved.");
}
async function getSeller(userId){
  const {data}=await db.from("seller_profiles").select("display_name").eq("user_id",userId).maybeSingle();
  return data?.display_name||"Ticketly seller";
}
async function uploadPhoto(inputId){
  const file=$(inputId)?.files?.[0];
  if(!file)return null;
  if(file.size>5*1024*1024)throw Error("Please choose an image smaller than 5 MB.");
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
  const path=`${currentUser.id}/${Date.now()}.${ext}`;
  const {error}=await db.storage.from("ticket-photos").upload(path,file,{upsert:true});
  if(error)throw error;
  return db.storage.from("ticket-photos").getPublicUrl(path).data.publicUrl;
}
function card(item,type){
  const title=type==="ticket"?item.event_name:item.title;
  const id=item.id;
  const photo=item.image_url?`<img src="${safe(item.image_url)}" alt="${safe(title)}">`:"";
  return `<article class="ticket-card">${photo}<div class="ticket-card-body">
    <span class="muted">${safe(type==="ticket"?category(item.category):item.category||"Memorabilia")} · ${safe(item.country||"")}</span>
    <h3>${safe(title)}</h3>
    ${type==="ticket"?`<span class="muted">${safe(dateText(item.event_date))}</span>`:""}
    <div class="price">€${Number(item.price).toFixed(2)}</div>
    <span class="muted">Seller: ${safe(item.seller_name||"Ticketly seller")}</span>
    <button class="primary card-button" data-open-type="${type}" data-open-id="${safe(id)}">View listing</button>
  </div></article>`;
}
async function addSellerNames(rows){
  const ids=[...new Set(rows.map(x=>x.user_id).filter(Boolean))];
  if(!ids.length)return rows;
  const {data}=await db.from("seller_profiles").select("user_id,display_name").in("user_id",ids);
  const map=new Map((data||[]).map(x=>[x.user_id,x.display_name]));
  return rows.map(x=>({...x,seller_name:map.get(x.user_id)||"Ticketly seller"}));
}
function renderTickets(){
  const q=($("ts").value||"").toLowerCase(),f=$("tf").value;
  const rows=tickets.filter(t=>(f==="All"||category(t.category)===f)&&
    `${t.event_name} ${t.country} ${t.description||""}`.toLowerCase().includes(q));
  $("ticketGrid").innerHTML=rows.length?rows.map(t=>card(t,"ticket")).join():"<p>No tickets found yet.</p>";
}
function renderMemorabilia(){
  const q=($("ms").value||"").toLowerCase(),f=$("mf").value;
  const rows=memorabilia.filter(m=>(f==="All"||m.category===f)&&
    `${m.title} ${m.country} ${m.description||""}`.toLowerCase().includes(q));
  $("memGrid").innerHTML=rows.length?rows.map(m=>card(m,"mem")).join():"<p>No memorabilia listed yet.</p>";
}
async function loadTickets(){
  const {data,error}=await db.from("tickets").select("*").order("created_at",{ascending:false});
  if(error)throw error;
  tickets=await addSellerNames(data||[]);renderTickets();
}
async function loadMemorabilia(){
  const {data,error}=await db.from("memorabilia").select("*").order("created_at",{ascending:false});
  if(error){say("memError",error.message,true);return}
  memorabilia=await addSellerNames(data||[]);renderMemorabilia();
}
async function publish(e,type){
  e.preventDefault();
  if(!currentUser){modal("authModal");return}
  const isTicket=type==="ticket",form=$(isTicket?"ticketForm":"memForm");
  try{
    const image_url=await uploadPhoto(isTicket?"ticketPhoto":"memPhoto");
    const row=isTicket?{
      event_name:$("eventName").value.trim(),category:$("eventCategory").value,
      country:$("eventCountry").value.trim(),event_date:$("eventDate").value,
      price:Number($("ticketPrice").value),description:$("ticketDescription").value.trim(),
      image_url,user_id:currentUser.id
    }:{
      title:$("memTitle").value.trim(),category:$("memCategory").value,
      country:$("memCountry").value.trim(),price:Number($("memPrice").value),
      description:$("memDescription").value.trim(),image_url,user_id:currentUser.id
    };
    const {error}=await db.from(isTicket?"tickets":"memorabilia").insert(row);
    if(error)throw error;
    form.reset();toast("Your listing has been published.");
    if(isTicket){await loadTickets();showPage("tickets")}
    else{await loadMemorabilia();showPage("memorabilia")}
  }catch(err){say(isTicket?"ticketMsg":"memMsg",err.message,true)}
}
async function openDetails(type,id){
  const item=(type==="ticket"?tickets:memorabilia).find(x=>String(x.id)===String(id));
  if(!item)return;
  selectedItem={type,item};
  const seller=await getSeller(item.user_id);
  $("detailContent").innerHTML=`
    <div class="detail-layout">
      ${item.image_url?`<img class="detail-image" src="${safe(item.image_url)}">`:`<div class="detail-art">TICKETLY</div>`}
      <div class="detail-info">
        <p class="eyebrow">${safe(type==="ticket"?category(item.category):item.category||"Memorabilia")}</p>
        <h2>${safe(type==="ticket"?item.event_name:item.title)}</h2>
        <p>📅 ${safe(dateText(item.event_date))}</p>
        <p>📍 ${safe(item.country||"Location not specified")}</p>
        <p>${safe(item.description||"No extra description.")}</p>
        <h2>€${Number(item.price).toFixed(2)}</h2>
        <div class="seller-name">Seller: ${safe(seller)}</div>
        <button id="detailContact" class="primary full">Message seller</button>
      </div>
    </div>
    <section id="sellerReviewPanel" class="seller-review-panel">
      <h3>Seller reviews</h3><p>Loading reviews...</p>
    </section>`;
  modal("detailModal");
  await attachSellerReviewPanel(item);
  $("detailContact").onclick=()=>{
    if(!currentUser){modal("authModal");return}
    if(!item.user_id||item.user_id===currentUser.id)return toast("You cannot message yourself.");
    selectedSeller={id:item.user_id,type,item};
    $("contactTitle").textContent="Message "+seller;
    modal("contactModal");
  };
}
async function attachSellerReviewPanel(item){
  const panel=$("sellerReviewPanel");
  const {data,error}=await db.from("seller_reviews").select("rating,review,reviewer_id,created_at")
    .eq("seller_id",item.user_id).order("created_at",{ascending:false});
  if(error){panel.innerHTML="<h3>Seller reviews</h3><p>Reviews are not set up yet. Run the SQL below.</p>";return}
  const rows=data||[],avg=rows.length?rows.reduce((a,r)=>a+Number(r.rating),0)/rows.length:0;
  panel.innerHTML=`<h3>Seller reviews</h3>
    <p>${rows.length?`⭐ ${avg.toFixed(1)} / 5 · ${rows.length} reviews`:"No reviews yet"}</p>
    ${rows.map(r=>`<article class="review-card"><div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div><p>${safe(r.review||"")}</p><small>${new Date(r.created_at).toLocaleDateString()}</small></article>`).join("")}
    <div id="reviewAction"></div>`;
  if(!currentUser){$("reviewAction").innerHTML="<p>Sign in to leave a review.</p>";return}
  if(currentUser.id===item.user_id){$("reviewAction").innerHTML="<p>You cannot review your own listing.</p>";return}
  $("reviewAction").innerHTML=`<form id="sellerReviewForm" class="panel">
    <h3>Review this seller</h3>
    <label>Your rating<select id="sellerRating" required><option value="">Choose stars</option><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option></select></label>
    <label>Your review<textarea id="sellerReviewText" required maxlength="1000"></textarea></label>
    <button class="primary">Submit review</button>
    <p id="sellerReviewMessage"></p>
  </form>`;
  $("sellerReviewForm").onsubmit=async e=>{
    e.preventDefault();
    const {error}=await db.from("seller_reviews").insert({
      seller_id:item.user_id,reviewer_id:currentUser.id,
      rating:Number($("sellerRating").value),review:$("sellerReviewText").value.trim()
    });
    if(error)return say("sellerReviewMessage",error.message,true);
    toast("Review submitted. Thank you!");
    await attachSellerReviewPanel(item);
  };
}
async function loadCommunityReviews(){
  const {data,error}=await db.from("seller_reviews").select("*").order("created_at",{ascending:false}).limit(80);
  if(error){$("reviewsList").textContent=error.message;return}
  $("reviewsList").innerHTML=(data||[]).length?data.map(r=>`
    <article class="review-card"><div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div>
    <p>${safe(r.review||"")}</p><small>${new Date(r.created_at).toLocaleDateString()}</small></article>`).join(""):"No reviews have been written yet.";
}
function renderClubs(){
  const q=($("clubSearch").value||"").toLowerCase(),sport=$("leagueFilter").value;
  const rows=clubDirectory.filter(c=>(sport==="All"||c.sport===sport)&&
    `${c.name} ${c.sport}`.toLowerCase().includes(q));
  $("clubGrid").innerHTML=rows.map(c=>`
    <button class="team-card" data-club="${safe(c.id)}">
      ${c.logo?`<img class="team-logo" src="${safe(c.logo)}" alt="">`:`<span class="seller-avatar">${safe(c.name.slice(0,1))}</span>`}
      <span><strong>${safe(c.name)}</strong><small>${safe(c.sport)} · ${safe(c.league)}</small></span>
    </button>`).join("");
}
async function openClub(id){
  const c=clubDirectory.find(x=>x.id===id);if(!c)return;
  $("clubDetail").innerHTML=`
    <div class="team-detail">
      <div class="team-detail-head">${c.logo?`<img src="${safe(c.logo)}">`:""}<div><h2>${safe(c.name)}</h2><p>${safe(c.league)}</p></div></div>
      <button class="primary" id="followClub">Follow this team</button>
      <p id="followStatus"></p>
      <h3>Available tickets</h3><div id="clubTickets"></div>
      <h3>Fan posts</h3>
      <form id="clubPostForm"><textarea id="clubPostText" placeholder="Write a message to other fans..." required maxlength="1000"></textarea><button class="primary">Post</button></form>
      <div id="clubPosts"></div>
    </div>`;
  const matching=tickets.filter(t=>(t.event_name||"").toLowerCase().includes(c.name.toLowerCase()));
  $("clubTickets").innerHTML=matching.length?matching.map(t=>card(t,"ticket")).join(""):"<p>No tickets listed for this club yet.</p>";
  await loadClubPosts(c.id);
  $("followClub").onclick=async()=>{
    if(!currentUser){modal("authModal");return}
    const email=currentUser.email;
    const {error}=await db.from("team_email_subscriptions").upsert({
      user_id:currentUser.id,email,team_id:c.id,team_name:c.name
    },{onConflict:"user_id,team_id"});
    if(error)return say("followStatus",error.message,true);
    say("followStatus","You are following "+c.name+". Your email subscription is saved.");
  };
  $("clubPostForm").onsubmit=async e=>{
    e.preventDefault();if(!currentUser){modal("authModal");return}
    const {error}=await db.from("team_posts").insert({
      team_id:c.id,team_name:c.name,user_id:currentUser.id,body:$("clubPostText").value.trim()
    });
    if(error)return toast(error.message);
    $("clubPostText").value="";await loadClubPosts(c.id);
  };
  $("clubDetail").scrollIntoView({behavior:"smooth"});
}
async function loadClubPosts(id){
  const {data,error}=await db.from("team_posts").select("body,created_at,team_name,user_id")
    .eq("team_id",id).order("created_at",{ascending:false}).limit(30);
  if(error){$("clubPosts").textContent=error.message;return}
  const rows=data||[];
  const names=await Promise.all(rows.map(p=>getSeller(p.user_id)));
  $("clubPosts").innerHTML=rows.map((p,i)=>`<article class="review-card"><p>${safe(p.body)}</p><small>${safe(names[i])} · ${new Date(p.created_at).toLocaleString()}</small></article>`).join("")||"<p>No fan posts yet.</p>";
}
async function beginContact(e){
  e.preventDefault();
  if(!currentUser||!selectedSeller)return;
  const {id:sellerId,type,item}=selectedSeller;
  const table=type==="ticket"?"conversations":"mem_conversations";
  const foreign=type==="ticket"?"ticket_id":"item_id";
  try{
    let {data:conv,error}=await db.from(table).select("*")
      .contains("participant_ids",[currentUser.id,sellerId]).eq(foreign,item.id).limit(1).maybeSingle();
    if(error)throw error;
    if(!conv){
      const result=await db.from(table).insert({
        [foreign]:item.id,participant_ids:[currentUser.id,sellerId]
      }).select("*").single();
      if(result.error)throw result.error;conv=result.data;
    }
    const msgTable=type==="ticket"?"messages":"mem_messages";
    const {error:msgError}=await db.from(msgTable).insert({
      conversation_id:conv.id,sender_id:currentUser.id,body:$("firstMessage").value.trim()
    });
    if(msgError)throw msgError;
    $("contactForm").reset();modal("contactModal",false);toast("Message sent!");
  }catch(err){say("contactMsg",err.message,true)}
}
async function openMessages(){
  if(!currentUser){modal("authModal");return}
  modal("messagesModal");$("conversationList").innerHTML="Loading...";
  $("chat").hidden=true;
  const {data,error}=await db.from("conversations").select("*")
    .contains("participant_ids",[currentUser.id]).order("updated_at",{ascending:false});
  if(error){$("conversationList").textContent=error.message;return}
  const rows=data||[];
  if(!rows.length){$("conversationList").textContent="No conversations yet. Contact a seller from a listing.";return}
  const others=rows.map(c=>c.participant_ids.find(id=>id!==currentUser.id));
  const names=await Promise.all(others.map(getSeller));
  $("conversationList").innerHTML=rows.map((c,i)=>`
    <button class="conversation-item" data-conv="${safe(c.id)}" data-other="${safe(others[i]||"")}">
      <strong>${safe(names[i])}</strong><br><small>${new Date(c.updated_at||c.created_at).toLocaleDateString()}</small>
    </button>`).join("");
  $("conversationList").querySelectorAll("[data-conv]").forEach(b=>{
    b.onclick=()=>loadChat(b.dataset.conv,b.dataset.other);
  });
}
async function loadChat(id,otherId){
  activeConversation={id,otherId};
  $("chat").hidden=false;
  $("chatTitle").textContent=await getSeller(otherId);
  const {data,error}=await db.from("messages").select("*").eq("conversation_id",id).order("created_at");
  if(error){say("messagesMsg",error.message,true);return}
  $("chatBody").innerHTML=(data||[]).map(m=>`
    <div class="bubble ${m.sender_id===currentUser.id?"mine":""}">
      ${safe(m.body)}<small>${new Date(m.created_at).toLocaleString()}</small>
    </div>`).join("");
  $("chatBody").scrollTop=$("chatBody").scrollHeight;
}
async function reply(e){
  e.preventDefault();if(!activeConversation)return;
  const body=$("replyText").value.trim();if(!body)return;
  const {error}=await db.from("messages").insert({
    conversation_id:activeConversation.id,sender_id:currentUser.id,body
  });
  if(error)return say("messagesMsg",error.message,true);
  $("replyText").value="";await loadChat(activeConversation.id,activeConversation.otherId);
}
function setLanguage(){
  const next=document.documentElement.lang==="en"?"he":"en";
  document.documentElement.lang=next;
  document.documentElement.dir=next==="he"?"rtl":"ltr";
  document.body.dir=next==="he"?"rtl":"ltr";
  $("lang").textContent=next==="he"?"English":"עברית";
  const hebrew={
    Home:"בית",Explore:"גילוי",Sell:"מכירה",Reviews:"ביקורות",
    "Israeli Teams":"קבוצות ישראליות",Memorabilia:"מזכרות",
    "Messages":"הודעות","Profile / Sign in":"התחברות",
    "Find your moment.":"מצאו את הרגע שלכם."
  };
  document.querySelectorAll("nav button").forEach(b=>{
    const key=b.textContent.trim();if(hebrew[key])b.textContent=hebrew[key];
  });
  toast(next==="he"?"העברית הופעלה":"English enabled");
}
document.addEventListener("DOMContentLoaded",async()=>{
  document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  $("openAuth").onclick=()=>{updateAuth();modal("authModal")};
  $("signOut").onclick=signOut;
  $("authForm").onsubmit=authSubmit;
  $("switchAuth").onclick=()=>{authMode=authMode==="signin"?"signup":"signin";updateAuth()};
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
  $("profileForm").onsubmit=saveProfile;
  $("chooseTicket").onclick=()=>{$("sellForms").hidden=false;$("ticketForm").hidden=false;$("memForm").hidden=true};
  $("chooseMem").onclick=()=>{$("sellForms").hidden=false;$("ticketForm").hidden=true;$("memForm").hidden=false};
  $("backSell").onclick=()=>$("sellForms").hidden=true;
  $("ticketForm").onsubmit=e=>publish(e,"ticket");
  $("memForm").onsubmit=e=>publish(e,"mem");
  $("contactForm").onsubmit=beginContact;
  $("messagesOpen").onclick=openMessages;
  $("replyForm").onsubmit=reply;
  $("ts").oninput=renderTickets;$("tf").onchange=renderTickets;
  $("ms").oninput=renderMemorabilia;$("mf").onchange=renderMemorabilia;
  $("clubSearch").oninput=renderClubs;$("leagueFilter").onchange=renderClubs;
  $("clubGrid").onclick=e=>{const b=e.target.closest("[data-club]");if(b)openClub(b.dataset.club)};
  $("heroSearch").onsubmit=e=>{e.preventDefault();$("ts").value=$("heroQuery").value;showPage("tickets");renderTickets()};
  $("lang").onclick=setLanguage;
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-open-type]");
    if(b)openDetails(b.dataset.openType,b.dataset.openId);
  });
  try{
    if(!window.supabase?.createClient)throw Error("Supabase did not load. Refresh the page.");
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data,error}=await db.auth.getSession();if(error)throw error;
    currentUser=data.session?.user||null;updateAuth();
    db.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;updateAuth()});
    clubDirectory=ISRAELI_CLUBS;
    renderClubs();
    await loadTickets();await loadMemorabilia();
    if(currentUser){
      const {data:profile}=await db.from("seller_profiles").select("display_name").eq("user_id",currentUser.id).maybeSingle();
      if(profile)$("displayName").value=profile.display_name||"";
    }
  }catch(err){console.error(err);say("ticketError",err.message,true)}
});
