//jshint esversion:6
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const userSchema = new mongoose.Schema({
  username: String,
  name: String,
  password: String,
  isAdmin: String
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
module.exports = User;
