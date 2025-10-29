import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../server";

// default fallback image
const FALLBACK_IMAGE =
  "https://cdn.pixabay.com/photo/2024/05/24/18/14/astronaut-8785566_960_720.png";

export const createSignedUrl = async (key?: string): Promise<string> => {

  if (!key || key.startsWith("http")) {
    return key || FALLBACK_IMAGE;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: "odds-images",
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 min

    if (!signedUrl) {
      throw new Error("Failed to create signed URL");
    }

    return signedUrl;
  } catch (err) {
    console.error("Error creating signed URL:", err);
    // fall back to placeholder if signing fails
    return FALLBACK_IMAGE;
  }
};
