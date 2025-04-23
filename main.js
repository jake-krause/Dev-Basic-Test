

/*====================== DEFAULT CONFIG ======================*/
const config = {
    logoSrc: "main_logo.png",                    // fallback logo if JSON not supplied
    brandName: "SECURA AI Hub",            // fallback brand name
    modelLinks: [                            // fallback popular models
      { title: "GPT‑4o",    href: "gpt4o.html",    color: "#F2A900" },
      { title: "Claude 3",  href: "claude3.html",  color: "#3E87CB" },
      { title: "Gemini 1.5", href: "gemini15.html", color: "#007467" }
    ],
    // NEW block ↓ — feel free to replace or expand
    extras: [
        {
        title:"Prompting Guide",
        href :"prompting.html",
        desc :"Quick tips for crafting effective prompts."
        },
        {
        title:"Reasoning vs Retrieval",
        href :"reasoning.html",
        desc :"Why o3‑style reasoning models behave differently from pure knowledge models."
        },
        {
        title:"AI Glossary",
        href :"glossary.html",
        desc :"Plain‑English definitions of common AI terms."
        }
    ],

    resources:[
        { label:"Documentation",   href:"docs.html" },
        { label:"Usage Analytics", href:"analytics.html" },
        { label:"Support",         href:"mailto:support@example.com" }
    ],
    askEndpoint:"/ask"
    };

  /*===========================================================*/
  /* =================================================================
   BRANDING COLOR PALETTE  —  REFERENCE ONLY (matches styles.css)
   -------------------------------------------------------------
     --yellow : #F2A900   // Primary accent & top‑bar background
     --grey   : #414042   // Dark text / button background
     --blue   : #3E87CB   // Secondary accent (bot bubbles, links)
     --red    : #CB333B   // Error / warning accent
     --teal   : #007467   // Additional accent option
     --lime   : #31B700   // Success accent option
   ================================================================= */
  // ─── Override defaults with JSON from <script id="page-config"> if present ──
  const cfgTag = document.getElementById("page-config");
  if (cfgTag) {
    try {
      const userCfg = JSON.parse(cfgTag.textContent);
      Object.assign(config, userCfg);
    } catch (err) {
      console.warn("Invalid JSON in page-config script:", err);
    }
  }
  
  // ─── UI bootstrapping ─────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    /* ---------- Inject extra CSS so we don't need to touch styles.css ---------- */
    const extraCSS = `
      .chat-demo { max-height: 70vh; }
      #chat-box   { flex: 1 1 auto; max-height: 60vh; overflow-y: auto; padding-right: .5rem; }
      .msg        { max-width: 70%; }
      .msg.user   { align-self: flex-end; margin-left: auto; }
      .msg.bot    { align-self: flex-start; margin-right: auto; }
      #scroll-bottom-btn {
        position: absolute;
        right: 1rem;
        bottom: 4rem; /* just above form */
        background: var(--blue);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: none;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
    `;
    const styleEl = document.createElement("style");
    styleEl.innerHTML = extraCSS;
    document.head.appendChild(styleEl);
  
    /* ---------- Branding ---------- */
    const logoEl  = document.getElementById("logo");
    if (logoEl) logoEl.src = config.logoSrc;
    const brandEl = document.querySelector(".brand-name");
    if (brandEl) brandEl.textContent = config.brandName;
  
    /* ---------- Model cards ---------- */
    const grid = document.getElementById("model-grid");
    if (grid) {
      config.modelLinks.forEach((m) => {
        const a = document.createElement("a");
        a.href = m.href;
        a.className = "model-card";
        a.style.setProperty("--card-accent", m.color);
        a.textContent = m.title;
        grid.appendChild(a);
      });
    }
  /* ---------- Extras / Resources cards ---------- */
const extrasWrap = document.getElementById("extras-section");
const extrasGrid = document.getElementById("extras-grid");

if (extrasWrap && extrasGrid) {
  if (config.extras && config.extras.length) {
    config.extras.forEach(x => {
      const card = document.createElement("a");
      card.className = "extras-card";
      card.href      = x.href;
      card.innerHTML = `<h3>${x.title}</h3><p>${x.desc || ""}</p>`;
      extrasGrid.appendChild(card);
    });
  } else {
    // hide section entirely if no entries
    extrasWrap.style.display = "none";
  }
}

    /* ---------- Resources dropdown ---------- */
    const resMenu = document.getElementById("resources-menu");
    if (resMenu) {
      config.resources.forEach((r) => {
        const link = document.createElement("a");
        link.href = r.href;
        link.textContent = r.label;
        resMenu.appendChild(link);
      });
    }
  
    /* ---------- Chat logic ---------- */
    const chatBox = document.getElementById("chat-box");
    const form    = document.getElementById("chat-form");
    const input   = document.getElementById("user-input");
  
    if (!form) return; // if page doesn’t include chat elements
  
    // Create scroll‑to‑bottom button
    const scrollBtn = document.createElement("button");
    scrollBtn.id = "scroll-bottom-btn";
    scrollBtn.innerHTML = "↓";
    form.parentElement.appendChild(scrollBtn);
  
    scrollBtn.addEventListener("click", () => {
      chatBox.scrollTop = chatBox.scrollHeight;
      scrollBtn.style.display = "none";
    });
  
    function toggleScrollBtn() {
      const nearBottom = chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 20;
      scrollBtn.style.display = nearBottom ? "none" : "flex";
    }
  
    chatBox.addEventListener("scroll", toggleScrollBtn);
  
    function appendMessage(role, text = "") {
      const div = document.createElement("div");
      div.className = `msg ${role}`;
      div.textContent = text;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
      toggleScrollBtn();
      return div; // handle for streaming updates
    }
  
    async function streamMessage(userText) {
      appendMessage("user", userText);
      const botDiv = appendMessage("bot", "...");
  
      try {
        const res = await fetch(config.askEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userText })
        });
  
        if (!res.ok || !res.body) {
          botDiv.textContent = `[Error] ${res.statusText}`;
          toggleScrollBtn();
          return;
        }
  
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = "";
  
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          botDiv.textContent = buffer;
          chatBox.scrollTop  = chatBox.scrollHeight;
          toggleScrollBtn();
        }
  
      } catch (err) {
        botDiv.textContent = `Error: ${err.message}`;
        toggleScrollBtn();
      }
    }
  
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      streamMessage(text);
    });
  });
  