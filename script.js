
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ticketly — Live for the Game</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script defer src="script.js"></script>
</head>
<body>

<header class="topbar">
  <a class="brand" href="#" data-page="home">
    <span class="brand-icon">✳</span>
    TICKETLY<span class="orange">.</span>
  </a>

  <nav id="mainNav">
    <button class="nav-link active" data-page="home" data-en="Home" data-he="בית">Home</button>
    <button class="nav-link" data-page="tickets" data-en="Explore" data-he="גילוי כרטיסים">Explore</button>
    <button class="nav-link" data-page="memorabilia" data-en="Memorabilia" data-he="מזכרות">Memorabilia</button>
    <button class="nav-link" data-page="sell" data-en="Sell Tickets" data-he="מכירת כרטיסים">Sell Tickets</button>
    <button class="nav-link" data-page="alerts" data-en="My Alerts" data-he="ההתראות שלי">My Alerts</button>
    <button class="nav-link" id="messagesOpen" data-en="Messages" data-he="הודעות">Messages</button>
    <button class="nav-link" id="openAuth" data-en="Profile / Sign in" data-he="פרופיל / התחברות">Profile / Sign in</button>
    <button class="nav-link" id="signOut" hidden data-en="Sign out" data-he="התנתקות">Sign out</button>
  </nav>

  <button id="lang" class="language">עברית</button>
</header>

<main>
  <!-- HOME -->
  <section id="page-home" class="page">
    <div class="hero">
      <div class="hero-copy">
        <div class="eyebrow">
          <span class="eyebrow-line"></span>
          <span data-en="FOR THE LOVE OF SPORT" data-he="בשביל אהבת הספורט">FOR THE LOVE OF SPORT</span>
        </div>

        <h1>
          <span data-en="Be there" data-he="תהיו שם">Be there</span><br>
          <span data-en="when " data-he="כשהרגע">when </span><span class="green" data-en="it" data-he="הוא">it</span><br>
          <span class="green" data-en="happens." data-he="מתרחש.">happens.</span>
        </h1>

        <p data-en="The biggest matches. The loudest crowds. Find your ticket and be part of the moment."
           data-he="המשחקים הגדולים ביותר. הקהל הכי רועש. מצאו כרטיס והיו חלק מהרגע.">
          The biggest matches. The loudest crowds. Find your ticket and be part of the moment.
        </p>

        <form id="heroSearch" class="searchbar">
          <span class="search-icon">⌕</span>
          <input id="heroQuery" placeholder="Search teams, matches or countries"
            data-en-placeholder="Search teams, matches or countries"
            data-he-placeholder="חפשו קבוצות, משחקים או מדינות">
          <button class="primary" type="submit" data-en="Find tickets →" data-he="מצאו כרטיסים ←">Find tickets →</button>
        </form>

        <div class="trust">
          <span>✳</span>
          <span data-en="Football and sports tickets from fellow fans"
            data-he="כרטיסי כדורגל וספורט מאוהדים אחרים">Football and sports tickets from fellow fans</span>
        </div>

        <button class="primary explore-button" data-page="tickets" data-en="Explore tickets" data-he="לגלות כרטיסים">Explore tickets</button>
      </div>

      <div class="poster-area">
        <article class="poster poster-green">
          <small>FOOTBALL · LIVE</small>
          <div class="poster-circle"></div>
          <div class="poster-content">
            <span class="trophy">⚽</span>
            <strong data-en="GAME<br>DAY." data-he="יום<br>משחק.">GAME<br>DAY.</strong>
          </div>
          <small class="poster-bottom" data-en="FEEL EVERY SECOND." data-he="להרגיש כל שנייה.">FEEL EVERY SECOND.</small>
        </article>

        <article class="poster poster-orange">
          <small>YOUR NEXT / 01</small>
          <div class="poster-circle"></div>
          <div class="poster-content">
            <strong>
              <span data-en="YOUR NEXT" data-he="הרגע">YOUR NEXT</span><br>
              <span class="light" data-en="moment." data-he="הבא.">moment.</span>
            </strong>
          </div>
          <div class="stamp">LIVE<br>SPORT</div>
          <small class="poster-bottom" data-en="FIND IT HERE →" data-he="מצאו אותו כאן ←">FIND IT HERE →</small>
        </article>

        <div class="poster-caption">
          <span data-en="Every match has a story." data-he="לכל משחק יש סיפור.">Every match has a story.</span>
          <span class="worldwide">TICKETLY / 01</span>
        </div>
      </div>
    </div>

    <div class="ticker">
      <span>FOOTBALL</span> ✳ <span>BASKETBALL</span> ✳
      <span>TENNIS</span> ✳ <span>SPORTS FANS</span> ✳
      <span>FOOTBALL</span> ✳ <span>LIVE MATCHES</span>
    </div>

    <div class="home-bottom">
      <div>
        <div class="eyebrow"><span class="eyebrow-line"></span><span data-en="YOUR NEXT EXPERIENCE" data-he="החוויה הבאה שלכם">YOUR NEXT EXPERIENCE</span></div>
        <h2 data-en="Find your <span class='green'>moment.</span>" data-he="מצאו את <span class='green'>הרגע שלכם.</span>">Find your <span class="green">moment.</span></h2>
        <p data-en="Find sports tickets or discover something special for your collection."
           data-he="מצאו כרטיסי ספורט או פריט מיוחד לאוסף שלכם.">Find sports tickets or discover something special for your collection.</p>
      </div>
      <div class="home-actions">
        <button class="primary" data-page="tickets" data-en="Explore tickets →" data-he="לכרטיסים ←">Explore tickets →</button>
        <button class="secondary" data-page="memorabilia" data-en="Explore memorabilia →" data-he="למזכרות ←">Explore memorabilia →</button>
      </div>
    </div>
  </section>

  <!-- SPORTS TICKETS -->
  <section id="page-tickets" class="page" hidden>
    <div class="page-heading">
      <div class="eyebrow"><span class="eyebrow-line"></span><span data-en="FIND YOUR NEXT MATCH" data-he="מצאו את המשחק הבא שלכם">FIND YOUR NEXT MATCH</span></div>
      <h1 data-en="Sports <span class='green'>tickets.</span>" data-he="כרטיסי <span class='green'>ספורט.</span>">Sports <span class="green">tickets.</span></h1>
      <p data-en="Football and sports tickets listed by fans." data-he="כרטיסי כדורגל וספורט שמפורסמים על ידי אוהדים.">Football and sports tickets listed by fans.</p>
    </div>

    <div class="filters">
      <input id="ts" type="search" placeholder="Search teams, matches or countries"
        data-en-placeholder="Search teams, matches or countries"
        data-he-placeholder="חיפוש קבוצות, משחקים או מדינות">
      <select id="tf">
        <option value="All" data-en="All sports" data-he="כל ענפי הספורט">All sports</option>
        <option value="Football" data-en="Football" data-he="כדורגל">Football</option>
        <option value="Basketball" data-en="Basketball" data-he="כדורסל">Basketball</option>
        <option value="Tennis" data-en="Tennis" data-he="טניס">Tennis</option>
        <option value="Other" data-en="Other sports" data-he="ענפי ספורט אחרים">Other sports</option>
      </select>
    </div>

    <p id="ticketError" class="error"></p>
    <div id="ticketGrid" class="grid"></div>
  </section>

  <!-- MEMORABILIA -->
  <section id="page-memorabilia" class="page" hidden>
    <div class="page-heading">
      <div class="eyebrow"><span class="eyebrow-line"></span><span data-en="FOR THE COLLECTORS" data-he="לאספנים">FOR THE COLLECTORS</span></div>
      <h1 data-en="Sporting <span class='green'>memorabilia.</span>" data-he="מזכרות <span class='green'>ספורט.</span>">Sporting <span class="green">memorabilia.</span></h1>
      <p data-en="Signed shirts, match-worn kits, boots and collectibles from the world of sport."
         data-he="חולצות חתומות, מדי משחק, נעליים ופריטי אספנות מעולם הספורט.">
        Signed shirts, match-worn kits, boots and collectibles from the world of sport.
      </p>
      <button class="primary" data-page="sell" data-en="Sell memorabilia →" data-he="מכירת מזכרות ←">Sell memorabilia →</button>
    </div>

    <div class="filters">
      <input id="ms" type="search" placeholder="Search memorabilia..."
        data-en-placeholder="Search memorabilia..." data-he-placeholder="חיפוש מזכרות...">
      <select id="mf">
        <option value="All" data-en="All items" data-he="כל הפריטים">All items</option>
        <option value="Match-worn shirt" data-en="Match-worn shirts" data-he="חולצות ממשחקים">Match-worn shirts</option>
        <option value="Signed item" data-en="Signed items" data-he="פריטים חתומים">Signed items</option>
        <option value="Boots" data-en="Football boots" data-he="נעלי כדורגל">Football boots</option>
        <option value="Other" data-en="Other collectibles" data-he="פריטי אספנות אחרים">Other collectibles</option>
      </select>
    </div>

    <p id="memError" class="error"></p>
    <div id="memGrid" class="grid"></div>
  </section>

  <!-- SELL -->
  <section id="page-sell" class="page" hidden>
    <div class="page-heading">
      <div class="eyebrow"><span class="eyebrow-line"></span><span data-en="SELL TO FELLOW FANS" data-he="מכרו לאוהדים אחרים">SELL TO FELLOW FANS</span></div>
      <h1 data-en="List your <span class='green'>item.</span>" data-he="פרסמו את <span class='green'>הפריט שלכם.</span>">List your <span class="green">item.</span></h1>
      <p data-en="Choose whether you want to sell a sports ticket or memorabilia."
         data-he="בחרו אם למכור כרטיס ספורט או מזכרת.">Choose whether you want to sell a sports ticket or memorabilia.</p>
    </div>

    <div class="sell-tabs">
      <button class="primary" data-sell-tab="ticket" data-en="Sports ticket" data-he="כרטיס ספורט">Sports ticket</button>
      <button class="secondary" data-sell-tab="mem" data-en="Memorabilia" data-he="מזכרות">Memorabilia</button>
    </div>

    <div class="forms">
      <form id="ticketForm" class="panel">
        <h2 data-en="Sell a sports ticket" data-he="מכירת כרטיס ספורט">Sell a sports ticket</h2>

        <label><span data-en="Match or event name" data-he="שם המשחק או האירוע">Match or event name</span>
          <input id="eventName" required maxlength="120">
        </label>

        <div class="two">
          <label><span data-en="Sport" data-he="ענף ספורט">Sport</span>
            <select id="eventCategory">
              <option value="Football">Football / כדורגל</option>
              <option value="Basketball">Basketball / כדורסל</option>
              <option value="Tennis">Tennis / טניס</option>
              <option value="Other">Other sports / ענפי ספורט אחרים</option>
            </select>
          </label>
          <label><span data-en="Country" data-he="מדינה">Country</span><input id="eventCountry" required></label>
        </div>

        <div class="two">
          <label><span data-en="Match date" data-he="תאריך המשחק">Match date</span><input id="eventDate" type="date" required></label>
          <label><span data-en="Price (€)" data-he="מחיר (€)">Price (€)</span><input id="ticketPrice" type="number" min="0.01" step="0.01" required></label>
        </div>

        <label><span data-en="Details" data-he="פרטים">Details</span><textarea id="ticketDescription" maxlength="1000"></textarea></label>
        <label><span data-en="Photo (optional)" data-he="תמונה (לא חובה)">Photo (optional)</span><input id="ticketPhoto" type="file" accept="image/*"></label>

        <button class="primary full" id="ticketSubmit" type="submit" data-en="Publish ticket" data-he="פרסום כרטיס">Publish ticket</button>
        <p id="ticketMsg"></p>
      </form>

      <form id="memForm" class="panel" hidden>
        <h2 data-en="Sell memorabilia" data-he="מכירת מזכרות">Sell memorabilia</h2>

        <label><span data-en="Item name" data-he="שם הפריט">Item name</span><input id="memTitle" required maxlength="120"></label>

        <div class="two">
          <label><span data-en="Item type" data-he="סוג הפריט">Item type</span>
            <select id="memCategory">
              <option value="Match-worn shirt">Match-worn shirt / חולצת משחק</option>
              <option value="Signed item">Signed item / פריט חתום</option>
              <option value="Boots">Boots / נעליים</option>
              <option value="Other">Other / אחר</option>
            </select>
          </label>
          <label><span data-en="Country" data-he="מדינה">Country</span><input id="memCountry" required></label>
        </div>

        <label><span data-en="Price (€)" data-he="מחיר (€)">Price (€)</span><input id="memPrice" type="number" min="0.01" step="0.01" required></label>
        <label><span data-en="Details" data-he="פרטים">Details</span><textarea id="memDescription" maxlength="1000"></textarea></label>
        <label><span data-en="Photo (optional)" data-he="תמונה (לא חובה)">Photo (optional)</span><input id="memPhoto" type="file" accept="image/*"></label>

        <button class="primary full" id="memSubmit" type="submit" data-en="Publish item" data-he="פרסום פריט">Publish item</button>
        <p id="memMsg"></p>
      </form>
    </div>
  </section>

  <!-- ALERTS -->
  <section id="page-alerts" class="page" hidden>
    <div class="page-heading">
      <div class="eyebrow"><span class="eyebrow-line"></span><span data-en="FOLLOW YOUR TEAM" data-he="עקבו אחרי הקבוצה שלכם">FOLLOW YOUR TEAM</span></div>
      <h1 data-en="Your team. Your <span class='green'>alerts.</span>" data-he="הקבוצה שלכם. <span class='green'>ההתראות שלכם.</span>">Your team. Your <span class="green">alerts.</span></h1>
      <p data-en="Choose the teams you want to follow. Email notifications will be added later."
         data-he="בחרו את הקבוצות שתרצו לעקוב אחריהן. התראות באימייל יתווספו בהמשך.">
        Choose the teams you want to follow. Email notifications will be added later.
      </p>
    </div>

    <form id="alertsForm" class="panel alerts-panel">
      <label><span data-en="Your email address" data-he="כתובת האימייל שלכם">Your email address</span>
        <input id="alertEmail" type="email" placeholder="you@example.com" required>
      </label>
      <h3 data-en="Choose your teams" data-he="בחרו את הקבוצות שלכם">Choose your teams</h3>
      <div class="team-grid">
        <label><input type="checkbox" name="teams" value="Arsenal"> Arsenal</label>
        <label><input type="checkbox" name="teams" value="Chelsea"> Chelsea</label>
        <label><input type="checkbox" name="teams" value="Liverpool"> Liverpool</label>
        <label><input type="checkbox" name="teams" value="Manchester United"> Manchester United</label>
        <label><input type="checkbox" name="teams" value="Manchester City"> Manchester City</label>
        <label><input type="checkbox" name="teams" value="Real Madrid"> Real Madrid</label>
        <label><input type="checkbox" name="teams" value="Barcelona"> Barcelona</label>
        <label><input type="checkbox" name="teams" value="Other"> Other teams</label>
      </div>
      <button class="primary" type="submit" data-en="Save preferences" data-he="שמירת העדפות">Save preferences</button>
      <p id="alertsMsg"></p>
      <p class="muted" data-en="Email alerts are not active yet. Your preferences are saved in this browser for now."
         data-he="התראות באימייל עדיין אינן פעילות. כרגע ההעדפות נשמרות בדפדפן הזה.">
        Email alerts are not active yet. Your preferences are saved in this browser for now.
      </p>
    </form>
  </section>
</main>

<footer>
  <a class="brand" href="#" data-page="home">TICKETLY<span class="orange">.</span></a>
  <span data-en="Made for sports fans, everywhere." data-he="נוצר עבור אוהדי ספורט, בכל מקום.">Made for sports fans, everywhere.</span>
</footer>

<!-- SIGN IN / SIGN UP -->
<div class="modal" id="authModal" hidden>
  <div class="dialog">
    <button class="x" type="button" data-close="authModal">×</button>
    <h2 id="authTitle">Sign in</h2>
    <form id="authForm">
      <label><span data-en="Email" data-he="אימייל">Email</span><input id="email" type="email" required></label>
      <label><span data-en="Password" data-he="סיסמה">Password</span><input id="password" type="password" minlength="6" required></label>
      <button class="primary full" id="authSubmit" type="submit">Sign in</button>
    </form>
    <button id="switchAuth" class="text-button" type="button">Need an account? Sign up</button>
    <p id="authMsg"></p>
  </div>
</div>

<!-- SELLER CONTACT -->
<div class="modal" id="contactModal" hidden>
  <div class="dialog">
    <button class="x" type="button" data-close="contactModal">×</button>
    <h2 id="contactTitle">Message seller</h2>
    <form id="contactForm">
      <textarea id="firstMessage" required maxlength="2000" placeholder="Write a message"></textarea>
      <button class="primary full" type="submit" data-en="Send message" data-he="שליחת הודעה">Send message</button>
    </form>
    <p id="contactMsg"></p>
  </div>
</div>

<!-- INBOX -->
<div class="modal" id="messagesModal" hidden>
  <div class="dialog wide">
    <button class="x" type="button" data-close="messagesModal">×</button>
    <h2 data-en="Messages" data-he="הודעות">Messages</h2>
    <div id="conversationList"></div>
    <div id="chat" hidden>
      <div id="chatBody"></div>
      <form id="replyForm">
        <input id="replyText" required maxlength="2000" placeholder="Write a reply">
        <button class="primary" type="submit" data-en="Send" data-he="שליחה">Send</button>
      </form>
    </div>
    <p id="messagesMsg"></p>
  </div>
</div>

<div id="toast" hidden></div>

<script>
(() => {
  let language = "en";

  function setLanguage(next) {
    language = next;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "he" ? "rtl" : "ltr";

    document.querySelectorAll("[data-en][data-he]").forEach(el => {
      el.innerHTML = el.dataset[next];
    });

    document.querySelectorAll("[data-en-placeholder][data-he-placeholder]").forEach(el => {
      el.placeholder = el.dataset[next + "Placeholder"];
    });

    document.getElementById("lang").textContent =
      next === "he" ? "English" : "עברית";
  }

  document.getElementById("lang").addEventListener("click", () => {
    setLanguage(language === "en" ? "he" : "en");
    window.ticketlyLanguage = language;
  });

  window.ticketlySetLanguage = setLanguage;
  window.ticketlyLanguage = language;
})();
</script>
</body>
</html>
