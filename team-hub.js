
(() => {
  const SUPABASE_URL = "https://lhmatsjxdkgoqubuezfi.supabase.co";
  const SUPABASE_KEY = "sb_publishable_jENZfb_D2Tws5sk3bkSkQA_BDvzdknA";

  let db;
  let selectedTeam = null;

  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  function addStyles() {
    if ($("teamHubStyles")) return;

    const style = document.createElement("style");
    style.id = "teamHubStyles";
    style.textContent = `
      .th-wrap{max-width:1200px;margin:auto}
      .th-search{width:100%;padding:15px;border:1px solid #e3dfd4;background:#fffefa;margin:20px 0}
      .th-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
      .th-card{background:#fffefa;border:1px solid #e3dfd4;padding:22px;cursor:pointer;text-align:left;color:#202b30}
      .th-card:hover{border-color:#176d54;transform:translateY(-2px)}
      .th-card h3{margin:10px 0}
      .th-logo{width:58px;height:58px;object-fit:contain}
      .th-post{background:#fffefa;border:1px solid #e3dfd4;padding:20px;margin:14px 0}
      .th-post textarea,.th-post input{width:100%;padding:13px;margin:8px 0;border:1px solid #e3dfd4}
      .th-back{background:transparent;border:0;color:#176d54;padding:12px 0;font-weight:bold;cursor:pointer}
      .th-muted{color:#7a8585}
      .th-button{background:#176d54;color:white;border:0;padding:12px 18px;cursor:pointer;font-weight:bold}
      .th-error{color:#b42318}
      @media(max-width:700px){.th-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:450px){.th-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function message(id, text, error = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("th-error", error);
  }

  async function loadTeams() {
    const grid = $("teamGrid");
    if (!grid) return;

    grid.innerHTML = "<p>Loading teams...</p>";

    const { data, error } = await db
      .from("teams")
      .select("*")
      .order("name");

    if (error) {
      grid.innerHTML = "";
      message("teamMessage", "Could not load teams: " + error.message, true);
      return;
    }

    window.ticketlyTeams = data || [];
    renderTeams(window.ticketlyTeams);
  }

  function renderTeams(teams) {
    const grid = $("teamGrid");
    if (!grid) return;

    if (!teams.length) {
      grid.innerHTML = "<p>No teams have been added yet.</p>";
      return;
    }

    grid.innerHTML = teams.map(team => `
      <button class="th-card" data-team-id="${escapeHTML(team.id)}">
        ${team.logo_url
          ? `<img class="th-logo" src="${escapeHTML(team.logo_url)}" alt="">`
          : `<div class="th-logo">⚽</div>`}
        <h3>${escapeHTML(team.name)}</h3>
        <p class="th-muted">${escapeHTML(team.sport || "Football")} · ${escapeHTML(team.country || "")}</p>
        <span>View team →</span>
      </button>
    `).join("");

    grid.querySelectorAll("[data-team-id]").forEach(button => {
      button.addEventListener("click", () => {
        const team = teams.find(t => String(t.id) === button.dataset.teamId);
        if (team) openTeam(team);
      });
    });
  }

  async function openTeam(team) {
    selectedTeam = team;
    $("teamListView").hidden = true;
    $("teamDetailView").hidden = false;

    $("teamDetailTitle").textContent = team.name;
    $("teamPosts").innerHTML = "<p>Loading posts...</p>";

    const { data, error } = await db
      .from("team_posts")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false });

    if (error) {
      $("teamPosts").innerHTML = "";
      message("teamPostMessage", "Could not load posts: " + error.message, true);
      return;
    }

    renderPosts(data || []);
    updateFollowButton();
  }

  function renderPosts(posts) {
    const container = $("teamPosts");

    if (!posts.length) {
      container.innerHTML = "<p>No posts yet. Be the first to post!</p>";
      return;
    }

    container.innerHTML = posts.map(post => `
      <article class="th-post">
        <p>${escapeHTML(post.body || post.content || "")}</p>
        <small class="th-muted">${post.created_at ? new Date(post.created_at).toLocaleString() : ""}</small>
      </article>
    `).join("");
  }

  async function updateFollowButton() {
    const button = $("teamFollowButton");
    if (!button || !selectedTeam) return;

    const { data: auth } = await db.auth.getUser();
    const user = auth?.user;

    if (!user) {
      button.textContent = "Sign in to follow";
      return;
    }

    const { data, error } = await db
      .from("team_follows")
      .select("*")
      .eq("team_id", selectedTeam.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      message("teamPostMessage", error.message, true);
      return;
    }

    button.textContent = data ? "Unfollow team" : "Follow team";
  }

  async function toggleFollow() {
    if (!selectedTeam) return;

    const { data: auth } = await db.auth.getUser();
    const user = auth?.user;

    if (!user) {
      document.getElementById("openAuth")?.click();
      return;
    }

    const { data: existing, error: checkError } = await db
      .from("team_follows")
      .select("*")
      .eq("team_id", selectedTeam.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) {
      message("teamPostMessage", checkError.message, true);
      return;
    }

    let result;

    if (existing) {
      result = await db.from("team_follows").delete()
        .eq("team_id", selectedTeam.id)
        .eq("user_id", user.id);
    } else {
      result = await db.from("team_follows").insert({
        team_id: selectedTeam.id,
        user_id: user.id
      });
    }

    if (result.error) {
      message("teamPostMessage", result.error.message, true);
      return;
    }

    message("teamPostMessage", "Your follow settings have been updated.");
    updateFollowButton();
  }

  async function createPost(event) {
    event.preventDefault();

    if (!selectedTeam) return;

    const { data: auth } = await db.auth.getUser();
    const user = auth?.user;

    if (!user) {
      document.getElementById("openAuth")?.click();
      return;
    }

    const body = $("teamPostText").value.trim();
    if (!body) return;

    const { error } = await db.from("team_posts").insert({
      team_id: selectedTeam.id,
      user_id: user.id,
      body
    });

    if (error) {
      message("teamPostMessage", error.message, true);
      return;
    }

    $("teamPostText").value = "";
    message("teamPostMessage", "Post published!");
    openTeam(selectedTeam);
  }

  async function loadReviews() {
    const container = $("reviewsList");
    if (!container) return;

    container.innerHTML = "<p>Loading reviews...</p>";

    const { data, error } = await db
      .from("seller_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      container.innerHTML = "";
      message("reviewsMessage", "Could not load reviews: " + error.message, true);
      return;
    }

    if (!data?.length) {
      container.innerHTML = "<p>No seller reviews yet.</p>";
      return;
    }

    container.innerHTML = data.map(review => {
      const rating = Math.max(1, Math.min(5, Number(review.rating) || 0));
      return `
        <article class="th-post">
          <strong>${"★".repeat(rating)}${"☆".repeat(5-rating)}</strong>
          <p>${escapeHTML(review.comment || review.review || "")}</p>
          <small class="th-muted">${review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}</small>
        </article>
      `;
    }).join("");
  }

  function showTeamList() {
    selectedTeam = null;
    $("teamDetailView").hidden = true;
    $("teamListView").hidden = false;
  }

  async function start() {
    addStyles();

    if (!window.supabase?.createClient) {
      message("teamMessage", "Supabase did not load. Refresh the page and try again.", true);
      return;
    }

    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    $("teamSearch")?.addEventListener("input", event => {
      const q = event.target.value.toLowerCase();
      renderTeams((window.ticketlyTeams || []).filter(team =>
        `${team.name} ${team.sport || ""} ${team.country || ""}`.toLowerCase().includes(q)
      ));
    });

    $("teamBackButton")?.addEventListener("click", showTeamList);
    $("teamFollowButton")?.addEventListener("click", toggleFollow);
    $("teamPostForm")?.addEventListener("submit", createPost);

    await loadTeams();
    await loadReviews();
  }

  document.addEventListener("DOMContentLoaded", start);
})();
