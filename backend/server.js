require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { assertValidConfig, getReadinessStatus } = require("./config");
const apiRoutes = require("./routes");

const startupStatus = getReadinessStatus();

startupStatus.warnings.forEach((warning) => {
  console.warn(`[config] ${warning}`);
});

assertValidConfig();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const frontendDistPath = path.join(__dirname, "..", "frontend", "dist");

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  const status = getReadinessStatus();

  res.status(status.ok ? 200 : 503).json({
    ok: status.ok,
    provider: status.provider,
    fallbackProvider: status.fallbackProvider,
    warnings: status.warnings,
    errors: status.errors,
    models: status.models
  });
});

app.use("/api", apiRoutes);

app.use(express.static(frontendDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api") || !req.accepts("html")) {
    return next();
  }

  res.sendFile(path.join(frontendDistPath, "index.html"), (error) => {
    if (error) {
      res.status(404).json({
        error: "Frontend build not found. Run `npm run build` first."
      });
    }
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || "Something went wrong."
  });
});

app.listen(PORT, () => {
  const fallbackLabel = startupStatus.fallbackProvider
    ? ` and fallback "${startupStatus.fallbackProvider}"`
    : "";
  console.log(
    `Server listening on port ${PORT} with provider "${startupStatus.provider}"${fallbackLabel}.`
  );
});
