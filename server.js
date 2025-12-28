const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// YouTube Search Route
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await axios.get(url);

    const html = response.data;
    const videoIds = [...html.matchAll(/"videoId":"(.*?)"/g)].map(v => v[1]);
    const titles = [...html.matchAll(/"title":\{"runs":\[{"text":"(.*?)"}/g)].map(t => t[1]);

    const results = [];
    for (let i = 0; i < Math.min(videoIds.length, 10); i++) {
      results.push({
        videoId: videoIds[i],
        title: titles[i] || "No Title"
      });
    }

    res.json(results);
  } catch (err) {
    console.log(err);
    res.json([]);
  }
});

// Export the app for Vercel serverless function
module.exports = app;
