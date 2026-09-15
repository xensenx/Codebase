// The list of models you provided
const models = [
    "01-ai/yi-large", "abacusai/dracarys-llama-3.1-70b-instruct", "adept/fuyu-8b", "ai21labs/jamba-1.5-large-instruct", "ai21labs/jamba-1.5-mini-instruct", "aisingapore/sea-lion-7b-instruct", "baai/bge-m3", "baichuan-inc/baichuan2-13b-chat", "bigcode/starcoder2-15b", "bigcode/starcoder2-7b", "bytedance/seed-oss-36b-instruct", "databricks/dbrx-instruct", "deepseek-ai/deepseek-coder-6.7b-instruct", "deepseek-ai/deepseek-r1-distill-llama-8b", "deepseek-ai/deepseek-r1-distill-qwen-14b", "deepseek-ai/deepseek-r1-distill-qwen-32b", "deepseek-ai/deepseek-r1-distill-qwen-7b", "deepseek-ai/deepseek-v3.1", "deepseek-ai/deepseek-v3.1-terminus", "deepseek-ai/deepseek-v3.2", "google/codegemma-1.1-7b", "google/codegemma-7b", "google/deplot", "google/gemma-2-27b-it", "google/gemma-2-2b-it", "google/gemma-2-9b-it", "google/gemma-2b", "google/gemma-3-12b-it", "google/gemma-3-1b-it", "google/gemma-3-27b-it", "google/gemma-3-4b-it", "google/gemma-3n-e2b-it", "google/gemma-3n-e4b-it", "google/gemma-7b", "google/paligemma", "google/recurrentgemma-2b", "google/shieldgemma-9b", "gotocompany/gemma-2-9b-cpt-sahabatai-instruct", "ibm/granite-3.0-3b-a800m-instruct", "ibm/granite-3.0-8b-instruct", "ibm/granite-3.3-8b-instruct", "ibm/granite-34b-code-instruct", "ibm/granite-8b-code-instruct", "ibm/granite-guardian-3.0-8b", "igenius/colosseum_355b_instruct_16k", "igenius/italia_10b_instruct_16k", "institute-of-science-tokyo/llama-3.1-swallow-70b-instruct-v0.1", "institute-of-science-tokyo/llama-3.1-swallow-8b-instruct-v0.1", "marin/marin-8b-instruct", "mediatek/breeze-7b-instruct", "meta/codellama-70b", "meta/llama-3.1-405b-instruct", "meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct", "meta/llama-3.2-11b-vision-instruct", "meta/llama-3.2-1b-instruct", "meta/llama-3.2-3b-instruct", "meta/llama-3.2-90b-vision-instruct", "meta/llama-3.3-70b-instruct", "meta/llama-4-maverick-17b-128e-instruct", "meta/llama-4-scout-17b-16e-instruct", "meta/llama-guard-4-12b", "meta/llama2-70b", "meta/llama3-70b-instruct", "meta/llama3-8b-instruct", "microsoft/kosmos-2", "microsoft/phi-3-medium-128k-instruct", "microsoft/phi-3-medium-4k-instruct", "microsoft/phi-3-mini-128k-instruct", "microsoft/phi-3-mini-4k-instruct", "microsoft/phi-3-small-128k-instruct", "microsoft/phi-3-small-8k-instruct", "microsoft/phi-3-vision-128k-instruct", "microsoft/phi-3.5-mini-instruct", "microsoft/phi-3.5-moe-instruct", "microsoft/phi-3.5-vision-instruct", "microsoft/phi-4-mini-flash-reasoning", "microsoft/phi-4-mini-instruct", "microsoft/phi-4-multimodal-instruct", "minimaxai/minimax-m2.5", "mistralai/codestral-22b-instruct-v0.1", "mistralai/devstral-2-123b-instruct-2512", "mistralai/magistral-small-2506", "mistralai/mamba-codestral-7b-v0.1", "mistralai/mathstral-7b-v0.1", "mistralai/ministral-14b-instruct-2512", "mistralai/mistral-7b-instruct-v0.2", "mistralai/mistral-7b-instruct-v0.3", "mistralai/mistral-large", "mistralai/mistral-large-2-instruct", "mistralai/mistral-large-3-675b-instruct-2512", "mistralai/mistral-medium-3-instruct", "mistralai/mistral-nemotron", "mistralai/mistral-small-24b-instruct", "mistralai/mistral-small-3.1-24b-instruct-2503", "mistralai/mistral-small-4-119b-2603", "mistralai/mixtral-8x22b-instruct-v0.1", "mistralai/mixtral-8x22b-v0.1", "mistralai/mixtral-8x7b-instruct-v0.1", "moonshotai/kimi-k2-instruct", "moonshotai/kimi-k2-instruct-0905", "moonshotai/kimi-k2-thinking", "moonshotai/kimi-k2.5", "nv-mistralai/mistral-nemo-12b-instruct", "nvidia/cosmos-reason2-8b", "nvidia/embed-qa-4", "nvidia/gliner-pii", "nvidia/llama-3.1-nemoguard-8b-content-safety", "nvidia/llama-3.1-nemoguard-8b-topic-control", "nvidia/llama-3.1-nemotron-51b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct", "nvidia/llama-3.1-nemotron-70b-reward", "nvidia/llama-3.1-nemotron-nano-4b-v1.1", "nvidia/llama-3.1-nemotron-nano-8b-v1", "nvidia/llama-3.1-nemotron-nano-vl-8b-v1", "nvidia/llama-3.1-nemotron-safety-guard-8b-v3", "nvidia/llama-3.1-nemotron-ultra-253b-v1", "nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1", "nvidia/llama-3.2-nemoretriever-300m-embed-v1", "nvidia/llama-3.2-nv-embedqa-1b-v1", "nvidia/llama-3.2-nv-embedqa-1b-v2", "nvidia/llama-3.3-nemotron-super-49b-v1", "nvidia/llama-3.3-nemotron-super-49b-v1.5", "nvidia/llama-nemotron-embed-1b-v2", "nvidia/llama-nemotron-embed-vl-1b-v2", "nvidia/llama3-chatqa-1.5-70b", "nvidia/llama3-chatqa-1.5-8b", "nvidia/mistral-nemo-minitron-8b-8k-instruct", "nvidia/mistral-nemo-minitron-8b-base", "nvidia/nemoretriever-parse", "nvidia/nemotron-3-nano-30b-a3b", "nvidia/nemotron-3-super-120b-a12b", "nvidia/nemotron-4-340b-instruct", "nvidia/nemotron-4-340b-reward", "nvidia/nemotron-4-mini-hindi-4b-instruct", "nvidia/nemotron-content-safety-reasoning-4b", "nvidia/nemotron-mini-4b-instruct", "nvidia/nemotron-nano-12b-v2-vl", "nvidia/nemotron-nano-3-30b-a3b", "nvidia/nemotron-parse", "nvidia/neva-22b", "nvidia/nv-embed-v1", "nvidia/nv-embedcode-7b-v1", "nvidia/nv-embedqa-e5-v5", "nvidia/nv-embedqa-mistral-7b-v2", "nvidia/nvclip", "nvidia/nvidia-nemotron-nano-9b-v2", "nvidia/riva-translate-4b-instruct", "nvidia/riva-translate-4b-instruct-v1.1", "nvidia/streampetr", "nvidia/vila", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "opengpt-x/teuken-7b-instruct-commercial-v0.4", "qwen/qwen2-7b-instruct", "qwen/qwen2.5-7b-instruct", "qwen/qwen2.5-coder-32b-instruct", "qwen/qwen2.5-coder-7b-instruct", "qwen/qwen3-coder-480b-a35b-instruct", "qwen/qwen3-next-80b-a3b-instruct", "qwen/qwen3-next-80b-a3b-thinking", "qwen/qwen3.5-122b-a10b", "qwen/qwen3.5-397b-a17b", "qwen/qwq-32b", "rakuten/rakutenai-7b-chat", "rakuten/rakutenai-7b-instruct", "sarvamai/sarvam-m", "snowflake/arctic-embed-l", "speakleash/bielik-11b-v2.3-instruct", "speakleash/bielik-11b-v2.6-instruct", "stepfun-ai/step-3.5-flash", "stockmark/stockmark-2-100b-instruct", "thudm/chatglm3-6b", "tiiuae/falcon3-7b-instruct", "tokyotech-llm/llama-3-swallow-70b-instruct-v0.1", "upstage/solar-10.7b-instruct", "utter-project/eurollm-9b-instruct", "writer/palmyra-creative-122b", "writer/palmyra-fin-70b-32k", "writer/palmyra-med-70b", "writer/palmyra-med-70b-32k", "yentinglin/llama-3-taiwan-70b-instruct", "z-ai/glm4.7", "z-ai/glm5", "zyphra/zamba2-7b-instruct"
];

const datalist = document.getElementById('model-options');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Independent state tracking for both panels
const state = {
    1: { select: document.getElementById('model-select-1'), box: document.getElementById('chat-box-1'), history: [] },
    2: { select: document.getElementById('model-select-2'), box: document.getElementById('chat-box-2'), history: [] }
};

// Populate the hidden datalist for the search bars
models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    datalist.appendChild(option);
});

// Clear history if a model is changed in either panel
[1, 2].forEach(id => {
    state[id].select.addEventListener('change', () => {
        state[id].history = [];
        state[id].box.innerHTML = `<div class="message system">Switched to ${state[id].select.value}. History cleared.</div>`;
    });
});

function appendMessage(paneId, role, text, isError = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role} ${isError ? 'error' : ''}`;
    msgDiv.textContent = text;
    state[paneId].box.appendChild(msgDiv);
    state[paneId].box.scrollTop = state[paneId].box.scrollHeight;
}

// Fetch helper function to keep code clean
async function fetchAIResponse(paneId, text) {
    const modelName = state[paneId].select.value.trim();
    if (!modelName) {
        appendMessage(paneId, 'system', 'Please select a valid model from the search bar.', true);
        return;
    }

    // Add user message to specific history
    state[paneId].history.push({ role: 'user', content: text });

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                messages: state[paneId].history
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'API Error: Make sure model name is exact.');
        }

        const aiResponse = data.choices[0].message.content;
        appendMessage(paneId, 'ai', aiResponse);
        state[paneId].history.push({ role: 'assistant', content: aiResponse });

    } catch (error) {
        appendMessage(paneId, 'ai', `Error: ${error.message}`, true);
        // Remove the failed user message from history so it doesn't corrupt future context
        state[paneId].history.pop(); 
    }
}

// Main function triggered on send
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Show user message in both UI panels immediately
    appendMessage(1, 'user', text);
    appendMessage(2, 'user', text);
    
    userInput.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Generating...';

    // Run both API requests at the exact same time
    await Promise.all([
        fetchAIResponse(1, text),
        fetchAIResponse(2, text)
    ]);

    sendBtn.disabled = false;
    sendBtn.textContent = 'Send to Both';
}

// Export logic
window.exportChat = function(paneId) {
    const modelName = state[paneId].select.value || "Unknown_Model";
    const history = state[paneId].history;
    
    if (history.length === 0) return alert("No chat history to export yet!");

    let textContent = `NVIDIA NIM Arena Export\nModel: ${modelName}\nDate: ${new Date().toLocaleString()}\n\n`;
    textContent += "========================================\n\n";

    history.forEach(msg => {
        const role = msg.role === 'user' ? 'YOU' : 'AI';
        textContent += `[${role}]:\n${msg.content}\n\n`;
    });

    // Create file and download trigger
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NIM_Chat_${modelName.replace(/\//g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
