import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";
import Group, { IGroup } from "../models/Group";
import Expense from "../models/Expense";

dotenv.config();
console.log('✅', process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI!);

async function seed() {
  await User.deleteMany({});
  await Group.deleteMany({});
  await Expense.deleteMany({});

  const alice = await User.create({ name: "Alice", email: "alice@test.com", passwordHash: "hashed1", groups: [] });
  const bob = await User.create({ name: "Bob", email: "bob@test.com", passwordHash: "hashed2", groups: [] });
  const charlie = await User.create({ name: "Charlie", email: "charlie@test.com", passwordHash: "hashed3", groups: [] });

  const group1: IGroup = await Group.create({ name: "Friends Trip", members: [alice._id, bob._id, charlie._id], expenses: [] });
  alice.groups.push(group1._id as Types.ObjectId);
  bob.groups.push(group1._id as Types.ObjectId);
  charlie.groups.push(group1._id as Types.ObjectId);

  await alice.save();
  await bob.save();
  await charlie.save();

  console.log("Seeding complete!");
  process.exit(0);
}

seed();