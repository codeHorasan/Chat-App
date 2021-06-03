//jshint esversion:6
const PORT = process.env.PORT || 5000;
const express = require('express');
const socket = require("socket.io");
const mongoose = require('mongoose');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const Msg = require("./models/message");
const User = require("./models/User");

const cipher = salt => {
    const textToChars = text => text.split('').map(c => c.charCodeAt(0));
    const byteHex = n => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = code => textToChars(salt).reduce((a,b) => a ^ b, code);

    return text => text.split('')
        .map(textToChars)
        .map(applySaltToChar)
        .map(byteHex)
        .join('');
};
const myCipher = cipher('mySecretSalt');

var name;
var email;
var usersList = [];

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Secret.",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

const server = app.listen(PORT);

const dbURL = 'mongodb+srv://ugurhorasan:swulucho6@nodedeneme.nxnhj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
mongoose.connect(process.env.MONGODB_URI || dbURL, {useNewUrlParser: true, useUnifiedTopology: true})
  .then((result) => console.log("Connection Established"))
  .catch((err) => console.log("Error: " + err));
mongoose.set("useCreateIndex", true);

const io = socket(server);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', function(req, res) {
  if (req.isAuthenticated()) {
    res.redirect('/chat');
  } else {
    res.render('home');
  }
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/register', function(req, res) {
  res.render('register');
});

app.get('/chat', function(req, res) {
  if (req.isAuthenticated()) {
    var user = req.user;
    req.session.user = req.user;

    res.render('chat', { name: name, user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.post('/register', function(req, res) {
  var newUser = new User({
    username: req.body.username,
    name: req.body.name
  });
  User.register(newUser, req.body.password, function(err, user) {
    if (err) {
      console.log("error: " + err);
      res.redirect('/register');
    } else {
      passport.authenticate("local")(req, res, function() {
        name = newUser.name;
        email = req.body.username;
        res.redirect('/chat');
      });
    }
  });
});

app.post('/login', function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      User.findOne({ 'username': user.username }, 'name', function (err, user) {
        if (err) return handleError(err);
        passport.authenticate("local")(req, res, function() {
          name = user.name;
          email = req.body.username;
          res.redirect('/');
      });

      });
    }
  });
});


io.on('connection', function(socket) {
  var str = "User Joined => Email: " + email + "  Name: " + name + "  Socket ID: " + socket.id;
  console.log(str);
  io.sockets.emit('admin-log', str);
  usersList.push({email: email, name: name, socket_id: socket.id});

  Msg.find().then(result => {
    io.sockets.emit("output-messages", result);
  });

  socket.broadcast.emit("active", { email: email, name: name });

  socket.on('active', data => {
    socket.broadcast.emit("active", data);
  });

  socket.on('disconnect', () => {
    var i;
    var specific_index;
    for (i=0; i<usersList.length; i++) {
      if (usersList[i].socket_id === socket.id) {
        var str = "User Disconnected => Email: " + usersList[i].email + "  Name: " + usersList[i].name + "  Socket ID: " + socket.id;
        console.log(str);
        io.sockets.emit('admin-log', str);
        email_to_delete = usersList[i].email;
        usersList.splice(i,1);
      }
    }

    socket.broadcast.emit('out', email_to_delete);
  });

  socket.on('chat', data => {
    var encryptedMessage = myCipher(data.message);
    const message = new Msg({"message": encryptedMessage, "sender": data.sender, "private": data.private});
    message.save().then(() => {
      io.sockets.emit("chat", data);
    });
  });

  socket.on('private-chat', data => {
    var encryptedMessage = myCipher(data.message);
    const message = new Msg({"message": encryptedMessage, "sender": data.sender, "private": data.private,
    "receiver_name": data.receiver_name, "sender_email": data.sender_email, "receiver_email": data.receiver_email});
     message.save().then(() => {
       io.sockets.emit("private-chat", data);
     });
  });

});
