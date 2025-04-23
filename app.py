# -----------------------
# Your Azure API Key Setup
# -----------------------
AZURE_OPENAI_API_KEY = "Ah0TUKlywJuqkBwaHfJiqLJhXpJ8fksiuKPEBxJcHbaqej9oNmFqJQQJ99BAACHYHv6XJ3w3AAAAACOGBjre"
AZURE_ENDPOINT = "https://ai-demohub605911395249.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2025-01-01-preview"
DEPLOYMENT_NAME = "Test_AI_Deployment"

# -----------------------
# Flask + Azure AI (streaming)
# -----------------------
from flask import Flask, Response, request, stream_with_context, send_from_directory
from openai import AzureOpenAI
import os


client = AzureOpenAI(
    api_key        = AZURE_OPENAI_API_KEY,
    api_version    = "2023-05-15",
    azure_endpoint = AZURE_ENDPOINT
)

# ─── Flask setup (everything served from current dir) ────────────────────────
app = Flask(
    __name__,
    template_folder=".",   # so render_template can find index.html right here
    static_folder="."      # so /styles.css, /main.js, /logo.png resolve automatically
)

@app.route("/")
def home():
    return app.send_static_file("index.html")   # equivalent to render_template here

# serve any other top‑level static file (e.g., gpt4o.html, docs.html)
@app.route("/<path:filename>")
def root_files(filename):
    # if file exists in current folder, serve it; otherwise 404 and let front‑end handle
    return send_from_directory(".", filename)

# ---- Chat endpoint (streams text/plain) ------------------------------------
@app.route("/ask", methods=["POST"])
def ask():
    user_input = request.json.get("message", "")

    def generate():
        """Yield a *single* token at a time + tiny heartbeat gaps."""
        try:
            stream = client.chat.completions.create(
                model       = DEPLOYMENT_NAME,
                stream      = True,
                temperature = 0.7,
                max_tokens  = 1000,
                messages    = [
                    {
                        "role": "system",
                        "content": (
                            "You are a demonstration assistant for the SECURA AI Hub. "
                            "Be friendly and fun, but do not write code or solve complex tasks."
                        )
                    },
                    {"role": "user", "content": user_input}
                ]
            )

            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    # send just the *new* token
                    yield token
                else:
                    # tiny heartbeat so the browser sees progress even if no token yet
                    yield " "
        except Exception as e:
            yield f"[Error] {e}"

    return Response(
        stream_with_context(generate()),
        mimetype="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"  # Nginx / Akamai / Cloudflare
        }
    )


if __name__ == "__main__":
    # use host="0.0.0.0" to expose on LAN if needed
    app.run(debug=True)