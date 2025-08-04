"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: '*', // or your frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
const PORT = parseInt(process.env.SERVER_PORT || "3000", 10);
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const coins_1 = __importDefault(require("./routes/coins"));
const followers_1 = __importDefault(require("./routes/followers"));
const recomendations_1 = __importDefault(require("./routes/recomendations"));
const events_1 = __importDefault(require("./routes/events"));
// Use routes
app.use("/auth", auth_1.default);
app.use("/users", users_1.default);
app.use("/coins", coins_1.default);
app.use("/followers", followers_1.default);
app.use("/recomendations", recomendations_1.default);
app.use("/event", events_1.default);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
