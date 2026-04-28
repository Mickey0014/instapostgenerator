const express = require("express");

const postController = require("../controllers/postController");

const router = express.Router();

router.get("/health", postController.healthCheck);
router.get("/asset", postController.proxyAsset);
router.post("/search-news", postController.searchNews);
router.post("/generate-from-link", postController.generateFromLink);
router.post("/generate-post", postController.generatePost);

module.exports = router;
