
const tickets = [
  {
    event: "Arsenal Match",
    category: "Football",
    location: "London, United Kingdom",
    price: 85,
    quantity: 1,
    sample: true
  },
  {
    event: "Live Music Concert",
    category: "Concert",
    location: "Paris, France",
    price: 120,
    quantity: 2,
    sample: true
  },
  {
    event: "Summer Music Festival",
    category: "Festival",
    location: "Barcelona, Spain",
    price: 65,
    quantity: 3,
    sample: true
  }
];

let selectedCategory = "All";

const list = document.querySelector("#ticket-list");
const search = document.querySelector("#search");
const empty = document.querySelector("#empty");

function renderTickets() {
  const query = search.value.trim().toLowerCase();

  const filtered = tickets.filter(ticket => {
    const text = [
      ticket.event,
      ticket.category,
      ticket.location
    ].join(" ").toLowerCase();

    return text.includes(query) &&
      (selectedCategory === "All" ||
       ticket.category === selectedCategory);
  });

  list.replaceChildren();
  empty.hidden = filtered.length > 0;

  filtered.forEach(ticket => {
    const card = document.createElement("article");
    card.className = "ticket-card";

    const category = document.createElement("p");
    category.className = "category";
    category.textContent = ticket.category;

    const title = document.createElement("h3");
    title.textContent = ticket.event;

    const location = document.createElement("p");
    location.textContent = ticket.location;

    const price = document.createElement("p");
    price.className = "price";
    price.textContent = `€${Number(ticket.price).toFixed(2)}`;

    const quantity = document.createElement("p");
    quantity.textContent = `${ticket.quantity} ticket(s)`;

    const note = document.createElement("small");
    note.textContent = ticket.sample
      ? "Sample listing — not a real offer"
      : "User-created demo listing";

    card.append(category, title, location, price, quantity, note);
    list.append(card);
  });
}

search.addEventListener("input", renderTickets);

document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    document.querySelectorAll("[data-category]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderTickets();
  });
});

document.querySelector("#sell-form").addEventListener("submit", event => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);
  const price = Number(form.get("price"));
  const quantity = Number(form.get("quantity"));

  if (!Number.isFinite(price) || price <= 0 ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    document.querySelector("#form-message").textContent =
      "Enter a valid price and ticket quantity.";
    return;
  }

  tickets.unshift({
    event: String(form.get("event")).trim(),
    category: String(form.get("category")),
    location: String(form.get("location")).trim(),
    price,
    quantity,
    sample: false
  });

  selectedCategory = "All";
  search.value = "";
  document.querySelectorAll("[data-category]").forEach(button => {
    button.classList.toggle("active", button.dataset.category === "All");
  });

  renderTickets();
  event.currentTarget.reset();

  document.querySelector("#form-message").textContent =
    "Listing added to this demo. It is not published online.";
  document.querySelector("#explore").scrollIntoView({ behavior: "smooth" });
});

renderTickets();
