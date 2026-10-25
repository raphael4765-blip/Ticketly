
const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let db = null;
let currentUser = null;
let authMode = "signin";
let activeCategory = "All";
let allTickets = [];

const $ = id => document.getElementById(id);

function notice(message, error = false) {
  const el = $("notice");
  el.textContent = message;
  el.classList.toggle("notice-error", error);
  el.hidden = false;
}

function normalCategory(value) {
  const c = String(value || "").toLowerCase();
  if (c.includes("football") || c.includes("sport")) return "Football";
  if (c.includes("concert") || c.includes("music")) return "Concerts";
  return "Other";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function updateAuthUI() {
  const signedIn = !!currentUser;
  $("openAuth").textContent = signedIn ? "My account" : "Sign in / Sign up";
  $("authTitle").textContent = signedIn ? "Your account" : authMode === "signup" ? "Create account" : "Sign in";
  $("authSubmit").textContent = authMode === "signup" ? "Create account" : "Sign in";
  $("authSubmit").hidden = signedIn;
  $("authEmail").disabled = signedIn;
  $("authPassword").disabled = signedIn;
  $("authSwitch").hidden = signedIn;
  $("authSwitch").textContent = authMode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up";
  $("signOutButton").hidden = !signedIn;
  $("authMessage").textContent = signedIn
    ? `Signed in as ${currentUser.email || "your account"}.`
    : "Sign in or create an account to list tickets.";
}

function openAuth() {
  $("authSection").hidden = false;
  document.body.classList.add("modal-open");
  updateAuthUI();
}

function closeAuth() {
  $("authSection").hidden = true;
  document.body.classList.remove("modal-open");
}

function renderTickets() {
  const query = $("searchInput").value.trim().toLowerCase();
  const filtered = allTickets.filter(t => {
    const matchesCategory = activeCategory === "All" || normalCategory(t.category) === activeCategory;
    const text = `${t.event_name} ${t.country} ${t.category}`.toLowerCase();
    return matchesCategory && text.includes(query);
  });

  $("ticketGrid").innerHTML = filtered.map(t => {
    const price = Number(t.price);
    const date = t.event_date
      ? new Date(t.event_date + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
      : "Date to be confirmed";
    return `
      <article class="ticket-card">
        <div class="ticket-card-top">
          <span class="ticket-category">${escapeHTML(normalCategory(t.category))}</span>
          <span class="ticket-date">${escapeHTML(date)}</span>
        </div>
        <h3>${escapeHTML(t.event_name)}</h3>
        <p class="ticket-country">📍 ${escapeHTML(t.country)}</p>
        <div class="ticket-card-bottom">
          <strong>€${Number.isFinite(price) ? price.toFixed(2) : "—"}</strong>
          <span class="ticket-label">Listed ticket</span>
        </div>
      </article>`;
  }).join("");

  $("resultCount").textContent = `${filtered.length} ${filtered.length === 1 ? "ticket" : "tickets"}`;
  $("emptyMessage").hidden = filtered.length !== 0;
}

async function loadTickets() {
  const { data, error } = await db.from("tickets")
    .select("id,event_name,category,country,event_date,price,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  allTickets = data || [];
  renderTickets();
}

async function startTicketly() {
  try {
    if (!window.supabase || !window.supabase.createClient) {
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
  } catch (e) {
    console.error("Ticketly connection error:", e);
    notice("Ticketly could not connect: " + e.message, true);
    $("resultCount").textContent = "Could not load tickets";
  }
}

async function submitAuth(event) {
  event.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const button = $("authSubmit");
  button.disabled = true;

  try {
    if (authMode === "signup") {
      const { data, error } = await db.auth.signUp({ email, password });
      if (error) throw error;

      if (data.session) {
        currentUser = data.user;
        updateAuthUI();
        $("authMessage").textContent = "Your account has been created.";
      } else {
        $("authMessage").textContent = "Account created. Check your email to confirm your account, then sign in.";
      }
    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      updateAuthUI();
      closeAuth();
    }
  } catch (e) {
    $("authMessage").textContent = e.message || "Could not sign in. Please try again.";
    $("authMessage").classList.add("error-text");
  } finally {
    button.disabled = false;
    updateAuthUI();
  }
}

async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) {
    $("authMessage").textContent = error.message;
    return;
  }
  currentUser = null;
  authMode = "signin";
  updateAuthUI();
}

async function publishTicket(event) {
  event.preventDefault();

  if (!currentUser) {
    authMode = "signin";
    openAuth();
    $("authMessage").textContent = "Please sign in before publishing a ticket.";
    return;
  }

  const ticket = {
    event_name: $("eventName").value.trim(),
    category: $("eventCategory").value,
    country: $("eventCountry").value.trim(),
    event_date: $("eventDate").value,
    price: Number($("ticketPrice").value),
    user_id: currentUser.id
  };

  if (!ticket.event_name || !ticket.country || !ticket.event_date || !Number.isFinite(ticket.price) || ticket.price <= 0) {
    notice("Please fill in all fields and enter a price greater than €0.", true);
    return;
  }

  const button = $("sellSubmit");
  button.disabled = true;
  button.textContent = "Publishing…";

  try {
    const { error } = await db.from("tickets").insert([ticket]);
    if (error) throw error;
    $("sellForm").reset();
    await loadTickets();
    notice("Your ticket has been published!");
    $("tickets").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    notice("Could not publish ticket: " + e.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Publish ticket";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("openAuth").addEventListener("click", openAuth);
  $("closeAuth").addEventListener("click", closeAuth);
  $("authBackdrop").addEventListener("click", closeAuth);
  $("authForm").addEventListener("submit", submitAuth);
  $("authSwitch").addEventListener("click", () => {
    authMode = authMode === "signup" ? "signin" : "signup";
    $("authMessage").classList.remove("error-text");
    updateAuthUI();
  });
  $("signOutButton").addEventListener("click", signOut);
  $("sellForm").addEventListener("submit", publishTicket);
  $("searchForm").addEventListener("submit", event => {
    event.preventDefault();
    renderTickets();
  });
  $("searchInput").addEventListener("input", renderTickets);

  document.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach(item => item.classList.toggle("active", item === button));
      renderTickets();
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeAuth();
  });

  startTicketly();
});
