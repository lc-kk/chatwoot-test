const API_BASE = "你的后端公网地址";
let conversationId = null;
let pollTimer = null;

const conversationLabel = document.getElementById("conversationLabel");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");

async function startChat() {
  const res = await fetch(`${API_BASE}/test-chat/start`, {
    method: "POST"
  });

  const data = await res.json();
  conversationId = data.conversation_id;
  conversationLabel.textContent = `Conversation ID: ${conversationId}`;
  messagesEl.innerHTML = "";

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(loadMessages, 2000);

  await loadMessages();
}

async function loadMessages() {
  if (!conversationId) return;

  const res = await fetch(
    `${API_BASE}/test-chat/messages?conversation_id=${conversationId}`
  );
  const data = await res.json();

  messagesEl.innerHTML = "";

  for (const msg of data.messages) {
    const item = document.createElement("div");
    item.className = `message ${msg.role}`;

    const role = document.createElement("div");
    role.className = "role";
    role.textContent = msg.role === "user" ? "Customer" : "AI";

    const content = document.createElement("div");
    content.className = "content";
    content.textContent = msg.content;

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
    await fetch(`${API_BASE}/test-chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: text
      })
    });

    messageInput.value = "";
    await loadMessages();
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
