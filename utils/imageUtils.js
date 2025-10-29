"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignedUrl = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const server_1 = require("../server");
// default fallback image
const FALLBACK_IMAGE = "https://cdn.pixabay.com/photo/2024/05/24/18/14/astronaut-8785566_960_720.png";
const createSignedUrl = async (key) => {
    if (!key || key.startsWith("http")) {
        return key || FALLBACK_IMAGE;
    }
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: "odds-images",
            Key: key,
        });
        const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(server_1.s3, command, { expiresIn: 60 * 5 }); // 5 min
        if (!signedUrl) {
            throw new Error("Failed to create signed URL");
        }
        return signedUrl;
    }
    catch (err) {
        console.error("Error creating signed URL:", err);
        // fall back to placeholder if signing fails
        return FALLBACK_IMAGE;
    }
};
exports.createSignedUrl = createSignedUrl;
