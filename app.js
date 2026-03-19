const API_BASE = "https://roseanne-psychogenic-affrontingly.ngrok-free.dev";
const NGROK_HEADERS = {
  "ngrok-skip-browser-warning": "true"
};

let conversationId = null;
let pollTimer = null;
let isLoadingMessages = false;
let isSending = false;
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
      await loadMessages(true);
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

function appendMessage(roleText, contentText, cssRole = "user", pending = false) {
  const item = document.createElement("div");
  item.className = `message ${cssRole}${pending ? " pending" : ""}`;

  const role = document.createElement("div");
  role.className = "role";
  role.textContent = roleText;

  const content = document.createElement("div");
  content.className = "content";
  content.textContent = contentText;

  item.appendChild(role);
  item.appendChild(content);
  messagesEl.appendChild(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return item;
}

function renderMessages(messages) {
  const signature = buildMessagesSignature(messages);
  if (signature === lastRenderedSignature) return;

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

    await loadMessages(false);
    scheduleNextPoll();
  } catch (err) {
    console.error("startChat error:", err);
    conversationLabel.textContent = "Failed to start";
    alert("Failed to start chat.");
  }
}

async function loadMessages(silent = false) {
  if (!conversationId || isLoadingMessages) return;

  isLoadingMessages = true;

  try {
    const res = await fetch(
      `${API_BASE}/test-chat/messages?conversation_id=${encodeURIComponent(conversationId)}`,
      {
        headers: NGROK_HEADERS
      }
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

  if (!text || !conversationId || isSending) return;

  isSending = true;
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";
  messageInput.disabled = true;
  stopPolling();

  const currentText = text;
  messageInput.value = "";

  // 先把用户消息显示出来，避免用户以为没发出去
  const pendingNode = appendMessage("Customer", currentText, "user", true);

  try {
    const sendRes = await fetch(`${API_BASE}/test-chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...NGROK_HEADERS
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: currentText
      })
    });

    console.log("send status:", sendRes.status);

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("send failed:", errText);

      pendingNode.remove();
      messageInput.value = currentText;
      alert("Send request failed.");
      return;
    }

    const sendData = await sendRes.json();
    console.log("send data:", sendData);

    await loadMessages(false);
  } catch (err) {
    console.error("sendMessage error:", err);

    pendingNode.remove();
    messageInput.value = currentText;
    alert("Failed to send message.");
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
    messageInput.disabled = false;
    messageInput.focus();
    scheduleNextPoll(3000);
  }
}

sendBtn.addEventListener("click", () => {
  if (isSending) return;
  sendMessage();
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    if (isSending) return;
    if (e.repeat) return;

    sendMessage();
  }
});

newChatBtn.addEventListener("click", () => {
  if (isSending) return;
  startChat();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopPolling();
  } else if (conversationId && !isSending) {
    loadMessages(true)
      .catch((err) => console.error("visibility refresh error:", err))
      .finally(() => scheduleNextPoll());
  }
});

window.addEventListener("beforeunload", stopPolling);

startChat();
