import dotenv from "dotenv";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";

dotenv.config();

const USER_ID = process.argv[2]; // pass as argument
if (!USER_ID) {
  console.error("❌ Please provide a user ID\nExample: node scripts/seedBanking.js <userId>");
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;

const seedBanking = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    let account = await Account.findOne({ userId: USER_ID });
    if (!account) {
      account = await Account.create({
        userId: USER_ID,
        accountNumber: "123456789012",
        type: "SAVINGS",
        balance: 0,
        currency: "INR"
      });
    }

    const samples = [
      { d: "Initial Deposit", t: "CREDIT", a: 20000 },
      { d: "Groceries", t: "DEBIT", a: 1250 },
      { d: "Electricity Bill", t: "DEBIT", a: 980 },
      { d: "UPI from Rahul", t: "CREDIT", a: 1500 },
      { d: "Coffee", t: "DEBIT", a: 180 }
    ];

    let bal = account.balance;
    const txs = [];

    for (const s of samples) {
      bal = s.t === "CREDIT" ? bal + s.a : bal - s.a;
      txs.push({
        accountId: account._id,
        userId: USER_ID,
        description: s.d,
        type: s.t,
        amount: s.a,
        date: new Date(),
        runningBalance: bal
      });
    }

    await Transaction.insertMany(txs);
    account.balance = bal;
    await account.save();

    console.log(`✅ Seed complete! Account: ${account.accountNumber}, Balance: ₹${bal}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

seedBanking();
