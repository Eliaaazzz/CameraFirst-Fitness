# YouTube API Project Setup (Manual Checklist)

1. **Create Google Cloud project**
   - Visit https://console.cloud.google.com/projectcreate
   - Name: `FitnessApp-MVP`
   - Link billing account (required for quota alerts).

2. **Enable YouTube Data API v3**
   - APIs & Services → Library → search "YouTube Data API v3" → Enable.

3. **Create credentials**
   - APIs & Services → Credentials.
   - Create API key → restrict by HTTP referrers (`localhost`, staging/prod domains) and API restriction `YouTube Data API v3`.
   - Create OAuth 2.0 Client ID (Web application) for future admin console; add redirect URIs placeholder (`http://localhost:8080/oauth2/callback`).

4. **Quota monitoring**
   - APIs & Services → Quotas → filter for YouTube Data API.
   - Set alert at 8,000 units/day (80% of 10,000) with notifications to backend@fitnessapp.com.
   - Optional: create Cloud Monitoring dashboard for daily usage graph.

5. **Store secrets**
   - Save API key in 1Password vault `FitnessApp > API Keys`.
   - Mirror key in AWS Secrets Manager (`fitnessapp/prod/youtubeApiKey`).
   - Do **not** commit keys to Git. Application expects `YOUTUBE_API_KEY` env var.

6. **Verification**
   - Test with curl:
     ```bash
     curl "https://www.googleapis.com/youtube/v3/videos?id=dQw4w9WgXcQ&key=YOUR_API_KEY&part=snippet,contentDetails,statistics"
     ```
   - Confirm 200 response and quota usage increments (~1 unit).

7. **Documentation**
   - Record key issuance (owner, date, restrictions) in Notion: `Content Services > API Credentials`.
   - Attach Cloud Console screenshots for audit.
