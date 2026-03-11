const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* STATIC FILES */

app.use(express.static("public"));

/* CREATE UPLOADS FOLDER IF NOT EXISTS */

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* SERVE UPLOADED FILES */

app.use("/files", express.static(uploadDir));

/* ROOM MEMORY */

const rooms = {};

/*
rooms = {
  roomId : {
    text : "",
    files : [],
    time : timestamp
  }
}
*/

/* MULTER STORAGE */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* FILE UPLOAD API */

app.post("/upload", upload.single("file"), (req, res) => {

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({ file: req.file.filename });

});

/* IMAGE CONVERSION API */

app.post("/convert", upload.single("image"), async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const input = req.file.path;

    const outputName = Date.now() + ".jpg";
    const output = path.join(uploadDir, outputName);

    await sharp(input)
      .jpeg({ quality: 90 })
      .toFile(output);

    res.json({ file: outputName });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Image conversion failed" });

  }

});

/* SOCKET.IO */

io.on("connection", (socket) => {

  socket.on("joinRoom", (room) => {

    socket.join(room);
    socket.room = room;

    if (!rooms[room]) {
      rooms[room] = {
        text: "",
        files: [],
        time: Date.now()
      };
    }

    /* send stored clipboard */

    socket.emit("clipboardUpdate", rooms[room].text);

    /* send stored files */

    socket.emit("fileHistory", rooms[room].files);

  });

  /* CLIPBOARD UPDATE */

  socket.on("clipboardUpdate", (data) => {

    if (!socket.room) return;

    rooms[socket.room].text = data;
    rooms[socket.room].time = Date.now();

    socket.to(socket.room).emit("clipboardUpdate", data);

  });

  /* FILE SHARING */

  socket.on("fileShared", (file) => {

    if (!socket.room) return;

    rooms[socket.room].files.push(file);
    rooms[socket.room].time = Date.now();

    socket.to(socket.room).emit("fileShared", file);

  });

});

/* AUTO DELETE FILES + ROOMS AFTER 30 MINUTES */

setInterval(() => {

  const now = Date.now();

  /* delete expired rooms */

  for (const room in rooms) {

    if (now - rooms[room].time > 30 * 60 * 1000) {
      delete rooms[room];
    }

  }

  /* delete old files */

  fs.readdir(uploadDir, (err, files) => {

    if (err) return;

    files.forEach(file => {

      const filePath = path.join(uploadDir, file);

      fs.stat(filePath, (err, stat) => {

        if (err) return;

        const age = now - stat.mtime.getTime();

        if (age > 30 * 60 * 1000) {

          fs.unlink(filePath, () => {});

        }

      });

    });

  });

}, 60000);

/* START SERVER */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

  console.log("Clipy server running on port " + PORT);

});