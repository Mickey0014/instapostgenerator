const SUPPORTED_PROVIDERS = ["openai", "gemini", "groq", "fallback"];

function cleanEnvValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProvider(value, fallbackValue = "fallback") {
  const normalized = cleanEnvValue(value).toLowerCase();
  return SUPPORTED_PROVIDERS.includes(normalized) ? normalized : fallbackValue;
}

function providerEnvLabel(provider) {
  if (provider === "gemini") {
    return "GOOGLE_API_KEY or GEMINI_API_KEY";
  }

  if (provider === "openai") {
    return "OPENAI_API_KEY";
  }

  if (provider === "groq") {
    return "GROQ_API_KEY";
  }

  return "";
}

function hasProviderCredentials(provider, config) {
  if (provider === "gemini") {
    return Boolean(config.geminiApiKey);
  }

  if (provider === "openai") {
    return Boolean(config.openaiApiKey);
  }

  if (provider === "groq") {
    return Boolean(config.groqApiKey);
  }

  return provider === "fallback";
}

function createRuntimeConfig() {
  const rawAiProvider = cleanEnvValue(process.env.AI_PROVIDER);
  const rawLlmProvider = cleanEnvValue(process.env.LLM_PROVIDER);
  const rawFallbackProvider = cleanEnvValue(
    process.env.AI_FALLBACK_PROVIDER || process.env.LLM_FALLBACK_PROVIDER
  );
  const requestedProvider = (rawAiProvider || rawLlmProvider || "fallback").toLowerCase();
  const provider = normalizeProvider(requestedProvider);
  const requestedFallbackProvider = rawFallbackProvider.toLowerCase();
  const fallbackProvider = requestedFallbackProvider
    ? normalizeProvider(requestedFallbackProvider, "")
    : "";

  const openaiApiKey = cleanEnvValue(process.env.OPENAI_API_KEY);
  const geminiApiKey = cleanEnvValue(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  const groqApiKey = cleanEnvValue(process.env.GROQ_API_KEY);
  const openaiModel = cleanEnvValue(process.env.OPENAI_MODEL) || "gpt-4.1-mini";
  const geminiModel = cleanEnvValue(process.env.GEMINI_MODEL) || "gemini-1.5-flash";
  const groqModel = cleanEnvValue(process.env.GROQ_MODEL) || "llama-3.3-70b-versatile";
  const groqBaseUrl = cleanEnvValue(process.env.GROQ_BASE_URL) || "https://api.groq.com/openai/v1";

  const warnings = [];
  const errors = [];
  const config = {
    provider,
    fallbackProvider,
    requestedProvider,
    requestedFallbackProvider,
    openaiApiKey,
    geminiApiKey,
    groqApiKey,
    openaiModel,
    geminiModel,
    groqModel,
    groqBaseUrl
  };

  if (requestedProvider !== provider) {
    warnings.push(
      `Unsupported AI provider "${requestedProvider}" configured. Falling back to "${provider}".`
    );
  }

  if (rawAiProvider && rawLlmProvider && rawAiProvider.toLowerCase() !== rawLlmProvider.toLowerCase()) {
    warnings.push(
      `AI_PROVIDER="${rawAiProvider}" overrides LLM_PROVIDER="${rawLlmProvider}".`
    );
  }

  if (cleanEnvValue(process.env.GOOGLE_API_KEY) && cleanEnvValue(process.env.GEMINI_API_KEY)) {
    warnings.push("GOOGLE_API_KEY is set, so it takes precedence over GEMINI_API_KEY.");
  }

  if (requestedFallbackProvider && !fallbackProvider) {
    warnings.push(
      `Unsupported fallback provider "${requestedFallbackProvider}" configured. Ignoring fallback provider.`
    );
  }

  if (fallbackProvider && fallbackProvider === provider) {
    warnings.push(`Fallback provider "${fallbackProvider}" matches the primary provider and will be ignored.`);
  }

  if (provider !== "fallback" && !hasProviderCredentials(provider, config)) {
    errors.push(
      `AI_PROVIDER is set to ${provider}, but ${providerEnvLabel(provider)} is missing in the server environment.`
    );
  }

  if (
    fallbackProvider &&
    fallbackProvider !== provider &&
    fallbackProvider !== "fallback" &&
    !hasProviderCredentials(fallbackProvider, config)
  ) {
    warnings.push(
      `Fallback provider "${fallbackProvider}" is configured, but ${providerEnvLabel(
        fallbackProvider
      )} is missing. Fallback requests will be skipped.`
    );
  }

  return {
    provider,
    fallbackProvider: fallbackProvider && fallbackProvider !== provider ? fallbackProvider : "",
    requestedProvider,
    requestedFallbackProvider,
    openaiApiKey,
    geminiApiKey,
    groqApiKey,
    openaiModel,
    geminiModel,
    groqModel,
    groqBaseUrl,
    warnings,
    errors
  };
}

function getRuntimeConfig() {
  return createRuntimeConfig();
}

function getReadinessStatus() {
  const config = createRuntimeConfig();

  return {
    ok: config.errors.length === 0,
    provider: config.provider,
    fallbackProvider: config.fallbackProvider,
    requestedProvider: config.requestedProvider,
    requestedFallbackProvider: config.requestedFallbackProvider,
    warnings: config.warnings,
    errors: config.errors,
    models: {
      openai: config.openaiModel,
      gemini: config.geminiModel,
      groq: config.groqModel
    }
  };
}

function assertValidConfig() {
  const status = getReadinessStatus();

  if (!status.ok) {
    throw new Error(`Invalid runtime configuration:\n- ${status.errors.join("\n- ")}`);
  }

  return status;
}

module.exports = {
  SUPPORTED_PROVIDERS,
  assertValidConfig,
  getReadinessStatus,
  getRuntimeConfig
};
