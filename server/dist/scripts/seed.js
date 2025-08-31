"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const Group_1 = __importDefault(require("../models/Group"));
const Expense_1 = __importDefault(require("../models/Expense"));
dotenv_1.default.config();
mongoose_1.default.connect(process.env.MONGO_URI);
async function seed() {
    await User_1.default.deleteMany({});
    await Group_1.default.deleteMany({});
    await Expense_1.default.deleteMany({});
    const alice = await User_1.default.create({ name: "Alice", email: "alice@test.com", passwordHash: "hashed1", groups: [] });
    const bob = await User_1.default.create({ name: "Bob", email: "bob@test.com", passwordHash: "hashed2", groups: [] });
    const charlie = await User_1.default.create({ name: "Charlie", email: "charlie@test.com", passwordHash: "hashed3", groups: [] });
    const group1 = await Group_1.default.create({ name: "Friends Trip", members: [alice._id, bob._id, charlie._id], expenses: [] });
    alice.groups.push(group1._id);
    bob.groups.push(group1._id);
    charlie.groups.push(group1._id);
    await alice.save();
    await bob.save();
    await charlie.save();
    console.log("Seeding complete!");
    process.exit(0);
}
seed();
