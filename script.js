
const SUPABASE_URL = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";
const SUPABASE_KEY = "https://lhmatsjxdkgoqubuezfi.supabase.co/rest/v1/ ";

let tickets = [
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

let selectedCategory = "All";

const ticketGrid = document.querySelector("#ticketGrid");
const searchInput = document.querySelector("#searchInput");
const emptyMessage = document.querySelector("#emptyMessage");
const resultCount = document.querySelector("#resultCount");
const notice = document.querySelector("#notice");

function showNotice(message) {
  notice.textContent = message;
  notice.classList.add("visible");
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => {
    notice.classList.remove("visible");
  }, 3500);
}

function formatDate(dateString) {
  if (!dateString) return "Date not specified";

  return new Date(dateString + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function emojiFor(category) {
  if (category === "Football") return "⚽";
  if (category === "Concerts") return "🎤";
  return "🎟️";
}

function renderTickets() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = tickets.filter(ticket => {
    const searchableText = [
      ticket.event,
      ticket.category,
      ticket.country,
      ticket.date
    ].join(" ").toLowerCase();

    return searchableText.includes(query) &&
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

async function loadTickets() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/tickets?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const savedTickets = await response.json();

    const databaseTickets = savedTickets.map(ticket => ({
      id: ticket.id,
      event: ticket.event_name,
      category: ticket.category,
      country: ticket.country,
      date: ticket.event_date,
      price: Number(ticket.price),
      quantity: 1,
      emoji: emojiFor(ticket.category),
      sample: false
    }));

    tickets = [...databaseTickets, ...tickets.filter(t => t.sample)];
    renderTickets();
    showNotice("Saved Ticketly listings loaded!");
  } catch (error) {
    console.error("Could not load saved tickets:", error);
    showNotice("Couldn't load online tickets. Check your connection settings.");
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

document.querySelector("#sellForm").addEventListener("submit", async event => {
  event.preventDefault();

  const eventName = document.querySelector("#eventName").value.trim();
  const category = document.querySelector("#eventCategory").value;
  const country = document.querySelector("#eventCountry").value.trim();
  const date = document.querySelector("#eventDate").value;
  const price = Number(document.querySelector("#ticketPrice").value);

  if (
    !eventName ||
    !country ||
    !date ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !["Football", "Concerts", "Other"].includes(category)
  ) {
    showNotice("Please complete every field with valid information.");
    return;
  }

  showNotice("Saving your listing...");

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tickets`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        event_name: eventName,
        category,
        country,
        event_date: date,
        price
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const saved = await response.json();
    const ticket = saved[0];

    tickets.unshift({
      id: ticket.id,
      event: ticket.event_name,
      category: ticket.category,
      country: ticket.country,
      date: ticket.event_date,
      price: Number(ticket.price),
      quantity: 1,
      emoji: emojiFor(ticket.category),
      sample: false
    });

    selectedCategory = "All";
    searchInput.value = "";

    document.querySelectorAll("[data-category]").forEach(button => {
      button.classList.toggle("active", button.dataset.category === "All");
    });

    renderTickets();
    event.currentTarget.reset();
    showNotice("Your listing was saved online!");
    document.querySelector("#tickets").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Could not save listing:", error);
    showNotice("Couldn't save your listing. Check the connection and try again.");
  }
});

renderTickets();
loadTickets();
