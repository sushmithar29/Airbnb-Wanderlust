const mongoose = require('mongoose');
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    await mongoose.connect(MONGO_URL);
}
const initDB = async () => {
   await Listing.deleteMany({});
   initData.data = initData.data.map((obj) => ({...obj, owner: "6aa52120d07d78a1c3744c56"}))
   await Listing.insertMany(initData.data);
   console.log("Data was initialized");
};

main()
  .then(async () => {
    console.log("Connected to MongoDB");
    await initDB();
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB:", err);
  })
  .finally(() => mongoose.disconnect());
