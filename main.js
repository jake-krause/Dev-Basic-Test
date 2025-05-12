/*****************************************************************
 *  SECURA AI Hub – main.js 
 *****************************************************************/

/* ────────────────────────────────────────────────────────────── */
/* 1. CONFIG                                                     */
/* ────────────────────────────────────────────────────────────── */
const config = {
  logoSrc  : "main_logo.jpg",
  brandName: "SECURA AI Hub",
  modelLinks: [
    { title: "GPT-4o",     href: "gpt4o.html",   color: "#F2A900" },
    { title: "Claude 3",   href: "claude3.html", color: "#3E87CB" },
    { title: "Gemini 1.5", href: "gemini15.html",color: "#007467" }
  ],
  resources: [
    { label: "Documentation",   href: "docs.html"     },
    { label: "Usage Analytics", href: "analytics.html"},
    { label: "Support",         href: "mailto:support@example.com"}
  ],
  askEndpoint: "/ask"
};

/* merge any overrides from <script id="page-config"> */
const cfgTag = document.getElementById("page-config");
if (cfgTag && cfgTag.textContent.trim()) {
  Object.assign(config, JSON.parse(cfgTag.textContent));
}



/* ────────────────────────────────────────────────────────────── */
/* 2. DOM READY BOOTSTRAP                                        */
/* ────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {

  /* ---------- 2-A  Branding ---------- */
  document.getElementById("logo").src               = config.logoSrc;
  document.querySelector(".brand-name").textContent = config.brandName;

  /* ---------- 2-B  Sidebar cards ---------- */
  const modelGrid = document.getElementById("model-grid");
  config.modelLinks.forEach(m => {
    const a = document.createElement("a");
    a.href = m.href;
    a.className = "model-card";
    a.style.setProperty("--card-accent", m.color);
    a.textContent = m.title;
    modelGrid.appendChild(a);
  });

  const resNav = document.getElementById("resources-menu");
  config.resources.forEach(r => {
    const a = document.createElement("a");
    a.href = r.href;
    a.textContent = r.label;
    resNav.appendChild(a);
  });



  /* ──────────────────────────────────────────────────────────── */
  /* 3. SIDEBAR TOGGLE + LAYOUT SYNC                             */
  /* ──────────────────────────────────────────────────────────── */
  const sidebar      = document.getElementById("sidebar");
  const sidebarBtn   = document.getElementById("sidebar-toggle");
  const chatWrap     = document.querySelector(".chat-wrap");
  const chatForm     = document.querySelector(".chat-form");

  /* down-arrow button (created once) */
  const scrollBtn = document.createElement("button");
  scrollBtn.id = "scroll-bottom-btn";
  scrollBtn.textContent = "↓";
  document.body.appendChild(scrollBtn);

  /* recompute left/width for chatForm + scrollBtn */
  function syncFixedBars() {
    const rect = chatWrap.getBoundingClientRect();
    chatForm.style.left  = `${rect.left}px`;
    chatForm.style.width = `${rect.width}px`;

    scrollBtn.style.left = `${rect.left + rect.width / 2}px`;
  }

  /* toggle handler */
  function toggleSidebar() {
    sidebar.classList.toggle("collapsed");
    /* wait for CSS transition to finish, then recalc */
    sidebar.addEventListener("transitionend", syncFixedBars, { once: true });
  }
  sidebarBtn.addEventListener("click", toggleSidebar);

  /* run on load + resize */
  syncFixedBars();
  window.addEventListener("resize", syncFixedBars);



  /* ──────────────────────────────────────────────────────────── */
  /* 4. CHAT LOGIC                                               */
  /* ──────────────────────────────────────────────────────────── */
  const chatBox = document.getElementById("chat-box");
  const input   = document.getElementById("user-input");
  const form    = document.getElementById("chat-form");

  /* 4-A  scroll-to-bottom visibility */
  scrollBtn.onclick = () => {
    chatBox.scrollTop = chatBox.scrollHeight;
    scrollBtn.style.display = "none";
  };
  chatBox.onscroll = () => {
    const nearBottom = chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 10;
    scrollBtn.style.display = nearBottom ? "none" : "flex";
  };

  /* 4-B  helpers */
  const append = (role, html="") => {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.innerHTML = html;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
  };

  async function stream(userText) {
    append("user", marked.parse(userText));
    const botDiv = append("bot", "…");

    const res = await fetch(config.askEndpoint, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ message: userText })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      botDiv.innerHTML = marked.parse(buffer);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  /* 4-C  form submit */
  form.addEventListener("submit", e => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    input.value = "";
    stream(txt);
  });
});
