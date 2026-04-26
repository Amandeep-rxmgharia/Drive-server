export default async function(code) {
        const client_id = process.env.GITHUB_CLIENT_ID
        const client_secret = process.env.GITHUB_CLIENT_SECRET
    try{
      const tokenResponse = await fetch(
    process.env.GITHUB_TOKEN_URL,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    }
  );
   const tokenData = await tokenResponse.json();
  
  const accessToken = tokenData.access_token;
  console.log(accessToken);
  if(!accessToken) return {error: "Token Invald!"}
  // User data fetch
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const userDetails = await userResponse.json()
  console.log(userDetails)
const emailResponse = await fetch(
  "https://api.github.com/user/emails",
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
);
  const emails = await emailResponse.json()
  console.log(emails);
  const primaryEmail = emails?.find(e => e.primary)?.email;
  const userData = {
    name: userDetails.login,
    email: primaryEmail,
    provider: 'GITHUB'
  }
  return userData
    }catch(err) {
      return {error: err}
    }

 
}