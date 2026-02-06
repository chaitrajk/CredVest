import mongoose from "mongoose";

const BranchSchema = new mongoose.Schema({
  bankKey: { type: String, required: true }, // e.g. 'karnataka_bank'
  name: String,
  type: { type: String, enum: ["Branch", "ATM"], default: "Branch" },
  address: String,
  phone: String,
  hours: String,
  city: String,
  state: String,
  lat: Number,
  lng: Number,
  color: String,
}, { timestamps: true });

export default mongoose.model("Branch", BranchSchema);

