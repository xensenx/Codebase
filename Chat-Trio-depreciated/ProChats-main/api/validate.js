// Password validation endpoint
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
        const { password } = req.body;
        
        const correctPassword = process.env.ADMIN_PASSWORD;
        
        if (!correctPassword) {
            console.error('[Validate] ADMIN_PASSWORD not set in environment variables!');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        const valid = password === correctPassword;
        
        // Generate version from password hash (changes when password changes)
        const version = simpleHash(correctPassword);
        
        return res.status(200).json({ 
            valid,
            version // Return version to frontend for tracking
        });
        
    } catch (error) {
        console.error('[Validate Error]', error);
        return res.status(500).json({ error: 'Server error' });
    }
}

// Simple hash function to generate version from password
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
