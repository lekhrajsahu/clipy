const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);


/* =================================
   STATIC FILES
================================= */

app.use(
    express.static("public")
);


app.use(
    express.json()
);


/* =================================
   UPLOAD DIRECTORY
================================= */

const uploadDir =
    path.join(
        __dirname,
        "../uploads"
    );


if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(
        uploadDir,
        {
            recursive: true
        }
    );

}


/* =================================
   SERVE FILES
================================= */

app.use(
    "/files",
    express.static(uploadDir)
);


/* =================================
   ROOMS
================================= */

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


/* =================================
   MULTER
================================= */

const storage =
    multer.diskStorage({

        destination:
            (req, file, cb) => {

                cb(
                    null,
                    uploadDir
                );

            },


        filename:
            (req, file, cb) => {

                const safeName =
                    path
                        .basename(
                            file.originalname
                        )
                        .replace(
                            /[^a-zA-Z0-9._-]/g,
                            "_"
                        );


                cb(
                    null,
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .slice(2,8) +
                    "-" +
                    safeName
                );

            }

    });


const upload =
    multer({
        storage
    });


/* =================================
   UPLOAD API
================================= */

app.post(
    "/upload",
    upload.single("file"),
    (req, res) => {

        if (!req.file) {

            return res
                .status(400)
                .json({
                    error:
                        "No file uploaded"
                });

        }


        res.json({

            file:
                req.file.filename

        });

    }
);


/* =================================
   DELETE FILE API
================================= */

app.delete(
    "/delete-file",
    (req, res) => {

        const file =
            req.body.file;


        if (!file) {

            return res
                .status(400)
                .json({
                    error:
                        "File name required"
                });

        }


        /*
           Prevent path traversal.
        */

        const safeFile =
            path.basename(file);


        const filePath =
            path.join(
                uploadDir,
                safeFile
            );


        /*
           Make sure the resolved
           path remains inside uploads.
        */

        const resolvedPath =
            path.resolve(filePath);


        const resolvedUploadDir =
            path.resolve(uploadDir);


        if (
            !resolvedPath.startsWith(
                resolvedUploadDir +
                path.sep
            )
        ) {

            return res
                .status(400)
                .json({
                    error:
                        "Invalid file"
                });

        }


        fs.unlink(
            resolvedPath,
            (error) => {

                if (error) {

                    if (
                        error.code ===
                        "ENOENT"
                    ) {

                        return res.json({
                            success: true
                        });

                    }


                    console.error(
                        error
                    );


                    return res
                        .status(500)
                        .json({
                            error:
                                "Could not delete file"
                        });

                }


                /*
                   Remove the file
                   from all rooms.
                */

                for (
                    const roomId in rooms
                ) {

                    rooms[roomId].files =
                        rooms[roomId]
                            .files
                            .filter(
                                item =>
                                    item !==
                                    safeFile
                            );


                    rooms[roomId].time =
                        Date.now();

                }


                res.json({

                    success: true,

                    file:
                        safeFile

                });

            }
        );

    }
);


/* =================================
   IMAGE CONVERSION
================================= */

app.post(
    "/convert",
    upload.single("image"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res
                    .status(400)
                    .json({
                        error:
                            "No image uploaded"
                    });

            }


            const input =
                req.file.path;


            const outputName =
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2,8) +
                ".jpg";


            const output =
                path.join(
                    uploadDir,
                    outputName
                );


            await sharp(input)
                .jpeg({
                    quality: 90
                })
                .toFile(output);


            /*
               Remove original PNG
               after conversion.
            */

            fs.unlink(
                input,
                () => {}
            );


            res.json({

                file:
                    outputName

            });

        }

        catch (error) {

            console.error(
                error
            );


            res
                .status(500)
                .json({
                    error:
                        "Image conversion failed"
                });

        }

    }
);


/* =================================
   SOCKET.IO
================================= */

io.on(
    "connection",
    (socket) => {


        /* =============================
           JOIN ROOM
        ============================= */

        socket.on(
            "joinRoom",
            (room) => {

                if (!room) {
                    return;
                }


                socket.join(room);

                socket.room =
                    room;


                if (!rooms[room]) {

                    rooms[room] = {

                        text: "",

                        files: [],

                        time:
                            Date.now()

                    };

                }


                rooms[room].time =
                    Date.now();


                socket.emit(
                    "clipboardUpdate",
                    rooms[room].text
                );


                socket.emit(
                    "fileHistory",
                    rooms[room].files
                );

            }
        );


        /* =============================
           CLIPBOARD
        ============================= */

        socket.on(
            "clipboardUpdate",
            (data) => {

                if (
                    !socket.room ||
                    !rooms[socket.room]
                ) {

                    return;

                }


                rooms[socket.room].text =
                    data;


                rooms[socket.room].time =
                    Date.now();


                socket
                    .to(socket.room)
                    .emit(
                        "clipboardUpdate",
                        data
                    );

            }
        );


        /* =============================
           FILE SHARING
        ============================= */

        socket.on(
            "fileShared",
            (file) => {

                if (
                    !socket.room ||
                    !rooms[socket.room]
                ) {

                    return;

                }


                if (
                    !file ||
                    typeof file !==
                    "string"
                ) {

                    return;

                }


                /*
                   Prevent duplicate files.
                */

                if (
                    !rooms[
                        socket.room
                    ].files.includes(file)
                ) {

                    rooms[
                        socket.room
                    ].files.push(file);

                }


                rooms[
                    socket.room
                ].time =
                    Date.now();


                socket
                    .to(socket.room)
                    .emit(
                        "fileShared",
                        file
                    );

            }
        );


        /* =============================
           FILE DELETED
        ============================= */

        socket.on(
            "fileDeleted",
            (file) => {

                if (
                    !socket.room ||
                    !rooms[socket.room]
                ) {

                    return;

                }


                if (!file) {
                    return;
                }


                rooms[
                    socket.room
                ].files =
                    rooms[
                        socket.room
                    ].files.filter(
                        item =>
                            item !== file
                    );


                rooms[
                    socket.room
                ].time =
                    Date.now();


                socket
                    .to(socket.room)
                    .emit(
                        "fileDeleted",
                        file
                    );

            }
        );

    }
);


/* =================================
   CLEANUP
================================= */

setInterval(
    () => {

        const now =
            Date.now();


        /*
           Delete expired rooms.
        */

        for (
            const room in rooms
        ) {

            if (
                now -
                rooms[room].time
                >
                30 * 60 * 1000
            ) {

                delete rooms[room];

            }

        }


        /*
           Delete old files.
        */

        fs.readdir(
            uploadDir,
            (err, files) => {

                if (err) {
                    return;
                }


                files.forEach(
                    (file) => {

                        const filePath =
                            path.join(
                                uploadDir,
                                file
                            );


                        fs.stat(
                            filePath,
                            (error, stat) => {

                                if (error) {
                                    return;
                                }


                                const age =
                                    now -
                                    stat.mtime
                                        .getTime();


                                if (
                                    age >
                                    30 *
                                    60 *
                                    1000
                                ) {

                                    fs.unlink(
                                        filePath,
                                        () => {}
                                    );

                                }

                            }
                        );

                    }
                );

            }
        );

    },
    60000
);


/* =================================
   START SERVER
================================= */

const PORT =
    process.env.PORT || 3000;


server.listen(
    PORT,
    () => {

        console.log(
            "Clipy server running on port " +
            PORT
        );

    }
);