import { StreamChat } from "stream-chat";
import "dotenv/config";
import User from "../models/User.js";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Stream API key or Secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

export const generateStreamToken = (userId) => {
  try {
    // ensure userId is a string
    const userIdStr = userId.toString();
    return streamClient.createToken(userIdStr);
  } catch (error) {
    console.error("Error generating Stream token:", error);
  }
};

export const syncAllUsersToStream = async () => {
  try {
    if (!apiKey || !apiSecret) {
      console.warn("Stream credentials not set, skipping user sync.");
      return;
    }
    const users = await User.find({});
    const streamUsers = users.map((u) => ({
      id: u._id.toString(),
      name: u.fullName,
      image: u.profilePic || "",
    }));
    if (streamUsers.length > 0) {
      await streamClient.upsertUsers(streamUsers);
      console.log(`Successfully synced ${streamUsers.length} users to Stream.`);
    }
  } catch (error) {
    console.error("Error syncing all users to Stream:", error.message);
  }
};