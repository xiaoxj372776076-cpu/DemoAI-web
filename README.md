# DemoAI Web

DemoAI AI data company homepage. The project is a dependency-free static site
with responsive navigation, hover dropdowns, and mobile menu interactions.

Open `index.html` directly in a browser, or run a local static server:

```bash
python3 -m http.server 4173
```

## ASR playground

The interactive ASR section expects `DemoAI-server` at
`http://localhost:8080`. Start the Go backend first, then serve this repository:

```bash
cd ../DemoAI-server
go run ./cmd/server
```

```bash
cd ../DemoAI-web
python3 -m http.server 4173
```

Open `http://localhost:4173`, choose a video or audio file, and start the ASR
job. The page uploads the file, polls job progress, displays the transcript, and
links to the complete JSON result. Change the `demoai-api-base` meta value in
`index.html` when the backend is hosted elsewhere.
