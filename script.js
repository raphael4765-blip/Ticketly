
const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let db;
let user = null;
let authMode = "signin";
let tickets = [];
let memorabilia = [];
let pendingMessage = null;
let activeChat = null;
let currentPage = "home";
let currentLanguage = "en";

const $ = id => document.getElementById(id);

const words = {
  "Home": "בית",
  "Explore": "גילוי אירועים",
  "Tickets": "כרטיסים",
  "Memorabilia": "מזכרות",
  "Sell Tickets": "מכירת כרטיסים",
  "Sell to fans": "מכרו לאוהדים",
  "My Alerts": "ההתראות שלי",
  "Messages": "הודעות",
  "Profile": "פרופיל",
  "Sign in": "התחברות",
  "Sign up": "הרשמה",
  "Sign in / Sign up": "התחברות / הרשמה",
  "Sign out": "התנתקות",
  "Create account": "יצירת חשבון",
  "Need an account? Sign up": "אין לכם חשבון? הירשמו",
  "Already have an account? Sign in": "כבר יש לכם חשבון? התחברו",
  "Email": "אימייל",
  "Password": "סיסמה",
  "Category": "קטגוריה",
  "Country": "מדינה",
  "Price (€)": "מחיר (€)",
  "Event date": "תאריך האירוע",
  "Description": "תיאור",
  "Photo": "תמונה",
  "Event name": "שם האירוע",
  "Item title": "שם הפריט",
  "Item type": "סוג הפריט",
  "Football": "כדורגל",
  "Concerts": "הופעות",
  "Other": "אחר",
  "All": "הכול",
  "Match-worn shirt": "חולצת משחק",
  "Signed item": "פריט חתום",
  "Boots": "נעלי כדורגל",
  "Publish ticket": "פרסום כרטיס",
  "Publish item": "פרסום פריט",
  "Sell a ticket": "מכירת כרטיס",
  "Sell memorabilia": "מכירת מזכרות",
  "Message seller": "שליחת הודעה למוכר",
  "Write a message": "כתבו הודעה",
  "Write a reply": "כתבו תשובה",
  "Send message": "שליחת הודעה",
  "No messages yet": "אין הודעות עדיין",
  "No listings yet": "אין פריטים עדיין",
  "Loading...": "טוען...",
  "View details": "הצגת פרטים",
  "Your own listing": "זו המודעה שלכם",
  "Listing published": "המודעה פורסמה",
  "Message sent": "ההודעה נשלחה",
  "Please sign in first": "יש להתחבר תחילה",
  "No seller account is linked to this listing.": "לא משויך חשבון מוכר למודעה הזו."
};

function tr(text) {
  if (currentLanguage === "he") {
    return words[text] || text;
  }
  return text;
}

function say(id, message, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = tr(message);
  el.classList.toggle("error", error);
}

function notify(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = tr(message);
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 3000);
}

function showModal(id, show) {
  if ($(id)) $(id).hidden = !show;
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

/* ---------------------------
   NAVIGATION: ONE PAGE AT A TIME
---------------------------- */

function goTo(page) {
  currentPage = page;

  const sections = {
    home: ["home"],
    tickets: ["tickets"],
    memorabilia: ["memorabilia"],
    sell: ["sell"],
    alerts: ["alerts"]
  };

  const ids = ["tickets", "memorabilia", "sell", "alerts"];

  ids.forEach(id => {
    const el = $(id);
    if (el) el.hidden = !(sections[page] || []).includes(id);
  });

  const hero = document.querySelector(".hero");
  const ticker = document.querySelector(".ticker");

  if (hero) hero.hidden = page !== "home";
  if (ticker) ticker.hidden = page !== "home";

  if (page === "home") {
    if (hero) hero.hidden = false;
    if (ticker) ticker.hidden = false;
  }

  document.querySelectorAll(".topbar nav a").forEach(a => {
    a.classList.remove("active");
    const href = a.getAttribute("href");

    if (
      (page === "home" && href === "#") ||
      (page === "tickets" && href === "#tickets") ||
      (page === "memorabilia" && href === "#memorabilia") ||
      (page === "sell" && href === "#sell") ||
      (page === "alerts" && href === "#alerts")
    ) {
      a.classList.add("active");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
  document.querySelectorAll(".topbar nav a").forEach(a => {
    a.addEventListener("click", e => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      e.preventDefault();

      const pages = {
        "#": "home",
        "#tickets": "tickets",
        "#memorabilia": "memorabilia",
        "#sell": "sell",
        "#alerts": "alerts"
      };

      goTo(pages[href] || "home");
    });
  });

  const explore = document.querySelector('.topbar nav a[href="#tickets"]');
  if (explore) {
    explore.addEventListener("dblclick", e => {
      e.preventDefault();
      goTo("memorabilia");
    });
  }

  const heroSearch = $("heroSearch");
  if (heroSearch) {
    heroSearch.addEventListener("submit", e => {
      e.preventDefault();
      if ($("ts") && $("heroQuery")) {
        $("ts").value = $("heroQuery").value;
      }
      goTo("tickets");
      renderTickets();
    });
  }

  document.querySelectorAll('a[href="#memorabilia"]').forEach(a => {
    a.addEventListener("click", () => goTo("memorabilia"));
  });
}

/* ---------------------------
   AUTHENTICATION
---------------------------- */

function updateAuthUI() {
  const open = $("openAuth");
  const signOut = $("signOut");

  if (open) {
    open.textContent = user
      ? (user.email || tr("Profile"))
      : tr("Sign in / Sign up");
  }

  if (signOut) {
    signOut.hidden = !user;
    signOut.textContent = tr("Sign out");
  }

  ["ticketSubmit", "memSubmit"].forEach(id => {
    if ($(id)) $(id).disabled = !user;
  });

  if ($("authTitle")) {
    $("authTitle").textContent =
      authMode === "signup" ? tr("Create account") : tr("Sign in");
  }

  if ($("authSubmit")) {
    $("authSubmit").textContent =
      authMode === "signup" ? tr("Create account") : tr("Sign in");
  }

  if ($("switchAuth")) {
    $("switchAuth").textContent = authMode === "signup"
      ? tr("Already have an account? Sign in")
      : tr("Need an account? Sign up");
    $("switchAuth").hidden = !!user;
  }
}

async function handleAuth(e) {
  e.preventDefault();

  const button = $("authSubmit");
  button.disabled = true;
  say("authMsg", "");

  try {
    const email = $("email").value.trim();
    const password = $("password").value;

    const result = authMode === "signup"
      ? await db.auth.signUp({ email, password })
      : await db.auth.signInWithPassword({ email, password });

    if (result.error) throw result.error;

    if (result.data.session) {
      user = result.data.user;
      showModal("authModal", false);
      notify("Signed in successfully");
    } else {
      say(
        "authMsg",
        "Account created. Check your email if confirmation is enabled."
      );
    }

    updateAuthUI();
    await loadAll();
  } catch (err) {
    say("authMsg", err.message, true);
  } finally {
    button.disabled = !user;
    updateAuthUI();
  }
}

async function signOut() {
  const result = await db.auth.signOut();

  if (result.error) {
    notify(result.error.message);
    return;
  }

  user = null;
  updateAuthUI();
  notify("Signed out");
}

/* ---------------------------
   LISTING CARDS
---------------------------- */

function cardHTML(item, kind) {
  const isMem = kind === "mem";
  const title = isMem ? item.title : item.event_name;
  const category = tr(item.category || "Other");
  const country = item.country || "";
  const price = Number(item.price || 0).toFixed(2);
  const id = safe(item.id);

  return `
    <article class="card">
      ${item.image_url
        ? `<img src="${safe(item.image_url)}" alt="${safe(title)}" loading="lazy">`
        : `<div class="card-placeholder">${isMem ? "👕" : "🎟️"}</div>`}
      <div class="card-meta">${safe(category)} · ${safe(country)}</div>
      <h3>${safe(title)}</h3>
      ${!isMem && item.event_date
        ? `<p>${safe(item.event_date)}</p>`
        : ""}
      <p>${safe(item.description || "")}</p>
      <div class="price">€${price}</div>
      <button type="button" class="contact-seller"
        data-kind="${kind}" data-id="${id}">
        ${safe(tr("Message seller"))}
      </button>
    </article>
  `;
}

function renderTickets() {
  const grid = $("ticketGrid");
  if (!grid) return;

  const query = ($("ts")?.value || "").toLowerCase();
  const filter = $("tf")?.value || "All";

  const filtered = tickets.filter(t => {
    const matchesCategory =
      filter === "All" ||
      String(t.category || "").toLowerCase() === filter.toLowerCase();

    return matchesCategory &&
      JSON.stringify(t).toLowerCase().includes(query);
  });

  grid.innerHTML = filtered.length
    ? filtered.map(t => cardHTML(t, "ticket")).join("")
    : `<p>${safe(tr("No listings yet"))}</p>`;

  bindContactButtons(grid);
}

function renderMemorabilia() {
  const grid = $("memGrid");
  if (!grid) return;

  const query = ($("ms")?.value || "").toLowerCase();
  const filter = $("mf")?.value || "All";

  const filtered = memorabilia.filter(item => {
    const matchesCategory =
      filter === "All" ||
      String(item.category || "").toLowerCase() === filter.toLowerCase();

    return matchesCategory &&
      JSON.stringify(item).toLowerCase().includes(query);
  });

  grid.innerHTML = filtered.length
    ? filtered.map(item => cardHTML(item, "mem")).join("")
    : `<p>${safe(tr("No listings yet"))}</p>`;

  bindContactButtons(grid);
}

function bindContactButtons(grid) {
  grid.querySelectorAll(".contact-seller").forEach(button => {
    button.addEventListener("click", () => {
      openContact(button.dataset.kind, button.dataset.id);
    });
  });
}

/* ---------------------------
   LOAD LISTINGS
---------------------------- */

async function loadAll() {
  const ticketResult = await db.from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (ticketResult.error) {
    say("ticketError", ticketResult.error.message, true);
  } else {
    tickets = ticketResult.data || [];
    say("ticketError", "");
  }

  renderTickets();

  const memResult = await db.from("memorabilia")
    .select("*")
    .order("created_at", { ascending: false });

  if (memResult.error) {
    memorabilia = [];
    say(
      "memError",
      "Memorabilia needs its database table. Run setup.sql in Supabase.",
      true
    );
  } else {
    memorabilia = memResult.data || [];
    say("memError", "");
  }

  renderMemorabilia();
}

/* ---------------------------
   IMAGE UPLOADS
---------------------------- */

async function uploadImage(file) {
  if (!file) return null;

  if (!file.type.startsWith("image/")) {
    throw Error("Please choose an image file.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw Error("Images must be smaller than 5 MB.");
  }

  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const result = await db.storage.from("ticket-photos").upload(path, file, {
    contentType: file.type
  });

  if (result.error) throw result.error;

  return db.storage.from("ticket-photos").getPublicUrl(path).data.publicUrl;
}

/* ---------------------------
   PUBLISH TICKETS AND MEMORABILIA
---------------------------- */

async function publishListing(e, kind) {
  e.preventDefault();

  if (!user) {
    showModal("authModal", true);
    return;
  }

  const isMem = kind === "mem";
  const button = $(isMem ? "memSubmit" : "ticketSubmit");
  button.disabled = true;

  try {
    const photoInput = $(isMem ? "memPhoto" : "ticketPhoto");
    const image_url = await uploadImage(photoInput.files[0]);

    let row;

    if (isMem) {
      row = {
        title: $("memTitle").value.trim(),
        category: $("memCategory").value,
        country: $("memCountry").value.trim(),
        price: Number($("memPrice").value),
        description: $("memDescription").value.trim() || null,
        image_url,
        user_id: user.id
      };
    } else {
      row = {
        event_name: $("eventName").value.trim(),
        category: $("eventCategory").value,
        country: $("eventCountry").value.trim(),
        event_date: $("eventDate").value,
        price: Number($("ticketPrice").value),
        description: $("ticketDescription").value.trim() || null,
        image_url,
        user_id: user.id
      };
    }

    if (
      !row.country ||
      !Number.isFinite(row.price) ||
      row.price <= 0 ||
      (isMem ? !row.title : (!row.event_name || !row.event_date))
    ) {
      throw Error("Please complete the required fields and enter a valid price.");
    }

    const result = await db.from(isMem ? "memorabilia" : "tickets")
      .insert(row);

    if (result.error) throw result.error;

    $(isMem ? "memForm" : "ticketForm").reset();
    await loadAll();
    notify("Listing published");
  } catch (err) {
    say(isMem ? "memMsg" : "ticketMsg", err.message, true);
  } finally {
    button.disabled = !user;
  }
}

/* ---------------------------
   CONTACT A SELLER
---------------------------- */

function openContact(kind, id) {
  if (!user) {
    showModal("authModal", true);
    return;
  }

  const list = kind === "mem" ? memorabilia : tickets;
  const item = list.find(x => String(x.id) === String(id));

  if (!item) return;

  const sellerId = String(item.user_id || "");

  if (!sellerId) {
    say(
      "contactMsg",
      "No seller account is linked to this listing.",
      true
    );
    showModal("contactModal", true);
    pendingMessage = null;
    return;
  }

  if (sellerId === user.id) {
    notify("Your own listing");
    return;
  }

  pendingMessage = { kind, item, sellerId };

  $("contactTitle").textContent =
    `${tr("Message seller")} — ${kind === "mem" ? item.title : item.event_name}`;

  $("firstMessage").value = "";
  say("contactMsg", "");
  showModal("contactModal", true);
}

async function sendFirstMessage(e) {
  e.preventDefault();

  if (!pendingMessage || !user) return;

  const body = $("firstMessage").value.trim();
  if (!body) return;

  const { kind, item, sellerId } = pendingMessage;
  const participants = [user.id, sellerId];

  try {
    let conversationId;
    const conversationTable =
      kind === "mem" ? "mem_conversations" : "conversations";
    const messageTable =
      kind === "mem" ? "mem_messages" : "messages";

    const foreignKey = kind === "mem" ? "item_id" : "ticket_id";

    let find = db.from(conversationTable)
      .select("id")
      .eq(foreignKey, item.id)
      .contains("participant_ids", participants)
      .limit(1);

    const existing = await find;

    if (existing.error) throw existing.error;

    if (existing.data?.length) {
      conversationId = existing.data[0].id;
    } else {
      const created = await db.from(conversationTable)
        .insert({
          [foreignKey]: item.id,
          participant_ids: participants
        })
        .select("id")
        .single();

      if (created.error) throw created.error;
      conversationId = created.data.id;
    }

    const sent = await db.from(messageTable).insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body
    });

    if (sent.error) throw sent.error;

    showModal("contactModal", false);
    pendingMessage = null;
    notify("Message sent");
  } catch (err) {
    say("contactMsg", err.message, true);
  }
}

/* ---------------------------
   INBOX AND REPLIES
---------------------------- */

async function openMessages() {
  if (!user) {
    showModal("authModal", true);
    return;
  }

  showModal("messagesModal", true);
  $("conversationList").textContent = tr("Loading...");
  $("chat").hidden = true;
  say("messagesMsg", "");

  try {
    const rows = [];

    const ticketResult = await db.from("conversations")
      .select("id,ticket_id,participant_ids")
      .order("created_at", { ascending: false });

    if (ticketResult.error) throw ticketResult.error;

    for (const c of ticketResult.data || []) {
      if (!(c.participant_ids || []).includes(user.id)) continue;

      const ticket = tickets.find(t => String(t.id) === String(c.ticket_id));

      rows.push({
        id: c.id,
        kind: "ticket",
        title: ticket?.event_name || "Ticket"
      });
    }

    const memResult = await db.from("mem_conversations")
      .select("id,item_id,participant_ids")
      .order("created_at", { ascending: false });

    if (!memResult.error) {
      for (const c of memResult.data || []) {
        if (!(c.participant_ids || []).includes(user.id)) continue;

        const item = memorabilia.find(x => String(x.id) === String(c.item_id));

        rows.push({
          id: c.id,
          kind: "mem",
          title: item?.title || "Memorabilia"
        });
      }
    }

    const list = $("conversationList");

    if (!rows.length) {
      list.textContent = tr("No messages yet");
      return;
    }

    list.innerHTML = rows.map(c => `
      <button class="conversation-item"
        data-chat-kind="${c.kind}"
        data-chat-id="${safe(c.id)}">
        ${safe(c.title)}
      </button>
    `).join("");

    list.querySelectorAll("[data-chat-id]").forEach(button => {
      button.onclick = () => openChat(
        button.dataset.chatKind,
        button.dataset.chatId
      );
    });
  } catch (err) {
    say("messagesMsg", err.message, true);
  }
}

async function openChat(kind, id) {
  activeChat = { kind, id };
  $("chat").hidden = false;
  $("chatBody").textContent = tr("Loading...");

  try {
    const result = await db.from(
      kind === "mem" ? "mem_messages" : "messages"
    )
      .select("id,sender_id,body,created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (result.error) throw result.error;

    $("chatBody").innerHTML = (result.data || []).map(message => `
      <div class="bubble ${message.sender_id === user.id ? "mine" : ""}">
        <div>${safe(message.body)}</div>
        <small>${safe(new Date(message.created_at).toLocaleString())}</small>
      </div>
    `).join("") || safe(tr("No messages yet"));
  } catch (err) {
    say("messagesMsg", err.message, true);
  }
}

async function sendReply(e) {
  e.preventDefault();

  if (!user || !activeChat) return;

  const body = $("replyText").value.trim();
  if (!body) return;

  try {
    const result = await db.from(
      activeChat.kind === "mem" ? "mem_messages" : "messages"
    ).insert({
      conversation_id: activeChat.id,
      sender_id: user.id,
      body
    });

    if (result.error) throw result.error;

    $("replyText").value = "";
    await openChat(activeChat.kind, activeChat.id);
  } catch (err) {
    say("messagesMsg", err.message, true);
  }
}

/* ---------------------------
   LANGUAGE SWITCH
---------------------------- */

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === "he" ? "rtl" : "ltr";

  document.querySelectorAll("[data-en][data-he]").forEach(el => {
    el.innerHTML = el.dataset[currentLanguage];
  });

  document.querySelectorAll("[data-en-placeholder][data-he-placeholder]").forEach(el => {
    el.placeholder = el.dataset[currentLanguage + "Placeholder"];
  });

  document.querySelectorAll("select option").forEach(option => {
    if (!option.dataset.original) {
      option.dataset.original = option.textContent;
    }
    option.textContent = tr(option.dataset.original);
  });

  const langButton = $("lang");
  if (langButton) {
    langButton.textContent = currentLanguage === "he" ? "English" : "עברית";
  }

  updateAuthUI();
  renderTickets();
  renderMemorabilia();
}

function setupLanguage() {
  if (!$("lang")) return;

  $("lang").onclick = () => {
    currentLanguage = currentLanguage === "en" ? "he" : "en";
    applyLanguage();
  };
}

/* ---------------------------
   STARTUP
---------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    setupNavigation();
    setupLanguage();

    $("openAuth").onclick = () => {
      authMode = "signin";
      updateAuthUI();
      say("authMsg", "");
      showModal("authModal", true);
    };

    $("switchAuth").onclick = () => {
      authMode = authMode === "signin" ? "signup" : "signin";
      updateAuthUI();
      say("authMsg", "");
    };

    $("authForm").onsubmit = handleAuth;
    $("signOut").onclick = signOut;

    $("ticketForm").onsubmit = e => publishListing(e, "ticket");
    $("memForm").onsubmit = e => publishListing(e, "mem");

    $("ts").oninput = renderTickets;
    $("tf").onchange = renderTickets;
    $("ms").oninput = renderMemorabilia;
    $("mf").onchange = renderMemorabilia;

    $("contactForm").onsubmit = sendFirstMessage;
    $("messagesOpen").onclick = openMessages;
    $("replyForm").onsubmit = sendReply;

    document.querySelectorAll("[data-close]").forEach(button => {
      button.onclick = () => showModal(button.dataset.close, false);
    });

    const session = await db.auth.getSession();
    if (session.error) throw session.error;

    user = session.data.session?.user || null;

    db.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      updateAuthUI();
    });

    updateAuthUI();
    await loadAll();

    goTo("home");
    applyLanguage();
  } catch (err) {
    say("ticketError", "Connection error: " + err.message, true);
  }
});
