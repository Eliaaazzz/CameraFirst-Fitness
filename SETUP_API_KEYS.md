# API Keys Setup Guide

## Required API Keys

Your fitness app needs the following API keys to function properly:

### 1. YouTube API Key (Required)
**Purpose:** Fetch workout video metadata

**How to get:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Copy the API key

**Cost:** Free (10,000 quota units/day)

---

### 2. Spoonacular API Key (Required)
**Purpose:** Fetch recipe data and nutrition information

**How to get:**
1. Go to [Spoonacular](https://spoonacular.com/food-api/console#Dashboard)
2. Sign up for a free account
3. Copy your API key from the dashboard

**Cost:** Free tier (150 requests/day)

---

### 3. OpenAI API Key (Optional)
**Purpose:** AI-powered meal plan generation, recipe suggestions

**How to get:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account
3. Generate an API key

**Cost:** Pay-as-you-go (approximately $0.01-0.03 per meal plan generation)

**Note:** The app works fine without this. AI features will just be disabled.

---

### 4. Google Gemini API Key (Optional - Recommended for Food Recognition)
**Purpose:** AI-powered food recognition from photos

**How to get:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

**Cost:** Free tier (60 requests per minute for Gemini 2.0 Flash)

**Note:** This is the primary provider for food recognition. The app will work without it but food photo analysis will be disabled.

---

## Local Development Setup

1. Copy `.env.example` to `.env` in the backend folder:
   ```bash
   cd backend
   cp ../.env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```bash
   YOUTUBE_API_KEY=your_youtube_key_here
   SPOONACULAR_API_KEY=your_spoonacular_key_here

   # Optional - for food recognition:
   GEMINI_API_KEY=your_gemini_key_here

   # Optional - for AI meal plans:
   OPENAI_ENABLED=true
   OPENAI_API_KEY=your_openai_key_here
   ```

3. Restart your backend server

---

## Production (EC2) Setup

Your backend is deployed on EC2. To configure API keys:

### Option 1: Using Environment Variables (Recommended)

SSH into your EC2 instance and edit the Docker Compose environment:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Create/edit environment file for backend
sudo nano /opt/fitness-app/backend.env
```

Add these lines:
```env
YOUTUBE_API_KEY=your_youtube_key_here
SPOONACULAR_API_KEY=your_spoonacular_key_here
GEMINI_API_KEY=your_gemini_key_here
OPENAI_ENABLED=true
OPENAI_API_KEY=your_openai_key_here
```

Then update the Docker Compose file to use this env file:
```bash
sudo nano /opt/fitness-app/docker-compose.yml
```

Add `env_file` to the backend service:
```yaml
services:
  backend:
    env_file:
      - backend.env
    # ... rest of config
```

Restart the backend:
```bash
cd /opt/fitness-app
sudo docker-compose restart backend
```

### Option 2: Using GitHub Actions Secrets

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `YOUTUBE_API_KEY`
   - `SPOONACULAR_API_KEY`
   - `GEMINI_API_KEY` (optional)
   - `OPENAI_API_KEY` (optional)
   - `OPENAI_ENABLED` (optional)

3. Update `.github/workflows/deploy-backend.yml` to pass these as environment variables

---

## Verifying API Keys

After adding API keys, check the backend logs:

```bash
# On EC2:
sudo docker logs fitness-app-backend -f

# Look for:
# - "Gemini API key configured" or "⚠️  Gemini API key not configured"
# - "OpenAI enabled: true" (if configured)
# - "YouTube API key configured: true"
# - "Spoonacular API key configured: true"
```

Test the API endpoints:
```bash
# Test YouTube API
curl http://localhost:8080/api/yt/metadata?videoId=dQw4w9WgXcQ

# Test meal plan generation
curl -X POST http://localhost:8080/api/v1/meal-plan/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

---

## Troubleshooting

### "API key missing" error
- Check backend logs: `sudo docker logs fitness-app-backend`
- Verify .env file exists and has correct keys
- Restart backend after adding keys

### "OpenAI features disabled"
- This is normal if OPENAI_ENABLED=false
- App works fine without OpenAI
- AI features (meal plans, smart suggestions) won't work

### YouTube/Spoonacular quota exceeded
- YouTube: 10,000 units/day (resets at midnight Pacific)
- Spoonacular: 150 requests/day on free tier
- Upgrade to paid tier if needed

---

## Security Best Practices

1. **Never commit API keys to Git**
   - `.env` files are in `.gitignore`
   - Use secrets management in production

2. **Rotate keys regularly**
   - Rotate every 90 days
   - Immediately if compromised

3. **Use different keys for dev/prod**
   - Separate keys for development and production
   - Easier to track usage and revoke if needed

4. **Monitor usage**
   - Check Google Cloud Console for YouTube quota
   - Check Spoonacular dashboard for usage
   - Check OpenAI usage page for costs
