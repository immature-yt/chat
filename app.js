(() => {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  const thread = document.getElementById("thread");
  const asLabel = document.getElementById("as-label");
  const composer = document.getElementById("composer");
  const input = document.getElementById("message-input");
  const clearBtn = document.getElementById("clear-btn");
  const confirm = document.getElementById("confirm");
  const confirmCancel = document.getElementById("confirm-cancel");
  const confirmDelete = document.getElementById("confirm-delete");
  const sendBtn = composer.querySelector(".send-btn");

  const KEY = "ours-who";
  const POLL_MS = 2000;
  let who = localStorage.getItem(KEY);
  let pollTimer = null;
  let knownIds = new Set();
  let sending = false;

  function openChat() {
    gate.hidden = true;
    app.hidden = false;
    asLabel.textContent = who === "her" ? "Her" : "Him";
    asLabel.style.color = who === "her" ? "var(--her)" : "var(--him)";
    startPolling();
    input.focus();
  }

  function renderEmpty() {
    thread.innerHTML = "";
    knownIds = new Set();
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nothing here yet. Say hi.";
    thread.appendChild(empty);
  }

  function formatTime(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return "";
    }
  }

  function appendMessage(message, { scroll = true } = {}) {
    if (!message?.id || knownIds.has(message.id)) return;
    knownIds.add(message.id);

    const empty = thread.querySelector(".empty");
    if (empty) empty.remove();

    const el = document.createElement("article");
    el.className = `msg ${message.from}`;
    el.dataset.id = message.id;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span>${message.from === "her" ? "Her" : "Him"}</span><span>${formatTime(message.at)}</span>`;

    const body = document.createElement("div");
    body.className = "body";
    body.textContent = message.text;

    el.append(meta, body);
    thread.appendChild(el);

    if (scroll) {
      thread.scrollTop = thread.scrollHeight;
    }
  }

  function renderHistory(messages) {
    const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
    const existing = new Set(knownIds);
    const incoming = Array.isArray(messages) ? messages : [];

    if (!incoming.length) {
      if (knownIds.size) renderEmpty();
      else if (!thread.querySelector(".empty")) renderEmpty();
      return;
    }

    const incomingIds = new Set(incoming.map((m) => m.id));
    const wiped = [...existing].some((id) => !incomingIds.has(id));

    if (wiped || existing.size === 0) {
      thread.innerHTML = "";
      knownIds = new Set();
      incoming.forEach((message) => appendMessage(message, { scroll: false }));
      thread.scrollTop = thread.scrollHeight;
      return;
    }

    incoming.forEach((message) => {
      if (!knownIds.has(message.id)) {
        appendMessage(message, { scroll: nearBottom });
      }
    });
  }

  async function fetchMessages() {
    const res = await fetch("/api/messages");
    if (!res.ok) throw new Error("Failed to load messages");
    return res.json();
  }

  async function refresh() {
    try {
      const messages = await fetchMessages();
      renderHistory(messages);
    } catch (error) {
      console.error(error);
    }
  }

  function startPolling() {
    refresh();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refresh, POLL_MS);
  }

  function autosize() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }

  document.querySelectorAll(".who-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      who = btn.dataset.who;
      localStorage.setItem(KEY, who);
      openChat();
    });
  });

  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || !who || sending) return;

    sending = true;
    sendBtn.disabled = true;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: who, text }),
      });
      if (!res.ok) throw new Error("Failed to send");
      const message = await res.json();
      appendMessage(message);
      input.value = "";
      autosize();
    } catch (error) {
      console.error(error);
      alert("Couldn’t send. Try again.");
    } finally {
      sending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });

  input.addEventListener("input", autosize);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  clearBtn.addEventListener("click", () => {
    confirm.hidden = false;
  });

  confirmCancel.addEventListener("click", () => {
    confirm.hidden = true;
  });

  confirm.addEventListener("click", (event) => {
    if (event.target === confirm) confirm.hidden = true;
  });

  confirmDelete.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/messages", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear");
      renderEmpty();
      confirm.hidden = true;
    } catch (error) {
      console.error(error);
      alert("Couldn’t delete chats. Try again.");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !confirm.hidden) {
      confirm.hidden = true;
    }
  });

  if (who === "him" || who === "her") {
    openChat();
  }
})();
