# Agent task

Vision-based agent task end-to-end. The agent takes a natural-language goal, screenshots the page, picks an action, executes, repeats.

## Prerequisites

- Node 20+
- A BrowseFleet server at `http://localhost:3000`
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` configured on the server (or pass per-request via `apiKey`)

## Run

```bash
npm install
npm start
```

## What it does

1. Asks the BrowseFleet agent to extract the H1 from `https://example.com`.
2. Prints the final result and the number of iterations the agent took.
