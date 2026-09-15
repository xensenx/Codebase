# NVIDIA NIM API Tester & Vercel Proxy 

Hey guys! As you might know, NVIDIA is now offering free AI APIs for developers to test and prototype with. They provide unlimited AI access (no token limits or daily requests) with the only limitation being a 40 Requests Per Minute (RPM) cap. 

Anyone can grab an API key by signing up at [build.nvidia.com](https://build.nvidia.com/).

## What does this repo do?

If you try to build a simple frontend web app to test these models, you'll immediately run into a problem: **CORS errors**. 

Unlike Google's AI APIs which allow direct browser calls, NVIDIA (like most major AI providers) restricts browser calls for security reasons and will return a strict error if you hardcode your key in the frontend. To bypass this, you need a backend proxy.

This repository provides a clean, minimal UI and a secure `chat.js` proxy file designed to be hosted on Vercel. It acts as a middleman, securely pulling your API key from your environment variables so you can test out the NVIDIA API and experiment with different models right from your browser!

##  How to Deploy & Use?

Getting this up and running takes about two minutes:

1. **Fork this repo** to your own GitHub account.
2. Go to [Vercel](https://vercel.com/) (Sign up for a free account if you haven't already).
3. Click **Add New Project**, import from GitHub, and select your forked repository.
4. Before clicking deploy, find the **Environment Variables** section.
5. Add a new variable:
   * **Key:** `NVIDIA_API_KEY` (must be exact)
   * **Value:** *(Paste your actual NVIDIA API key here)*
6. Hit **Deploy**. 

That's it! Vercel will automatically host the frontend and turn the `api/chat.js` file into your secure backend proxy.

## Updating the Model List

NVIDIA frequently experiments with their models. A model that works today might be removed tomorrow, or new experimental models might be added. 

If you want to pull the absolute latest list of working models:
1. Open the `nvidia_test.py` file in your terminal.
2. Enter your API key inside the script and run it.
3. It will output a fresh, formatted list of all currently active models.
4. Copy those model IDs and update the array inside `script.js` in your repo to use them in the UI.


<img width="1280" height="720" alt="image" src="https://github.com/user-attachments/assets/7f6afe89-7795-4be3-9f68-48596c243502" />


## Current Model List (As of April 1, 2026)

There are currently **188 models** available. Click below to expand the full list of working models included in this build:

<details>
<summary><b>Click to view all 188 available models</b></summary>

```text
Model ID                                           | Owned By
-----------------------------------------------------------------
01-ai/yi-large                                     | 01-ai
abacusai/dracarys-llama-3.1-70b-instruct           | abacusai
adept/fuyu-8b                                      | adept
ai21labs/jamba-1.5-large-instruct                  | ai21labs
ai21labs/jamba-1.5-mini-instruct                   | ai21labs
aisingapore/sea-lion-7b-instruct                   | aisingapore
baai/bge-m3                                        | baai
baichuan-inc/baichuan2-13b-chat                    | baichuan-inc
bigcode/starcoder2-15b                             | bigcode
bigcode/starcoder2-7b                              | bigcode
bytedance/seed-oss-36b-instruct                    | bytedance
databricks/dbrx-instruct                           | databricks
deepseek-ai/deepseek-coder-6.7b-instruct           | deepseek-ai
deepseek-ai/deepseek-r1-distill-llama-8b           | deepseek-ai
deepseek-ai/deepseek-r1-distill-qwen-14b           | deepseek-ai
deepseek-ai/deepseek-r1-distill-qwen-32b           | deepseek-ai
deepseek-ai/deepseek-r1-distill-qwen-7b            | deepseek-ai
deepseek-ai/deepseek-v3.1                          | deepseek-ai
deepseek-ai/deepseek-v3.1-terminus                 | deepseek-ai
deepseek-ai/deepseek-v3.2                          | deepseek-ai
google/codegemma-1.1-7b                            | google
google/codegemma-7b                                | google
google/deplot                                      | google
google/gemma-2-27b-it                              | google
google/gemma-2-2b-it                               | google
google/gemma-2-9b-it                               | google
google/gemma-2b                                    | google
google/gemma-3-12b-it                              | google
google/gemma-3-1b-it                               | google
google/gemma-3-27b-it                              | google
google/gemma-3-4b-it                               | google
google/gemma-3n-e2b-it                             | google
google/gemma-3n-e4b-it                             | google
google/gemma-7b                                    | google
google/paligemma                                   | google
google/recurrentgemma-2b                           | google
google/shieldgemma-9b                              | google
gotocompany/gemma-2-9b-cpt-sahabatai-instruct      | gotocompany
ibm/granite-3.0-3b-a800m-instruct                  | ibm
ibm/granite-3.0-8b-instruct                        | ibm
ibm/granite-3.3-8b-instruct                        | ibm
ibm/granite-34b-code-instruct                      | ibm
ibm/granite-8b-code-instruct                       | ibm
ibm/granite-guardian-3.0-8b                        | ibm
igenius/colosseum_355b_instruct_16k                | igenius
igenius/italia_10b_instruct_16k                    | igenius
institute-of-science-tokyo/llama-3.1-swallow-70b-instruct-v0.1 | institute-of-science-tokyo
institute-of-science-tokyo/llama-3.1-swallow-8b-instruct-v0.1 | institute-of-science-tokyo
marin/marin-8b-instruct                            | marin
mediatek/breeze-7b-instruct                        | mediatek
meta/codellama-70b                                 | meta
meta/llama-3.1-405b-instruct                       | meta
meta/llama-3.1-70b-instruct                        | meta
meta/llama-3.1-8b-instruct                         | meta
meta/llama-3.2-11b-vision-instruct                 | meta
meta/llama-3.2-1b-instruct                         | meta
meta/llama-3.2-3b-instruct                         | meta
meta/llama-3.2-90b-vision-instruct                 | meta
meta/llama-3.3-70b-instruct                        | meta
meta/llama-4-maverick-17b-128e-instruct            | meta
meta/llama-4-scout-17b-16e-instruct                | meta
meta/llama-guard-4-12b                             | meta
meta/llama2-70b                                    | meta
meta/llama3-70b-instruct                           | meta
meta/llama3-8b-instruct                            | meta
microsoft/kosmos-2                                 | microsoft
microsoft/phi-3-medium-128k-instruct               | microsoft
microsoft/phi-3-medium-4k-instruct                 | microsoft
microsoft/phi-3-mini-128k-instruct                 | microsoft
microsoft/phi-3-mini-4k-instruct                   | microsoft
microsoft/phi-3-small-128k-instruct                | microsoft
microsoft/phi-3-small-8k-instruct                  | microsoft
microsoft/phi-3-vision-128k-instruct               | microsoft
microsoft/phi-3.5-mini-instruct                    | microsoft
microsoft/phi-3.5-moe-instruct                     | microsoft
microsoft/phi-3.5-vision-instruct                  | microsoft
microsoft/phi-4-mini-flash-reasoning               | microsoft
microsoft/phi-4-mini-instruct                      | microsoft
microsoft/phi-4-multimodal-instruct                | microsoft
minimaxai/minimax-m2.5                             | minimaxai
mistralai/codestral-22b-instruct-v0.1              | mistralai
mistralai/devstral-2-123b-instruct-2512            | mistralai
mistralai/magistral-small-2506                     | mistralai
mistralai/mamba-codestral-7b-v0.1                  | mistralai
mistralai/mathstral-7b-v0.1                        | mistralai
mistralai/ministral-14b-instruct-2512              | mistralai
mistralai/mistral-7b-instruct-v0.2                 | mistralai
mistralai/mistral-7b-instruct-v0.3                 | mistralai
mistralai/mistral-large                            | mistralai
mistralai/mistral-large-2-instruct                 | mistralai
mistralai/mistral-large-3-675b-instruct-2512       | mistralai
mistralai/mistral-medium-3-instruct                | mistralai
mistralai/mistral-nemotron                         | mistralai
mistralai/mistral-small-24b-instruct               | mistralai
mistralai/mistral-small-3.1-24b-instruct-2503      | mistralai
mistralai/mistral-small-4-119b-2603                | mistralai
mistralai/mixtral-8x22b-instruct-v0.1              | mistralai
mistralai/mixtral-8x22b-v0.1                       | mistralai
mistralai/mixtral-8x7b-instruct-v0.1               | mistralai
moonshotai/kimi-k2-instruct                        | moonshotai
moonshotai/kimi-k2-instruct-0905                   | moonshotai
moonshotai/kimi-k2-thinking                        | moonshotai
moonshotai/kimi-k2.5                               | moonshotai
nv-mistralai/mistral-nemo-12b-instruct             | nv-mistralai
nvidia/cosmos-reason2-8b                           | nvidia
nvidia/embed-qa-4                                  | nvidia
nvidia/gliner-pii                                  | nvidia
nvidia/llama-3.1-nemoguard-8b-content-safety       | nvidia
nvidia/llama-3.1-nemoguard-8b-topic-control        | nvidia
nvidia/llama-3.1-nemotron-51b-instruct             | nvidia
nvidia/llama-3.1-nemotron-70b-instruct             | nvidia
nvidia/llama-3.1-nemotron-70b-reward               | nvidia
nvidia/llama-3.1-nemotron-nano-4b-v1.1             | nvidia
nvidia/llama-3.1-nemotron-nano-8b-v1               | nvidia
nvidia/llama-3.1-nemotron-nano-vl-8b-v1            | nvidia
nvidia/llama-3.1-nemotron-safety-guard-8b-v3       | nvidia
nvidia/llama-3.1-nemotron-ultra-253b-v1            | nvidia
nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1     | nvidia
nvidia/llama-3.2-nemoretriever-300m-embed-v1       | nvidia
nvidia/llama-3.2-nv-embedqa-1b-v1                  | nvidia
nvidia/llama-3.2-nv-embedqa-1b-v2                  | nvidia
nvidia/llama-3.3-nemotron-super-49b-v1             | nvidia
nvidia/llama-3.3-nemotron-super-49b-v1.5           | nvidia
nvidia/llama-nemotron-embed-1b-v2                  | nvidia
nvidia/llama-nemotron-embed-vl-1b-v2               | nvidia
nvidia/llama3-chatqa-1.5-70b                       | nvidia
nvidia/llama3-chatqa-1.5-8b                        | nvidia
nvidia/mistral-nemo-minitron-8b-8k-instruct        | nvidia
nvidia/mistral-nemo-minitron-8b-base               | nvidia
nvidia/nemoretriever-parse                         | nvidia
nvidia/nemotron-3-nano-30b-a3b                     | nvidia
nvidia/nemotron-3-super-120b-a12b                  | nvidia
nvidia/nemotron-3-super-120b-a12b                  | nvidia
nvidia/nemotron-4-340b-instruct                    | nvidia
nvidia/nemotron-4-340b-reward                      | nvidia
nvidia/nemotron-4-mini-hindi-4b-instruct           | nvidia
nvidia/nemotron-content-safety-reasoning-4b        | nvidia
nvidia/nemotron-mini-4b-instruct                   | nvidia
nvidia/nemotron-nano-12b-v2-vl                     | nvidia
nvidia/nemotron-nano-3-30b-a3b                     | nvidia
nvidia/nemotron-parse                              | nvidia
nvidia/neva-22b                                    | nvidia
nvidia/nv-embed-v1                                 | nvidia
nvidia/nv-embedcode-7b-v1                          | nvidia
nvidia/nv-embedqa-e5-v5                            | nvidia
nvidia/nv-embedqa-mistral-7b-v2                    | nvidia
nvidia/nvclip                                      | nvidia
nvidia/nvidia-nemotron-nano-9b-v2                  | nvidia
nvidia/riva-translate-4b-instruct                  | nvidia
nvidia/riva-translate-4b-instruct-v1.1             | nvidia
nvidia/streampetr                                  | nvidia
nvidia/vila                                        | nvidia
openai/gpt-oss-120b                                | openai
openai/gpt-oss-120b                                | openai
openai/gpt-oss-20b                                 | openai
openai/gpt-oss-20b                                 | openai
opengpt-x/teuken-7b-instruct-commercial-v0.4       | opengpt-x
qwen/qwen2-7b-instruct                             | qwen
qwen/qwen2.5-7b-instruct                           | qwen
qwen/qwen2.5-coder-32b-instruct                    | qwen
qwen/qwen2.5-coder-7b-instruct                     | qwen
qwen/qwen3-coder-480b-a35b-instruct                | qwen
qwen/qwen3-next-80b-a3b-instruct                   | qwen
qwen/qwen3-next-80b-a3b-thinking                   | qwen
qwen/qwen3.5-122b-a10b                             | qwen
qwen/qwen3.5-397b-a17b                             | qwen
qwen/qwq-32b                                       | qwen
rakuten/rakutenai-7b-chat                          | rakuten
rakuten/rakutenai-7b-instruct                      | rakuten
sarvamai/sarvam-m                                  | sarvamai
snowflake/arctic-embed-l                           | snowflake
speakleash/bielik-11b-v2.3-instruct                | speakleash
speakleash/bielik-11b-v2.6-instruct                | speakleash
stepfun-ai/step-3.5-flash                          | stepfun-ai
stockmark/stockmark-2-100b-instruct                | stockmark
thudm/chatglm3-6b                                  | thudm
tiiuae/falcon3-7b-instruct                         | tiiuae
tokyotech-llm/llama-3-swallow-70b-instruct-v0.1    | tokyotech-llm
upstage/solar-10.7b-instruct                       | upstage
utter-project/eurollm-9b-instruct                  | utter-project
writer/palmyra-creative-122b                       | writer
writer/palmyra-fin-70b-32k                         | writer
writer/palmyra-med-70b                             | writer
writer/palmyra-med-70b-32k                         | writer
yentinglin/llama-3-taiwan-70b-instruct             | yentinglin
z-ai/glm4.7                                        | z-ai
z-ai/glm5                                          | z-ai
zyphra/zamba2-7b-instruct                          | zyphra
