import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// Function to determine port from args, env, or default
const getPort = () => {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex > -1 && process.argv[portArgIndex + 1]) {
    const port = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(port)) return port;
  }
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port)) return port;
  }
  return 8003;
};

const PORT = getPort();

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON bodies

// --- API Routes ---

// Proxy endpoint for Gemini API
app.post('/api/rewrite-message', async (req, res) => {
  const { text } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text to rewrite is required.' });
  }

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Rewrite the following message for a gift to make it more heartfelt and eloquent. Keep the original sentiment and key memories. Here is the original text: "${text}"`,
        config: {
            systemInstruction: "You are a creative writing assistant helping someone write a warm, personal, and heartfelt message to a friend or family member. You refine their words to be more poetic and touching while preserving the core message. Return only the rewritten text, without any additional commentary or quotation marks.",
            temperature: 0.7,
        }
    });

    const rewrittenText = response.text;
    res.json({ rewrittenText });

  } catch (error) {
    console.error('Error proxying to Gemini:', error);
    res.status(500).json({ error: 'An internal server error occurred while contacting the AI assistant.' });
  }
});

// --- Static File Serving ---
// Serve the built React app from the `dist` directory in the parent folder.
const staticFilesPath = path.join(__dirname, '..', 'dist');
app.use(express.static(staticFilesPath));

// --- Catch-all for Client-Side Routing ---
// For any other GET request, serve the index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(staticFilesPath, 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});