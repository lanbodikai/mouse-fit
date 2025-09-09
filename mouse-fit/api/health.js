// GET /api/health
export default async function handler(_req, res) {
  res.status(200).json({
    ok: true,
    runtime: "vercel-serverless",
    hasKey: Boolean(process.env.GROQ_API_KEY),
  });
}
