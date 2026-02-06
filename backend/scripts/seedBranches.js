// backend/scripts/seedBranches.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/Branch.js"; // adjust relative path if needed

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  // optional: remove existing Karnataka Bank entries in Bangalore
  await Branch.deleteMany({ bankKey: "karnataka_bank", city: /Bangalore|Bengaluru/i });

  const docs = [
    {
      bankKey: "karnataka_bank",
      name: "Karnataka Bank - MG Road Branch",
      type: "Branch",
      address: "No. 12, M.G. Road, Bangalore 560001",
      phone: "080-2555-0100",
      hours: "Mon-Fri: 9AM-5PM, Sat: 9AM-1PM",
      city: "Bangalore",
      state: "Karnataka",
      color: "#0d6efd"
    },
    {
      bankKey: "karnataka_bank",
      name: "Karnataka Bank - Jayanagar ATM",
      type: "ATM",
      address: "3rd Block, Jayanagar, Bangalore 560011",
      phone: "",
      hours: "24/7",
      city: "Bangalore",
      state: "Karnataka",
      color: "#6c757d"
    },
    {
      bankKey: "karnataka_bank",
      name: "Karnataka Bank - Koramangala Branch",
      type: "Branch",
      address: "5th Block, Koramangala, Bangalore 560095",
      phone: "080-5555-0200",
      hours: "Mon-Fri: 9AM-5PM",
      city: "Bangalore",
      state: "Karnataka",
      color: "#0d6efd"
    }
  ];

  await Branch.insertMany(docs);
  console.log("Branches seeded.");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
