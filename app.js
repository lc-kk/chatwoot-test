const API_BASE = "https://roseanne-psychogenic-affrontingly.ngrok-free.dev";
const DEFAULT_HEADERS = {
  "ngrok-skip-browser-warning": "true"
};
let conversationId = null;
let pollTimer = null;

const conversationLabel = document.getElementById("conversationLabel");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");

async function startChat() {
  try {
    const res = await fetch(`${API_BASE}/test-chat/start`, {
      method: "POST",
      headers: DEFAULT_HEADERS
    });

    console.log("startChat status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("startChat failed:", errText);
      alert("Failed to start chat.");
      return;
    }

    const data = await res.json();
    console.log("startChat data:", data);

    conversationId = data.conversation_id;
    conversationLabel.textContent = `Conversation ID: ${conversationId}`;
    messagesEl.innerHTML = "";

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(loadMessages, 2000);

    await loadMessages();
  } catch (err) {
    console.error("startChat error:", err);
    alert("Failed to start chat.");
  }
}

async function loadMessages() {
  if (!conversationId) return;

  const res = await fetch(
    `${API_BASE}/test-chat/messages?conversation_id=${conversationId}`,
    {
      headers: DEFAULT_HEADERS
    }
  );

  console.log("loadMessages status:", res.status);

  if (!res.ok) {
    const errText = await res.text();
    console.error("loadMessages failed:", errText);
    throw new Error("Failed to load messages");
  }

  const data = await res.json();
  console.log("loadMessages data:", data);

  if (!data.messages || !Array.isArray(data.messages)) {
    console.error("Invalid messages payload:", data);
    throw new Error("Invalid messages payload");
  }

  messagesEl.innerHTML = "";

  for (const msg of data.messages) {
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

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !conversationId) return;

  sendBtn.disabled = true;

  try {
  const API_BASE = "https://roseanne-psychogenic-affrontingly.ngrok-free.dev";

  const DEFAULT_HEADERS = {
    "ngrok-skip-browser-warning": "true"
  };

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
    await loadMessages();
  } catch (loadErr) {
    console.error("loadMessages failed after send:", loadErr);
    alert("Message sent, but failed to refresh messages.");
  }
} catch (err) {
  console.error("sendMessage error:", err);
  alert("Failed to send message.");
} finally {
  sendBtn.disabled = false;
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

startChat();
