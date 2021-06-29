const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const stockBought = new Schema({
    symbol: {
        type: String
    },
    qty: {
        type: Number
    },
    buyPrice: {
        type: Number
    }
});

const userSchema = new Schema({
    balanceAmt: {
        type: Number
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    stockBought: [stockBought]
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);