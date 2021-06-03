//jshint esversion:6
var PORT = 5000;
const socket = io.connect("http://localhost:" + PORT);

const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const output = document.getElementById("output");
const users = document.getElementById("users");
const senderOutput = document.getElementById("name");
const userOutput = document.getElementById("user");
const heading = document.getElementById("heading");

var user = userOutput.innerHTML;
var email = user.split(":")[2].split(",")[0].split("'")[1];
var sender = user.split(":")[3].split(",")[0].split("'")[1];
document.getElementById("name").innerHTML = "Hello " + sender;

var isAdmin = false;
if (user.includes("isAdmin: 'yes'")) {
  isAdmin = true;
  heading.innerHTML += " -- ADMIN";
}

const decipher = salt => {
    const textToChars = text => text.split('').map(c => c.charCodeAt(0));
    const applySaltToChar = code => textToChars(salt).reduce((a,b) => a ^ b, code);
    return encoded => encoded.match(/.{1,2}/g)
        .map(hex => parseInt(hex, 16))
        .map(applySaltToChar)
        .map(charCode => String.fromCharCode(charCode))
        .join('');
};
const myDecipher = decipher('mySecretSalt');

var messagesLoaded = false;
var activeUsers = [];
var index = 0;

var oneToOne = false;
var privateChatEmail;
var privateChatName;

submitBtn.addEventListener("click", function() {
  if (!oneToOne) {
    socket.emit('chat', {
      message: message.value,
      sender: sender,
      private: "no"
    });
  } else {
    socket.emit('private-chat', {
      message: message.value,
      sender: sender,
      private: "yes",
      receiver_name: privateChatName,
      sender_email: email,
      receiver_email: privateChatEmail,
    });
  }

  message.value = "";
});

users.addEventListener("click", function() {
  if (!oneToOne) {
    oneToOne = true;
    var selectedIndex = event.target.id;
    privateChatEmail = activeUsers[selectedIndex].email;
    privateChatName = activeUsers[selectedIndex].name;
    message.placeholder = "Private Message to: " + privateChatName;
  } else {
    oneToOne = false;
    message.placeholder = "Enter Message";
  }
});

socket.on('chat', data => {
  output.innerHTML += "<p><strong>" + data.sender + " : </strong>" + data.message + "</p>";
});

socket.on('private-chat', data => {
  if (data.receiver_email == email || data.sender_email == email || isAdmin) {
    output.innerHTML += "<p><strong> From: " + data.sender + " to: " + data.receiver_name + " </strong>" + data.message + "</p>";
  }
});

socket.on('active', data => {
  socket.emit('active', { email: email, name: sender });

  var alreadyExists = false;
  activeUsers.forEach(e => {
    if (e.email === data.email || e.email === email) {
      alreadyExists = true;
    }
  });

  activeUsers = [...new Set(activeUsers)];

  if (!alreadyExists) {
    if (data.email != email) {
      activeUsers.push({name: data.name, email: data.email});
      users.innerHTML += '<h3 id="' + index.toString() + '">' + data.name + '</h3>';
      index+=1;
    }
  }
});

if (isAdmin) {
  socket.on('admin-log', data => {
    output.innerHTML += "<p><strong>" + data + "</strong></p>";
  });
}

socket.on('out', data => {
  var indexToRemove = 0;
  activeUsers.forEach(e => {
    if (e.email == data) {
      activeUsers.splice(indexToRemove, 1);
    }
    indexToRemove+=1;
  });

  var index = 0;
  users.innerHTML = "";
  activeUsers.forEach(elm => {
    users.innerHTML += '<h3 id="' + index.toString() + '">' + elm.name + '</h3>';
    index+=1;
  });
});

socket.on("output-messages", data => {
  if (!messagesLoaded) {
    data.forEach(message => {
      if (message.private == "no") {
        var decryptedMessage = myDecipher(message.message);
        output.innerHTML += "<p><strong>" + message.sender + " : </strong>" + decryptedMessage + "</p>";
      } else {
        if (message.sender_email == email || message.receiver_email == email || isAdmin) {
          var decryptedMessage = myDecipher(message.message);
          output.innerHTML += "<p><strong> From: " + message.sender + " to: " + message.receiver_name + " </strong>" + decryptedMessage + "</p>";
        }
      }
    });
    messagesLoaded = true;
  }
});
