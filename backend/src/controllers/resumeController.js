const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");

exports.parseResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let text = "";

    const fileType = req.file.mimetype;
    const fileName = req.file.originalname.toLowerCase();

    // ================= PDF =================
    if (fileType === "application/pdf") {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    }

    // ================= WORD =================
    else if (
      fileType.includes("word") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc")
    ) {
      const result = await mammoth.extractRawText({
        buffer: req.file.buffer,
      });
      text = result.value;
    }

    // ================= IMAGE =================
    else if (fileType.startsWith("image/")) {
      const result = await Tesseract.recognize(req.file.buffer, "eng");
      text = result.data.text;
    }

    else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // ================= COMMON EXTRACTION =================
    const email =
      text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";

    const phoneMatch = text.match(/(\+91[-\s]?)?[6-9]\d{9}/);
    const phone = phoneMatch
      ? phoneMatch[0].replace(/\D/g, "").slice(-10)
      : "";

    // NAME
    let firstName = "";
    let lastName = "";

    const lines = text.split("\n").filter(l => l.trim());

    for (let line of lines.slice(0, 10)) {
      const clean = line.trim();

      if (
        clean.length < 3 ||
        clean.length > 40 ||
        clean.includes("@") ||
        /\d/.test(clean)
      ) continue;

      const words = clean.split(" ");

      if (words.length >= 2) {
        firstName = words[0];
        lastName = words.slice(1).join(" ");
        break;
      }
    }

    const name = `${firstName} ${lastName}`.trim();

    // CITY
    const cities = ["Mumbai","Delhi","Noida","Ghaziabad","Pune","Hyderabad","Chennai","Bangalore"];

    let city = "";
    for (let c of cities) {
      if (new RegExp(`\\b${c}\\b`, "i").test(text)) {
        city = c;
        break;
      }
    }

    // STATE
    const stateMap = {
      Mumbai: "Maharashtra",
      Pune: "Maharashtra",
      Delhi: "Delhi",
      Noida: "Uttar Pradesh",
      Ghaziabad: "Uttar Pradesh",
      Bangalore: "Karnataka",
      Hyderabad: "Telangana",
      Chennai: "Tamil Nadu"
    };

    const state = stateMap[city] || "";

    // SOURCE
    let sourcedFrom = "Resume Upload";
    if (/linkedin/i.test(text)) sourcedFrom = "LinkedIn";
    else if (/naukri/i.test(text)) sourcedFrom = "Naukri";
    else if (/indeed/i.test(text)) sourcedFrom = "Indeed";

    return res.json({
      success: true,
      name,
      firstName,
      lastName,
      email,
      phone,
      city,
      state,
      country: "India",
      recruiter: "Self",
      sourcedFrom,
      sourceDate: new Date().toISOString().split("T")[0],
      fullText: text.substring(0, 2000),
    });

  } catch (err) {
    console.error("❌ Resume Parse Error:", err);
    res.status(500).json({ error: "Resume parsing failed" });
  }
};