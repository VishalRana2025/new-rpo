const express = require("express");
const router = express.Router();
const multer = require("multer");

const { parseResume } = require("../controllers/resumeController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/parse-resume", upload.single("file"), parseResume);

module.exports = router;