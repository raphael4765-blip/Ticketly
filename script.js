
"use strict";

const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let db = null;
let currentUser = null;
let authMode = "signin";
let tickets = [];
let memorabilia = [];
let selectedSeller = null;
let activeConversation = null;
let teams = [];
let activeSport = "Football";

const $ = id => document.getElementById(id);

const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
}[c]));

function say(id, message, error = false) {
  const el = $(id);
  if (el) {
    el.textContent = message;
    el.classList.toggle("error-text", error);
  }
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => el.hidden = true, 3500);
}

function modal(id, show = true) {
  if ($(id)) $(id).hidden = !show;
  document.body.classList.toggle("modal-open", show);
}

function category(value) {
  const s = String(value || "").toLowerCase();
  if (s.includes("football") || s.includes("soccer")) return "Football";
  if (s.includes("basket")) return "Basketball";
  if (s.includes("tennis")) return "Tennis";
  return "Other";
}

function dateText(value) {
  if (!value) return "Date not specified";
  const d = new Date(value + "T12:00:00");
  return isNaN(d) ? safe(value) :
    d.toLocaleDateString(undefined, {
      day:"numeric",
      month:"short",
      year:"numeric"
    });
}

function showPage(id) {
  ["home","tickets","teamHub","memorabilia","reviews","sell","alerts"].forEach(page => {
    if ($(page)) $(page).hidden = page !== id;
  });

  if ($("ticker")) $("ticker").hidden = id !== "home";

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === id);
  });

  if (id === "tickets") renderTickets();
  if (id === "memorabilia") renderMemorabilia();
  if (id === "teamHub" && $("teamGrid")) loadTeams();
  if (id === "reviews" && $("reviewsList")) loadReviews();

  window.scrollTo({top:0,behavior:"smooth"});
}

function updateAuth() {
  const signed = !!currentUser;

  if ($("openAuth")) {
    $("openAuth").textContent = signed
      ? (currentUser.email || "Profile")
      : "Profile / Sign in";
  }

  if ($("signOut")) $("signOut").hidden = !signed;

  if ($("authTitle")) {
    $("authTitle").textContent =
      authMode === "signup" ? "Create account" : "Sign in";
  }

  if ($("authSubmit")) {
    $("authSubmit").textContent =
      authMode === "signup" ? "Create account" : "Sign in";
    $("authSubmit").hidden = signed;
  }

  if ($("email")) $("email").disabled = signed;
  if ($("password")) $("password").disabled = signed;
  if ($("switchAuth")) $("switchAuth").hidden = signed;

  if (signed && $("authMsg")) {
    $("authMsg").textContent = "Signed in as " + currentUser.email;
  }
}

function requireDatabase() {
  if (!db) {
    throw new Error("Ticketly is still connecting. Please refresh the page and try again.");
  }
}

async function authSubmit(event) {
  event.preventDefault();

  if (!db) {
    say("authMsg", "Ticketly is still connecting. Please try again shortly.", true);
    return;
  }

  const email = $("email").value.trim();
  const password = $("password").value;

  $("authSubmit").disabled = true;
  say("authMsg", "Please wait...");

  try {
    if (authMode === "signup") {
      const {data,error} = await db.auth.signUp({email,password});
      if (error) throw error;

      if (data.session) {
        currentUser = data.user;
        updateAuth();
        say("authMsg", "Account created and signed in.");
      } else {
        say("authMsg", "Account created. Check your email if confirmation is required.");
      }
    } else {
      const {data,error} = await db.auth.signInWithPassword({email,password});
      if (error) throw error;

      currentUser = data.user;
      updateAuth();
      modal("authModal", false);
      toast("Signed in successfully.");
    }
  } catch (error) {
    say("authMsg", error.message, true);
  } finally {
    $("authSubmit").disabled = false;
  }
}

async function signOut() {
  try {
    requireDatabase();
    const {error} = await db.auth.signOut();
    if (error) throw error;

    currentUser = null;
    updateAuth();
    toast("Signed out.");
  } catch (error) {
    toast(error.message);
  }
}

function card(item,type) {
  const title = type === "ticket" ? item.event_name : item.title;

  const image = item.image_url
    ? `<img src="${safe(item.image_url)}" alt="${safe(title)}">`
    : `<div class="card-placeholder">${type === "ticket" ? "⚽" : "★"}</div>`;

  return `<article class="listing-card ticket-card" tabindex="0" role="button"
    data-open-type="${type}" data-open-id="${safe(item.id)}">
    ${image}
    <div class="ticket-card-inner">
      <div class="ticket-card-top">
        <span class="ticket-category">${safe(type === "ticket" ? category(item.category) : item.category)}</span>
        <span class="ticket-date">${type === "ticket" ? dateText(item.event_date) : "Collectible"}</span>
      </div>
      <h3>${safe(title || "Untitled listing")}</h3>
      <p class="ticket-country">📍 ${safe(item.country || "Location not specified")}</p>
      <div class="ticket-card-bottom">
        <strong>€${Number(item.price).toFixed(2)}</strong>
        <span class="ticket-label">View details →</span>
      </div>
    </div>
  </article>`;
}

function renderTickets() {
  if (!$("ticketGrid")) return;

  const q = ($("ts")?.value || "").toLowerCase();
  const filter = $("tf")?.value || "All";

  const rows = tickets.filter(t =>
    (filter === "All" || category(t.category) === filter) &&
    `${t.event_name} ${t.country} ${t.description || ""}`.toLowerCase().includes(q)
  );

  $("ticketGrid").innerHTML = rows.length
    ? rows.map(t => card(t,"ticket")).join("")
    : "<p>No sports tickets found. Try another search.</p>";
}

function renderMemorabilia() {
  if (!$("memGrid")) return;

  const q = ($("ms")?.value || "").toLowerCase();
  const filter = $("mf")?.value || "All";

  const rows = memorabilia.filter(m =>
    (filter === "All" || m.category === filter) &&
    `${m.title} ${m.country} ${m.description || ""} ${m.category || ""}`.toLowerCase().includes(q)
  );

  $("memGrid").innerHTML = rows.length
    ? rows.map(m => card(m,"mem")).join("")
    : "<p>No memorabilia listings found.</p>";
}

async function loadTickets() {
  requireDatabase();

  const {data,error} = await db.from("tickets")
    .select("*")
    .order("created_at",{ascending:false});

  if (error) throw error;

  tickets = (data || []).filter(t =>
    ["Football","Basketball","Tennis","Other"].includes(category(t.category))
  );

  renderTickets();
}

async function loadMemorabilia() {
  requireDatabase();

  const {data,error} = await db.from("memorabilia")
    .select("*")
    .order("created_at",{ascending:false});

  if (error) {
    memorabilia = [];
    say("memError","Could not load memorabilia: " + error.message,true);
    renderMemorabilia();
    return;
  }

  memorabilia = data || [];
  renderMemorabilia();
}

async function uploadPhoto(input) {
  const file = input?.files?.[0];
  if (!file) return null;

  if (!file.type.startsWith("image/")) {
    throw Error("Choose an image file.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw Error("Images must be 5 MB or smaller.");
  }

  if (!currentUser) {
    throw Error("Please sign in before uploading a photo.");
  }

  const ext = (file.name.split(".").pop() || "jpg")
    .replace(/[^a-z0-9]/gi,"")
    .toLowerCase();

  const path = `${currentUser.id}/${Date.now()}.${ext}`;

  const {error} = await db.storage.from("ticket-photos").upload(path,file,{
    upsert:false,
    contentType:file.type
  });

  if (error) throw error;

  return db.storage.from("ticket-photos").getPublicUrl(path).data.publicUrl;
}

async function publish(event,type) {
  event.preventDefault();

  if (!currentUser) {
    authMode = "signin";
    updateAuth();
    modal("authModal");
    return;
  }

  const isTicket = type === "ticket";
  const form = $(isTicket ? "ticketForm" : "memForm");
  const message = isTicket ? "ticketMsg" : "memMsg";
  const button = $(isTicket ? "ticketSubmit" : "memSubmit");

  button.disabled = true;
  say(message,"Publishing...");

  try {
    const image_url = await uploadPhoto(
      $(isTicket ? "ticketPhoto" : "memPhoto")
    );

    let row;

    if (isTicket) {
      row = {
        event_name:$("eventName").value.trim(),
        category:$("eventCategory").value,
        country:$("eventCountry").value.trim(),
        event_date:$("eventDate").value,
        price:Number($("ticketPrice").value),
        description:$("ticketDescription").value.trim(),
        user_id:currentUser.id
      };
    } else {
      row = {
        title:$("memTitle").value.trim(),
        category:$("memCategory").value,
        country:$("memCountry").value.trim(),
        price:Number($("memPrice").value),
        description:$("memDescription").value.trim(),
        user_id:currentUser.id
      };
    }

    if (image_url) row.image_url = image_url;

    const {error} = await db.from(
      isTicket ? "tickets" : "memorabilia"
    ).insert(row);

    if (error) throw error;

    form.reset();
    say(message,"Published successfully!");

    if (isTicket) {
      await loadTickets();
      showPage("tickets");
    } else {
      await loadMemorabilia();
      showPage("memorabilia");
    }
  } catch (error) {
    say(message,"Could not publish: " + error.message,true);
  } finally {
    button.disabled = false;
  }
}

async function openDetails(type,id) {
  const item = (type === "ticket" ? tickets : memorabilia)
    .find(x => String(x.id) === String(id));

  if (!item) return toast("This listing is no longer available.");

  const title = type === "ticket" ? item.event_name : item.title;

  $("detailContent").innerHTML = `
    <div class="detail-layout">
      <div>${item.image_url
        ? `<img class="detail-image" src="${safe(item.image_url)}" alt="${safe(title)}">`
        : `<div class="detail-art">${type === "ticket" ? "⚽" : "★"}</div>`}
      </div>
      <div class="detail-info">
        <p class="eyebrow">${safe(type === "ticket" ? category(item.category) : item.category)} · LISTING</p>
        <h2>${safe(title)}</h2>
        ${type === "ticket" ? `<p>📅 ${dateText(item.event_date)}</p>` : ""}
        <p>📍 ${safe(item.country || "Location not specified")}</p>
        <p>${safe(item.description || "No additional description provided.")}</p>
        <h2>€${Number(item.price).toFixed(2)}</h2>
        <div id="sellerProfileArea"></div>
        <button class="primary full" id="detailContact">Contact seller</button>
      </div>
    </div>`;

  modal("detailModal");

  if (item.user_id) showSellerProfile(item.user_id,type);

  $("detailContact").onclick = () => {
    if (!currentUser) {
      modal("detailModal",false);
      authMode = "signin";
      updateAuth();
      modal("authModal");
      return;
    }

    if (!item.user_id) return toast("Seller account unavailable.");
    if (item.user_id === currentUser.id) return toast("This is your own listing.");

    selectedSeller = {id:item.user_id,type,item};
    $("contactTitle").textContent = "Message seller about " + title;
    modal("detailModal",false);
    modal("contactModal");
  };
}

async function showSellerProfile(sellerId,kind) {
  const table = kind === "mem" ? "memorabilia" : "tickets";

  const [listings,sales,reviews] = await Promise.all([
    db.from(table).select("id",{count:"exact",head:true}).eq("user_id",sellerId),
    db.from("ticket_sales").select("id",{count:"exact",head:true})
      .eq("seller_id",sellerId).eq("status","completed"),
    db.from("seller_reviews").select("rating,review,created_at")
      .eq("seller_id",sellerId).order("created_at",{ascending:false})
  ]);

  const area = $("sellerProfileArea");
  if (!area) return;

  const rows = reviews.data || [];
  const average = rows.length
    ? rows.reduce((sum,r) => sum + Number(r.rating),0) / rows.length
    : 0;

  area.innerHTML = `
    <div class="seller-panel">
      <h3>Seller profile</h3>
      <p><b>Active listings:</b> ${listings.count ?? "—"}</p>
      <p><b>Completed ticket sales:</b> ${sales.count ?? 0}</p>
      <p><b>Rating:</b> ${rows.length ? average.toFixed(1)+"/5 ("+rows.length+" reviews)" : "No reviews yet"}</p>
      <button class="hub-button" id="writeReview">Write a review</button>
      <div id="sellerReviewForm" hidden>
        <form id="sellerReviewSubmit">
          <label>Rating
            <select id="sellerRating" required>
              <option value="">Choose rating</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
          </label>
          <textarea id="sellerReviewText" maxlength="1000" placeholder="Your experience"></textarea>
          <button class="primary">Submit review</button>
        </form>
      </div>
    </div>`;

  $("writeReview").onclick = () => {
    if (!currentUser) {
      modal("authModal");
      return;
    }

    if (currentUser.id === sellerId) {
      return toast("You cannot review yourself.");
    }

    $("sellerReviewForm").hidden = false;
  };

  $("sellerReviewSubmit").onsubmit = async event => {
    event.preventDefault();

    const {error} = await db.from("seller_reviews").insert({
      seller_id:sellerId,
      reviewer_id:currentUser.id,
      rating:Number($("sellerRating").value),
      review:$("sellerReviewText").value.trim()
    });

    if (error) return toast(error.message);

    toast("Review submitted.");
    showSellerProfile(sellerId,kind);
  };
}

async function beginContact(event) {
  event.preventDefault();

  if (!currentUser || !selectedSeller) return;

  const {id:sellerId,item} = selectedSeller;
  say("contactMsg","Sending...");

  try {
    const {data:conversation,error} = await db.from("conversations")
      .select("*")
      .contains("participant_ids",[currentUser.id,sellerId])
      .eq("ticket_id",item.id)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    let conv = conversation;

    if (!conv) {
      const result = await db.from("conversations").insert({
        ticket_id:item.id,
        participant_ids:[currentUser.id,sellerId]
      }).select("*").single();

      if (result.error) throw result.error;
      conv = result.data;
    }

    const {error:messageError} = await db.from("messages").insert({
      conversation_id:conv.id,
      sender_id:currentUser.id,
      body:$("firstMessage").value.trim()
    });

    if (messageError) throw messageError;

    $("contactForm").reset();
    modal("contactModal",false);
    toast("Message sent.");
  } catch (error) {
    say("contactMsg","Could not send: " + error.message,true);
  }
}

async function openMessages() {
  if (!currentUser) {
    modal("authModal");
    return;
  }

  modal("messagesModal");
  $("conversationList").innerHTML = "Loading...";
  $("chat").hidden = true;

  const {data,error} = await db.from("conversations")
    .select("*")
    .contains("participant_ids",[currentUser.id])
    .order("updated_at",{ascending:false});

  if (error) return say("messagesMsg",error.message,true);

  const rows = data || [];

  $("conversationList").innerHTML = rows.length
    ? rows.map(c =>
      `<button class="conversation-item" data-conv="${safe(c.id)}">
        Conversation · ${new Date(c.updated_at || c.created_at).toLocaleDateString()}
      </button>`
    ).join("")
    : "No conversations yet.";

  $("conversationList").querySelectorAll("[data-conv]").forEach(button => {
    button.onclick = () => loadChat(button.dataset.conv);
  });
}

async function loadChat(id) {
  activeConversation = id;

  const {data,error} = await db.from("messages")
    .select("*")
    .eq("conversation_id",id)
    .order("created_at",{ascending:true});

  if (error) return say("messagesMsg",error.message,true);

  $("chat").hidden = false;

  $("chatBody").innerHTML = (data || []).map(m =>
    `<div class="bubble ${m.sender_id === currentUser.id ? "mine" : ""}">
      ${safe(m.body)}
      <small>${new Date(m.created_at).toLocaleString()}</small>
    </div>`
  ).join("");

  $("chatBody").scrollTop = $("chatBody").scrollHeight;
}

async function reply(event) {
  event.preventDefault();

  if (!activeConversation || !currentUser) return;

  const body = $("replyText").value.trim();
  if (!body) return;

  const {error} = await db.from("messages").insert({
    conversation_id:activeConversation,
    sender_id:currentUser.id,
    body
  });

  if (error) return say("messagesMsg",error.message,true);

  $("replyText").value = "";
  await loadChat(activeConversation);
}

/* TEAM HUB */

async function loadTeams() {
  if (!$("teamGrid")) return;

  $("teamGrid").innerHTML = "<p>Loading clubs...</p>";

  const {data,error} = await db.from("teams")
    .select("*")
    .order("name");

  if (error) {
    $("teamGrid").innerHTML =
      `<p class="error">Could not load teams: ${safe(error.message)}</p>`;
    return;
  }

  teams = data || [];
  renderTeams();
}

function renderTeams() {
  if (!$("teamGrid")) return;

  const query = (($("teamSearch")?.value) || "").toLowerCase();

  const rows = teams.filter(t =>
    t.sport === activeSport &&
    `${t.name} ${t.league || ""}`.toLowerCase().includes(query)
  );

  $("teamGrid").innerHTML = rows.length
    ? rows.map(t => `
      <button class="team-button" data-team-id="${safe(t.id)}">
        ${t.logo_url
          ? `<img src="${safe(t.logo_url)}" alt="">`
          : `<b>${activeSport === "Football" ? "⚽" : "🏀"}</b>`}
        <span>
          <b>${safe(t.name)}</b>
          <small>${safe(t.league || activeSport)}</small>
        </span>
      </button>
    `).join("")
    : `<p>No ${activeSport.toLowerCase()} clubs added yet. The clubs need to be entered in your Supabase teams table.</p>`;
}

async function openTeam(id) {
  const team = teams.find(t => String(t.id) === String(id));
  if (!team) return;

  const box = $("teamDetail");
  if (!box) return;

  box.innerHTML = `
    <div class="hub-panel">
      <div class="team-heading">
        ${team.logo_url ? `<img src="${safe(team.logo_url)}" width="65" alt="">` : ""}
        <h2>${safe(team.name)}</h2>
        <p class="muted">${safe(team.league || "")}</p>
      </div>
      <button class="hub-button primary-hub" id="followTeam">Follow team</button>
      <h3>Fan posts</h3>
      <form id="teamPostForm">
        <textarea id="teamPostText" maxlength="1500" required
          placeholder="Share an update about ${safe(team.name)}..."></textarea>
        <button class="primary">Publish post</button>
      </form>
      <div id="teamPosts">Loading posts...</div>
    </div>`;

  const {data:followRows} = await db.from("team_follows")
    .select("user_id")
    .eq("team_id",team.id);

  let following = (followRows || []).some(x => x.user_id === currentUser?.id);

  $("followTeam").textContent = following ? "Following ✓" : "Follow team";

  $("followTeam").onclick = async () => {
    if (!currentUser) return modal("authModal");

    const result = following
      ? await db.from("team_follows").delete()
          .eq("team_id",team.id)
          .eq("user_id",currentUser.id)
      : await db.from("team_follows").insert({
          team_id:team.id,
          user_id:currentUser.id
        });

    if (result.error) return toast(result.error.message);

    following = !following;
    $("followTeam").textContent = following ? "Following ✓" : "Follow team";
  };

  $("teamPostForm").onsubmit = async event => {
    event.preventDefault();

    if (!currentUser) return modal("authModal");

    const {error} = await db.from("team_posts").insert({
      team_id:team.id,
      user_id:currentUser.id,
      body:$("teamPostText").value.trim()
    });

    if (error) return toast(error.message);

    $("teamPostText").value = "";
    await loadTeamPosts(team.id);
  };

  await loadTeamPosts(team.id);
}

async function loadTeamPosts(id) {
  const {data,error} = await db.from("team_posts")
    .select("*")
    .eq("team_id",id)
    .order("created_at",{ascending:false})
    .limit(50);

  if (!$("teamPosts")) return;

  $("teamPosts").innerHTML = error
    ? safe(error.message)
    : (data || []).length
      ? data.map(post => `
        <article class="hub-post">
          <p>${safe(post.body)}</p>
          <small class="muted">${new Date(post.created_at).toLocaleString()}</small>
        </article>
      `).join("")
      : "<p>No posts yet. Start the conversation!</p>";
}

async function loadReviews() {
  if (!$("reviewsList")) return;

  $("reviewsList").innerHTML = "Loading reviews...";

  const {data,error} = await db.from("seller_reviews")
    .select("*")
    .order("created_at",{ascending:false})
    .limit(100);

  if (error) {
    $("reviewsList").innerHTML = `<p class="error">${safe(error.message)}</p>`;
    return;
  }

  $("reviewsList").innerHTML = (data || []).length
    ? data.map(r => `
      <article class="review-card">
        <b class="green">${"★".repeat(Number(r.rating))}${"☆".repeat(5-Number(r.rating))}</b>
        <p>${safe(r.review || "No written comment.")}</p>
        <small class="muted">${new Date(r.created_at).toLocaleDateString()}</small>
      </article>
    `).join("")
    : "<p>No reviews have been submitted yet.</p>";
}

/* LANGUAGE */

function setLanguage(language) {
  const selected = language === "he" ? "he" : "en";

  document.documentElement.lang = selected;
  document.documentElement.dir = selected === "he" ? "rtl" : "ltr";

  document.querySelectorAll("[data-en][data-he]").forEach(el => {
    el.innerHTML = el.dataset[selected];
  });

  document.querySelectorAll(
    "[data-en-placeholder][data-he-placeholder]"
  ).forEach(el => {
    el.placeholder = el.dataset[selected + "Placeholder"] || "";
  });

  if ($("lang")) {
    $("lang").textContent = selected === "he" ? "English" : "עברית";
  }

  try {
    localStorage.setItem("ticketlyLanguage",selected);
  } catch (_) {}
}

/* STARTUP */

document.addEventListener("DOMContentLoaded", async () => {

  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click",() => showPage(button.dataset.page));
  });

  $("openAuth")?.addEventListener("click",() => {
    updateAuth();
    modal("authModal");
  });

  $("signOut")?.addEventListener("click",signOut);
  $("authForm")?.addEventListener("submit",authSubmit);

  $("switchAuth")?.addEventListener("click",() => {
    authMode = authMode === "signup" ? "signin" : "signup";
    say("authMsg","");
    updateAuth();
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click",() => modal(button.dataset.close,false));
  });

  $("chooseTicket")?.addEventListener("click",() => {
    $("sellChoices").hidden = true;
    $("sellForms").hidden = false;
    $("ticketForm").hidden = false;
    $("memForm").hidden = true;
  });

  $("chooseMem")?.addEventListener("click",() => {
    $("sellChoices").hidden = true;
    $("sellForms").hidden = false;
    $("ticketForm").hidden = true;
    $("memForm").hidden = false;
  });

  $("backSell")?.addEventListener("click",() => {
    $("sellChoices").hidden = false;
    $("sellForms").hidden = true;
  });

  $("ticketForm")?.addEventListener("submit",e => publish(e,"ticket"));
  $("memForm")?.addEventListener("submit",e => publish(e,"mem"));
  $("contactForm")?.addEventListener("submit",beginContact);
  $("messagesOpen")?.addEventListener("click",openMessages);
  $("replyForm")?.addEventListener("submit",reply);

  $("ts")?.addEventListener("input",renderTickets);
  $("tf")?.addEventListener("change",renderTickets);
  $("ms")?.addEventListener("input",renderMemorabilia);
  $("mf")?.addEventListener("change",renderMemorabilia);
  $("teamSearch")?.addEventListener("input",renderTeams);

  document.querySelectorAll("[data-sport]").forEach(button => {
    button.addEventListener("click",() => {
      activeSport = button.dataset.sport;

      document.querySelectorAll("[data-sport]").forEach(b => {
        b.classList.toggle("active",b === button);
      });

      if ($("teamDetail")) $("teamDetail").innerHTML = "";
      renderTeams();
    });
  });

  $("teamGrid")?.addEventListener("click",event => {
    const button = event.target.closest("[data-team-id]");
    if (button) openTeam(button.dataset.teamId);
  });

  document.addEventListener("click",event => {
    const item = event.target.closest("[data-open-type]");
    if (item) openDetails(item.dataset.openType,item.dataset.openId);
  });

  document.addEventListener("keydown",event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal").forEach(m => m.hidden = true);
      document.body.classList.remove("modal-open");
    }
  });

  $("heroSearch")?.addEventListener("submit",event => {
    event.preventDefault();
    $("ts").value = $("heroQuery").value;
    showPage("tickets");
  });

  $("lang")?.addEventListener("click",() => {
    setLanguage(document.documentElement.lang === "he" ? "en" : "he");
  });

  let savedLanguage = "en";
  try {
    savedLanguage = localStorage.getItem("ticketlyLanguage") || "en";
  } catch (_) {}

  setLanguage(savedLanguage);

  try {
    const supabaseLibrary = await (
      window.ticketlySupabaseReady || Promise.resolve(window.supabase)
    );

    if (!supabaseLibrary?.createClient) {
      throw new Error(
        "Supabase could not load. Check your internet connection and refresh the page."
      );
    }

    db = supabaseLibrary.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth: {
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    });

    const {data,error} = await db.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;
    updateAuth();

    db.auth.onAuthStateChange((_event,session) => {
      currentUser = session?.user || null;
      updateAuth();
    });

    await loadTickets();
    await loadMemorabilia();

  } catch (error) {
    console.error("Ticketly startup error:",error);
    say("ticketError","Ticketly connection error: " + error.message,true);
    say("memError","Ticketly connection error: " + error.message,true);
    say("authMsg","Connection error: " + error.message,true);
  }
});
