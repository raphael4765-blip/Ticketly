/* TICKETLY — football and basketball marketplace */

const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);

let user = null;
let language = localStorage.getItem("ticketly-language") || "en";
let page = "home";
let teamSport = "Football";
let selectedTeam = null;
let selectedConversation = null;
let authMode = "signin";
let ticketCache = [];
let memorabiliaCache = [];
let teamCache = [];
let conversationCache = [];

const translations = {
  en: {
    home:"Home",tickets:"Tickets",teams:"Teams",competitions:"Competitions",
    memorabilia:"Memorabilia",sell:"Sell",alerts:"My alerts",messages:"Messages",
    profile:"Profile",signIn:"Sign in",signOut:"Sign out",eyebrow:"THE SPORTS MARKETPLACE",
    heroTitle:"Your team. Your tickets. Your moment.",
    heroText:"Discover football and basketball tickets and memorabilia from fans around the world.",
    searchPlaceholder:"Search teams, matches or items",search:"Search",football:"Football",
    basketball:"Basketball",discover:"DISCOVER",latestTickets:"Latest tickets",
    viewAll:"View all →",collect:"COLLECT",followYourClub:"FOLLOW YOUR CLUB",
    popularTeams:"Teams",community:"THE COMMUNITY",fanReviews:"Fan experiences",
    reviewsNotice:"Customer reviews will appear here after verified transactions are available.",
    footer:"Made for football and basketball fans, everywhere.",email:"Email",
    password:"Password",forgotPassword:"Forgot password?",writeMessage:"Write a message",
    send:"Send",all:"All",searchListings:"Search listings",country:"Country",
    price:"Price",date:"Date",sport:"Sport",team:"Team",competition:"Competition",
    noTickets:"No tickets found.",noItems:"No memorabilia found.",
    noTeams:"No teams have been added yet.",noCompetitions:"No competitions available yet.",
    createAccount:"Create an account",alreadyAccount:"Already have an account? Sign in",
    needAccount:"Need an account? Sign up",name:"Display name",description:"Description",
    eventName:"Match or event name",eventDate:"Match date",quantity:"Quantity",
    image:"Image",publish:"Publish listing",ticket:"Ticket",item:"Memorabilia item",
    chooseType:"What would you like to sell?",sellTicket:"Sell a ticket",
    sellItem:"Sell memorabilia",profileTitle:"Your profile",joined:"Joined",
    sold:"Tickets sold",active:"Active listings",listed:"Tickets listed",
    contact:"Message seller",save:"Save changes",follow:"Follow team",
    unfollow:"Unfollow",noMessages:"No conversations yet.",writeFirst:"Start a conversation",
    loginRequired:"Please sign in first.",loading:"Loading…",success:"Done!",
    error:"Something went wrong.",homeEmpty:"No listings yet. Be the first to list one.",
    homeTeams:"Explore teams",competitionPage:"Competitions and leagues",
    countryPlaceholder:"Country",teamOptional:"Choose a team (optional)",
    category:"Category",title:"Title",photo:"Photo",descriptionPlaceholder:"Describe the listing",
    selectSport:"Select a sport",matchHome:"Home team",matchAway:"Away team",
    section:"Seat or section (optional)",profilePicture:"Profile picture",
    updateProfile:"Update profile",following:"Teams you follow",
    noFollowing:"You are not following any teams yet."
  },
  he: {
    home:"בית",tickets:"כרטיסים",teams:"קבוצות",competitions:"ליגות ותחרויות",
    memorabilia:"מזכרות",sell:"מכירה",alerts:"ההתראות שלי",messages:"הודעות",
    profile:"פרופיל",signIn:"התחברות",signOut:"התנתקות",eyebrow:"שוק הספורט",
    heroTitle:"הקבוצה שלך. הכרטיסים שלך. הרגע שלך.",
    heroText:"גלו כרטיסים ומזכרות של כדורגל וכדורסל מאוהדים ברחבי העולם.",
    searchPlaceholder:"חיפוש קבוצות, משחקים או פריטים",search:"חיפוש",football:"כדורגל",
    basketball:"כדורסל",discover:"גלו",latestTickets:"כרטיסים אחרונים",
    viewAll:"הצג הכל ←",collect:"אספו",followYourClub:"עקבו אחרי הקבוצה שלכם",
    popularTeams:"קבוצות",community:"הקהילה",fanReviews:"חוויות אוהדים",
    reviewsNotice:"ביקורות לקוחות יוצגו כאן לאחר שיהיו עסקאות מאומתות.",
    footer:"נוצר עבור אוהדי כדורגל וכדורסל בכל העולם.",email:"דוא״ל",
    password:"סיסמה",forgotPassword:"שכחתם סיסמה?",writeMessage:"כתבו הודעה",
    send:"שליחה",all:"הכל",searchListings:"חיפוש מודעות",country:"מדינה",
    price:"מחיר",date:"תאריך",sport:"ענף ספורט",team:"קבוצה",competition:"תחרות",
    noTickets:"לא נמצאו כרטיסים.",noItems:"לא נמצאו מזכרות.",
    noTeams:"עדיין לא נוספו קבוצות.",noCompetitions:"אין תחרויות זמינות כרגע.",
    createAccount:"יצירת חשבון",alreadyAccount:"כבר יש לכם חשבון? התחברו",
    needAccount:"אין לכם חשבון? הירשמו",name:"שם לתצוגה",description:"תיאור",
    eventName:"שם המשחק או האירוע",eventDate:"תאריך המשחק",quantity:"כמות",
    image:"תמונה",publish:"פרסום מודעה",ticket:"כרטיס",item:"פריט מזכרת",
    chooseType:"מה תרצו למכור?",sellTicket:"מכירת כרטיס",sellItem:"מכירת מזכרות",
    profileTitle:"הפרופיל שלכם",joined:"תאריך הצטרפות",sold:"כרטיסים שנמכרו",
    active:"מודעות פעילות",listed:"כרטיסים שפורסמו",contact:"שליחת הודעה למוכר",
    save:"שמירת שינויים",follow:"עקבו אחרי הקבוצה",unfollow:"הפסקת מעקב",
    noMessages:"אין שיחות עדיין.",writeFirst:"התחילו שיחה",
    loginRequired:"יש להתחבר תחילה.",loading:"טוען…",success:"בוצע!",
    error:"משהו השתבש.",homeEmpty:"אין מודעות עדיין. היו הראשונים לפרסם.",
    homeTeams:"גלו קבוצות",competitionPage:"ליגות ותחרויות",
    countryPlaceholder:"מדינה",teamOptional:"בחירת קבוצה (לא חובה)",
    category:"קטגוריה",title:"כותרת",photo:"תמונה",descriptionPlaceholder:"תארו את המודעה",
    selectSport:"בחרו ענף ספורט",matchHome:"קבוצה מארחת",matchAway:"קבוצה אורחת",
    section:"מקום או יציע (לא חובה)",profilePicture:"תמונת פרופיל",
    updateProfile:"עדכון פרופיל",following:"קבוצות במעקב",
    noFollowing:"עדיין אינכם עוקבים אחרי קבוצות."
  }
};

function tr(key) {
  return translations[language][key] || translations.en[key] || key;
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "he" ? "rtl" : "ltr";
  $("languageButton").textContent = language === "en" ? "עברית" : "English";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (tr(key)) el.textContent = tr(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = tr(el.dataset.i18nPlaceholder);
  });

  localStorage.setItem("ticketly-language", language);
  renderPage();
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function money(value) {
  return "€" + Number(value || 0).toFixed(2);
}

function showNotice(message, error = false) {
  const el = $("notice");
  el.textContent = message;
  el.className = error ? "notice error" : "notice";
  el.hidden = false;
  window.scrollTo({top:0,behavior:"smooth"});
}

function empty(message) {
  return `<div class="empty-card">${safe(message)}</div>`;
}

function openModal(id) {
  $(id).hidden = false;
}

function closeModal(id) {
  $(id).hidden = true;
}

function go(next) {
  page = next;
  selectedTeam = null;
  renderPage();
  document.querySelectorAll("nav [data-page]").forEach(b =>
    b.classList.toggle("active", b.dataset.page === next)
  );
  window.scrollTo({top:0,behavior:"smooth"});
}

function listingCard(row, type = "ticket") {
  const title = type === "ticket" ? row.event_name : row.title;
  const image = row.image_url
    ? `<img class="listing-image" src="${safe(row.image_url)}" alt="">`
    : `<div class="listing-image"></div>`;
  const sellerName = row.seller?.display_name || "Ticketly member";
  const avatar = row.seller?.avatar_url || "";
  const joined = row.seller?.created_at
    ? new Date(row.seller.created_at).toLocaleDateString()
    : "—";
  const sold = Number(row.seller?.tickets_sold || 0);

  return `<article class="listing-card" data-detail="${safe(row.id)}" data-type="${type}">
    ${image}
    <h3>${safe(title)}</h3>
    <p class="muted">${safe(row.sport || row.category || "")} · ${safe(row.country || "")}</p>
    ${type === "ticket" ? `<p class="muted">${safe(row.event_date || "")}</p>` : ""}
    <p>${safe(row.description || "")}</p>
    <div class="price">${money(row.price)}</div>
    <div class="seller">
      <img class="avatar" src="${safe(avatar)}" alt="" onerror="this.style.display='none'">
      <div><strong>${safe(sellerName)}</strong>
      <span class="muted">${tr("joined")}: ${safe(joined)} · ${tr("sold")}: ${sold}</span></div>
    </div>
  </article>`;
}

async function attachSellers(rows) {
  const ids = [...new Set(rows.map(x => x.user_id).filter(Boolean))];
  if (!ids.length) return rows;
  const {data} = await db.from("profiles")
    .select("user_id,display_name,avatar_url,created_at,tickets_sold")
    .in("user_id", ids);
  const map = new Map((data || []).map(p => [p.user_id,p]));
  return rows.map(r => ({...r,seller:map.get(r.user_id)}));
}

async function loadTickets() {
  const {data,error} = await db.from("tickets")
    .select("*").order("created_at",{ascending:false});
  if (error) throw error;
  ticketCache = await attachSellers(data || []);
  return ticketCache;
}

async function loadMemorabilia() {
  const {data,error} = await db.from("memorabilia")
    .select("*").order("created_at",{ascending:false});
  if (error) throw error;
  memorabiliaCache = await attachSellers(data || []);
  return memorabiliaCache;
}

async function loadTeams() {
  const {data,error} = await db.from("teams")
    .select("*").order("name");
  if (error) throw error;
  teamCache = data || [];
  return teamCache;
}

function renderHome() {
  $("app").innerHTML = `
  <section class="hero">
    <div class="hero-copy">
      <span class="eyebrow">${tr("eyebrow")}</span>
      <h1>${tr("heroTitle").replaceAll(". ",".<br>")}</h1>
      <p>${tr("heroText")}</p>
      <form id="heroSearch" class="search-bar">
        <input id="heroQuery" placeholder="${tr("searchPlaceholder")}">
        <button class="primary">${tr("search")}</button>
      </form>
      <div class="sport-shortcuts">
        <button data-sport="Football">⚽ ${tr("football")}</button>
        <button data-sport="Basketball">🏀 ${tr("basketball")}</button>
      </div>
    </div>
    <div class="hero-art"><div class="hero-ball">⚽</div>
      <div class="hero-label">TICKETLY / WORLDWIDE SPORTS</div>
      <div class="hero-orange">LIVE<br>THE GAME.</div></div>
  </section>
  <section class="home-section">
    <div class="section-title"><h2>${tr("latestTickets")}</h2>
      <button class="text-link" data-page="tickets">${tr("viewAll")}</button></div>
    <div class="card-grid">${ticketCache.slice(0,3).map(x=>listingCard(x)).join("") || empty(tr("homeEmpty"))}</div>
  </section>
  <section class="home-section">
    <div class="section-title"><h2>${tr("memorabilia")}</h2>
      <button class="text-link" data-page="memorabilia">${tr("viewAll")}</button></div>
    <div class="card-grid">${memorabiliaCache.slice(0,3).map(x=>listingCard(x,"memorabilia")).join("") || empty(tr("noItems"))}</div>
  </section>
  <section class="home-section">
    <div class="section-title"><h2>${tr("popularTeams")}</h2>
      <button class="text-link" data-page="teams">${tr("viewAll")}</button></div>
    <div class="team-grid">${teamCache.slice(0,5).map(teamCard).join("") || empty(tr("noTeams"))}</div>
  </section>
  <section class="reviews"><h2>${tr("fanReviews")}</h2><p>${tr("reviewsNotice")}</p></section>`;
}

function teamCard(team) {
  return `<article class="team-card" data-team="${safe(team.id)}">
    ${team.logo_url ? `<img class="team-logo" src="${safe(team.logo_url)}" alt="${safe(team.name)}">` : ""}
    <strong>${safe(team.name)}</strong>
    <p class="muted">${safe(team.sport)} · ${safe(team.country || "")}</p>
  </article>`;
}

function renderTickets() {
  $("app").innerHTML = `
    <div class="page-heading"><span class="eyebrow">${tr("discover")}</span><h2>${tr("tickets")}</h2></div>
    <div class="filters">
      <input id="listingSearch" placeholder="${tr("searchListings")}">
      <select id="sportFilter"><option value="">${tr("all")}</option><option>Football</option><option>Basketball</option></select>
      <input id="countryFilter" placeholder="${tr("country")}">
      <input id="minPrice" type="number" min="0" placeholder="Min €">
      <input id="maxPrice" type="number" min="0" placeholder="Max €">
      <select id="sortFilter"><option value="new">${tr("latestTickets")}</option><option value="low">Price ↑</option><option value="high">Price ↓</option></select>
    </div>
    <div id="ticketResults" class="card-grid"></div>`;
  const update = () => {
    let rows = [...ticketCache];
    const q = $("listingSearch").value.toLowerCase();
    const sport = $("sportFilter").value;
    const country = $("countryFilter").value.toLowerCase();
    const min = Number($("minPrice").value || 0);
    const max = Number($("maxPrice").value || Infinity);
    rows = rows.filter(r =>
      `${r.event_name} ${r.country} ${r.description}`.toLowerCase().includes(q) &&
      (!sport || r.sport === sport) &&
      String(r.country || "").toLowerCase().includes(country) &&
      Number(r.price) >= min && Number(r.price) <= max
    );
    if ($("sortFilter").value === "low") rows.sort((a,b)=>a.price-b.price);
    if ($("sortFilter").value === "high") rows.sort((a,b)=>b.price-a.price);
    $("ticketResults").innerHTML = rows.map(r=>listingCard(r)).join("") || empty(tr("noTickets"));
  };
  ["listingSearch","sportFilter","countryFilter","minPrice","maxPrice","sortFilter"]
    .forEach(id => $(id).addEventListener("input",update));
  update();
}

function renderMemorabilia() {
  $("app").innerHTML = `
    <div class="page-heading"><span class="eyebrow">${tr("collect")}</span><h2>${tr("memorabilia")}</h2></div>
    <div class="filters"><input id="memSearch" placeholder="${tr("searchListings")}">
    <select id="memSport"><option value="">${tr("all")}</option><option>Football</option><option>Basketball</option></select></div>
    <div id="memResults" class="card-grid"></div>`;
  const update = () => {
    const q = $("memSearch").value.toLowerCase();
    const sport = $("memSport").value;
    const rows = memorabiliaCache.filter(r =>
      `${r.title} ${r.description} ${r.country}`.toLowerCase().includes(q) &&
      (!sport || r.sport === sport)
    );
    $("memResults").innerHTML = rows.map(r=>listingCard(r,"memorabilia")).join("") || empty(tr("noItems"));
  };
  $("memSearch").addEventListener("input",update);
  $("memSport").addEventListener("change",update);
  update();
}

function renderTeams() {
  $("app").innerHTML = `
    <div class="page-heading"><span class="eyebrow">${tr("followYourClub")}</span><h2>${tr("teams")}</h2></div>
    <div class="team-filters">
      <button class="${teamSport==="Football"?"active":""}" data-teamsport="Football">⚽ ${tr("football")}</button>
      <button class="${teamSport==="Basketball"?"active":""}" data-teamsport="Basketball">🏀 ${tr("basketball")}</button>
    </div>
    <div class="team-grid">${teamCache.filter(t=>t.sport===teamSport).map(teamCard).join("") || empty(tr("noTeams"))}</div>`;
}

async function renderTeamDetail(team) {
  selectedTeam = team;
  const tickets = ticketCache.filter(t=>String(t.team_id)===String(team.id));
  const items = memorabiliaCache.filter(t=>String(t.team_id)===String(team.id));
  $("app").innerHTML = `
    <div class="page-heading">${team.logo_url?`<img class="team-logo" src="${safe(team.logo_url)}">`:""}
      <h2>${safe(team.name)}</h2><p>${safe(team.sport)} · ${safe(team.country || "")}</p>
      <button class="secondary" data-page="teams">← ${tr("teams")}</button></div>
    <h2>${tr("tickets")}</h2><div class="card-grid">${tickets.map(t=>listingCard(t)).join("") || empty(tr("noTickets"))}</div>
    <h2>${tr("memorabilia")}</h2><div class="card-grid">${items.map(t=>listingCard(t,"memorabilia")).join("") || empty(tr("noItems"))}</div>`;
}

function renderCompetitions() {
  $("app").innerHTML = `<div class="page-heading"><h2>${tr("competitionPage")}</h2></div>
  <div class="card-grid">${empty(tr("noCompetitions"))}</div>`;
}

function renderSell() {
  $("app").innerHTML = `
  <div class="page-heading"><h2>${tr("chooseType")}</h2></div>
  <div class="form-layout">
    <form id="newTicket" class="panel">
      <h3>${tr("sellTicket")}</h3>
      ${field("event_name",tr("eventName"),"text",true)}
      ${sportSelect()}
      ${teamSelect()}
      ${field("country",tr("country"),"text",true)}
      ${field("event_date",tr("eventDate"),"date",true)}
      ${field("price",tr("price")+" (€)","number",true)}
      ${field("quantity",tr("quantity"),"number",true)}
      ${field("section",tr("section"),"text",false)}
      ${field("description",tr("description"),"textarea",false)}
      ${field("image",tr("image"),"file",false)}
      <button class="primary full">${tr("publish")}</button><p id="ticketMessage" class="form-message"></p>
    </form>
    <form id="newMemorabilia" class="panel">
      <h3>${tr("sellItem")}</h3>
      ${field("title",tr("title"),"text",true)}
      ${sportSelect()}
      ${teamSelect()}
      ${field("country",tr("country"),"text",true)}
      ${field("price",tr("price")+" (€)","number",true)}
      ${field("description",tr("description"),"textarea",false)}
      ${field("image",tr("image"),"file",false)}
      <button class="primary full">${tr("publish")}</button><p id="memMessage" class="form-message"></p>
    </form>
  </div>`;
  $("newTicket").addEventListener("submit",e=>publishListing(e,"ticket"));
  $("newMemorabilia").addEventListener("submit",e=>publishListing(e,"memorabilia"));
}

function field(name,label,type,required) {
  const req = required ? "required" : "";
  if (type==="textarea") return `<label>${label}<textarea name="${name}" maxlength="2000"></textarea></label>`;
  return `<label>${label}<input name="${name}" type="${type}" ${req} ${type==="number"?'min="0.01" step="0.01"':""}></label>`;
}
function sportSelect() {
  return `<label>${tr("sport")}<select name="sport" required><option>Football</option><option>Basketball</option></select></label>`;
}
function teamSelect() {
  return `<label>${tr("team")}<select name="team_id"><option value="">${tr("teamOptional")}</option>
    ${teamCache.map(t=>`<option value="${safe(t.id)}">${safe(t.name)}</option>`).join("")}</select></label>`;
}

async function uploadImage(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/") || file.size > 5*1024*1024) {
    throw new Error("Please choose an image smaller than 5 MB.");
  }
  const ext = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,"");
  const path = `${user.id}/${crypto.randomUUID()}.${ext || "jpg"}`;
  const {error} = await db.storage.from("ticket-photos").upload(path,file,{upsert:false});
  if (error) throw error;
  const {data} = db.storage.from("ticket-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function publishListing(event,type) {
  event.preventDefault();
  if (!user) return showAuth();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const message = $(type==="ticket"?"ticketMessage":"memMessage");
  const button = form.querySelector("button[type=submit],button:not([type])");
  button.disabled = true;
  try {
    const image = await uploadImage(values.image);
    const common = {
      sport:values.sport,
      team_id:values.team_id || null,
      country:values.country,
      price:Number(values.price),
      description:values.description || "",
      image_url:image,
      user_id:user.id
    };
    let payload;
    if (type==="ticket") {
      payload = {...common,event_name:values.event_name,event_date:values.event_date,
        quantity:Number(values.quantity),section:values.section || "",status:"available"};
    } else {
      payload = {...common,title:values.title,category:"Sports memorabilia"};
    }
    const {error} = await db.from(type==="ticket"?"tickets":"memorabilia").insert(payload);
    if (error) throw error;
    form.reset();
    message.textContent = tr("success");
    await refreshData();
  } catch (error) {
    message.textContent = error.message;
  } finally { button.disabled = false; }
}

function renderAlerts() {
  $("app").innerHTML = `<div class="page-heading"><h2>${tr("following")}</h2></div><div id="followedTeams" class="team-grid"></div>`;
  if (!user) return $("followedTeams").innerHTML=empty(tr("loginRequired"));
  db.from("followed_teams").select("team_id,teams(*)").eq("user_id",user.id)
    .then(({data,error})=>{
      $("followedTeams").innerHTML = error ? empty(error.message) :
        (data||[]).map(x=>teamCard(x.teams)).join("") || empty(tr("noFollowing"));
    });
}

async function renderProfile() {
  $("app").innerHTML = `<div class="page-heading"><h2>${tr("profileTitle")}</h2></div>`;
  if (!user) return $("app").insertAdjacentHTML("beforeend",`<button class="primary" id="profileLogin">${tr("signIn")}</button>`);
  const {data:p} = await db.from("profiles").select("*").eq("user_id",user.id).maybeSingle();
  const {count} = await db.from("tickets").select("*",{count:"exact",head:true}).eq("user_id",user.id);
  $("app").insertAdjacentHTML("beforeend",`
    <form id="profileForm" class="panel">
      <label>${tr("name")}<input name="display_name" maxlength="60" value="${safe(p?.display_name || "")}" required></label>
      <label>${tr("profilePicture")}<input name="avatar" type="file" accept="image/*"></label>
      <p>${tr("joined")}: ${p?.created_at?new Date(p.created_at).toLocaleDateString():"—"}</p>
      <p>${tr("sold")}: ${Number(p?.tickets_sold||0)}</p>
      <p>${tr("listed")}: ${count||0}</p>
      <button class="primary">${tr("save")}</button>
      <button type="button" id="profileSignOut" class="secondary">${tr("signOut")}</button>
      <p id="profileMessage" class="form-message"></p>
    </form>`);
  $("profileForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    try {
      const avatar=await uploadImage(f.get("avatar"));
      const patch={user_id:user.id,display_name:f.get("display_name")};
      if(avatar) patch.avatar_url=avatar;
      const {error}=await db.from("profiles").upsert(patch,{onConflict:"user_id"});
      if(error) throw error;
      $("profileMessage").textContent=tr("success");
      await refreshData();
    } catch(err){$("profileMessage").textContent=err.message;}
  });
  $("profileSignOut").addEventListener("click",signOut);
}

function renderMessages() {
  $("app").innerHTML = `<div class="page-heading"><h2>${tr("messages")}</h2></div>
    <div class="panel"><div id="pageConversations"></div><div id="pageChat"></div></div>`;
  if (!user) return $("pageConversations").innerHTML=empty(tr("loginRequired"));
  loadConversations("pageConversations","pageChat");
}

async function loadConversations(listId,chatId) {
  const {data,error}=await db.from("conversations").select("*,messages(*)")
    .contains("participant_ids",[user.id]).order("updated_at",{ascending:false});
  if(error) return $(listId).innerHTML=empty(error.message);
  conversationCache=data||[];
  $(listId).innerHTML=conversationCache.map(c=>
    `<button class="secondary full" data-conversation="${c.id}">Conversation · ${new Date(c.updated_at).toLocaleString()}</button>`
  ).join("") || empty(tr("noMessages"));
}

async function openConversation(id) {
  selectedConversation=id;
  const {data,error}=await db.from("messages").select("*")
    .eq("conversation_id",id).order("created_at");
  if(error) return showNotice(error.message,true);
  $("chatMessages").innerHTML=(data||[]).map(m=>
    `<div class="message-bubble ${m.sender_id===user.id?"mine":""}">${safe(m.body)}</div>`
  ).join("");
  $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
}

async function sendMessage(event) {
  event.preventDefault();
  if(!user || !selectedConversation) return;
  const body=$("messageInput").value.trim();
  if(!body) return;
  const {error}=await db.from("messages").insert({
    conversation_id:selectedConversation,sender_id:user.id,body
  });
  if(error) return $("chatNotice").textContent=error.message;
  $("messageInput").value="";
  await openConversation(selectedConversation);
}

async function contactSeller(row,type) {
  if(!user) return showAuth();
  if(row.user_id===user.id) return showNotice("This is your own listing.");
  const table=type==="ticket"?"conversations":"mem_conversations";
  const idField=type==="ticket"?"ticket_id":"item_id";
  const {data:existing}=await db.from(table).select("*")
    .contains("participant_ids",[user.id]).eq(idField,row.id).maybeSingle();
  let conversation=existing;
  if(!conversation) {
    const {data,error}=await db.from(table).insert({
      participant_ids:[user.id,row.user_id],[idField]:row.id
    }).select().single();
    if(error) return showNotice(error.message,true);
    conversation=data;
  }
  selectedConversation=conversation.id;
  openModal("chatModal");
  $("conversationList").innerHTML="";
  await openConversation(selectedConversation);
}

async function showDetails(id,type) {
  const row=(type==="ticket"?ticketCache:memorabiliaCache).find(x=>String(x.id)===String(id));
  if(!row) return;
  const title=type==="ticket"?row.event_name:row.title;
  $("detailContent").innerHTML=`
    ${row.image_url?`<img class="listing-image" src="${safe(row.image_url)}">`:""}
    <h2>${safe(title)}</h2><p>${safe(row.sport||"")} · ${safe(row.country||"")}</p>
    <p>${safe(row.description||"")}</p><h2 class="price">${money(row.price)}</h2>
    <div class="seller"><strong>${safe(row.seller?.display_name||"Ticketly member")}</strong></div>
    <p>${tr("joined")}: ${row.seller?.created_at?new Date(row.seller.created_at).toLocaleDateString():"—"}</p>
    <p>${tr("sold")}: ${Number(row.seller?.tickets_sold||0)}</p>
    <button id="detailContact" class="primary">${tr("contact")}</button>`;
  openModal("detailModal");
  $("detailContact").addEventListener("click",()=>contactSeller(row,type));
}

async function showAuth() {
  authMode="signin";
  $("authHeading").textContent=tr("signIn");
  $("authSubmit").textContent=tr("signIn");
  $("authSwitch").textContent=tr("needAccount");
  $("signOutButton").hidden=!user;
  openModal("authModal");
}

async function submitAuth(e) {
  e.preventDefault();
  const email=$("authEmail").value.trim();
  const password=$("authPassword").value;
  $("authSubmit").disabled=true;
  try {
    const result=authMode==="signup"
      ? await db.auth.signUp({email,password})
      : await db.auth.signInWithPassword({email,password});
    if(result.error) throw result.error;
    if(authMode==="signup" && !result.data.session) {
      $("authMessage").textContent="Account created. Check your email to confirm it.";
    } else {
      user=result.data.user;
      closeModal("authModal");
      await ensureProfile();
      await refreshData();
    }
  } catch(err) {$("authMessage").textContent=err.message;}
  finally {$("authSubmit").disabled=false;}
}

async function ensureProfile() {
  if(!user) return;
  const {error}=await db.from("profiles").upsert({
    user_id:user.id,
    display_name:user.user_metadata?.display_name || user.email?.split("@")[0] || "Member"
  },{onConflict:"user_id",ignoreDuplicates:true});
  if(error) console.warn("Profile setup:",error.message);
}

async function signOut() {
  const {error}=await db.auth.signOut();
  if(error) return showNotice(error.message,true);
  user=null;
  closeModal("authModal");
  await refreshData();
}

async function toggleFollow(teamId) {
  if(!user) return showAuth();
  const {data}=await db.from("followed_teams").select("*")
    .eq("user_id",user.id).eq("team_id",teamId).maybeSingle();
  if(data) {
    const {error}=await db.from("followed_teams").delete()
      .eq("user_id",user.id).eq("team_id",teamId);
    if(error) return showNotice(error.message,true);
    showNotice(tr("unfollow"));
  } else {
    const {error}=await db.from("followed_teams").insert({user_id:user.id,team_id:teamId});
    if(error) return showNotice(error.message,true);
    showNotice(tr("follow"));
  }
}

async function refreshData() {
  try {
    await Promise.all([loadTickets(),loadMemorabilia(),loadTeams()]);
    renderPage();
  } catch(error) {
    console.error(error);
    showNotice("Database error: "+error.message,true);
  }
}

function renderPage() {
  if(page==="home") renderHome();
  else if(page==="tickets") renderTickets();
  else if(page==="memorabilia") renderMemorabilia();
  else if(page==="teams") renderTeams();
  else if(page==="competitions") renderCompetitions();
  else if(page==="sell") renderSell();
  else if(page==="alerts") renderAlerts();
  else if(page==="profile") renderProfile();
  else if(page==="messages") renderMessages();
}

document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-page]");
  if(nav) {go(nav.dataset.page);return;}
  const sport=e.target.closest("[data-sport]");
  if(sport) {page="tickets";renderTickets();$("sportFilter").value=sport.dataset.sport;$("sportFilter").dispatchEvent(new Event("input"));return;}
  const teamSportButton=e.target.closest("[data-teamsport]");
  if(teamSportButton) {teamSport=teamSportButton.dataset.teamsport;renderTeams();return;}
  const team=e.target.closest("[data-team]");
  if(team) {
    const found=teamCache.find(t=>String(t.id)===team.dataset.team);
    if(found) renderTeamDetail(found);
    return;
  }
  const card=e.target.closest("[data-detail]");
  if(card) {showDetails(card.dataset.detail,card.dataset.type);return;}
  const conversation=e.target.closest("[data-conversation]");
  if(conversation) {openConversation(conversation.dataset.conversation);return;}
  const close=e.target.closest("[data-close]");
  if(close) closeModal(close.dataset.close);
});

$("languageButton").addEventListener("click",()=>{
  language=language==="en"?"he":"en";
  applyLanguage();
});
$("accountButton").addEventListener("click",showAuth);
$("mobileMenu").addEventListener("click",()=>$("navigation").classList.toggle("open"));
$("authForm").addEventListener("submit",submitAuth);
$("authSwitch").addEventListener("click",()=>{
  authMode=authMode==="signin"?"signup":"signin";
  $("authHeading").textContent=tr(authMode==="signup"?"createAccount":"signIn");
  $("authSubmit").textContent=tr(authMode==="signup"?"createAccount":"signIn");
  $("authSwitch").textContent=tr(authMode==="signup"?"alreadyAccount":"needAccount");
});
$("signOutButton").addEventListener("click",signOut);
$("messageForm").addEventListener("submit",sendMessage);
$("forgotPassword").addEventListener("click",async()=>{
  const email=$("authEmail").value.trim();
  if(!email) return $("authMessage").textContent="Enter your email first.";
  const {error}=await db.auth.resetPasswordForEmail(email);
  $("authMessage").textContent=error?error.message:"Password reset email requested.";
});
$("heroSearch").addEventListener("submit",e=>{
  e.preventDefault();
  page="tickets";
  renderTickets();
  $("listingSearch").value=$("heroQuery").value;
  $("listingSearch").dispatchEvent(new Event("input"));
});

(async function init(){
  applyLanguage();
  try {
    const {data,error}=await db.auth.getSession();
    if(error) throw error;
    user=data.session?.user||null;
    if(user) await ensureProfile();
    $("accountButton").textContent=user?(user.email||tr("profile")):tr("signIn");
    db.auth.onAuthStateChange((_event,session)=>{
      user=session?.user||null;
      $("accountButton").textContent=user?(user.email||tr("profile")):tr("signIn");
      refreshData();
    });
    await refreshData();
  } catch(error) {
    console.error(error);
    showNotice("Ticketly could not connect to Supabase: "+error.message,true);
  }
})();
