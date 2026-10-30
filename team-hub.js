
(() => {
"use strict";

const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

let db = null;
let teams = [];
let selectedSport = "Football";
let selectedTeam = null;
let signedInUser = null;

function getDB() {
  if (!db) {
    if (!window.supabase?.createClient) throw new Error("Supabase did not load.");
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return db;
}

function currentUser() {
  return getDB().auth.getUser().then(({data}) => data.user || null);
}

function message(container, text) {
  container.innerHTML = `<p class="th-empty">${esc(text)}</p>`;
}

function showPage(id) {
  const pages = ["home","tickets","memorabilia","sell","alerts","teamHub","reviews"];
  pages.forEach(page => {
    const element = $(page);
    if (element) element.hidden = page !== id;
  });

  document.querySelectorAll("[data-page],[data-th]").forEach(button => {
    button.classList.toggle("active",
      button.dataset.page === id || button.dataset.th === id);
  });

  if (id === "home" && $("ticker")) $("ticker").hidden = false;
  else if ($("ticker")) $("ticker").hidden = true;

  window.scrollTo({top:0,behavior:"smooth"});

  if (id === "teamHub") loadTeams();
  if (id === "reviews") loadReviews();
}

const styles = document.createElement("style");
styles.textContent = `
.th-tabs,.th-row{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}
.th-tabs button,.th-btn{padding:12px 18px;border:1px solid #e3dfd4;background:#fffefa;color:#176d54;font-weight:700;cursor:pointer}
.th-tabs button.on,.th-btn.on,.th-primary{background:#176d54;color:white}
.th-search{padding:14px;width:min(100%,450px);border:1px solid #e3dfd4;background:#fffefa}
.th-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:15px;margin:24px 0}
.th-team{display:flex;align-items:center;gap:14px;text-align:left;padding:18px;background:#fffefa;border:1px solid #e3dfd4;cursor:pointer;color:#202b30}
.th-team img{width:52px;height:52px;object-fit:contain}
.th-panel{background:#fffefa;border:1px solid #e3dfd4;padding:24px;margin:22px 0}
.th-panel textarea{width:100%;min-height:90px;padding:13px;border:1px solid #e3dfd4;margin:12px 0}
.th-post,.th-review{padding:16px 0;border-bottom:1px solid #e3dfd4}
.th-muted,.th-post small{color:#78827e}
.th-primary{border:0;padding:13px 20px;cursor:pointer}
.th-empty{padding:20px;background:#fffefa;color:#78827e}
.th-logo{width:64px;height:64px;object-fit:contain}
.th-profile{margin-top:25px;padding-top:20px;border-top:1px solid #e3dfd4}
@media(max-width:650px){.th-grid{grid-template-columns:1fr}}
`;
document.head.append(styles);

async function loadTeams() {
  const target = $("teamHubContent");
  target.innerHTML = `
    <div class="th-tabs">
      <button class="on" data-sport="Football">⚽ Football</button>
      <button data-sport="Basketball">🏀 Basketball</button>
    </div>
    <input id="thSearch" class="th-search" placeholder="Search clubs...">
    <div id="thTeams" class="th-grid"></div>
    <div id="thTeamDetail"></div>
  `;

  target.querySelectorAll("[data-sport]").forEach(button => {
    button.addEventListener("click", () => {
      selectedSport = button.dataset.sport;
      target.querySelectorAll("[data-sport]").forEach(b =>
        b.classList.toggle("on", b === button));
      renderTeams();
    });
  });

  $("thSearch").addEventListener("input", renderTeams);

  try {
    const {data,error} = await getDB().from("teams")
      .select("*").order("name");
    if (error) throw error;
    teams = data || [];
    renderTeams();
  } catch (error) {
    message($("thTeams"),"Could not load clubs: " + error.message);
  }
}

function renderTeams() {
  const search = $("thSearch").value.toLowerCase();
  const rows = teams.filter(team =>
    team.sport === selectedSport &&
    `${team.name} ${team.league || ""}`.toLowerCase().includes(search)
  );

  $("thTeams").innerHTML = rows.length ? rows.map(team => `
    <button class="th-team" data-team="${esc(team.id)}">
      ${team.logo_url
        ? `<img src="${esc(team.logo_url)}" alt="${esc(team.name)} logo">`
        : `<span style="font-size:35px">⚽</span>`}
      <span><b>${esc(team.name)}</b><br>
      <small class="th-muted">${esc(team.league || selectedSport)}</small></span>
    </button>
  `).join("") : `<p class="th-empty">No clubs have been added to this category yet.</p>`;

  $("thTeams").querySelectorAll("[data-team]").forEach(button => {
    button.addEventListener("click", () => openTeam(button.dataset.team));
  });
}

async function openTeam(id) {
  selectedTeam = teams.find(team => String(team.id) === String(id));
  if (!selectedTeam) return;

  const box = $("thTeamDetail");
  box.innerHTML = `
    <div class="th-panel">
      <div class="th-row">
        ${selectedTeam.logo_url
          ? `<img class="th-logo" src="${esc(selectedTeam.logo_url)}" alt="">`
          : "⚽"}
        <div><h2>${esc(selectedTeam.name)}</h2>
        <p class="th-muted">${esc(selectedTeam.league || "")}</p></div>
      </div>
      <button id="thFollow" class="th-btn">Loading follow status...</button>
      <h3>Fan posts</h3>
      <form id="thPost">
        <textarea id="thBody" maxlength="1500" required placeholder="Write an update about ${esc(selectedTeam.name)}..."></textarea>
        <button class="th-primary">Publish post</button>
      </form>
      <div id="thPosts">Loading posts...</div>
    </div>
  `;

  try {
    const client = getDB();
    signedInUser = await currentUser();

    const {data: follows,error: followError} = await client
      .from("team_follows").select("user_id")
      .eq("team_id",selectedTeam.id);

    if (followError) throw followError;

    let following = (follows || []).some(row =>
      row.user_id === signedInUser?.id);

    const followButton = $("thFollow");
    followButton.textContent = following ? "Following ✓" : "Follow team";

    followButton.onclick = async () => {
      if (!signedInUser) return alert("Please sign in first.");
      const result = following
        ? await client.from("team_follows").delete()
            .eq("team_id",selectedTeam.id).eq("user_id",signedInUser.id)
        : await client.from("team_follows").insert({
            team_id:selectedTeam.id,user_id:signedInUser.id
          });

      if (result.error) return alert(result.error.message);
      following = !following;
      followButton.textContent = following ? "Following ✓" : "Follow team";
    };

    $("thPost").onsubmit = async event => {
      event.preventDefault();
      if (!signedInUser) return alert("Please sign in first.");
      const body = $("thBody").value.trim();
      if (!body) return;

      const {error} = await client.from("team_posts").insert({
        team_id:selectedTeam.id,
        user_id:signedInUser.id,
        body
      });

      if (error) return alert(error.message);
      $("thBody").value = "";
      await loadPosts();
    };

    async function loadPosts() {
      const {data,error} = await client.from("team_posts")
        .select("body,created_at")
        .eq("team_id",selectedTeam.id)
        .order("created_at",{ascending:false}).limit(50);

      if (error) return message($("thPosts"),error.message);

      $("thPosts").innerHTML = data?.length ? data.map(post => `
        <article class="th-post">
          <p>${esc(post.body)}</p>
          <small>${esc(new Date(post.created_at).toLocaleString())}</small>
        </article>
      `).join("") : `<p class="th-empty">No posts yet. Start the conversation!</p>`;
    }

    await loadPosts();
  } catch (error) {
    message(box,error.message);
  }
}

async function loadReviews() {
  const target = $("reviewsContent");
  target.innerHTML = "Loading reviews...";

  try {
    const {data,error} = await getDB().from("seller_reviews")
      .select("rating,review,created_at")
      .order("created_at",{ascending:false}).limit(100);

    if (error) throw error;

    target.innerHTML = data?.length ? data.map(review => `
      <article class="th-review">
        <b style="color:#c58a26">${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}</b>
        <p>${esc(review.review || "")}</p>
        <small class="th-muted">${esc(new Date(review.created_at).toLocaleDateString())}</small>
      </article>
    `).join("") : `<p class="th-empty">No reviews yet.</p>`;
  } catch (error) {
    message(target,"Could not load reviews: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-th]").forEach(button => {
    button.addEventListener("click",() => showPage(button.dataset.th));
  });

  // Keep the original marketplace navigation working.
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click",() => showPage(button.dataset.page));
  });
});
})();
