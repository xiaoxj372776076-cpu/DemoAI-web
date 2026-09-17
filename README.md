# DemoAI Web

DemoAI AI data company website. The project is a dependency-free static site;
navigation products, operator availability, upload rules, and pricing are read
from `DemoAI-server`.

Run a local static server:

```bash
python3 -m http.server 4173
```

## Pages

- `index.html`: company homepage and backend-driven product navigation
- `operators.html`: operator marketplace populated by the operator catalog API
- `asr.html`: ASR detail, pricing, upload, progress, and transcript result

## Local development

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

Open `http://localhost:4173`, choose Product > Operator Marketplace, then open
the ASR operator. The page uploads the file, polls job progress, displays the
transcript, and links to the complete JSON result. Change the
`demoai-api-base` meta value in all HTML pages when the backend is hosted
elsewhere.
