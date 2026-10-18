
const tickets = [
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
    art.textContent = ticket.emoji;

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
    tag.textContent = ticket.sample ? "SAMPLE" : "DEMO LISTING";

    bottom.append(price, tag);
    info.append(category, title, location, date, bottom);
    card.append(art, info);
    ticketGrid.append(card);
  });
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

document.querySelector("#sellForm").addEventListener("submit", event => {
  event.preventDefault();

  const eventName = document.querySelector("#eventName").value.trim();
  const category = document.querySelector("#eventCategory").value;
  const country = document.querySelector("#eventCountry").value.trim();
  const date = document.querySelector("#eventDate").value;
  const price = Number(document.querySelector("#ticketPrice").value);

  if (!eventName || !country || !date ||
      !Number.isFinite(price) || price <= 0) {
    showNotice("Please complete every field with valid information.");
    return;
  }

  tickets.unshift({
    event: eventName,
    category,
    country,
    date,
    price,
    quantity: 1,
    emoji: category === "Football" ? "⚽" :
      category === "Concerts" ? "🎤" : "🎟️",
    sample: false
  });

  selectedCategory = "All";
  searchInput.value = "";

  document.querySelectorAll("[data-category]").forEach(button => {
    button.classList.toggle("active", button.dataset.category === "All");
  });

  renderTickets();
  event.currentTarget.reset();

  showNotice("Your demo listing was added! It won't be saved after refreshing.");
  document.querySelector("#tickets").scrollIntoView({ behavior: "smooth" });
});

renderTickets();

