exports.parseResume = async (req, res) => {
  try {
    console.log("API HIT ✅");

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // dummy response for test
    res.json({
      name: "Test User",
      email: "test@example.com"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};