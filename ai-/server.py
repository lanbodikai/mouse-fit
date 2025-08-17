from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import textwrap

# ---- config ----
OLLAMA_URL = "http://localhost:11434/api/generate"   # default Ollama endpoint
MODEL_NAME = "llama3.2"                               # or e.g. "llama3.2:8b-instruct"

app = Flask(__name__)
CORS(app)  # allow requests from your Vite dev server

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/report")
def report():
    """
    Expects JSON like:
    {
      "hand": {"length_mm": 175, "width_mm": 80, "grip": "claw"},
      "picks": [
        {
          "brand":"Razer","model":"Viper V3 Pro","length_mm":127.1,"width_mm":63.9,"height_mm":39.9,
          "weight_g":54,"shape":"symmetrical","hump":"back-low",
          "product_url":"https://...","image_url":"https://..."
        },
        ...
      ]
    }
    """
    payload = request.get_json(force=True) or {}
    hand = payload.get("hand") or {}
    picks = payload.get("picks") or []

    if not hand.get("length_mm") or not hand.get("width_mm"):
        return jsonify({"error": "hand.length_mm and hand.width_mm are required"}), 400
    if not picks:
        return jsonify({"error": "picks array is required"}), 400

    # Build a compact candidate table for the prompt
    lines = []
    for p in picks:
        name = f"{p.get('brand','')} {p.get('model','')}".strip()
        dims = f"{p.get('length_mm','?')}×{p.get('width_mm','?')}×{p.get('height_mm','?')} mm"
        wt   = f"{p.get('weight_g','?')} g"
        shape= p.get("shape","?")
        lines.append(f"- {name} | {shape} | {dims} | {wt}")

    prompt = f"""
You are a gaming mouse fit consultant. The user has a {hand['length_mm']:.1f}×{hand['width_mm']:.1f} mm hand and prefers a {hand.get('grip','claw')} grip.
From the candidate list below, choose the best 3–4 and explain WHY (tie reasons to length/width targets, shape/hump, and grip). Avoid marketing fluff.

Candidates:
{textwrap.indent("\n".join(lines), "  ")}

Return concise HTML only (no <html> or <body>), dark-theme friendly:

<section class="fit-report">
  <h2>Overview</h2>
  <p>One short paragraph.</p>

  <h2>Top picks</h2>
  <div class="cards">
    <!-- Repeat for each pick -->
    <article class="card">
      <h3>Brand Model</h3>
      <ul>
        <li>reason 1</li>
        <li>reason 2</li>
        <li>reason 3</li>
      </ul>
      <p class="specs">L×W×H mm &middot; weight g &middot; shape</p>
    </article>
  </div>

  <h2>Also consider</h2>
  <ul>
    <li>Brand Model — one sentence why</li>
    <li>Brand Model — one sentence why</li>
  </ul>

  <p class="tip"><em>One tip on grip posture or size tolerance.</em></p>
</section>
"""

    try:
        r = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False},
            timeout=120
        )
        r.raise_for_status()
        html = (r.json() or {}).get("response", "").strip()
    except Exception as e:
        return jsonify({"error": f"Ollama call failed: {e}"}), 500

    return jsonify({"html": html})

if __name__ == "__main__":
    print("AI server running on http://localhost:5055")
    app.run(host="0.0.0.0", port=5055, debug=True)
