
const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let db;
let currentUser = null;
let authMode = "signin";
let activeCategory = "All";
let allTickets = [];
let pendingSellerTicket = null;
let activeConversation = null;

const $ = id => document.getElementById(id);

function message(id, text, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("error-text", error);
}

function notice(text, error = false) {
  const el = $("notice");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.classList.toggle("notice-error", error);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function category(value) {
  const s = String(value || "").toLowerCase();
  if (s.includes("football") || s.includes("sport")) return "Football";
  if (s.includes("concert") || s.includes("music")) return "Concerts";
  return "Other";
}

function openAuth(mode = "signin") {
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
  if (!$("authForm")) return;

  const signedIn = !!currentUser;
  $("openAuth").textContent = signedIn
    ? currentUser.email : "Sign in / Sign up";

  $("authTitle").textContent = signedIn
    ? "Your account"
    : authMode === "signup" ? "Create account" : "Sign in";

  $("authSubmit").textContent =
    authMode === "signup" ? "Create account" : "Sign in";

  $("authSubmit").hidden = signedIn;
  $("authEmail").disabled = signedIn;
  $("authPassword").disabled = signedIn;
  $("authSwitch").hidden = signedIn;
  $("signOutButton").hidden = !signedIn;

  $("authSwitch").textContent = authMode === "signup"
    ? "Already have an account? Sign in"
    : "Need an account? Sign up";

  $("sellSubmit").disabled = !signedIn;
  $("sellMessage").textContent = signedIn
    ? "" : "Sign in first to publish a ticket.";
}

function renderTickets() {
  if (!$("ticketGrid")) return;

  const query = $("searchInput").value.trim().toLowerCase();

  const tickets = allTickets.filter(t =>
    (activeCategory === "All" || category(t.category) === activeCategory) &&
    `${t.event_name} ${t.country} ${t.category} ${t.description || ""}`
      .toLowerCase().includes(query)
  );

  $("ticketGrid").innerHTML = tickets.map(t => {
    const date = t.event_date
      ? new Date(t.event_date + "T12:00:00").toLocaleDateString()
      : "Date TBC";

    const image = t.image_url
      ? `<img src="${safe(t.image_url)}" alt="Ticket photo" loading="lazy">`
      : `<span>${category(t.category) === "Football" ? "⚽" :
          category(t.category) === "Concerts" ? "🎤" : "🎟️"}</span>`;

    return `
      <article class="ticket-card">
        <div class="ticket-image">${image}</div>
        <div class="ticket-card-body">
          <div class="ticket-card-top">
            <span class="ticket-category">${safe(category(t.category))}</span>
            <span class="ticket-date">${safe(date)}</span>
          </div>
          <h3>${safe(t.event_name)}</h3>
          <p class="ticket-country">📍 ${safe(t.country)}</p>
          ${t.description
            ? `<p class="ticket-description">${safe(t.description)}</p>` : ""}
          <div class="ticket-card-bottom">
            <strong>€${Number(t.price).toFixed(2)}</strong>
            <span class="ticket-label">Listed ticket</span>
          </div>
          <div class="ticket-actions">
            <button class="button button-primary" type="button"
              data-message-seller="${safe(t.id)}">Message seller</button>
          </div>
        </div>
      </article>`;
  }).join("");

  $("resultCount").textContent =
    `${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"}`;
  $("emptyMessage").hidden = tickets.length > 0;

  document.querySelectorAll("[data-message-seller]").forEach(button => {
    button.addEventListener("click", () =>
      startSellerMessage(button.dataset.messageSeller));
  });
}

async function loadTickets() {
  const { data, error } = await db.from("tickets")
    .select("id,event_name,category,country,event_date,price,created_at,user_id,description,image_url")
    .order("created_at", { ascending: false });

  if (error) throw error;
  allTickets = data || [];
  renderTickets();
}

async function submitAuth(event) {
  event.preventDefault();

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const button = $("authSubmit");

  if (!db) {
    message("authMessage", "Still connecting to Ticketly. Refresh and try again.", true);
    return;
  }

  if (!email || !password) {
    message("authMessage", "Enter your email and password.", true);
    return;
  }

  if (authMode === "signup" && password.length < 6) {
    message("authMessage", "Your password must be at least 6 characters.", true);
    return;
  }

  button.disabled = true;
  button.textContent = authMode === "signup"
    ? "Creating account..." : "Signing in...";
  message("authMessage", "Please wait...");

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
        notice("Your account was created successfully!");
      } else {
        message(
          "authMessage",
          "Account request received. If email confirmation is enabled in Supabase, check your inbox and spam folder, then sign in."
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
      notice("Signed in successfully!");
    }
  } catch (error) {
    console.error("Ticketly authentication error:", error);
    message(
      "authMessage",
      error.message || "Could not sign in. Please try again.",
      true
    );
  } finally {
    button.disabled = false;
    updateAuthUI();
  }
}

async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) return notice(error.message, true);

  currentUser = null;
  updateAuthUI();
  notice("You have signed out.");
}

async function publishTicket(event) {
  event.preventDefault();

  if (!currentUser) {
    openAuth("signin");
    return;
  }

  const button = $("sellSubmit");
  button.disabled = true;
  button.textContent = "Publishing...";

  let uploadedPath = null;

  try {
    let image_url = null;
    const file = $("ticketPhoto")?.files?.[0];

    if (file) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Choose an image file.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Images must be 5 MB or smaller.");
      }

      uploadedPath = `${currentUser.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const upload = await db.storage.from("ticket-photos").upload(
        uploadedPath, file, { contentType: file.type }
      );
      if (upload.error) throw upload.error;

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
      throw new Error("Complete all required fields and enter a price above €0.");
    }

    const { error } = await db.from("tickets").insert(ticket);
    if (error) throw error;

    $("sellForm").reset();
    await loadTickets();
    notice("Your ticket has been published!");
    $("tickets").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    if (uploadedPath) {
      await db.storage.from("ticket-photos").remove([uploadedPath]);
    }
    message("sellMessage", error.message, true);
    notice("Could not publish ticket: " + error.message, true);
  } finally {
    button.disabled = !currentUser;
    button.textContent = "Publish ticket";
  }
}

async function startSellerMessage(ticketId) {
  if (!currentUser) {
    openAuth("signin");
    message("authMessage", "Sign in to contact the seller.");
    return;
  }

  const ticket = allTickets.find(t => String(t.id) === String(ticketId));
  if (!ticket) return;

  if (ticket.user_id === currentUser.id) {
    notice("This is your own listing.");
    return;
  }

  pendingSellerTicket = ticket;
  $("sellerModalTitle").textContent = "Message seller";
  $("sellerTicketName").textContent = "About: " + ticket.event_name;
  $("sellerFirstMessage").value = "";
  message("sellerNotice", "");
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

  const body = $("sellerFirstMessage").value.trim();
  if (!body) return;

  try {
    const ticket = pendingSellerTicket;
    const participants = [currentUser.id, ticket.user_id];

    const { data: existing, error: findError } = await db
      .from("conversations")
      .select("id")
      .eq("ticket_id", ticket.id)
      .contains("participant_ids", participants)
      .maybeSingle();

    if (findError) throw findError;

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data, error } = await db.from("conversations")
        .insert({
          ticket_id: ticket.id,
          participant_ids: participants
        })
        .select("id")
        .single();

      if (error) throw error;
      conversationId = data.id;
    }

    const { error } = await db.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      body
    });
    if (error) throw error;

    closeSellerModal();
    openMessages();
    await openConversation(conversationId);
    notice("Message sent!");
  } catch (error) {
    message("sellerNotice", error.message, true);
  }
}

async function loadConversations() {
  const list = $("conversationList");
  list.innerHTML = "<p>Loading messages...</p>";

  const { data, error } = await db.from("conversations")
    .select("id,ticket_id,participant_ids,updated_at,tickets(event_name)")
    .order("updated_at", { ascending: false });

  if (error) {
    list.innerHTML = "";
    return message("messagesNotice", error.message, true);
  }

  const mine = (data || []).filter(c =>
    (c.participant_ids || []).includes(currentUser.id)
  );

  if (!mine.length) {
    list.innerHTML = "<p class='small-note'>No messages yet.</p>";
    return;
  }

  list.innerHTML = mine.map(c => `
    <button class="conversation-item" type="button"
      data-conversation="${safe(c.id)}">
      <strong>${safe(c.tickets?.event_name || "Ticket conversation")}</strong>
      <span>Open conversation</span>
    </button>`).join("");

  list.querySelectorAll("[data-conversation]").forEach(button =>
    button.addEventListener("click", () =>
      openConversation(button.dataset.conversation))
  );
}

async function openConversation(id) {
  activeConversation = id;
  $("conversationView").hidden = false;
  $("conversationList").hidden = true;
  $("conversationMessages").innerHTML = "<p>Loading...</p>";

  const { data: convo, error: ce } = await db.from("conversations")
    .select("id,participant_ids").eq("id", id).single();

  if (ce) return message("messagesNotice", ce.message, true);

  if (!convo.participant_ids.includes(currentUser.id)) {
    return message("messagesNotice", "You cannot access this conversation.", true);
  }

  const { data, error } = await db.from("messages")
    .select("id,sender_id,body,created_at")
    .eq("conversation_id", id).order("created_at");

  if (error) return message("messagesNotice", error.message, true);

  $("conversationMessages").innerHTML = (data || []).map(m => `
    <div class="message-bubble ${m.sender_id === currentUser.id ? "mine" : ""}">
      ${safe(m.body)}
      <span class="message-meta">${m.sender_id === currentUser.id ? "You" : "Other user"} · ${new Date(m.created_at).toLocaleString()}</span>
    </div>`).join("") || "<p>No messages yet.</p>";

  await db.from("messages").update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .neq("sender_id", currentUser.id)
    .is("read_at", null);
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
  } catch (error) {
    message("messagesNotice", error.message, true);
  } finally {
    button.disabled = false;
  }
}

function openMessages() {
  if (!currentUser) {
    openAuth("signin");
    message("authMessage", "Sign in to use messages.");
    return;
  }

  $("messagesPanel").hidden = false;
  document.body.classList.add("modal-open");
  $("conversationList").hidden = false;
  $("conversationView").hidden = true;
  message("messagesNotice", "");
  loadConversations();
}

function closeMessages() {
  $("messagesPanel").hidden = true;
  document.body.classList.remove("modal-open");
  activeConversation = null;
}

document.addEventListener("DOMContentLoaded", async () => {
  // Attach the form handlers first, so the buttons work as soon as the page loads.
  $("authForm").addEventListener("submit", submitAuth);

  $("authSubmit").type = "submit";
  $("authForm").querySelectorAll("button").forEach(button => {
    if (button.id !== "authSubmit") button.type = "button";
  });

  $("openAuth").addEventListener("click", () =>
    openAuth(currentUser ? "signin" : "signin"));
  $("closeAuth").addEventListener("click", closeAuth);
  $("authBackdrop").addEventListener("click", closeAuth);

  $("authSwitch").addEventListener("click", () => {
    authMode = authMode === "signup" ? "signin" : "signup";
    message("authMessage", "");
    updateAuthUI();
  });

  $("signOutButton").addEventListener("click", signOut);
  $("sellForm").addEventListener("submit", publishTicket);

  $("searchForm").addEventListener("submit", event => {
    event.preventDefault();
    renderTickets();
  });
  $("searchInput").addEventListener("input", renderTickets);

  document.querySelectorAll("[data-category]").forEach(button =>
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach(item =>
        item.classList.toggle("active", item === button));
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

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeAuth();
      closeMessages();
      closeSellerModal();
    }
  });

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
    $("notice").hidden = true;
  } catch (error) {
    console.error("Ticketly startup error:", error);
    notice("Ticketly connection error: " + error.message, true);
    $("resultCount").textContent = "Could not load tickets";
  }
});
