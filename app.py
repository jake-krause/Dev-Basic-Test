# -----------------------
# Your Azure API Key Setup
# -----------------------
AZURE_OPENAI_API_KEY = "Ah0TUKlywJuqkBwaHfJiqLJhXpJ8fksiuKPEBxJcHbaqej9oNmFqJQQJ99BAACHYHv6XJ3w3AAAAACOGBjre"
AZURE_ENDPOINT = "https://ai-demohub605911395249.cognitiveservices.azure.com/"
DEPLOYMENT_NAME = "gpt-4.1"

# -----------------------
# Flask + Azure AI (streaming)
# -----------------------
from flask import (
    Flask, Response, request, stream_with_context,
    send_from_directory, make_response
)
from openai import AzureOpenAI
import os, uuid

client = AzureOpenAI(
    api_key        = AZURE_OPENAI_API_KEY,
    api_version    = "2024-12-01-preview",
    azure_endpoint = AZURE_ENDPOINT
)

app = Flask(
    __name__,
    template_folder=".",
    static_folder="."
)

# ─── very small in-memory store ──────────────────────────────────────────────
# { session_id : [ {role: "user"/"assistant", content: "..."} , ... ] }
CONVERSATIONS = {}
MAX_HISTORY   = 20          # keep last 20 messages total (10 user/assistant pairs)

def get_session_id() -> str:
    """Return existing cookie or make a new one."""
    sid = request.cookies.get("chat_sid")
    if not sid:
        sid = uuid.uuid4().hex
    return sid

def get_history(sid: str):
    return CONVERSATIONS.setdefault(sid, [])

# ─── routes ──────────────────────────────────────────────────────────────────
# import uuid  (already in the file)

@app.route("/")
def home():
    # always mint a fresh session id → new blank conversation
    new_sid = uuid.uuid4().hex

    # optional: tidy up memory from any previous SID the browser had
    old_sid = request.cookies.get("chat_sid")
    if old_sid in CONVERSATIONS:
        del CONVERSATIONS[old_sid]

    resp = make_response(app.send_static_file("index.html"))
    resp.set_cookie("chat_sid", new_sid)     # no max_age → session cookie;
                                             # but we overwrite it each load anyway
    return resp


@app.route("/<path:filename>")
def root_files(filename):
    return send_from_directory(".", filename)

@app.route("/ask", methods=["POST"])
def ask():
    user_input = request.json.get("message", "")
    sid        = get_session_id()
    history    = get_history(sid)

    # ---- assemble the prompt ----
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. "
                "When you include code, ALWAYS wrap it in markdown fences, e.g.\n"
                "```python\nprint('hi')\n```\n"
                "so the frontend can render it correctly."
            )
        },
        *history,
        {"role": "user", "content": user_input}
    ]

    def generate():
        try:
            stream = client.chat.completions.create(
                model       = DEPLOYMENT_NAME,
                stream      = True,
                temperature = 0.7,
                max_tokens  = 1000,
                messages    = messages
            )

            assistant_response = []

            for chunk in stream:
                # ---- real safety check ----
                if not chunk.choices:
                    continue   # skip empty chunks

                choice = chunk.choices[0]
                token = getattr(choice.delta, "content", None)
                if token:
                    assistant_response.append(token)
                    yield token

            # ---- save this turn ----
            history.append({"role": "user",      "content": user_input})
            history.append({"role": "assistant", "content": "".join(assistant_response)})

            # trim old turns
            if len(history) > MAX_HISTORY:
                del history[: len(history) - MAX_HISTORY]

        except Exception as e:
            yield f"[Error] {e}"


    return Response(
        stream_with_context(generate()),
        mimetype="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    app.run(debug=True)   # host="0.0.0.0" if you want LAN exposure
