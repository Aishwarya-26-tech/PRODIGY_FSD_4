const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const users = {};

function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join", ({ username, room }) => {
        users[socket.id] = { username, room };
        socket.join(room);

        // Welcome message to current user
        socket.emit("message", {
            user: "System",
            text: `Welcome ${username}!`,
            time: getCurrentTime(),
            type: "system"
        });

        // Notify others
        socket.to(room).emit("message", {
            user: "System",
            text: `${username} joined the room`,
            time: getCurrentTime(),
            type: "system"
        });

        io.to(room).emit("roomUsers", getRoomUsers(room));
    });

    socket.on("chatMessage", (msg) => {
        const user = users[socket.id];
        if (user) {
            io.to(user.room).emit("message", {
                user: user.username,
                text: msg,
                time: getCurrentTime(),
                type: "normal"
            });
        }
    });

    socket.on("privateMessage", ({ toUser, message }) => {
        const sender = users[socket.id];
        if (!sender) return;

        const targetSocketId = Object.keys(users).find(
            id => users[id].username === toUser
        );

        if (targetSocketId) {
            io.to(targetSocketId).emit("privateMessage", {
                user: sender.username,
                text: message,
                time: getCurrentTime(),
                type: "private"
            });

            socket.emit("privateMessage", {
                user: `You to ${toUser}`,
                text: message,
                time: getCurrentTime(),
                type: "private"
            });
        } else {
            socket.emit("privateMessage", {
                user: "System",
                text: `${toUser} is not online`,
                time: getCurrentTime(),
                type: "system"
            });
        }
    });

    socket.on("typing", () => {
        const user = users[socket.id];
        if (user) {
            socket.to(user.room).emit("typing", `${user.username} is typing...`);
        }
    });

    socket.on("stopTyping", () => {
        const user = users[socket.id];
        if (user) {
            socket.to(user.room).emit("typing", "");
        }
    });

    socket.on("disconnect", () => {
        const user = users[socket.id];
        if (user) {
            socket.to(user.room).emit("message", {
                user: "System",
                text: `${user.username} left the room`,
                time: getCurrentTime(),
                type: "system"
            });

            delete users[socket.id];
            io.to(user.room).emit("roomUsers", getRoomUsers(user.room));
        }

        console.log("User disconnected:", socket.id);
    });
});

function getRoomUsers(room) {
    return Object.values(users)
        .filter(user => user.room === room)
        .map(user => user.username);
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});