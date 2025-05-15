// Serve a temporary web server to handle the redirect and collect the code
// import { serve } from "https://deno.land/std/http/server.ts";
import { URL } from 'node:url';
import ServeHandlerInfo = Deno.ServeHandlerInfo;
import Addr = Deno.Addr;

const ac = new AbortController();

export const runServer = async (authUrl: string) => {

  let code: string | null = "";

  function handleRequest(
    req: Request,
    info: ServeHandlerInfo<Addr>,
  ): Response | Promise<Response> {
    const url = new URL(req.url);

    // Check if the request is a redirect with the 'code' parameter
    if (url.searchParams.has("code")) {
      code = url.searchParams.get("code");
      console.log("Received authorization code:", code);

      if (!code) {
        return new Response("Error during authorization.", { status: 500 });
      }

      setTimeout(() => {
        if (!server) {
          return;
        }
        ac.abort();
      }, 500); // Give the server some time to send the response

      return new Response(
        "Authorization successful! You can close this window.",
        {
          status: 200,
        },
      );

      // // Exchange the authorization code for an access token
      // try {
      //   const { tokens } = await oauth2Client.getToken(code!);
      //   oauth2Client.setCredentials(tokens);
      //   console.log('Access token:', tokens);
      //
      //   return new Response('Authorization successful! You can close this window.', {
      //     status: 200,
      //   });
      // } catch (error) {
      //   console.error('Error exchanging code for token:', error);
      //   return new Response('Error during authorization.', { status: 500 });
      // }
    } else {
      // Display a message with the authorization URL
      return new Response(
        `Please authorize the app by visiting this URL: <a href="${authUrl}">${authUrl}</a>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
          },
        },
      );
    }
  }

  // TODO: Find a way to randomize the port?
  // Start the server on port 8099
  // console.log("Server running on http://localhost:8099");
  const server = Deno.serve(
    { signal: ac.signal, port: 8099, hostname: "127.0.0.1" },
    handleRequest,
  );

  await server.finished;
  console.log("Server shutdown");

  return code;
};
