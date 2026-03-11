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

app.use(express.static("public"));
app.use("/files", express.static("server/uploads"));

/* ROOM MEMORY STORAGE */

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

/* FILE STORAGE */

const storage = multer.diskStorage({
  destination: "server/uploads",
  filename: (req,file,cb)=>{
    cb(null, Date.now()+"-"+file.originalname)
  }
});

const upload = multer({storage});

/* FILE UPLOAD */

app.post("/upload", upload.single("file"), (req,res)=>{

  const file = req.file.filename;

  res.json({file});

});

/* IMAGE CONVERSION */

app.post("/convert", upload.single("image"), async(req,res)=>{

  const input = req.file.path;

  const outputName = Date.now()+".jpg";
  const output = "server/uploads/"+outputName;

  await sharp(input)
  .jpeg({quality:90})
  .toFile(output);

  res.json({file:outputName});

});

/* SOCKET */

io.on("connection",(socket)=>{

  socket.on("joinRoom",(room)=>{

    socket.join(room);
    socket.room = room;

    if(!rooms[room]){
      rooms[room] = {
        text:"",
        files:[],
        time:Date.now()
      };
    }

    /* send stored clipboard */
    socket.emit("clipboardUpdate", rooms[room].text);

    /* send stored files */
    socket.emit("fileHistory", rooms[room].files);

  });

  /* CLIPBOARD */

  socket.on("clipboardUpdate",(data)=>{

    if(!socket.room) return;

    rooms[socket.room].text = data;
    rooms[socket.room].time = Date.now();

    socket.to(socket.room).emit("clipboardUpdate",data);

  });

  /* FILE SHARING */

  socket.on("fileShared",(file)=>{

    if(!socket.room) return;

    rooms[socket.room].files.push(file);
    rooms[socket.room].time = Date.now();

    socket.to(socket.room).emit("fileShared",file);

  });

});

/* AUTO DELETE FILES + ROOMS AFTER 30 MIN */

setInterval(()=>{

  const now = Date.now();

  /* delete expired rooms */

  for(const room in rooms){

    if(now - rooms[room].time > 30*60*1000){

      delete rooms[room];

    }

  }

  /* delete old files */

  const uploadPath = "server/uploads";

  fs.readdir(uploadPath,(err,files)=>{

    if(err) return;

    files.forEach(file=>{

      const filePath = path.join(uploadPath,file);

      fs.stat(filePath,(err,stat)=>{

        if(err) return;

        const age = now - stat.mtime.getTime();

        if(age > 30*60*1000){

          fs.unlink(filePath,()=>{});

        }

      });

    });

  });

},60000);

server.listen(3000,()=>{
  console.log("Clipy running on http://localhost:3000");
});