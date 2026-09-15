export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Safely pull the key from Vercel's environment variables
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'NVIDIA_API_KEY is not configured on the server.' });
    }

    try {
        // Forward the request to NVIDIA
        const nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            // We pass the exact model and message history received from the frontend
            body: JSON.stringify({
                model: req.body.model,
                messages: req.body.messages,
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await nvidiaResponse.json();

        // Send the result back to our frontend
        if (!nvidiaResponse.ok) {
            return res.status(nvidiaResponse.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Failed to fetch from NVIDIA API' });
    }
}