# AI Model Configuration Guide

ScorePAL now supports multiple AI providers! You can configure and use different AI models for grading, including OpenAI, Anthropic Claude, Google Gemini, Perplexity, Hugging Face, and more.

## Features

### ✨ **Multi-Provider Support**
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google**: Gemini 2.0 Flash, Gemini 1.5 Pro
- **Perplexity**: Llama 3.1 Sonar models with online search
- **Hugging Face**: Access to thousands of open-source models
- **Cohere**: Cohere Command models

### 🔧 **Configuration Management**
- Store multiple AI configurations per user
- Encrypt API keys securely
- Set default models for automatic selection
- Test configurations before use
- Track usage statistics and costs

### ⚡ **Smart Model Selection**
- Choose specific models before grading
- Override model parameters (temperature, max tokens)
- Automatic fallback to backup models
- Real-time cost estimation
- Performance tier recommendations

## Getting Started

### 1. **Access AI Configuration**
1. Go to your **Profile** page
2. Click on the **AI Models** tab
3. Click **Add Configuration** to start

### 2. **Add Your First AI Provider**

#### For OpenAI:
```
Provider: OpenAI
Model: gpt-4-turbo
API Key: sk-your-openai-api-key
Endpoint: https://api.openai.com/v1 (default)
```

#### For Anthropic Claude:
```
Provider: Anthropic
Model: claude-3-sonnet-20240229
API Key: sk-ant-your-anthropic-key
Endpoint: https://api.anthropic.com (default)
```

#### For Google Gemini:
```
Provider: Google
Model: gemini-2.0-flash
API Key: your-google-api-key
Endpoint: (leave empty for default)
```

#### For Perplexity:
```
Provider: Perplexity
Model: llama-3.1-sonar-large-128k-online
API Key: pplx-your-perplexity-key
Endpoint: https://api.perplexity.ai/chat/completions
```

### 3. **Test Your Configuration**
- Click the **Test** button to verify your setup
- Check response time and functionality
- Make sure your API key is working correctly

### 4. **Set Default Model**
- Click **Set Default** on your preferred configuration
- This model will be used automatically for grading
- You can always override during grading

## Using AI Models for Grading

### **Method 1: Automatic (Default Model)**
1. Upload your assignment files normally
2. Your default AI model will be used automatically
3. View AI provider info in the results

### **Method 2: Manual Selection**
1. Start the grading process normally
2. Click **Select AI Model** before grading
3. Choose from your configured models
4. Optionally adjust parameters (temperature, max tokens)
5. View estimated cost and token usage
6. Click **Use Selected Model** to proceed

### **Model Selection Dialog Features:**
- **Real-time cost estimation** based on content size
- **Performance indicators** (response time, success rate)
- **Capability badges** (fast response, high accuracy, etc.)
- **Usage statistics** (requests made, tokens used)
- **Custom parameter overrides** for advanced users

## Advanced Features

### **Custom Parameters**
Override model settings for specific grading tasks:
- **Temperature**: Control randomness (0.0 = deterministic, 1.0 = creative)
- **Max Tokens**: Limit response length
- **Top P**: Nucleus sampling parameter
- **Frequency/Presence Penalty**: Reduce repetition

### **Fallback System**
ScorePAL automatically tries backup models if your primary choice fails:
1. Primary model (your selection)
2. Your default model (if different)
3. Other active configurations
4. Built-in system fallback

### **Usage Analytics**
Track your AI usage in the profile dashboard:
- **Total requests** made across all providers
- **Tokens consumed** and estimated costs
- **Success rates** and response times
- **Most used providers** and models
- **Monthly usage trends**

## Security & Privacy

### **API Key Security**
- All API keys are encrypted before storage
- Keys are masked in the interface (sk-1234****5678)
- Automatic encryption/decryption during use
- No keys stored in logs or frontend

### **Data Privacy**
- Only necessary content sent to AI providers
- No persistent storage of submissions by providers
- Each provider's privacy policy applies
- Option to use local/private deployments

## Cost Management

### **Cost Estimation**
- Real-time cost calculation before grading
- Token usage estimates based on content size
- Historical cost tracking per provider
- Monthly spending summaries

### **Cost Optimization Tips**
1. **Use GPT-3.5 Turbo** for basic grading (most cost-effective)
2. **Use Gemini 2.0 Flash** for fastest processing
3. **Use Claude Sonnet** for balanced performance/cost
4. **Use GPT-4** only for complex analysis needs

### **Provider Cost Comparison** (per 1K tokens):
- **Gemini 2.0 Flash**: ~$0.000075 (lowest cost)
- **GPT-3.5 Turbo**: ~$0.001
- **Perplexity Sonar**: ~$0.0002
- **Claude Haiku**: ~$0.00025
- **Claude Sonnet**: ~$0.003
- **GPT-4 Turbo**: ~$0.01
- **GPT-4**: ~$0.03
- **Claude Opus**: ~$0.015

## Troubleshooting

### **Common Issues**

#### ❌ **"Configuration test failed"**
- Check your API key is correct and active
- Verify the endpoint URL is correct
- Ensure you have credits/quota remaining
- Try a different model from the same provider

#### ❌ **"No AI configurations available"**
- Add at least one AI configuration in your profile
- Make sure the configuration is marked as "Active"
- Set a default configuration

#### ❌ **"All providers failed"**
- Check your internet connection
- Verify API keys haven't expired
- Check provider status pages for outages
- Contact support if issue persists

### **Getting API Keys**

#### **OpenAI**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login to your account
3. Navigate to API Keys section
4. Create a new secret key
5. Copy the key (starts with `sk-`)

#### **Anthropic**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up/login to your account
3. Navigate to API Keys
4. Generate a new key
5. Copy the key (starts with `sk-ant-`)

#### **Google Gemini**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key
5. Copy the key

#### **Perplexity**
1. Go to [perplexity.ai](https://perplexity.ai)
2. Sign up for a Pro account
3. Navigate to API section
4. Generate an API key
5. Copy the key (starts with `pplx-`)

## Best Practices

### **Model Selection Guidelines**

#### **For Quick/Batch Grading:**
- **Gemini 2.0 Flash**: Fastest, very low cost
- **GPT-3.5 Turbo**: Good balance, reliable

#### **For Detailed Analysis:**
- **Claude 3 Sonnet**: Excellent at following rubrics
- **GPT-4 Turbo**: High accuracy, good context handling

#### **For Creative/Essay Grading:**
- **Claude 3 Opus**: Best for nuanced writing assessment
- **GPT-4**: Strong reasoning capabilities

#### **For Code Grading:**
- **GPT-4 Turbo**: Excellent code understanding
- **Claude 3 Sonnet**: Good at technical analysis

#### **For Research/Fact-Checking:**
- **Perplexity Models**: Online search capabilities
- **GPT-4**: Strong reasoning and knowledge

### **Configuration Tips**
1. **Set up multiple providers** for redundancy
2. **Test configurations regularly** to ensure they work
3. **Monitor usage** to avoid unexpected costs
4. **Use appropriate models** for each grading task
5. **Keep API keys secure** and rotate them periodically

## Support

Need help with AI model configuration?

- **Documentation**: Check this guide and the main ScorePAL docs
- **Test Feature**: Use the built-in configuration test
- **Community**: Join our Discord/forum for community support
- **Support**: Contact our support team for technical issues

---

**Happy Grading with AI! 🤖📚**

*The future of educational assessment is here - powered by multiple AI providers working together to give you the best grading experience possible.* 