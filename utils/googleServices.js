import { OAuth2Client } from "google-auth-library";

export const client = new OAuth2Client({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

export async function verifyToken(idToken) {
  const loginTicket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const userData = loginTicket.getPayload();
  return userData ? userData : null;
}

export function generateGdriveAuthURL() {
  return client.generateAuthUrl({
    scope: [process.env.DRIVE_SCOPE_URL],
  });
}

import fetch from "node-fetch";

export async function getTokens(code) {
  const res = await fetch(process.env.GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    }),
  });

  return await res.json();
}

export async function fetchGdriveFiles(access_token) {
  const res = await fetch(
    process.env.DRIVE_FETCH_URL,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  );
  return await res.json();
}
