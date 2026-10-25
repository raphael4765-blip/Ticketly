const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let supabase = null;
let currentUser = null;
let authMode = "signin";
let tickets = [];
let selectedCategory = "All";

const $ = (id) => document.getElementById(id);

function showNotice(message, isError = false) {
  const notice = $("notice");
  if (!notice) {
    alert(message);
    return;
  }
  notice.textContent = message;
  notice.style.color = isError ? "#b42318" : "";
  notice.hidden = false;
}

function openAuthForm(mode = "signin") {
  authMode = mode;
  $("authSection").hidden = false;
  $("authTitle").textContent =
    mode === "signup" ? "Create your Ticketly account" : "Sign in to Ticketly";
  $("authMessage").textContent =
    mode === "signup"
      ? "Create a free account to list tickets."
      : "Welcome back! Sign in to continue.";
  $("authSubmit").textContent =
    mode === "signup" ? "Create account" : "Sign in";
  $("authPassword").autocomplete =
    mode === "signup" ? "new-password" : "current-password";
  $("authSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateAuthUI() {
  if ($("openAuth")) {
    $("openAuth").textContent = currentUser ? "My account" : "Sign in";
  }
  if ($("signOutButton")) {
    $("signOutButton").hidden = !currentUser;
  }
  if ($("sellForm")) {
    $("sellForm").querySelectorAll("input, select, button").forEach((el) => {
      el.disabled = !currentUser;
    });
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(Number(price));
}

function renderTickets() {
  const grid = $("ticketGrid");
  if (!grid) return;

  const search = ($("searchInput")?.value || "").trim().toLowerCase();

  const filtered = tickets.filter((ticket) => {
    const matchesSearch =
      `${ticket.event_name} ${ticket.category} ${ticket.country}`
        .toLowerCase()
        .includes(search);

    const matchesCategory =
      selectedCategory === "All" || ticket.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  grid.innerHTML = "";

  filtered.forEach((ticket) => {
    const card = document.createElement("article");
    card.className = "ticket-card";

    const title = document.createElement("h3");
    title.textContent = ticket.event_name;

    const category = document.createElement("p");
    category.textContent = ticket.category;

    const location = document.createElement("p");
    location.textContent = ticket.country;

    const date = document.createElement("p");
    date.textContent = new Date(ticket.event_date + "T12:00:00")
      .toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

    const price = document.createElement("strong");
    price.textContent = formatPrice(ticket.price);

    card.append(title, category, location, date, price);
    grid.appendChild(card);
  });

  if ($("resultCount")) {
    $("resultCount").textContent =
      `${filtered.length} ticket${filtered.length === 1 ? "" : "s"} found`;
  }
  if ($("emptyMessage")) {
    $("emptyMessage").hidden = filtered.length > 0;
  }
}

async function loadTickets() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showNotice("Could not load tickets: " + error.message, true);
    return;
  }

  tickets = data || [];
  renderTickets();
}

async function startTicketly() {
  try {
    // Load the official Supabase JavaScript library.
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error("Could not load the Supabase library."));
        document.head.appendChild(script);
      });
    }

    if (!window.supabase?.createClient) {
      throw new Error("Supabase library did not initialise.");
    }

    supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;
    updateAuthUI();

    supabase.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      updateAuthUI();
    });

    await loadTickets();
  } catch (error) {
    console.error("Ticketly startup error:", error);
    showNotice("Ticketly connection error: " + error.message, true);
  }
}

// Sign-in button
$("openAuth")?.addEventListener("click", () => {
  openAuthForm(currentUser ? "signin" : "signin");
  updateAuthUI();
});

// Close the sign-in section
$("closeAuth")?.addEventListener("click", () => {
  $("authSection").hidden = true;
});

// Switch between sign-in and account creation
$("authSwitch")?.addEventListener("click", () => {
  openAuthForm(authMode === "signin" ? "signup" : "signin");
});

// Sign in or create account
$("authForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabase) {
    showNotice("Please wait for Ticketly to connect, then try again.", true);
    return;
  }

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const submit = $("authSubmit");

  submit.disabled = true;

  try {
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        showNotice("Account created! You are now signed in.");
      } else {
        showNotice("Account created! Check your email to confirm it.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      showNotice("Signed in successfully!");
    }
  } catch (error) {
    showNotice(error.message || "Something went wrong.", true);
  } finally {
    submit.disabled = false;
  }
});

// Sign out
$("signOutButton")?.addEventListener("click", async () => {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    showNotice(error.message, true);
  } else {
    showNotice("You have signed out.");
  }
});

// Search tickets
$("searchForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  renderTickets();
});

$("searchInput")?.addEventListener("input", renderTickets);

// Category filters
document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category || "All";
    renderTickets();
  });
});

// Create a ticket listing
$("sellForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabase || !currentUser) {
    showNotice("Please sign in before listing a ticket.", true);
    openAuthForm("signin");
    return;
  }

  const ticket = {
    event_name: $("eventName").value.trim(),
    category: $("eventCategory").value,
    country: $("eventCountry").value.trim(),
    event_date: $("eventDate").value,
    price: Number($("ticketPrice").value),
    user_id: currentUser.id,
  };

  try {
    const { error } = await supabase.from("tickets").insert(ticket);
    if (error) throw error;

    showNotice("Your ticket listing has been published!");
    $("sellForm").reset();
    await loadTickets();
  } catch (error) {
    showNotice("Could not publish listing: " + error.message, true);
  }
});

// Initial page setup
if ($("authSection")) $("authSection").hidden = true;
updateAuthUI();
startTicketly();


