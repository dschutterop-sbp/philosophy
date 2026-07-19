# Il Tiratore - Philosophy Layer prototype

A local, dependency-free prototype of the first human review gate for an Instagram Story.

## Run locally

Start the container:

```sh
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). Upload a quay photo, confirm the opening facts, and select **Prepare review**. Set `STORY_PORT` to use another local port.

## Test

```sh
npm test
```

## Delivery pipeline

GitHub Actions runs the domain tests on each pull request and push to `main`. A separate job validates the Compose file and builds the production Nginx image. The workflow intentionally does not publish an image: registry publishing needs a chosen registry and credentials, which should be added as a separate deployment decision.

The pipeline logic is isolated in `src/pipeline.js`:

1. verified operating context;
2. Philosophy interpretation;
3. bounded creative directions;
4. deterministic validation and semantic conformance;
5. the human decision: iterate, publish or cancel.
