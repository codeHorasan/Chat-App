//jshint esversion:6
const mongoose = require('mongoose');
const msgSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    sender: {
      type: String,
      required: true
    },
    private: {
      type: String,
      required: true
    },
    receiver_name: {
      type: String
    },
    sender_email: {
      type: String
    },
    receiver_email: {
      type: String
    }
}, { timestamps: true });

const Msg = mongoose.model('msg', msgSchema);
module.exports = Msg;
