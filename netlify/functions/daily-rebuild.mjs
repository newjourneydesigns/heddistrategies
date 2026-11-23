// Rebuilds the site once a day so articles scheduled for today go live.
// Needs a Netlify build hook URL saved as the BUILD_HOOK_URL environment variable.
export default async () => {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) return new Response("BUILD_HOOK_URL is not set, skipping.");
  const res = await fetch(hook, { method: "POST" });
  return new Response(res.ok ? "Rebuild started." : "Build hook failed.", { status: res.ok ? 200 : 502 });
};

// 11:05 UTC = 5:05 or 6:05 a.m. Central, depending on daylight saving.
export const config = { schedule: "5 11 * * *" };
