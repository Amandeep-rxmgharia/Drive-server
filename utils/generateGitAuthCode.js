export default async function () {
    const client_id = process.env.GITHUB_CLIENT_ID
    const redirect_uri = process.env.GITHUB_REDIRECT_URI
  const URL = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=read:user user:email`;
  return URL
}
