const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Serve static files from current directory
app.use(express.static(__dirname));

// API proxy endpoint for status check
app.get('/api/status', async (req, res) => {
    try {
        const response = await fetch('https://seaart-ai.apis-bj-devs.workers.dev/');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API proxy endpoint for image generation
app.get('/api/generate', async (req, res) => {
    try {
        const prompt = req.query.prompt;
        const resolution = req.query.resolution || 'medium'; // Default to medium resolution
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Define resolution mappings
        const resolutionSizes = {
            'low': '512x512',
            'medium': '768x768',
            'high': '1024x1024'
        };

        const size = resolutionSizes[resolution] || resolutionSizes.medium;

        // Set a longer timeout for the fetch request
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 120 second timeout

        try {
            const response = await fetch(`https://seaart-ai.apis-bj-devs.workers.dev/?Prompt=${encodeURIComponent(prompt)}&size=${size}`, {
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            clearTimeout(timeout); // Clear the timeout if request succeeds

            const data = await response.json();
            res.json(data);
        } catch (fetchError) {
            clearTimeout(timeout);
            throw new Error(`Failed to generate image: ${fetchError.message}`);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download image endpoint
app.get('/api/download', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        // Get the content type from the response
        const contentType = response.headers.get('content-type');
        
        // Set appropriate headers for the download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=seaart-ai-${Date.now()}.${contentType.split('/')[1]}`);

        // Pipe the image data to the response
        response.body.pipe(res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
