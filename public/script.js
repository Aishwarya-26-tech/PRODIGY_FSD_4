const socket = io();

const username = localStorage.getItem("username");
const room = localStorage.getItem("room");

if (!username || !room) {
    window.location.href = "index.html";
}

document.getElementById("roomTitle").innerText = `Room: ${room}`;

socket.emit("join", { username, room });

const chatBox = document.getElementById("chatBox");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const usersList = document.getElementById("usersList");
const typingStatus = document.getElementById("typingStatus");

messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (msg) {
        socket.emit("chatMessage", msg);
        messageInput.value = "";
        socket.emit("stopTyping");
    }
});

messageInput.addEventListener("input", () => {
    if (messageInput.value.trim()) {
        socket.emit("typing");
    } else {
        socket.emit("stopTyping");
    }
});

socket.on("message", (data) => {
    appendMessage(data.user, data.text, data.time, data.type);
});

socket.on("privateMessage", (data) => {
    appendMessage(data.user, data.text, data.time, "private");
});

socket.on("typing", (msg) => {
    typingStatus.innerText = msg;
});

socket.on("roomUsers", (users) => {
    usersList.innerHTML = "";
    users.forEach(user => {
        const li = document.createElement("li");
        li.textContent = user;
        usersList.appendChild(li);
    });
});

function appendMessage(user, text, time, type = "normal") {
    const div = document.createElement("div");
    div.classList.add("message");

    if (type === "system") {
        div.classList.add("system-message");
    } else if (type === "private") {
        div.classList.add("private-message");
    }

    div.innerHTML = `
        <div class="msg-header">
            <strong>${user}</strong>
            <span class="msg-time">${time}</span>
        </div>
        <div class="msg-text">${text}</div>
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function sendPrivateMessage() {
    const toUser = document.getElementById("privateUser").value.trim();
    const message = document.getElementById("privateMsg").value.trim();

    if (toUser && message) {
        socket.emit("privateMessage", { toUser, message });
        document.getElementById("privateMsg").value = "";
    }
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}