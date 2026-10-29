"use strict";

const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let db = null;
let currentUser = null;
let authMode = "signin";
let allTickets = [];
let allMemorabilia = [];
let activeItem = null;
let activeConversation = null;
let language = "en";

const $ = id => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function say(id, text, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("error-text", isError);
  el.classList.toggle("error", isError);
}

function toast(text) {
  const el = $("toast");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 3500);
}

function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  if (label) {
    if (busy) {
      button.dataset.oldLabel = button.textContent;
      button.textContent = label;
    } else if (button.dataset.oldLabel) {
      button.textContent = button.dataset.oldLabel;
      delete button.dataset.oldLabel;
    }
  }
}

function showModal(id) {
  const el = $(id);
  if (!el) return;
  el.hidden = false;
  document.body.classList.add("modal-open");
}

function hideModal(id) {
  const el = $(id);
  if (el) el.hidden = true;
  if (!document.querySelector(".modal:not([hidden])")) {
    document.body.classList.remove("modal-open");
  }
}

function formatDate(value) {
  if (!value) return "Date to be confirmed";
  const d = new Date(value + (String(value).length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(language === "he" ? "he-IL" : "en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function formatPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? "€" + n.toFixed(2) : "Price unavailable";
}

function currentText(en, he) {
  return language === "he" ? he : en;
}

function updateLanguage(next) {
  language = next;
  document.documentElement.lang = next;
  document.documentElement.dir = next === "he" ? "rtl" : "ltr";

  document.querySelectorAll("[data-en][data-he]").forEach(el => {
    const value = el.dataset[next];
    if (value !== undefined) el.innerHTML = value;
  });

  document.querySelectorAll("[data-en-placeholder][data-he-placeholder]").forEach(el => {
    el.placeholder = el.dataset[next + "Placeholder"] || "";
  });

  const langButton = $("lang");
  if (langButton) langButton.textContent = next === "en" ? "עברית" : "English";

  const category = $("tf");
  if (category) {
    const labels = next === "he"
      ? ["כל ענפי הספורט", "כדורגל", "כדורסל", "טניס", "ענפי ספורט אחרים"]
      : ["All sports", "Football", "Basketball", "Tennis", "Other sports"];
    [...category.options].forEach((o, i) => {
      if (labels[i]) o.textContent = labels[i];
    });
  }

  renderTickets();
  renderMemorabilia();
  updateAuthUI();
}

function goToPage(page) {
  const ids = ["home", "tickets", "memorabilia", "sell", "alerts"];
  ids.forEach(id => {
    const el = $(id);
    if (el) el.hidden = id !== page;
  });

  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  if (page === "tickets") loadTickets();
  if (page === "memorabilia") loadMemorabilia();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateAuthUI() {
  const signedIn = !!currentUser;
  const openButton = $("openAuth");
  if (openButton) {
    openButton.textContent = signedIn
      ? currentText("My account", "החשבון שלי")
      : currentText("Profile / Sign in", "פרופיל / כניסה");
  }

  const title = $("authTitle");
  if (title) {
    title.textContent = signedIn
      ? currentText("Your account", "החשבון שלך")
      : authMode === "signup"
        ? currentText("Create account", "יצירת חשבון")
        : currentText("Sign in", "כניסה לחשבון");
  }

  const submit = $("authSubmit");
  if (submit) {
    submit.textContent = authMode === "signup"
      ? currentText("Create account", "יצירת חשבון")
      : currentText("Sign in", "כניסה לחשבון");
    submit.hidden = signedIn;
  }

  if ($("email")) $("email").disabled = signedIn;
  if ($("password")) $("password").disabled = signedIn;
  if ($("switchAuth")) $("switchAuth").hidden = signedIn;
  if ($("signOut")) $("signOut").hidden = !signedIn;

  if ($("switchAuth")) {
    $("switchAuth").textContent = authMode === "signup"
      ? currentText("Already have an account? Sign in", "כבר יש לך חשבון? כניסה")
      : currentText("Need an account? Sign up", "אין לך חשבון? הרשמה");
  }

  if (signedIn) {
    say("authMsg", currentText(
      "Signed in as " + (currentUser.email || "your account") + ".",
      "מחובר בתור " + (currentUser.email || "החשבון שלך") + "."
    ));
  }
}

function openAuth() {
  if (currentUser) {
    showModal("authModal");
    updateAuthUI();
    return;
  }
  say("authMsg", "");
  updateAuthUI();
  showModal("authModal");
}

async function handleAuth(event) {
  event.preventDefault();

  if (!db) {
    say("authMsg", "Ticketly is still connecting. Refresh and try again.", true);
    return;
  }

  const email = $("email")?.value.trim();
  const password = $("password")?.value;
  const button = $("authSubmit");

  if (!email || !password) {
    say("authMsg", "Enter your email and password.", true);
    return;
  }

  if (password.length < 6) {
    say("authMsg", "Your password must contain at least 6 characters.", true);
    return;
  }

  setBusy(button, true, "Please wait…");
  say("authMsg", "");

  try {
    if (authMode === "signup") {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });

      if (error) throw error;

      if (data.session && data.user) {
        currentUser = data.user;
        updateAuthUI();
        say("authMsg", "Your account has been created and you are signed in.");
        toast("Account created successfully.");
      } else {
        say("authMsg",
          "Account request created. If email confirmation is enabled in Supabase, confirm your email before signing in."
        );
      }
    } else {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      currentUser = data.user;
      updateAuthUI();
      hideModal("authModal");
      toast("Signed in successfully.");
    }
  } catch (error) {
    console.error("Authentication error:", error);
    say("authMsg", error.message || "Account action failed. Please try again.", true);
  } finally {
    setBusy(button, false);
    updateAuthUI();
  }
}

async function signOut() {
  if (!db) return;
  const { error } = await db.auth.signOut();
  if (error) {
    say("authMsg", error.message, true);
    return;
  }
  currentUser = null;
  authMode = "signin";
  updateAuthUI();
  hideModal("authModal");
  toast("Signed out.");
}

function photoURL(row) {
  return row.image_url || row.photo_url || row.image || "";
}

function cardHTML(item, kind) {
  const isMem = kind === "mem";
  const title = isMem ? item.title : item.event_name;
  const category = item.category || (isMem ? "Other" : "Football");
  const country = item.country || "Location not specified";
  const date = isMem ? "" : formatDate(item.event_date);
  const image = photoURL(item);
  const id = String(item.id);

  return `
    <article class="card">
      <button type="button" class="card-open"
        data-open-item="${escapeHTML(id)}" data-kind="${kind}">
        ${image
          ? `<img class="card-image" src="${escapeHTML(image)}" alt="${escapeHTML(title)}" loading="lazy">`
          : `<div class="card-image" aria-label="No photo"> ${isMem ? "★" : "⚽"} </div>`}
        <div class="card-content">
          <div class="card-top">
            <span class="pill">${escapeHTML(category)}</span>
            <span class="card-date">${escapeHTML(date)}</span>
          </div>
          <h3>${escapeHTML(title)}</h3>
          <p class="card-location">📍 ${escapeHTML(country)}</p>
          <div class="card-bottom">
            <strong>${escapeHTML(formatPrice(item.price))}</strong>
            <span>${isMem ? "Memorabilia" : "Sports ticket"}</span>
          </div>
        </div>
      </button>
      <div class="card-contact">
        <button type="button" data-contact-item="${escapeHTML(id)}" data-kind="${kind}">
          ${currentText("View details / Contact seller", "פרטים / יצירת קשר")}
        </button>
      </div>
    </article>`;
}

function renderTickets() {
  const grid = $("ticketGrid");
  if (!grid) return;

  const query = ($("ts")?.value || $("heroQuery")?.value || "").trim().toLowerCase();
  const category = $("tf")?.value || "All";

  const results = allTickets.filter(t => {
    const c = String(t.category || "").toLowerCase();
    const sports = !c.includes("concert") && !c.includes("music") &&
      !c.includes("festival") && !c.includes("theatre");
    const text = `${t.event_name || ""} ${t.country || ""} ${t.category || ""} ${t.description || ""}`.toLowerCase();
    return sports && (category === "All" || t.category === category) && text.includes(query);
  });

  grid.innerHTML = results.map(t => cardHTML(t, "ticket")).join("");

  if ($("ticketError") && results.length === 0) {
    $("ticketError").textContent = allTickets.length
      ? currentText("No matching sports tickets found.", "לא נמצאו כרטיסי ספורט מתאימים.")
      : currentText("No sports tickets have been listed yet.", "עדיין לא פורסמו כרטיסי ספורט.");
  } else {
    say("ticketError", "");
  }
}

async function loadTickets() {
  if (!db) return;
  const grid = $("ticketGrid");
  if (grid && !allTickets.length) grid.innerHTML = "<p>Loading tickets…</p>";

  try {
    const { data, error } = await db.from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    allTickets = data || [];
    renderTickets();
  } catch (error) {
    console.error("Loading tickets:", error);
    say("ticketError", "Could not load tickets: " + error.message, true);
  }
}

function renderMemorabilia() {
  const grid = $("memGrid");
  if (!grid) return;

  const query = ($("ms")?.value || "").trim().toLowerCase();
  const category = $("mf")?.value || "All";

  const results = allMemorabilia.filter(item => {
    const text = `${item.title || ""} ${item.category || ""} ${item.country || ""} ${item.description || ""}`.toLowerCase();
    return (category === "All" || item.category === category) && text.includes(query);
  });

  grid.innerHTML = results.map(item => cardHTML(item, "mem")).join("");

  if ($("memError")) {
    $("memError").textContent = results.length ? "" :
      allMemorabilia.length
        ? "No memorabilia matches your search."
        : "No memorabilia listed yet. If the table is missing, run the supplied setup SQL in Supabase.";
  }
}

async function loadMemorabilia() {
  if (!db) return;

  try {
    const { data, error } = await db.from("memorabilia")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    allMemorabilia = data || [];
    renderMemorabilia();
  } catch (error) {
    console.error("Loading memorabilia:", error);
    say("memError", "Could not load memorabilia. Check that the memorabilia table and its permissions are set up in Supabase. " + error.message, true);
  }
}

function findItem(kind, id) {
  const list = kind === "mem" ? allMemorabilia : allTickets;
  return list.find(item => String(item.id) === String(id));
}

function openItemDetails(kind, id) {
  const item = findItem(kind, id);
  if (!item) {
    toast("This listing is no longer available. Refresh the page.");
    return;
  }

  activeItem = { kind, item };
  const title = kind === "mem" ? item.title : item.event_name;
  const image = photoURL(item);
  const date = kind === "mem" ? "" : formatDate(item.event_date);

  $("detailContent").innerHTML = `
    <div class="detail-layout">
      <div>
        ${image
          ? `<img class="detail-image" src="${escapeHTML(image)}" alt="${escapeHTML(title)}">`
          : `<div class="card-image detail-image">${kind === "mem" ? "★" : "⚽"}</div>`}
      </div>
      <div>
        <span class="pill">${escapeHTML(item.category || "Other")}</span>
        <h2>${escapeHTML(title)}</h2>
        <p class="muted">${escapeHTML(kind === "mem" ? "Memorabilia" : "Sports ticket")}</p>
        <p class="detail-price">${escapeHTML(formatPrice(item.price))}</p>
        ${date ? `<p>📅 ${escapeHTML(date)}</p>` : ""}
        <p>📍 ${escapeHTML(item.country || "Location not specified")}</p>
        <p>${escapeHTML(item.description || "No additional description provided.")}</p>
        <button class="primary full" type="button"
          data-contact-item="${escapeHTML(String(item.id))}" data-kind="${kind}">
          Contact seller
        </button>
      </div>
    </div>`;

  showModal("detailModal");
}

function openSellForm(kind) {
  if (!currentUser) {
    authMode = "signin";
    openAuth();
    say("authMsg", "Please sign in before publishing a listing.");
    return;
  }

  $("sellChoices").hidden = true;
  $("sellForms").hidden = false;
  $("ticketForm").hidden = kind !== "ticket";
  $("memForm").hidden = kind !== "mem";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backSellChoices() {
  $("sellChoices").hidden = false;
  $("sellForms").hidden = true;
  $("ticketForm").hidden = true;
  $("memForm").hidden = true;
}

async function uploadPhoto(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await db.storage.from("ticket-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type
  });

  if (error) throw new Error("Photo upload failed: " + error.message);

  const { data } = db.storage.from("ticket-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function publishTicket(event) {
  event.preventDefault();

  if (!currentUser) {
    openAuth();
    return;
  }

  const button = $("ticketSubmit");
  setBusy(button, true, "Publishing…");
  say("ticketMsg", "");

  try {
    const file = $("ticketPhoto").files[0];
    const image = await uploadPhoto(file);

    const ticket = {
      event_name: $("eventName").value.trim(),
      category: $("eventCategory").value,
      country: $("eventCountry").value.trim(),
      event_date: $("eventDate").value,
      price: Number($("ticketPrice").value),
      description: $("ticketDescription").value.trim(),
      user_id: currentUser.id
    };
    if (image) ticket.image_url = image;

    const { error } = await db.from("tickets").insert(ticket);
    if (error) throw error;

    $("ticketForm").reset();
    say("ticketMsg", "Your ticket has been published!");
    toast("Ticket published.");
    await loadTickets();
    goToPage("tickets");
  } catch (error) {
    console.error("Publish ticket:", error);
    say("ticketMsg", "Could not publish ticket: " + error.message, true);
  } finally {
    setBusy(button, false);
  }
}

async function publishMemorabilia(event) {
  event.preventDefault();

  if (!currentUser) {
    openAuth();
    return;
  }

  const button = $("memSubmit");
  setBusy(button, true, "Publishing…");
  say("memMsg", "");

  try {
    const image = await uploadPhoto($("memPhoto").files[0]);

    const item = {
      title: $("memTitle").value.trim(),
      category: $("memCategory").value,
      country: $("memCountry").value.trim(),
      price: Number($("memPrice").value),
      description: $("memDescription").value.trim(),
      user_id: currentUser.id
    };
    if (image) item.image_url = image;

    const { error } = await db.from("memorabilia").insert(item);
    if (error) throw error;

    $("memForm").reset();
    say("memMsg", "Your memorabilia has been published!");
    toast("Memorabilia published.");
    await loadMemorabilia();
    goToPage("memorabilia");
  } catch (error) {
    console.error("Publish memorabilia:", error);
    say("memMsg", "Could not publish item: " + error.message, true);
  } finally {
    setBusy(button, false);
  }
}

function openContact(kind, id) {
  if (!currentUser) {
    openAuth();
    say("authMsg", "Sign in to contact a seller.");
    return;
  }

  const item = findItem(kind, id);
  if (!item) return toast("Listing not found.");

  const sellerId = item.user_id;
  if (!sellerId) {
    toast("The seller cannot be contacted because this older listing has no linked seller account.");
    return;
  }
  if (sellerId === currentUser.id) {
    toast("This is your own listing.");
    return;
  }

  activeItem = { kind, item };
  $("contactTitle").textContent = "Message seller — " +
    (kind === "mem" ? item.title : item.event_name);
  $("firstMessage").value = "";
  say("contactMsg", "");
  showModal("contactModal");
}

async function sendFirstMessage(event) {
  event.preventDefault();

  if (!currentUser || !activeItem) return;

  const item = activeItem.item;
  const kind = activeItem.kind;
  const sellerId = item.user_id;
  if (!sellerId || sellerId === currentUser.id) {
    say("contactMsg", "This seller cannot be contacted.", true);
    return;
  }

  const button = $("contactForm").querySelector("button[type=submit]");
  setBusy(button, true, "Sending…");

  try {
    const table = kind === "mem" ? "mem_conversations" : "conversations";
    const ticketKey = kind === "mem" ? "item_id" : "ticket_id";
    const messagesTable = kind === "mem" ? "mem_messages" : "messages";

    const { data: existing, error: findError } = await db.from(table)
      .select("*")
      .contains("participant_ids", [currentUser.id])
      .contains("participant_ids", [sellerId]);

    if (findError) throw findError;

    let conversation = (existing || []).find(c =>
      kind === "mem"
        ? String(c.item_id) === String(item.id)
        : String(c.ticket_id) === String(item.id)
    );

    if (!conversation) {
      const row = {
        [ticketKey]: item.id,
        participant_ids: [currentUser.id, sellerId]
      };

      const { data, error } = await db.from(table)
        .insert(row)
        .select("*")
        .single();

      if (error) throw error;
      conversation = data;
    }

    const { error: sendError } = await db.from(messagesTable).insert({
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      body: $("firstMessage").value.trim()
    });

    if (sendError) throw sendError;

    hideModal("contactModal");
    toast("Message sent.");
    openMessages();
  } catch (error) {
    console.error("Send message:", error);
    say("contactMsg", "Could not send message: " + error.message, true);
  } finally {
    setBusy(button, false);
  }
}

async function openMessages() {
  if (!currentUser) {
    openAuth();
    say("authMsg", "Sign in to use messages.");
    return;
  }

  showModal("messagesModal");
  $("chat").hidden = true;
  $("conversationList").hidden = false;
  say("messagesMsg", "Loading messages…");

  try {
    const all = [];

    for (const kind of ["ticket", "mem"]) {
      const table = kind === "mem" ? "mem_conversations" : "conversations";
      const { data, error } = await db.from(table)
        .select("*")
        .contains("participant_ids", [currentUser.id])
        .order("updated_at", { ascending: false });

      if (error && kind === "ticket") throw error;
      if (data) data.forEach(c => all.push({ ...c, kind }));
    }

    const list = $("conversationList");
    if (!all.length) {
      list.innerHTML = "<p>You have no conversations yet.</p>";
      say("messagesMsg", "");
      return;
    }

    list.innerHTML = all.map(c => `
      <button class="conversation-button" type="button"
        data-conversation="${escapeHTML(c.id)}" data-kind="${c.kind}">
        <strong>${c.kind === "mem" ? "Memorabilia conversation" : "Ticket conversation"}</strong>
        <span class="muted"> · ${escapeHTML(formatDate(c.updated_at || c.created_at))}</span>
      </button>`).join("");

    say("messagesMsg", "");
  } catch (error) {
    console.error("Load conversations:", error);
    say("messagesMsg", "Could not load messages: " + error.message, true);
  }
}

async function openConversation(id, kind) {
  activeConversation = { id, kind };
  const table = kind === "mem" ? "mem_messages" : "messages";

  try {
    const { data, error } = await db.from(table)
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    $("chatBody").innerHTML = (data || []).map(m => `
      <div class="message ${m.sender_id === currentUser.id ? "mine" : ""}">
        ${escapeHTML(m.body)}
        <small>${escapeHTML(formatDate(m.created_at))}</small>
      </div>`).join("");

    $("chat").hidden = false;
    $("conversationList").hidden = true;
    say("messagesMsg", "");
    $("chatBody").scrollTop = $("chatBody").scrollHeight;
  } catch (error) {
    say("messagesMsg", "Could not open conversation: " + error.message, true);
  }
}

async function sendReply(event) {
  event.preventDefault();
  if (!currentUser || !activeConversation) return;

  const text = $("replyText").value.trim();
  if (!text) return;

  const table = activeConversation.kind === "mem" ? "mem_messages" : "messages";
  const button = $("replyForm").querySelector("button");
  setBusy(button, true, "Sending…");

  try {
    const { error } = await db.from(table).insert({
      conversation_id: activeConversation.id,
      sender_id: currentUser.id,
      body: text
    });
    if (error) throw error;

    $("replyText").value = "";
    await openConversation(activeConversation.id, activeConversation.kind);
  } catch (error) {
    say("messagesMsg", "Could not send reply: " + error.message, true);
  } finally {
    setBusy(button, false);
  }
}

function saveAlerts(event) {
  event.preventDefault();

  const email = $("alertEmail").value.trim();
  const teams = [...document.querySelectorAll('input[name="teams"]:checked')]
    .map(input => input.value);

  try {
    localStorage.setItem("ticketlyAlerts", JSON.stringify({ email, teams }));
    say("alertsMsg",
      "Your preferences are saved in this browser. Email notifications are not sent yet; an email service must be configured.");
  } catch (error) {
    say("alertsMsg", "Could not save preferences in this browser.", true);
  }
}

function restoreAlerts() {
  try {
    const saved = JSON.parse(localStorage.getItem("ticketlyAlerts") || "null");
    if (!saved) return;
    if ($("alertEmail")) $("alertEmail").value = saved.email || "";
    document.querySelectorAll('input[name="teams"]').forEach(input => {
      input.checked = (saved.teams || []).includes(input.value);
    });
  } catch (error) {
    console.warn("Could not restore alerts:", error);
  }
}

function bindEvents() {
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      goToPage(button.dataset.page);
    });
  });

  $("lang")?.addEventListener("click", () => {
    updateLanguage(language === "en" ? "he" : "en");
  });

  $("openAuth")?.addEventListener("click", openAuth);
  $("signOut")?.addEventListener("click", signOut);
  $("authForm")?.addEventListener("submit", handleAuth);

  $("switchAuth")?.addEventListener("click", () => {
    authMode = authMode === "signup" ? "signin" : "signup";
    say("authMsg", "");
    updateAuthUI();
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => hideModal(button.dataset.close));
  });

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) hideModal(modal.id);
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal:not([hidden])").forEach(m => hideModal(m.id));
    }
  });

  $("chooseTicket")?.addEventListener("click", () => openSellForm("ticket"));
  $("chooseMem")?.addEventListener("click", () => openSellForm("mem"));
  $("backSell")?.addEventListener("click", backSellChoices);
  $("ticketForm")?.addEventListener("submit", publishTicket);
  $("memForm")?.addEventListener("submit", publishMemorabilia);

  $("ts")?.addEventListener("input", renderTickets);
  $("tf")?.addEventListener("change", renderTickets);
  $("ms")?.addEventListener("input", renderMemorabilia);
  $("mf")?.addEventListener("change", renderMemorabilia);

  $("heroSearch")?.addEventListener("submit", event => {
    event.preventDefault();
    if ($("ts")) $("ts").value = $("heroQuery").value;
    goToPage("tickets");
    renderTickets();
  });

  $("messagesOpen")?.addEventListener("click", openMessages);
  $("contactForm")?.addEventListener("submit", sendFirstMessage);
  $("replyForm")?.addEventListener("submit", sendReply);
  $("alertsForm")?.addEventListener("submit", saveAlerts);

  document.addEventListener("click", event => {
    const openButton = event.target.closest("[data-open-item]");
    const contactButton = event.target.closest("[data-contact-item]");
    const conversationButton = event.target.closest("[data-conversation]");

    if (openButton) {
      openItemDetails(openButton.dataset.kind, openButton.dataset.openItem);
    } else if (contactButton) {
      openContact(contactButton.dataset.kind, contactButton.dataset.contactItem);
    } else if (conversationButton) {
      openConversation(conversationButton.dataset.conversation, conversationButton.dataset.kind);
    }
  });
}

async function startTicketly() {
  bindEvents();
  restoreAlerts();

  try {
    if (!window.supabase?.createClient) {
      throw new Error("Supabase did not load. Check your internet connection and refresh.");
    }

    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;
    updateAuthUI();

    db.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      updateAuthUI();
    });

    await loadTickets();
    await loadMemorabilia();
  } catch (error) {
    console.error("Ticketly startup error:", error);
    say("ticketError", "Ticketly could not connect: " + error.message, true);
    say("memError", "Ticketly could not connect: " + error.message, true);
  }
}

document.addEventListener("DOMContentLoaded", startTicketly);
