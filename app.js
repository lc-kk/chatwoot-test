const API_BASE = "https://roseanne-psychogenic-affrontingly.ngrok-free.dev";

// 只给确实需要的请求用；不要用于轮询 GET
const NGROK_HEADERS = {
  "ngrok-skip-browser-warning": "true"
};

let conversationId = null;
let pollTimer = null;
let isLoadingMessages = false;
let lastRenderedSignature = "";

const POLL_INTERVAL_MS = 5000;

const conversationLabel = document.getElementById("conversationLabel");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function scheduleNextPoll(delay = POLL_INTERVAL_MS) {
  stopPolling();

  if (!conversationId || document.hidden) return;

  pollTimer = setTimeout(async () => {
    try {
      await loadMessages({ silent: true });
    } catch (err) {
      console.error("poll loadMessages error:", err);
    } finally {
      scheduleNextPoll(POLL_INTERVAL_MS);
    }
  }, delay);
}

function buildMessagesSignature(messages) {
  return JSON.stringify(
    messages.map((msg) => ({
      role: msg.role || "",
      content: msg.content || ""
    }))
  );
}

function renderMessages(messages) {
  const signature = buildMessagesSignature(messages);

  // 没变化就不重绘
  if (signature === lastRenderedSignature) {
    return;
  }

  lastRenderedSignature = signature;
  messagesEl.innerHTML = "";

  for (const msg of messages) {
    const item = document.createElement("div");
    item.className = `message ${msg.role || "unknown"}`;

    const role = document.createElement("div");
    role.className = "role";
    role.textContent = msg.role === "user" ? "Customer" : "AI";

    const content = document.createElement("div");
    content.className = "content";
    content.textContent = msg.content || "";

    item.appendChild(role);
    item.appendChild(content);
    messagesEl.appendChild(item);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function startChat() {
  stopPolling();
  conversationId = null;
  lastRenderedSignature = "";
  messagesEl.innerHTML = "";
  conversationLabel.textContent = "Starting...";

  try {
    const res = await fetch(`${API_BASE}/test-chat/start`, {
      method: "POST",
      headers: NGROK_HEADERS
    });

    console.log("startChat status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("startChat failed:", errText);
      alert("Failed to start chat.");
      conversationLabel.textContent = "Failed to start";
      return;
    }

    const data = await res.json();
    console.log("startChat data:", data);

    conversationId = data.conversation_id;
    conversationLabel.textContent = `Conversation ID: ${conversationId}`;

    await loadMessages({ silent: false });
    scheduleNextPoll();
  } catch (err) {
    console.error("startChat error:", err);
    conversationLabel.textContent = "Failed to start";
    alert("Failed to start chat.");
  }
}

async function loadMessages({ silent = false } = {}) {
  if (!conversationId) return;
  if (isLoadingMessages) return;

  isLoadingMessages = true;

  try {
    const res = await fetch(
      `${API_BASE}/test-chat/messages?conversation_id=${encodeURIComponent(conversationId)}`
      // 注意：这里不要带自定义 ngrok header，减少 OPTIONS 预检机会
    );

    if (!silent) {
      console.log("loadMessages status:", res.status);
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("loadMessages failed:", errText);
      throw new Error("Failed to load messages");
    }

    const data = await res.json();

    if (!silent) {
      console.log("loadMessages data:", data);
    }

    if (!data.messages || !Array.isArray(data.messages)) {
      console.error("Invalid messages payload:", data);
      throw new Error("Invalid messages payload");
    }

    renderMessages(data.messages);
  } finally {
    isLoadingMessages = false;
  }
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !conversationId) return;

  sendBtn.disabled = true;
  stopPolling(); // 发送期间暂停轮询，避免打架

  try {
    const sendRes = await fetch(`${API_BASE}/test-chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...NGROK_HEADERS
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: text
      })
    });

    console.log("send status:", sendRes.status);

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("send failed:", errText);
      alert("Send request failed.");
      return;
    }

    const sendData = await sendRes.json();
    console.log("send data:", sendData);

    messageInput.value = "";

    try {
      // 发完立刻刷新一次
      await loadMessages({ silent: false });
    } catch (loadErr) {
      console.error("loadMessages failed after send:", loadErr);
      alert("Message sent, but failed to refresh messages.");
    }
  } catch (err) {
    console.error("sendMessage error:", err);
    alert("Failed to send message.");
  } finally {
    sendBtn.disabled = false;
    scheduleNextPoll(3000); // 发完后 3 秒再恢复轮询
  }
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

newChatBtn.addEventListener("click", startChat);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopPolling();
  } else if (conversationId) {
    loadMessages({ silent: true })
      .catch((err) => console.error("visibility refresh error:", err))
      .finally(() => scheduleNextPoll());
  }
});

window.addEventListener("beforeunload", stopPolling);

startChat();
