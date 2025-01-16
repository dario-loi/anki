> [!NOTE]
> This codebase was hastily assembled with wide usage of AI tools for personal usage 
> during the fires of an exam session. It is not intended to reflect directly on 
> my coding style, quality of work or ethics. Rather I am sharing it in the hope
> that it may be useful to someone else.

# What the app does

This app is a simple local-hosted web app that allows a user to interact with anki-decks
generated in the JSONL (json lines) format, it also incorporates a built-in pomodoro timer
(with sound effects that I manually programmed myself to procrastinate on my studies!).

The flashcards support markdown and $\LaTeX$ rendering!

# How to utilize it

I found that a useful workflow is to:

1. Upload a set of PDFs/papers to claude.ai using the projects functionality (or a single document for GPT/claude free plans)
2. Ask the model to generate a set of anki flashcards in this JSONL format, where each flashcard is a single json with two keys

```json
{"front": "The front of the card","back": "The back of the card"}
```

It is best to also ask the model to wrap any equation in $\LaTeX$ tags that are **properly escaped** (any backslashes should be doubled) so that the app can render them correctly. You might need to manually add a couple of slashes to the output of the model, since despite all the hype, AI is not quite there yet.

# How to run it

You can run the app by running the following command in the terminal:

```bash
docker-compose up --build
```

Alternatively, without docker, you can create a virtual env and run the following commands:

```bash
pip install -r requirements.txt
uvicorn web:app --reload --port 8000
```

P.S:

I know that a backend is completely useless and most of this could be done front-end only, we accept pull requests if this bothers you :).

In both cases, you can find the app deployed at `http://localhost:8000`.
