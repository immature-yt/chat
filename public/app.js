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

  const KEY = "ours-who";
  let who = localStorage.getItem(KEY);
  let socket = null;

  function openChat() {
    gate.hidden = true;
    app.hidden = false;
    asLabel.textContent = who === "her" ? "Her" : "Him";
    asLabel.style.color = who === "her" ? "var(--her)" : "var(--him)";
    connect();
    input.focus();
  }

  function renderEmpty() {
    thread.innerHTML = "";
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
    thread.innerHTML = "";
    if (!messages.length) {
      renderEmpty();
      return;
    }
    messages.forEach((message) => appendMessage(message, { scroll: false }));
    thread.scrollTop = thread.scrollHeight;
  }

  function connect() {
    socket = io();

    socket.on("history", (messages) => {
      renderHistory(Array.isArray(messages) ? messages : []);
    });

    socket.on("message", (message) => {
      if (!message?.id || !message?.text) return;
      if (thread.querySelector(`[data-id="${message.id}"]`)) return;
      appendMessage(message);
    });

    socket.on("cleared", () => {
      renderEmpty();
      confirm.hidden = true;
    });
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

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || !socket || !who) return;
    socket.emit("message", { from: who, text });
    input.value = "";
    autosize();
    input.focus();
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

  confirmDelete.addEventListener("click", () => {
    if (!socket) return;
    socket.emit("clear");
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
