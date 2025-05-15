import { oauth2Client } from "./auth.ts";
import { Credentials } from "npm:google-auth-library";

const TOKEN_FILE_PATH = Deno.env.get("TOKEN_FILE_PATH");

export const saveTokens = async (tokens: any): Promise<void> => {
  if (!TOKEN_FILE_PATH) {
    // Skipping.
    console.info(`Define TOKEN_FILE_PATH env to enable saving of tokens.`);
    return;
  }
  Deno.writeTextFileSync(TOKEN_FILE_PATH, JSON.stringify(tokens));
  console.log("Tokens saved to file.");
};

export const loadTokens = async (): Promise<Credentials | null> => {
  if (!TOKEN_FILE_PATH) {
    // Skipping.
    console.info(`Define TOKEN_FILE_PATH env to enable saving of tokens.`);
    return null;
  }

  try {
    const tokenData = await Deno.readTextFile(TOKEN_FILE_PATH);
    return JSON.parse(tokenData) as Credentials;
  } catch (error) {
    if ((error as Error).name === "NotFound") {
      console.error("No existing tokens found, starting fresh.");
      return null;
    }
    console.error("Error parsing tokens:", error);
  }
  return null;
};

// Refresh the access token using the refresh token
export const refreshAccessToken = async (
  oldCredentials: Credentials,
): Promise<Credentials> => {
  try {
    oauth2Client.setCredentials(oldCredentials);
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    Deno.exit(1);
  }
};
