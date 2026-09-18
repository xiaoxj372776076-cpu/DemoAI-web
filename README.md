# DemoAI Web

DemoAI AI data company site. The project is a dependency-free static site with
responsive navigation, hover dropdowns, and mobile menu interactions.

**Rendering only.** All product navigation entries and the operator catalog are
fetched from `DemoAI-server` at runtime; no product or operator copy is
hard-coded in these pages.

| Backend data | Endpoint | Rendered by |
| --- | --- | --- |
| Product navigation | `GET /api/v1/catalog/products` | `[data-product-list]` |
| Operator catalog | `GET /api/v1/operators` | `[data-operator-grid]` |

## Pages

- `index.html`: company homepage, backend-driven product navigation, ASR playground
- `operators.html`: operator marketplace, populated by the operator catalog API
- `handpose.html`: hand pose playground, renders the operator's skeleton video

Run a local static server:

```bash
python3 -m http.server 4173
```

## Playgrounds

Both playgrounds expect `DemoAI-server` at `http://localhost:8080`. Start the Go
backend first, then serve this repository:

```bash
cd ../DemoAI-server
go run ./cmd/server
```

```bash
cd ../DemoAI-web
python3 -m http.server 4173
```

Open `http://localhost:4173`, choose a video or audio file, and start the job.
The page uploads the file, polls job progress, and renders the artifacts the
backend reports:

| Page | Operator | Artifact rendered |
| --- | --- | --- |
| `index.html#playground` | `asr` | transcript text, language, duration, JSON link |
| `handpose.html` | `hand_pose` | rendered skeleton video, per-frame keypoint JSON |

Change the `demoai-api-base` meta value in every HTML page when the backend is
hosted elsewhere.
