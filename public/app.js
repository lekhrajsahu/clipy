const socket = io();

let room = "";

let selectedFiles = [];

let fileCounter = 0;


const textarea =
    document.getElementById("clipboard");

const roomInput =
    document.getElementById("roomId");

const fileInput =
    document.getElementById("fileUpload");

const imageInput =
    document.getElementById("imageUpload");

const dropZone =
    document.getElementById("dropZone");

const selectedFilesContainer =
    document.getElementById("selectedFiles");



/* =================================
   ROOM
================================= */

function joinRoom() {

    const value =
        roomInput.value.trim();


    if (!value) {

        showToast("Please enter a Room ID");

        roomInput.focus();

        return;
    }


    room = value;


    socket.emit(
        "joinRoom",
        room
    );


    document.getElementById(
        "joinSection"
    ).style.display = "none";


    document.getElementById(
        "appSection"
    ).style.display = "block";


    document.getElementById(
        "roomLegend"
    ).innerText = room;


    showToast(
        "Joined room successfully"
    );

}


roomInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            joinRoom();

        }

    }
);


/* =================================
   EXIT
================================= */

function exitRoom() {

    socket.disconnect();

    location.reload();

}


/* =================================
   CLIPBOARD
================================= */

textarea.addEventListener(
    "input",
    function() {

        updateCharacterCount();


        if (room !== "") {

            socket.emit(
                "clipboardUpdate",
                textarea.value
            );

        }

    }
);


socket.on(
    "clipboardUpdate",
    function(data) {

        textarea.value =
            data || "";

        updateCharacterCount();

    }
);


async function copyText() {

    if (!textarea.value) {

        showToast(
            "Clipboard is empty"
        );

        return;
    }


    try {

        await navigator.clipboard.writeText(
            textarea.value
        );

        showToast(
            "Copied to clipboard"
        );

    }

    catch {

        textarea.select();

        document.execCommand("copy");

        showToast(
            "Copied to clipboard"
        );

    }

}


function updateCharacterCount() {

    const count =
        textarea.value.length;


    document.getElementById(
        "charCount"
    ).innerText =

        count.toLocaleString() +

        (
            count === 1
                ? " character"
                : " characters"
        );

}


/* =================================
   FILE SELECTION
================================= */

fileInput.addEventListener(
    "change",
    function() {

        const files =
            Array.from(this.files);


        handleSelectedFiles(files);

    }
);


/* =================================
   DROP ZONE
================================= */

dropZone.addEventListener(
    "click",
    function() {

        fileInput.click();

    }
);


dropZone.addEventListener(
    "dragover",
    function(event) {

        event.preventDefault();

        dropZone.classList.add(
            "dragging"
        );

    }
);


dropZone.addEventListener(
    "dragleave",
    function() {

        dropZone.classList.remove(
            "dragging"
        );

    }
);


dropZone.addEventListener(
    "drop",
    function(event) {

        event.preventDefault();

        dropZone.classList.remove(
            "dragging"
        );


        const files =
            Array.from(
                event.dataTransfer.files
            );


        handleSelectedFiles(files);

    }
);


/* =================================
   HANDLE FILES
================================= */

function handleSelectedFiles(files) {

    if (!files.length) {
        return;
    }


    /*
       Limit total selected files
       to 5.
    */

    const combined =
        [
            ...selectedFiles,
            ...files
        ];


    if (combined.length > 5) {

        showToast(
            "Maximum 5 files allowed"
        );

        selectedFiles =
            combined.slice(0, 5);

    }

    else {

        selectedFiles =
            combined;

    }


    /*
       Remove duplicate File objects
    */

    selectedFiles =
        selectedFiles.filter(
            (file, index, array) =>

                index ===
                array.findIndex(
                    item =>
                        item.name === file.name &&
                        item.size === file.size &&
                        item.lastModified ===
                        file.lastModified
                )
        );


    renderSelectedFiles();

}


/* =================================
   RENDER SELECTED FILES
================================= */

function renderSelectedFiles() {

    selectedFilesContainer.innerHTML = "";


    selectedFiles.forEach(
        function(file, index) {

            const wrapper =
                document.createElement("div");


            wrapper.className =
                "selected-file";


            wrapper.id =
                `selected-file-${index}`;


            wrapper.innerHTML = `

                <div class="selected-file-top">

                    <span
                        class="selected-file-name"
                        title="${escapeHtml(file.name)}"
                    >
                        ${escapeHtml(file.name)}
                    </span>

                    <span class="selected-file-size">
                        ${formatFileSize(file.size)}
                    </span>

                    <button
                        class="remove-selected"
                        onclick="removeSelectedFile(${index})"
                        title="Remove"
                    >
                        ×
                    </button>

                </div>

                <div class="upload-progress">

                    <div class="progress-row">

                        <span class="progress-status">
                            Waiting
                        </span>

                        <span class="progress-percent">
                            0%
                        </span>

                    </div>

                    <div class="progress-track">

                        <div
                            class="progress-bar"
                        ></div>

                    </div>

                </div>
            `;


            selectedFilesContainer.appendChild(
                wrapper
            );

        }
    );


    updateSelectionUI();

}


/* =================================
   REMOVE SELECTED FILE
================================= */

function removeSelectedFile(index) {

    selectedFiles.splice(
        index,
        1
    );


    renderSelectedFiles();


    fileInput.value = "";

}


/* =================================
   SELECTION UI
================================= */

function updateSelectionUI() {

    const title =
        document.getElementById(
            "fileSelectionTitle"
        );


    const name =
        document.getElementById(
            "fileSelectionName"
        );


    const icon =
        document.getElementById(
            "uploadIcon"
        );


    if (!selectedFiles.length) {

        title.textContent =
            "Drop files here";


        name.textContent =
            "or click to browse • Max 5 files";


        icon.textContent =
            "↑";


        dropZone.classList.remove(
            "file-selected"
        );

        return;
    }


    title.textContent =
        `${selectedFiles.length} file${
            selectedFiles.length > 1
                ? "s"
                : ""
        } selected`;


    name.textContent =
        "Ready to upload";


    icon.textContent =
        "✓";


    dropZone.classList.add(
        "file-selected"
    );

}


/* =================================
   UPLOAD ALL FILES
================================= */

async function uploadFiles() {

    if (!selectedFiles.length) {

        showToast(
            "Select at least one file"
        );

        return;
    }


    const filesToUpload =
        [...selectedFiles];


    const uploadButton =
        document.getElementById(
            "uploadButton"
        );


    uploadButton.disabled =
        true;


    let completed = 0;


    for (
        let i = 0;
        i < filesToUpload.length;
        i++
    ) {

        const file =
            filesToUpload[i];


        try {

            await uploadSingleFile(
                file,
                i
            );


            completed++;

        }

        catch (error) {

            console.error(error);

            showToast(
                `Failed to upload ${file.name}`
            );

        }

    }


    uploadButton.disabled =
        false;


    if (completed > 0) {

        showToast(
            `${completed} file${
                completed > 1
                    ? "s"
                    : ""
            } uploaded`
        );

    }


    /*
       Clear selection
    */

    selectedFiles = [];

    fileInput.value = "";

    renderSelectedFiles();

}


/* =================================
   SINGLE FILE UPLOAD
================================= */

function uploadSingleFile(
    file,
    index
) {

    return new Promise(
        function(resolve, reject) {

            const xhr =
                new XMLHttpRequest();


            const wrapper =
                document.getElementById(
                    `selected-file-${index}`
                );


            if (!wrapper) {

                reject(
                    new Error(
                        "File UI not found"
                    )
                );

                return;
            }


            wrapper.classList.add(
                "uploading"
            );


            const status =
                wrapper.querySelector(
                    ".progress-status"
                );


            const percent =
                wrapper.querySelector(
                    ".progress-percent"
                );


            const progressBar =
                wrapper.querySelector(
                    ".progress-bar"
                );


            status.textContent =
                "Uploading";


            xhr.upload.addEventListener(
                "progress",
                function(event) {

                    if (!event.lengthComputable) {
                        return;
                    }


                    const value =
                        Math.round(
                            (
                                event.loaded /
                                event.total
                            ) * 100
                        );


                    progressBar.style.width =
                        value + "%";


                    percent.textContent =
                        value + "%";

                }
            );


            xhr.addEventListener(
                "load",
                function() {

                    if (
                        xhr.status >= 200 &&
                        xhr.status < 300
                    ) {

                        try {

                            const data =
                                JSON.parse(
                                    xhr.responseText
                                );


                            status.textContent =
                                "Uploaded";


                            progressBar.style.width =
                                "100%";


                            percent.textContent =
                                "100%";


                            socket.emit(
                                "fileShared",
                                data.file
                            );


                            addFile(
                                data.file
                            );


                            resolve(data);

                        }

                        catch {

                            reject(
                                new Error(
                                    "Invalid server response"
                                )
                            );

                        }

                    }

                    else {

                        reject(
                            new Error(
                                "Upload failed"
                            )
                        );

                    }

                }
            );


            xhr.addEventListener(
                "error",
                function() {

                    status.textContent =
                        "Failed";


                    reject(
                        new Error(
                            "Network error"
                        )
                    );

                }
            );


            const form =
                new FormData();


            form.append(
                "file",
                file
            );


            xhr.open(
                "POST",
                "/upload"
            );


            xhr.send(form);

        }
    );

}


/* =================================
   FILE HISTORY
================================= */

socket.on(
    "fileHistory",
    function(files) {

        if (!Array.isArray(files)) {
            return;
        }


        files.forEach(
            function(file) {

                addFile(file);

            }
        );

    }
);


/* =================================
   NEW FILE
================================= */

socket.on(
    "fileShared",
    function(file) {

        addFile(file);

        showToast(
            "New file received"
        );

    }
);


/* =================================
   FILE ADDED TO UI
================================= */

function addFile(file) {

    const list =
        document.getElementById(
            "fileList"
        );


    const existing =
        Array.from(
            list.querySelectorAll(
                ".file-name"
            )
        )
        .some(
            element =>
                element.dataset.file === file
        );


    if (existing) {
        return;
    }


    const div =
        document.createElement("div");


    div.className =
        "fileItem";


    const name =
        document.createElement("span");


    name.className =
        "file-name";


    name.dataset.file =
        file;


    name.title =
        file;


    name.textContent =
        file;


    const actions =
        document.createElement("div");


    actions.className =
        "file-actions";


    const downloadLink =
        document.createElement("a");


    downloadLink.href =
        "/files/" +
        encodeURIComponent(file);


    downloadLink.download =
        file;


    const downloadButton =
        document.createElement("button");


    downloadButton.className =
        "downloadBtn";


    downloadButton.textContent =
        "Download";


    downloadLink.appendChild(
        downloadButton
    );


    const deleteButton =
        document.createElement("button");


    deleteButton.className =
        "deleteBtn";


    deleteButton.textContent =
        "Delete";


    deleteButton.onclick =
        function() {

            deleteFile(file);

        };


    actions.appendChild(
        downloadLink
    );


    actions.appendChild(
        deleteButton
    );


    div.appendChild(
        name
    );


    div.appendChild(
        actions
    );


    list.appendChild(
        div
    );


    fileCounter++;


    updateFileCount();

}


/* =================================
   DELETE FILE
================================= */

async function deleteFile(file) {

    const confirmed =
        confirm(
            `Delete "${file}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                "/delete-file",
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            file
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Delete failed"
            );

        }


        /*
           Tell everyone in room.
        */

        socket.emit(
            "fileDeleted",
            file
        );


        /*
           Remove locally.
        */

        removeFileFromUI(file);


        showToast(
            "File deleted"
        );

    }

    catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not delete file"
        );

    }

}


/* =================================
   RECEIVE FILE DELETION
================================= */

socket.on(
    "fileDeleted",
    function(file) {

        removeFileFromUI(file);

        showToast(
            "A file was deleted"
        );

    }
);


/* =================================
   REMOVE FILE FROM UI
================================= */

function removeFileFromUI(file) {

    const list = document.getElementById("fileList");

    const item = Array.from(
        list.querySelectorAll(".file-name")
    ).find(
        element => element.dataset.file === file
    );

    if (!item) return;

    const fileItem = item.closest(".fileItem");

    if (fileItem) {
        fileItem.remove();
        fileCounter--;
        updateFileCount();
    }
}

/* =================================
   FILE COUNT
================================= */

function updateFileCount() {

    document.getElementById(
        "fileCount"
    ).innerText =
        fileCounter;

}


/* =================================
   IMAGE INPUT
================================= */

imageInput.addEventListener(
    "change",
    function() {

        const file =
            this.files[0];


        document.getElementById(
            "imageName"
        ).innerText =

            file
                ? file.name
                : "Choose PNG image";

    }
);


/* =================================
   IMAGE CONVERSION
================================= */

async function convertImage() {

    const input = document.getElementById("imageUpload");
    const file = input.files[0];

    if (!file) {
        alert("Please select an image");
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image");
        return;
    }

    try {

        const image = new Image();

        const imageURL = URL.createObjectURL(file);

        image.onload = () => {

            const canvas = document.createElement("canvas");

            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext("2d");

            /*
             * JPEG doesn't support transparency.
             * Fill transparent areas with white.
             */
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            ctx.drawImage(
                image,
                0,
                0
            );

            canvas.toBlob(
                async (blob) => {

                    if (!blob) {
                        alert("Conversion failed");
                        return;
                    }

                    /*
                     * Create JPEG filename
                     */
                    const originalName =
                        file.name
                            .replace(/\.[^/.]+$/, "");

                    const jpegFile =
                        new File(
                            [blob],
                            originalName + ".jpg",
                            {
                                type: "image/jpeg"
                            }
                        );

                    /*
                     * Upload converted JPEG
                     */
                    const form =
                        new FormData();

                    form.append(
                        "file",
                        jpegFile
                    );

                    const response =
                        await fetch(
                            "/upload",
                            {
                                method: "POST",
                                body: form
                            }
                        );

                    const data =
                        await response.json();

                    if (!response.ok) {
                        alert(
                            data.error ||
                            "Upload failed"
                        );
                        return;
                    }

                    /*
                     * Show converted file
                     */
                    addConverted(data.file);

                    /*
                     * Cleanup
                     */
                    URL.revokeObjectURL(
                        imageURL
                    );

                },
                "image/jpeg",
                0.90
            );
        };

        image.onerror = () => {

            URL.revokeObjectURL(imageURL);

            alert(
                "This image cannot be opened by your browser."
            );

        };

        image.src = imageURL;

    } catch (error) {

        console.error(error);

        alert("Image conversion failed");

    }
}


/* =================================
   ADD CONVERTED FILE
================================= */

function addConverted(file) {

    const list =
        document.getElementById(
            "convertList"
        );


    const div =
        document.createElement("div");


    div.className =
        "fileItem";


    const name =
        document.createElement("span");


    name.className =
        "file-name";


    name.textContent =
        file;


    name.title =
        file;


    const link =
        document.createElement("a");


    link.href =
        "/files/" +
        encodeURIComponent(file);


    link.download =
        file;


    const button =
        document.createElement("button");


    button.className =
        "downloadBtn";


    button.textContent =
        "Download";


    link.appendChild(
        button
    );


    div.appendChild(
        name
    );


    div.appendChild(
        link
    );


    list.appendChild(
        div
    );

}


/* =================================
   FILE SIZE
================================= */

function formatFileSize(bytes) {

    if (!bytes) {
        return "0 Bytes";
    }


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        (
            bytes /
            Math.pow(
                1024,
                index
            )
        )
        .toFixed(
            index === 0 ? 0 : 1
        )
        +
        " " +
        units[index]
    );

}


/* =================================
   ESCAPE HTML
================================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =================================
   TOAST
================================= */

function showToast(message) {

    const container =
        document.getElementById(
            "toastContainer"
        );


    const toast =
        document.createElement("div");


    toast.className =
        "toast";


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        function() {

            toast.style.opacity =
                "0";


            toast.style.transform =
                "translateY(8px)";


            setTimeout(
                function() {

                    toast.remove();

                },
                200
            );

        },
        2500
    );

}


/* =================================
   INITIALIZE
================================= */

updateCharacterCount();