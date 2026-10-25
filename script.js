
const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let supabase;
let currentUser = null;
let authMode = "signin";
let tickets = [];
let selectedCategory = "All";

const ticketGrid = document.querySelector("#ticketGrid");
const searchInput = document.querySelector("#searchInput");
const emptyMessage = document.querySelector("#emptyMessage");
const resultCount = document.querySelector("#resultCount");
const notice = document.querySelector("#notice");

const authSection = document.querySelector("#authSection");
const authForm = document.querySelector("#authForm");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authTitle = document.querySelector("#authTitle");
const authMessage = document.querySelector("#authMessage");
const authSubmit = document.querySelector("#authSubmit");
const authSwitch = document.querySelector("#authSwitch");
const signOutButton = document.querySelector("#signOutButton");
const openAuth = document.querySelector("#openAuth");

const sampleTickets = [
  {
    event: "Arsenal Match",
    category: "Football",
    country: "England",
    date: "2027-01-10",
    price: 85,
    quantity: 1,
    emoji: "⚽",
    sample: true
  },
  {
    event: "Live Music Concert",
    category: "Concerts",
    country: "France",
    date: "2027-02-14",
    price: 120,
    quantity: 2,
    emoji: "🎤",
    sample: true
  },
  {
    event: "Summer Music Festival",
    category: "Other",
    country: "Spain",
    date: "2027-06-20",
    price: 65,
    quantity: 3,
    emoji: "🎶",
    sample: true
  }
];

function showNotice(message) {
  notice.textContent = message;
  notice.classList.add("visible");

  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => {
    notice.classList.remove("visible");
  }, 5000);
}

function emojiFor(category) {
  if (category === "Football") return "⚽";
  if (category === "Concerts") return "🎤";
  return "🎟️";
}

function formatDate(dateString) {
  if (!dateString) return "Date not specified";

  return new Date(dateString + "T12:00:00").toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" }
  );
}

function renderTickets() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = tickets.filter(ticket => {
    const text = [
      ticket.event,
      ticket.category,
      ticket.country,
      ticket.date
    ].join(" ").toLowerCase();

    return text.includes(query) &&
      (selectedCategory === "All" ||
       ticket.category === selectedCategory);
  });

  ticketGrid.replaceChildren();
  emptyMessage.hidden = filtered.length !== 0;

  resultCount.textContent =
    filtered.length + (filtered.length === 1 ? " listing" : " listings");

  filtered.forEach(ticket => {
    const card = document.createElement("article");
    card.className = "ticket-card";

    const art = document.createElement("div");
    art.className = "ticket-art";
    art.textContent = ticket.emoji || emojiFor(ticket.category);

    const info = document.createElement("div");
    info.className = "ticket-info";

    const category = document.createElement("span");
    category.className = "ticket-category";
    category.textContent = ticket.category;

    const title = document.createElement("h3");
    title.textContent = ticket.event;

    const location = document.createElement("p");
    location.className = "ticket-location";
    location.textContent = "📍 " + ticket.country;

    const date = document.createElement("p");
    date.className = "ticket-date";
    date.textContent = "📅 " + formatDate(ticket.date);

    const bottom = document.createElement("div");
    bottom.className = "ticket-bottom";

    const price = document.createElement("span");
    price.className = "ticket-price";
    price.textContent = "€" + Number(ticket.price).toFixed(2);

    const tag = document.createElement("span");
    tag.className = "demo-tag";
    tag.textContent = ticket.sample ? "SAMPLE" : "LISTED";

    bottom.append(price, tag);
    info.append(category, title, location, date, bottom);
    card.append(art, info);
    ticketGrid.append(card);
  });
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === "signup";

  authTitle.textContent = signingUp
    ? "Create your Ticketly account"
    : "Sign in to Ticketly";

  authMessage.textContent = signingUp
    ? "Create an account with your email and password."
    : "Welcome back! Sign in to continue.";

  authSubmit.textContent = signingUp ? "Create account" : "Sign in";

  authSwitch.textContent = signingUp
    ? "Sign in instead"
    : "Create account";

  authPassword.autocomplete = signingUp
    ? "new-password"
    : "current-password";
}

function openAuthForm() {
  authSection.hidden = false;
  authSection.scrollIntoView({ behavior: "smooth", block: "center" });
}

function updateAuthUI() {
  if (currentUser) {
    openAuth.textContent = "My account";
    authTitle.textContent = "You're signed in!";
    authMessage.textContent =
      "Signed in as " + currentUser.email;
    authForm.hidden = true;
    authSwitch.hidden = true;
    signOutButton.hidden = false;
  } else {
    openAuth.textContent = "Sign in";
    authForm.hidden = false;
    authSwitch.hidden = false;
    signOutButton.hidden = true;
    setAuthMode(authMode);
  }
}

function mapDatabaseTicket(ticket) {
  return {
    id: ticket.id,
    event: ticket.event_name,
    category: ticket.category,
    country: ticket.country,
    date: ticket.event_date,
    price: Number(ticket.price),
    quantity: 1,
    emoji: emojiFor(ticket.category),
    sample: false
  };
}

async function loadTickets() {
  try {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    tickets = [
      ...data.map(mapDatabaseTicket),
      ...sampleTickets
    ];

    renderTickets();
  } catch (error) {
    console.error("Could not load tickets:", error);
    showNotice("Couldn't load online tickets. Please refresh.");
  }
}

searchInput.addEventListener("input", renderTickets);

document.querySelector("#searchForm").addEventListener("submit", event => {
  event.preventDefault();
  renderTickets();
});

document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    document.querySelectorAll("[data-category]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderTickets();
  });
});

openAuth.addEventListener("click", () => {
  openAuthForm();
  updateAuthUI();
});

document.querySelector("#closeAuth").addEventListener("click", () => {
  authSection.hidden = true;
});

authSwitch.addEventListener("click", () => {
  setAuthMode(authMode === "signin" ? "signup" : "signin");
});

authForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = authEmail.value.trim();
  const password = authPassword.value;

  authSubmit.disabled = true;

  try {
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            "https://raphael4765-blip.github.io/Ticketly/"
        }
      });

      if (error) throw error;

      if (data.session) {
        showNotice("Account created! You're signed in.");
      } else {
        showNotice(
          "Account created! Check your email and confirm your account before signing in."
        );
      }

      authPassword.value = "";
      setAuthMode("signin");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      showNotice("Welcome back to Ticketly!");
      authPassword.value = "";
      authSection.hidden = true;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    showNotice(error.message || "Authentication failed. Please try again.");
  } finally {
    authSubmit.disabled = false;
  }
});

signOutButton.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    showNotice(error.message);
    return;
  }

  authSection.hidden = true;
  showNotice("You've signed out.");
});

document.querySelector("#sellForm").addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    if (!currentUser) {
      showNotice("Please sign in before creating a listing.");
      setAuthMode("signin");
      openAuthForm();
      return;
    }

    const eventName =
      document.querySelector("#eventName").value.trim();
    const category =
      document.querySelector("#eventCategory").value;
    const country =
      document.querySelector("#eventCountry").value.trim();
    const date =
      document.querySelector("#eventDate").value;
    const price =
      Number(document.querySelector("#ticketPrice").value);

    if (
      !eventName ||
      !country ||
      !date ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !["Football", "Concerts", "Other"].includes(category)
    ) {
      showNotice("Please complete every field correctly.");
      return;
    }

    const submitButton = event.currentTarget.querySelector(
      'button[type="submit"]'
    );
    submitButton.disabled = true;
    showNotice("Saving your listing...");

    try {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          event_name: eventName,
          category,
          country,
          event_date: date,
          price,
          user_id: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      tickets = [
        mapDatabaseTicket(data),
        ...tickets.filter(ticket => !ticket.sample)
      ];

      tickets.push(...sampleTickets);
      selectedCategory = "All";
      searchInput.value = "";

      document.querySelectorAll("[data-category]").forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.category === "All"
        );
      });

      renderTickets();
      event.currentTarget.reset();
      showNotice("Your listing was saved online!");
      document.querySelector("#tickets").scrollIntoView({
        behavior: "smooth"
      });
    } catch (error) {
      console.error("Could not save listing:", error);
      showNotice(
        error.message || "Couldn't save your listing. Please try again."
      );
    } finally {
      submitButton.disabled = false;
    }
  }
);

async function startTicketly() {
  try {
    // Load the Supabase client library.
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error("Could not load the Supabase library."));
        document.head.appendChild(script);
      });
    }

    supabase = window.supabase.createClient(
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

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;
    updateAuthUI();
    renderTickets();
    await loadTickets();

    supabase.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      updateAuthUI();

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        loadTickets();
      }
    });
  } catch (error) {
    console.error("Ticketly setup error:", error);
    showNotice(
      "Ticketly couldn't connect to its account service. Refresh and try again."
    );
  }
}

renderTickets();
updateAuthUI();
startTicketly();
