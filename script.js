
const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let db = null;
let currentUser = null;
let authMode = "signin";
let activeCategory = "All";
let allTickets = [];
let activeConversation = null;
let pendingSellerTicket = null;
let toastTimer = null;

const $ = id => document.getElementById(id);

const categoryName = value => {
  const c = String(value || "").toLowerCase();
  if (c.includes("football") || c.includes("sport")) return "Football";
  if (c.includes("concert") || c.includes("music")) return "Concerts";
  return "Other";
};

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

function showNotice(message, error = false) {
  const el = $("notice");
  el.textContent = message;
  el.classList.toggle("notice-error", error);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.hidden = true, 5500);
}

function setMessage(id, message, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error-text", error);
}

function openAuth(mode = authMode) {
  authMode = mode;
  $("authSection").hidden = false;
  document.body.classList.add("modal-open");
  updateAuthUI();
}

function closeAuth() {
  $("authSection").hidden = true;
  document.body.classList.remove("modal-open");
}

function updateAuthUI() {
  if (!$("openAuth")) return;

  const signed = !!currentUser;

  $("openAuth").textContent = signed
    ? (currentUser.email || "My account")
    : "Sign in / Sign up";

  $("signOutButton").hidden = !signed;

  $("authTitle").textContent = signed
    ? "Your account"
    : authMode === "signup" ? "Create account" : "Sign in";

  $("authSubmit").textContent =
    authMode === "signup" ? "Create account" : "Sign in";

  $("authSubmit").hidden = signed;
  $("authEmail").disabled = signed;
  $("authPassword").disabled = signed;
  $("authSwitch").hidden = signed;

  $("authSwitch").textContent = authMode === "signup"
    ? "Already have an account? Sign in"
    : "Need an account? Sign up";

  $("authMessage").textContent = signed
    ? `Signed in as ${currentUser.email || "your account"}.`
    : "Sign in or create an account to list tickets and message sellers.";

  $("sellSubmit").disabled = !signed;
  $("sellMessage").textContent = signed
    ? ""
    : "Sign in first to publish a ticket.";

  $("messagesOpen").title = signed
    ? "Open your messages"
    : "Sign in to use messages";
}

function renderTickets() {
  const query = $("searchInput").value.trim().toLowerCase();

  const filtered = allTickets.filter(t => {
    const matches = activeCategory === "All" ||
      categoryName(t.category) === activeCategory;

    return matches &&
      `${t.event_name} ${t.country} ${t.category} ${t.description || ""}`
        .toLowerCase().includes(query);
  });

  $("ticketGrid").innerHTML = filtered.map(t => {
    const price = Number(t.price);
    const date = t.event_date
      ? new Date(t.event_date + "T12:00:00").toLocaleDateString(
          undefined, { day: "numeric", month: "short", year: "numeric" })
      : "Date TBC";

    const image = t.image_url
      ? `<img src="${escapeHTML(t.image_url)}" alt="Photo for ${escapeHTML(t.event_name)}" loading="lazy">`
      : `<span>${categoryName(t.category) === "Football" ? "⚽" :
          categoryName(t.category) === "Concerts" ? "🎤" : "🎟️"}</span>`;

    return `<article class="ticket-card">
      <div class="ticket-image">${image}</div>
      <div class="ticket-card-body">
        <div class="ticket-card-top">
          <span class="ticket-category">${escapeHTML(categoryName(t.category))}</span>
          <span class="ticket-date">${escapeHTML(date)}</span>
        </div>
        <h3>${escapeHTML(t.event_name)}</h3>
        <p class="ticket-country">📍 ${escapeHTML(t.country)}</p>
        ${t.description ? `<p class="ticket-description">${escapeHTML(t.description)}</p>` : ""}
        <div class="ticket-card-bottom">
          <strong>€${Number.isFinite(price) ? price.toFixed(2) : "—"}</strong>
          <span class="ticket-label">Listed ticket</span>
        </div>
        <div class="ticket-actions">
          <button class="button button-primary" type="button"
            data-message-seller="${escapeHTML(t.id)}">Message seller</button>
        </div>
      </div>
    </article>`;
  }).join("");

  $("resultCount").textContent =
    `${filtered.length} ${filtered.length === 1 ? "ticket" : "tickets"}`;

  $("emptyMessage").hidden = filtered.length !== 0;

  document.querySelectorAll("[data-message-seller]").forEach(btn =>
    btn.addEventListener("click", () =>
      startSellerMessage(btn.dataset.messageSeller)
    )
  );
}

async function loadTickets() {
  const { data, error } = await db.from("tickets")
    .select("id,event_name,category,country,event_date,price,created_at,user_id,description,image_url")
    .order("created_at", { ascending: false });

  if (error) throw error;

  allTickets = data || [];
  renderTickets();
}

async function startTicketly() {
  try {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase library did not load. Check your internet connection and refresh.");
    }

    db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;
    updateAuthUI();

    db.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      updateAuthUI();
      if (currentUser) refreshUnreadCount();
    });

    await loadTickets();
    $("notice").hidden = true;

    if (currentUser) refreshUnreadCount();
  } catch (e) {
    console.error("Ticketly connection error:", e);
    showNotice("Ticketly could not connect: " + e.message, true);
    $("resultCount").textContent = "Could not load tickets";
  }
}

async function submitAuth(event) {
  event.preventDefault();

  if (!db) {
    setMessage("authMessage", "Ticketly is still connecting. Refresh and try again.", true);
    return;
  }

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const button = $("authSubmit");

  button.disabled = true;

  setMessage(
    "authMessage",
    authMode === "signup" ? "Creating your account…" : "Signing in…"
  );

  try {
    if (authMode === "signup") {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: location.origin + location.pathname
        }
      });

      if (error) throw error;

      if (data.session && data.user) {
        currentUser = data.user;
        updateAuthUI();
        closeAuth();
        showNotice("Your account is ready! You are signed in.");
      } else {
        // Email confirmation is required before the account can sign in.
        currentUser = null;
        updateAuthUI();

        setMessage(
          "authMessage",
          "📧 Almost done! Go to your email inbox and click the verification link to activate your Ticketly account. Check your spam folder too. After verifying, return here and sign in."
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
      closeAuth();
      showNotice("Signed in successfully.");
      await refreshUnreadCount();
    }
  } catch (e) {
    setMessage(
      "authMessage",
      e.message || "Authentication failed.",
      true
    );
  } finally {
    button.disabled = false;
    updateAuthUI();
  }
}

async function signOut() {
  if (!db) return;

  const { error } = await db.auth.signOut();

  if (error) {
    showNotice(error.message, true);
    return;
  }

  currentUser = null;
  activeConversation = null;
  updateAuthUI();
  showNotice("Signed out.");
}

async function publishTicket(event) {
  event.preventDefault();

  if (!currentUser) {
    openAuth("signin");
    setMessage("authMessage", "Please sign in before publishing a ticket.");
    return;
  }

  const button = $("sellSubmit");
  button.disabled = true;
  button.textContent = "Publishing…";

  let uploadedPath = null;

  try {
    const file = $("ticketPhoto").files[0];
    let image_url = null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Images must be 5 MB or smaller.");
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      uploadedPath = `${currentUser.id}/${crypto.randomUUID()}-${safeName}`;

      const up = await db.storage.from("ticket-photos").upload(
        uploadedPath,
        file,
        { upsert: false, contentType: file.type }
      );

      if (up.error) throw up.error;

      image_url = db.storage.from("ticket-photos")
        .getPublicUrl(uploadedPath).data.publicUrl;
    }

    const ticket = {
      event_name: $("eventName").value.trim(),
      category: $("eventCategory").value,
      country: $("eventCountry").value.trim(),
      event_date: $("eventDate").value,
      price: Number($("ticketPrice").value),
      description: $("ticketDescription").value.trim() || null,
      image_url,
      user_id: currentUser.id
    };

    if (!ticket.event_name || !ticket.country || !ticket.event_date ||
        !Number.isFinite(ticket.price) || ticket.price <= 0) {
      throw new Error("Fill in all required fields and use a price above €0.");
    }

    const { error } = await db.from("tickets").insert(ticket);
    if (error) throw error;

    $("sellForm").reset();
    await loadTickets();
    showNotice("Your ticket has been published!");
    $("tickets").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    if (uploadedPath) {
      await db.storage.from("ticket-photos").remove([uploadedPath]);
    }

    const msg = e.message || "Could not publish ticket.";
    setMessage("sellMessage", msg, true);
    showNotice("Could not publish ticket: " + msg, true);
  } finally {
    button.disabled = !currentUser;
    button.textContent = "Publish ticket";
  }
}

async function startSellerMessage(ticketId) {
  if (!currentUser) {
    openAuth("signin");
    setMessage("authMessage", "Sign in to contact the seller.");
    return;
  }

  const ticket = allTickets.find(t => String(t.id) === String(ticketId));
  if (!ticket) return;

  if (ticket.user_id === currentUser.id) {
    showNotice("This is your own listing.");
    return;
  }

  pendingSellerTicket = ticket;
  $("sellerModalTitle").textContent = "Message seller";
  $("sellerTicketName").textContent = `About: ${ticket.event_name}`;
  $("sellerFirstMessage").value = "";
  setMessage("sellerNotice", "");
  $("sellerModal").hidden = false;
  document.body.classList.add("modal-open");
}

function closeSellerModal() {
  $("sellerModal").hidden = true;
  document.body.classList.remove("modal-open");
}

async function sendFirstMessage(event) {
  event.preventDefault();

  if (!currentUser || !pendingSellerTicket) return;

  const text = $("sellerFirstMessage").value.trim();
  if (!text) return;

  try {
    const ticket = pendingSellerTicket;

    const { data: existing, error: findError } = await db
      .from("conversations")
      .select("id")
      .eq("ticket_id", ticket.id)
      .contains("participant_ids", [currentUser.id, ticket.user_id])
      .maybeSingle();

    if (findError) throw findError;

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data, error } = await db.from("conversations")
        .insert({
          ticket_id: ticket.id,
          participant_ids: [currentUser.id, ticket.user_id]
        })
        .select("id")
        .single();

      if (error) throw error;
      conversationId = data.id;
    }

    const { error } = await db.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      body: text
    });

    if (error) throw error;

    closeSellerModal();
    $("messagesPanel").hidden = false;
    document.body.classList.add("modal-open");
    await openConversation(conversationId);
    showNotice("Message sent.");
  } catch (e) {
    setMessage("sellerNotice", e.message || "Could not send message.", true);
  }
}

async function refreshUnreadCount() {
  if (!currentUser || !db) return;

  const { count, error } = await db.from("messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", currentUser.id)
    .is("read_at", null);

  if (!error) $("unreadCount").textContent = count ? `(${count})` : "";
}

async function loadConversations() {
  const list = $("conversationList");
  list.innerHTML = "<p class='small-note'>Loading conversations…</p>";

  if (!currentUser) {
    list.innerHTML = "<p class='small-note'>Sign in to see your messages.</p>";
    return;
  }

  const { data, error } = await db.from("conversations")
    .select("id,ticket_id,participant_ids,updated_at,tickets(event_name)")
    .order("updated_at", { ascending: false });

  if (error) {
    list.innerHTML = "";
    setMessage("messagesNotice", error.message, true);
    return;
  }

  const mine = (data || []).filter(c =>
    (c.participant_ids || []).includes(currentUser.id)
  );

  if (!mine.length) {
    list.innerHTML = "<p class='small-note'>No conversations yet. Open a ticket and choose “Message seller”.</p>";
    return;
  }

  list.innerHTML = mine.map(c =>
    `<button class="conversation-item" type="button" data-conversation="${escapeHTML(c.id)}">
      <strong>${escapeHTML(c.tickets?.event_name || "Ticket conversation")}</strong>
      <span>Open conversation · ${new Date(c.updated_at).toLocaleDateString()}</span>
    </button>`
  ).join("");

  list.querySelectorAll("[data-conversation]").forEach(b =>
    b.addEventListener("click", () => openConversation(b.dataset.conversation))
  );
}

async function openConversation(id) {
  activeConversation = id;
  $("conversationView").hidden = false;
  $("conversationList").hidden = true;
  $("conversationMessages").innerHTML = "<p class='small-note'>Loading messages…</p>";

  const { data: convo, error: ce } = await db.from("conversations")
    .select("id,participant_ids")
    .eq("id", id)
    .single();

  if (ce) {
    setMessage("messagesNotice", ce.message, true);
    return;
  }

  if (!(convo.participant_ids || []).includes(currentUser.id)) {
    setMessage("messagesNotice", "You do not have access to this conversation.", true);
    return;
  }

  const { data, error } = await db.from("messages")
    .select("id,sender_id,body,created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    setMessage("messagesNotice", error.message, true);
    return;
  }

  $("conversationMessages").innerHTML = (data || []).map(m =>
    `<div class="message-bubble ${m.sender_id === currentUser.id ? "mine" : ""}">
      ${escapeHTML(m.body)}
      <span class="message-meta">${m.sender_id === currentUser.id ? "You" : "Seller / buyer"} · ${new Date(m.created_at).toLocaleString()}</span>
    </div>`
  ).join("") || "<p class='small-note'>No messages yet.</p>";

  $("conversationMessages").scrollTop = $("conversationMessages").scrollHeight;

  await db.from("messages").update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .neq("sender_id", currentUser.id)
    .is("read_at", null);

  refreshUnreadCount();
}

async function sendMessage(event) {
  event.preventDefault();

  if (!currentUser || !activeConversation) return;

  const body = $("messageInput").value.trim();
  if (!body) return;

  const button = $("messageForm").querySelector("button");
  button.disabled = true;

  try {
    const { error } = await db.from("messages").insert({
      conversation_id: activeConversation,
      sender_id: currentUser.id,
      body
    });

    if (error) throw error;

    $("messageInput").value = "";
    await openConversation(activeConversation);
  } catch (e) {
    setMessage("messagesNotice", e.message || "Could not send message.", true);
  } finally {
    button.disabled = false;
  }
}

function openMessages() {
  if (!currentUser) {
    openAuth("signin");
    setMessage("authMessage", "Sign in to use messages.");
    return;
  }

  $("messagesPanel").hidden = false;
  document.body.classList.add("modal-open");
  $("conversationList").hidden = false;
  $("conversationView").hidden = true;
  setMessage("messagesNotice", "");
  loadConversations();
}

function closeMessages() {
  $("messagesPanel").hidden = true;
  document.body.classList.remove("modal-open");
  activeConversation = null;
}

document.addEventListener("DOMContentLoaded", () => {
  $("openAuth").addEventListener("click", () =>
    openAuth(currentUser ? "signin" : authMode)
  );

  $("closeAuth").addEventListener("click", closeAuth);
  $("authBackdrop").addEventListener("click", closeAuth);
  $("authForm").addEventListener("submit", submitAuth);

  $("authSwitch").addEventListener("click", () => {
    authMode = authMode === "signup" ? "signin" : "signup";
    setMessage("authMessage", "");
    updateAuthUI();
  });

  $("signOutButton").addEventListener("click", signOut);
  $("sellForm").addEventListener("submit", publishTicket);

  $("searchForm").addEventListener("submit", e => {
    e.preventDefault();
    renderTickets();
  });

  $("searchInput").addEventListener("input", renderTickets);

  document.querySelectorAll("[data-category]").forEach(button =>
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach(item =>
        item.classList.toggle("active", item === button)
      );
      renderTickets();
    })
  );

  $("messagesOpen").addEventListener("click", openMessages);
  $("messagesClose").addEventListener("click", closeMessages);
  $("messagesBackdrop").addEventListener("click", closeMessages);

  $("backToConversations").addEventListener("click", () => {
    $("conversationView").hidden = true;
    $("conversationList").hidden = false;
    activeConversation = null;
  });

  $("messageForm").addEventListener("submit", sendMessage);
  $("sellerClose").addEventListener("click", closeSellerModal);
  $("sellerBackdrop").addEventListener("click", closeSellerModal);
  $("sellerMessageForm").addEventListener("submit", sendFirstMessage);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeAuth();
      closeMessages();
      closeSellerModal();
    }
  });

  startTicketly();
});
