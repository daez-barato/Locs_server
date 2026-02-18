"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authenticateToken_1 = __importDefault(require("../middleware/authenticateToken"));
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.get("/profile/:id", authenticateToken_1.default, userController_1.getUserById);
router.post("/save/template/:templateId", authenticateToken_1.default, userController_1.saveTemplate);
router.delete("/delete/savedTemplate/:templateId", authenticateToken_1.default, userController_1.deleteTemplate);
router.get("/savedTemplates", authenticateToken_1.default, userController_1.getUserSavedTemplates);
router.patch("/settings/changePrivacy", authenticateToken_1.default, userController_1.changePrivacy);
router.post("/settings/uploadProfilePicture", upload.single("image"), authenticateToken_1.default, userController_1.uploadProfilePicture);
exports.default = router;
