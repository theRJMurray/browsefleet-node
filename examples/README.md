# Examples

Runnable example projects for the `browsefleet` Node SDK.

| Example                              | Demonstrates                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [`quickstart/`](./quickstart/)       | Scrape, screenshot, release. The 5-line snippet expanded to a real script.                                |
| [`agent-task/`](./agent-task/)       | Vision-based agent task end-to-end. Requires `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` on the server.       |
| [`operator-mode/`](./operator-mode/) | Profile creation + operator-mode session + human-to-agent handoff via the control state machine.          |
| [`cdp-direct/`](./cdp-direct/)       | Use the SDK to create a session and read its `websocketUrl`, then connect with `puppeteer-core` directly. |

## Running an example

Every example assumes a BrowseFleet server is running at `http://localhost:3000`. Start one from the [server repo](https://github.com/theRJMurray/browsefleet):

```bash
docker run -p 3000:3000 --shm-size=2g ghcr.io/therjmurray/browsefleet:latest
```

Then in this repo's `examples/<name>/`:

```bash
npm install
npm start
```

Each example takes the same env vars:

- `BROWSEFLEET_URL` (default `http://localhost:3000`)
- `BROWSEFLEET_API_KEY` (optional; omit when the server is authless)

## A note on the SDK source

The examples install `browsefleet` from npm (the published package). Until the first release lands, you can substitute a local link:

```bash
cd .. && npm pack
cd examples/quickstart && npm install ../../browsefleet-*.tgz
```
