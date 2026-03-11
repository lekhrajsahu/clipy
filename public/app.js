const socket=io()

let room=""

const textarea=document.getElementById("clipboard")

function joinRoom(){

room=document.getElementById("roomId").value

if(room===""){
alert("Enter Room ID")
return
}

socket.emit("joinRoom",room)

document.getElementById("joinSection").style.display="none"
document.getElementById("workspace").style.display="flex"
document.getElementById("roomHeader").style.display="flex"

document.getElementById("roomLegend").innerText="Room: "+room

}

function exitRoom(){
location.reload()
}

/* CLIPBOARD */

textarea.addEventListener("input",()=>{

if(room!==""){
socket.emit("clipboardUpdate",textarea.value)
}

})

socket.on("clipboardUpdate",(data)=>{
textarea.value=data
})

function copyText(){
navigator.clipboard.writeText(textarea.value)
}

/* FILE UPLOAD */

async function uploadFile(){

const file=document.getElementById("fileUpload").files[0]

if(!file){
alert("Select file")
return
}

const form=new FormData()
form.append("file",file)

const res=await fetch("/upload",{method:"POST",body:form})

const data=await res.json()

socket.emit("fileShared",data.file)

addFile(data.file)

}

/* FILE HISTORY */

socket.on("fileHistory",(files)=>{

files.forEach(file=>{
addFile(file)
})

})

socket.on("fileShared",(file)=>{
addFile(file)
})

function addFile(file){

const list=document.getElementById("fileList")

const div=document.createElement("div")

div.className="fileItem"

div.innerHTML=`
<span>${file}</span>
<a href="/files/${file}" download>
<button class="downloadBtn">Download</button>
</a>
`

list.appendChild(div)

}

/* IMAGE CONVERT */

async function convertImage(){

const file=document.getElementById("imageUpload").files[0]

if(!file){
alert("Select image")
return
}

const form=new FormData()
form.append("image",file)

const res=await fetch("/convert",{method:"POST",body:form})

const data=await res.json()

addConverted(data.file)

}

function addConverted(file){

const list=document.getElementById("convertList")

const div=document.createElement("div")

div.className="fileItem"

div.innerHTML=`
<span>${file}</span>
<a href="/files/${file}" download>
<button class="downloadBtn">Download</button>
</a>
`

list.appendChild(div)

}