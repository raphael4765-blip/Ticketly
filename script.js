
const URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

let db, user = null, mode = "signin";
let tickets = [], items = [], pending = null, active = null, lang = "en";

const $ = id => document.getElementById(id);

const txt = (id, t, bad = false) => {
  if ($(id)) {
    $(id).textContent = t || "";
    $(id).classList.toggle("error", bad);
  }
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;",
  '"': "&quot;", "'": "&#39;"
}[c]));

function toast(t) {
  $("toast").textContent = t;
  $("toast").hidden = false;
  setTimeout(() => $("toast").hidden = true, 3500);
}

function modal(id, on) {
  $(id).hidden = !on;
}

function update() {
  $("openAuth").textContent = user
    ? user.email
    : (lang === "he" ? "התחברות / הרשמה" : "Sign in / Sign up");

  $("signOut").hidden = !user;
  $("ticketSubmit").disabled = !user;
  $("memSubmit").disabled = !user;
  $("authTitle").textContent = mode === "signup" ? "Create account" : "Sign in";
  $("authSubmit").textContent = mode === "signup" ? "Create account" : "Sign in";
  $("switchAuth").hidden = !!user;
  $("switchAuth").textContent = mode === "signup"
    ? "Already have an account? Sign in"
    : "Need an account? Sign up";
}

function render(kind) {
  const isMem = kind === "mem";
  const src = isMem ? items : tickets;
  const q = $(isMem ? "ms" : "ts").value.toLowerCase();
  const f = $(isMem ? "mf" : "tf").value;

  const data = src.filter(x =>
    (f === "All" || String(x.category).toLowerCase() === f.toLowerCase()) &&
    JSON.stringify(x).toLowerCase().includes(q)
  );

  const grid = $(isMem ? "memGrid" : "ticketGrid");

  grid.innerHTML = data.map(x => {
    const title = isMem ? x.title : x.event_name;

    return `
      <article class="card">
        <div>
          ${x.image_url
            ? `<img src="${esc(x.image_url)}" alt="">`
            : `<div style="font-size:50px;padding:20px">${isMem ? "👕" : "🎟️"}</div>`}
        </div>
        <small>${esc(x.category)} · ${esc(x.country)}</small>
        <h3>${esc(title)}</h3>
        <p>${esc(x.description || "")}</p>
        <div class="price">€${Number(x.price).toFixed(2)}</div>
        <button class="btn" data-contact="${isMem ? "mem" : "ticket"}:${esc(x.id)}">
          Message seller
        </button>
      </article>`;
  }).join("");

  grid.querySelectorAll("[data-contact]").forEach(b => {
    b.onclick = () => contact(...b.dataset.contact.split(":"));
  });
}

async function load() {
  const a = await db.from("tickets")
    .select("id,event_name,category,country,event_date,price,created_at,user_id,description,image_url")
    .order("created_at", { ascending: false });

  if (a.error) {
    txt("ticketError", a.error.message, true);
  } else {
    tickets = a.data || [];
    render("ticket");
  }

  const b = await db.from("memorabilia")
    .select("id,title,category,country,price,created_at,user_id,description,image_url")
    .order("created_at", { ascending: false });

  if (b.error) {
    items = [];
    txt("memError", "Run setup.sql in Supabase SQL Editor to enable Memorabilia.", true);
  } else {
    items = b.data || [];
    txt("memError", "");
  }

  render("mem");
}

async function auth(e) {
  e.preventDefault();
  const button = $("authSubmit");
  button.disabled = true;

  try {
    const r = mode === "signup"
      ? await db.auth.signUp({
          email: $("email").value.trim(),
          password: $("password").value
        })
      : await db.auth.signInWithPassword({
          email: $("email").value.trim(),
          password: $("password").value
        });

    if (r.error) throw r.error;

    if (r.data.session) {
      user = r.data.user;
      modal("authModal", false);
      toast("Signed in successfully");
    } else {
      txt("authMsg", "Account created/request received. Check whether email confirmation is enabled.");
    }

    update();
  } catch (e) {
    txt("authMsg", e.message, true);
  } finally {
    button.disabled = false;
  }
}

async function image(file) {
  if (!file) return null;

  if (!file.type.startsWith("image/") || file.size > 5242880) {
    throw Error("Choose an image smaller than 5 MB.");
  }

  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const r = await db.storage.from("ticket-photos").upload(path, file, {
    contentType: file.type
  });

  if (r.error) throw r.error;

  return db.storage.from("ticket-photos").getPublicUrl(path).data.publicUrl;
}

async function publish(e, kind) {
  e.preventDefault();

  if (!user) {
    modal("authModal", true);
    return;
  }

  const mem = kind === "mem";
  const btn = $(mem ? "memSubmit" : "ticketSubmit");
  btn.disabled = true;

  try {
    const image_url = await image($(mem ? "memPhoto" : "ticketPhoto").files[0]);

    const row = mem
      ? {
          title: $("memTitle").value.trim(),
          category: $("memCategory").value,
          country: $("memCountry").value.trim(),
          price: Number($("memPrice").value),
          description: $("memDescription").value.trim() || null,
          image_url,
          user_id: user.id
        }
      : {
          event_name: $("eventName").value.trim(),
          category: $("eventCategory").value,
          country: $("eventCountry").value.trim(),
          event_date: $("eventDate").value,
          price: Number($("ticketPrice").value),
          description: $("ticketDescription").value.trim() || null,
          image_url,
          user_id: user.id
        };

    if (
      !row.country ||
      !(mem ? row.title : row.event_name) ||
      row.price <= 0 ||
      (!mem && !row.event_date)
    ) {
      throw Error("Complete all required fields and enter a price above zero.");
    }

    const r = await db.from(mem ? "memorabilia" : "tickets").insert(row);
    if (r.error) throw r.error;

    $(mem ? "memForm" : "ticketForm").reset();
    await load();
    toast("Listing published");
  } catch (e) {
    txt(mem ? "memMsg" : "ticketMsg", e.message, true);
  } finally {
    btn.disabled = !user;
  }
}

function contact(kind, id) {
  if (!user) {
    modal("authModal", true);
    return;
  }

  const item = (kind === "mem" ? items : tickets)
    .find(x => String(x.id) === String(id));

  if (!item) return;

  const owner = String(item.user_id || "").trim();

  if (!owner) {
    modal("contactModal", true);
    txt("contactMsg", "This listing has no seller account linked. The seller must relist it while signed in.", true);
    pending = null;
    return;
  }

  if (owner === String(user.id)) {
    toast("This is your own listing");
    return;
  }

  pending = { kind, item, owner };
  $("contactTitle").textContent =
    "Message seller — " + (kind === "mem" ? item.title : item.event_name);
  $("firstMessage").value = "";
  txt("contactMsg", "");
  modal("contactModal", true);
}

async function firstMessage(e) {
  e.preventDefault();
  if (!pending || !user) return;

  const body = $("firstMessage").value.trim();
  const { kind, item, owner } = pending;
  const participants = [String(user.id), String(owner)].filter(Boolean);

  if (participants.length !== 2 || participants.includes("undefined")) {
    return txt("contactMsg", "Missing buyer or seller ID.", true);
  }

  try {
    let cid;

    if (kind === "ticket") {
      const r = await db.from("conversations")
        .select("id")
        .eq("ticket_id", item.id)
        .contains("participant_ids", participants)
        .maybeSingle();

      if (r.error) throw r.error;
      cid = r.data?.id;

      if (!cid) {
        const n = await db.from("conversations")
          .insert({ ticket_id: item.id, participant_ids: participants })
          .select("id")
          .single();

        if (n.error) throw n.error;
        cid = n.data.id;
      }

      const m = await db.from("messages").insert({
        conversation_id: cid,
        sender_id: user.id,
        body
      });

      if (m.error) throw m.error;
    } else {
      const r = await db.from("mem_conversations")
        .select("id")
        .eq("item_id", item.id)
        .contains("participant_ids", participants)
        .maybeSingle();

      if (r.error) throw r.error;
      cid = r.data?.id;

      if (!cid) {
        const n = await db.from("mem_conversations")
          .insert({ item_id: item.id, participant_ids: participants })
          .select("id")
          .single();

        if (n.error) throw n.error;
        cid = n.data.id;
      }

      const m = await db.from("mem_messages").insert({
        conversation_id: cid,
        sender_id: user.id,
        body
      });

      if (m.error) throw m.error;
    }

    modal("contactModal", false);
    toast("Message sent. Open Messages to view it");
  } catch (e) {
    txt("contactMsg", e.message, true);
  }
}

async function messages() {
  if (!user) {
    modal("authModal", true);
    return;
  }

  modal("messagesModal", true);
  $("conversationList").innerHTML = "Loading…";

  try {
    const r = await db.from("conversations")
      .select("id,ticket_id,participant_ids,tickets(event_name)")
      .order("created_at", { ascending: false });

    if (r.error) throw r.error;

    const rows = (r.data || [])
      .filter(c => (c.participant_ids || []).includes(user.id))
      .map(c => ({
        ...c,
        kind: "ticket",
        title: c.tickets?.event_name || "Ticket"
      }));

    const m = await db.from("mem_conversations")
      .select("id,item_id,participant_ids,memorabilia(title)")
      .order("created_at", { ascending: false });

    if (!m.error) {
      rows.push(...(m.data || [])
        .filter(c => (c.participant_ids || []).includes(user.id))
        .map(c => ({
          ...c,
          kind: "mem",
          title: c.memorabilia?.title || "Memorabilia"
        })));
    }

    $("conversationList").innerHTML = rows.length
      ? rows.map(c =>
          `<button class="conversation-item" data-c="${c.kind}:${c.id}">${esc(c.title)}</button>`
        ).join("")
      : "No messages yet";

    $("conversationList").querySelectorAll("[data-c]").forEach(b => {
      b.onclick = () => openChat(...b.dataset.c.split(":"));
    });
  } catch (e) {
    txt("messagesMsg", e.message, true);
  }
}

async function openChat(kind, id) {
  active = { kind, id };
  $("chat").hidden = false;

  try {
    const r = await db.from(kind === "mem" ? "mem_messages" : "messages")
      .select("id,sender_id,body,created_at")
      .eq("conversation_id", id)
      .order("created_at");

    if (r.error) throw r.error;

    $("chatBody").innerHTML = (r.data || []).map(m =>
      `<div class="bubble ${m.sender_id === user.id ? "mine" : ""}">
        ${esc(m.body)}
        <small>${new Date(m.created_at).toLocaleString()}</small>
      </div>`
    ).join("") || "No messages yet";
  } catch (e) {
    txt("messagesMsg", e.message, true);
  }
}

async function reply(e) {
  e.preventDefault();
  if (!active) return;

  const r = await db.from(
    active.kind === "mem" ? "mem_messages" : "messages"
  ).insert({
    conversation_id: active.id,
    sender_id: user.id,
    body: $("replyText").value.trim()
  });

  if (r.error) {
    txt("messagesMsg", r.error.message, true);
  } else {
    $("replyText").value = "";
    openChat(active.kind, active.id);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  $("lang").onclick = () => {
    lang = lang === "en" ? "he" : "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    $("lang").textContent = lang === "he" ? "English" : "עברית";
    $("tickets").querySelector("h2").textContent =
      lang === "he" ? "כרטיסים" : "Tickets";
    $("memorabilia").querySelector("h2").textContent =
      lang === "he" ? "מזכרות" : "Memorabilia";
  };

  $("openAuth").onclick = () => {
    mode = "signin";
    update();
    modal("authModal", true);
  };

  $("switchAuth").onclick = () => {
    mode = mode === "signup" ? "signin" : "signup";
    update();
    txt("authMsg", "");
  };

  $("authForm").onsubmit = auth;

  $("signOut").onclick = async () => {
    await db.auth.signOut();
    user = null;
    update();
  };

  $("ticketForm").onsubmit = e => publish(e, "ticket");
  $("memForm").onsubmit = e => publish(e, "mem");
  $("ts").oninput = () => render("ticket");
  $("tf").onchange = () => render("ticket");
  $("ms").oninput = () => render("mem");
  $("mf").onchange = () => render("mem");
  $("contactForm").onsubmit = firstMessage;
  $("messagesOpen").onclick = messages;
  $("replyForm").onsubmit = reply;

  document.querySelectorAll("[data-close]").forEach(b => {
    b.onclick = () => modal(b.dataset.close, false);
  });

  try {
    db = window.supabase.createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const s = await db.auth.getSession();
    if (s.error) throw s.error;

    user = s.data.session?.user || null;

    db.auth.onAuthStateChange((_e, s) => {
      user = s?.user || null;
      update();
    });

    update();
    await load();
  } catch (e) {
    txt("ticketError", "Connection error: " + e.message, true);
  }
});

