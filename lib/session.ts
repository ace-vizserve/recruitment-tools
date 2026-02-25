export async function getSessionToken() {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  
  // Create a hash of the password to use as the session token
  const msgBuffer = new TextEncoder().encode(password + "-mrf-salt");
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
