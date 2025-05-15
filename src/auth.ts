import { Credentials, OAuth2Client } from "npm:google-auth-library";
import { loadTokens, refreshAccessToken, saveTokens } from "./tokens.ts";
import { runServer } from "./server.ts";
import { open } from "https://deno.land/x/open/index.ts";

export const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

// OAuth2 credentials setup (from credentials.json)
export const oauth2Client = new OAuth2Client(
  Deno.env.get("CLIENT_ID"),
  Deno.env.get("CLIENT_SECRET"),
  Deno.env.get("REDIRECT_URIS"),
);

// Set the OAuth2 client credentials from stored or newly fetched tokens
export const setAndSaveCredentials = async (tokens: Credentials) => {
  oauth2Client.setCredentials(tokens);
  await saveTokens(tokens); // Save the new tokens
};

// Token generation and authentication (run this once to get token.json)
export async function authenticate() {
  let needAuth = true;
  const savedCredentials = await loadTokens();
  // console.log({ savedCredentials });
  if (savedCredentials) {
    console.log("Tokens found, checking expiration...");
    // If the access token is expired, try refreshing it
    if (!savedCredentials.expiry_date) {
      console.log("No expiry date found on access token");
    } else if (savedCredentials.expiry_date < Date.now()) {
      console.log("Access token expired, refreshing...");
      const newCredentials = await refreshAccessToken(savedCredentials);
      await setAndSaveCredentials(newCredentials);
      needAuth = false;
    } else {
      // If the credential is still valid, use it
      await setAndSaveCredentials(savedCredentials);
      needAuth = false;
    }
  }

  if (needAuth) {
    // You need to get the authentication token using OAuth2 flow
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log("Authorize this app by visiting this URL:", url);
    await open(url);

    // After the user authenticates, retrieve the code and exchange it for tokens
    const code = await runServer(url);
    console.log({ code });

    const { tokens: credentials } = await oauth2Client.getToken(code);
    console.log({ credentials });
    await setAndSaveCredentials(credentials);
  }

  // const accessToken = oauth2Client.credentials.access_token;
  // if (!accessToken) {
  //   console.error("No access token.");
  //   return;
  // }
  // console.log({ accessToken });

  // After acquiring an access_token, you may want to check on the audience, expiration,
  // or original scopes requested.  You can do that with the `getTokenInfo` method.
  // const tokenInfo = await oauth2Client.getTokenInfo(
  //   accessToken,
  // );
  // console.log(tokenInfo);
}
