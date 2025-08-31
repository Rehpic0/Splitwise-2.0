"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const group_1 = __importDefault(require("./routes/group"));
const expense_1 = __importDefault(require("./routes/expense"));
const aggregation_1 = __importDefault(require("./routes/aggregation"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
mongoose_1.default.connect(MONGO_URI)
    .then(() => {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
})
    .catch((err) => console.error("MongoDB error:", err));
app.get("/healthz", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth_1.default);
app.use("/api/user", user_1.default);
app.use("/api/groups", group_1.default);
app.use("/api/expenses", expense_1.default);
app.use("/api/aggregation", aggregation_1.default);
