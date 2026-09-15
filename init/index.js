const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});
  const owner = await User.findOne();
  if (!owner) {
    throw new Error("Create a user account before initializing listings.");
  }
  initData.data = initData.data.map((obj) => {
    obj.owner = owner._id;
    return obj;
  });
  await Listing.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();