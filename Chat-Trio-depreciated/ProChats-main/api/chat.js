// NVIDIA AI chat endpoint
const MODEL_MAP = {
    fast: 'meta/llama-3.1-8b-instruct',
    balanced: 'meta/llama-3.1-70b-instruct',
    smart: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    pro: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    experimental: 'deepseek-ai/deepseek-v3.2',
    gemma: 'gemma-3-27b-it' // Special: uses Google API
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, character, model, systemPrompt, history } = req.body;

        if (!message || !character || !model || !systemPrompt) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const modelId = MODEL_MAP[model] || MODEL_MAP.balanced;
        
        console.log(`[Backend] Request: character=${character}, model=${model}`);

        // Handle Gemma differently (Google API)
        if (model === 'gemma') {
            return await handleGemma(req, res, message, systemPrompt, history, character);
        }

        // Handle NVIDIA models
        const apiKey = process.env.NVIDIA_API_KEY;
        
        if (!apiKey) {
            console.error('[Backend] NVIDIA_API_KEY not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const messages = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];

        if (history && Array.isArray(history)) {
            messages.push(...history.slice(-30));
        }

        messages.push({
            role: 'user',
            content: message
        });

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages,
                temperature: 0.7,
                top_p: 0.95,
                max_tokens: 1024,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`[Backend] NVIDIA API Error (${response.status}):`, errorData);
            
            if (response.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded' });
            }
            
            return res.status(response.status).json({ error: 'AI service error' });
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('[Backend] Unexpected response:', data);
            return res.status(500).json({ error: 'Invalid AI response' });
        }

        const aiResponse = data.choices[0].message.content;

        return res.status(200).json({
            response: aiResponse,
            metadata: {
                model: modelId,
                mode: model
            }
        });

    } catch (error) {
        console.error('[Backend] Error:', error);
        return res.status(500).json({ error: 'Request failed' });
    }
}

// Handle Gemma via Google API
async function handleGemma(req, res, message, systemPrompt, history, character) {
    const apiKey = process.env.GEMMA_API_KEY;
    
    if (!apiKey) {
        console.error('[Backend] GEMMA_API_KEY not configured');
        return res.status(500).json({ error: 'Gemma model not configured' });
    }

    // Build context from history
    const context = history
        .slice(-30)
        .map(msg => `${msg.role === 'user' ? 'User' : character}: ${msg.content}`)
        .join('\n');

    const fullPrompt = `SYSTEM INSTRUCTION:
${systemPrompt}

${context ? `CONVERSATION HISTORY:\n${context}\n` : ''}
USER MESSAGE:
${message}

RESPOND AS CHARACTER:`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`[Backend] Gemma API Error (${response.status}):`, errorData);
            return res.status(response.status).json({ error: 'Gemma API error' });
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0]) {
            console.error('[Backend] Unexpected Gemma response:', data);
            return res.status(500).json({ error: 'Invalid Gemma response' });
        }

        const aiResponse = data.candidates[0].content.parts[0].text;

        return res.status(200).json({
            response: aiResponse,
            metadata: {
                model: 'gemma-3-27b-it',
                mode: 'gemma'
            }
        });

    } catch (error) {
        console.error('[Backend] Gemma Error:', error);
        return res.status(500).json({ error: 'Gemma request failed' });
    }
}
