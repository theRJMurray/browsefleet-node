# Operator mode (Node SDK)

Profile + operator-mode session + human-to-agent handoff via the SDK.

## Prerequisites

- Node 20+
- A BrowseFleet server at `http://localhost:3000`

## Run

```bash
npm install
npm start
```

## What it does

1. Creates a persistent profile.
2. Starts an operator-mode session attached to the profile. The session begins in `human` control.
3. Prints the live viewer URL. (A real UI would render the SSE stream as an `<img>` and overlay your input controls.)
4. Waits for you to type `done` in the terminal.
5. Switches control to `agent` via `sessions.control(...)`.
6. Issues a small action batch as proof the gate is open.
7. Releases the session. The profile persists.

See [`../../docs` in the server repo](https://github.com/theRJMurray/browsefleet/blob/master/docs/operator-mode.md) for the design discussion.
