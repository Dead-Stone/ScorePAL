# Canvas LTI Integration Guide

This guide explains how to integrate ScorePAL with Canvas using LTI (Learning Tools Interoperability) 1.3 Advantage.

## What is LTI?

LTI (Learning Tools Interoperability) is a standard that allows external tools to integrate seamlessly with Learning Management Systems like Canvas. LTI provides:

1. **Single Sign-On (SSO)** - Users can access ScorePAL directly from Canvas without separate login
2. **Grade Passback** - Automatically post grades back to Canvas gradebook
3. **Deep Linking** - Link directly to specific assignments from Canvas
4. **Context Awareness** - Access course, user, and assignment context automatically
5. **Security** - OAuth 2.0 and JWT-based authentication

## Benefits of LTI Integration

- ✅ **No separate login required** - Users launch ScorePAL from Canvas
- ✅ **Automatic grade posting** - Grades sync directly to Canvas gradebook
- ✅ **Better user experience** - Seamless integration within Canvas
- ✅ **Secure** - Industry-standard authentication
- ✅ **Context-aware** - Knows which course, assignment, and user

## Prerequisites

1. Canvas administrator access (to create Developer Keys)
2. ScorePAL backend running and accessible
3. SSL certificate (HTTPS required for production)
4. Canvas instance URL

## Setup Steps

### Step 1: Configure Environment Variables

Add these to your `.env` file:

```env
# LTI Configuration
LTI_CLIENT_ID=your_client_id_from_canvas
LTI_CLIENT_SECRET=your_client_secret_from_canvas
LTI_DEPLOYMENT_ID=your_deployment_id
LTI_ISSUER=https://canvas.instructure.com  # or your Canvas instance URL
LTI_REDIRECT_URI=https://your-domain.com/api/lti/launch
BASE_URL=https://your-domain.com

# RSA Key Pair for JWT signing (generate using OpenSSL)
LTI_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
LTI_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
```

### Step 2: Generate RSA Key Pair

Generate RSA key pair for JWT signing:

```bash
# Generate private key
openssl genrsa -out lti_private_key.pem 2048

# Generate public key
openssl rsa -in lti_private_key.pem -pubout -out lti_public_key.pem

# Convert to single line for .env (replace newlines with \n)
cat lti_private_key.pem | tr '\n' '\\n'
cat lti_public_key.pem | tr '\n' '\\n'
```

### Step 3: Get LTI Configuration

1. Start your ScorePAL backend
2. Navigate to: `GET /api/lti/config`
3. Copy the configuration JSON

### Step 4: Create Developer Key in Canvas

1. **Login to Canvas** as an administrator
2. Navigate to **Admin** → **Developer Keys**
3. Click **+ Developer Key** → **LTI Key**
4. Fill in the configuration:
   - **Key Name**: ScorePAL - AI Grading Assistant
   - **Redirect URIs**: `https://your-domain.com/api/lti/launch`
   - **Initiate Login URL**: `https://your-domain.com/api/lti/init`
   - **JWK Set URL**: `https://your-domain.com/api/lti/jwks`
   - **Public JWK**: Paste your public key (from `lti_public_key.pem`)
5. **Enable LTI Advantage Services**:
   - ✅ Assignment and Grade Services
   - ✅ Names and Role Provisioning Services
   - ✅ Deep Linking
6. **Save** and **Enable** the key
7. **Copy the Client ID** - you'll need this for your `.env` file

### Step 5: Configure App in Canvas Course

1. Go to your **Canvas Course**
2. Navigate to **Settings** → **Apps** tab
3. Click **+ App** → **By Client ID**
4. Enter the **Client ID** from Step 4
5. Click **Submit**
6. The app will appear in your course navigation

### Step 6: Test the Integration

1. **Launch from Canvas**:
   - Go to your Canvas course
   - Click on "ScorePAL Grading" in the navigation
   - You should be automatically logged in

2. **Test Grade Passback**:
   - Grade a submission in ScorePAL
   - Click "Post to Canvas"
   - Check Canvas gradebook to verify the grade was posted

## API Endpoints

### LTI Configuration
- `GET /api/lti/config` - Get LTI configuration for Canvas setup

### LTI Launch Flow
- `GET /api/lti/init` - OIDC login initiation (called by Canvas)
- `POST /api/lti/launch` - LTI launch endpoint (receives JWT from Canvas)

### LTI Services
- `GET /api/lti/jwks` - JSON Web Key Set for JWT verification
- `POST /api/lti/grade-passback` - Post grades back to Canvas
- `GET /api/lti/nrps/{course_id}/members` - Get course members (NRPS)
- `GET /api/lti/session/{session_id}` - Get LTI session data

## LTI Message Types

### 1. LtiResourceLinkRequest (Regular Launch)
- Launches ScorePAL from Canvas course navigation
- Provides course and user context
- Used for general grading interface

### 2. LtiDeepLinkingRequest (Assignment Selection)
- Allows selecting assignments from Canvas
- Creates deep links to specific assignments
- Used when adding ScorePAL to an assignment

## Grade Passback

ScorePAL can automatically post grades back to Canvas using LTI Advantage Assignment and Grade Services (AGS).

**Endpoint**: `POST /api/lti/grade-passback`

**Request Body**:
```json
{
  "scoreGiven": 85.5,
  "scoreMaximum": 100.0,
  "comment": "Great work!",
  "userId": "canvas_user_id",
  "lineItemId": "canvas_assignment_id"
}
```

## Security Considerations

1. **HTTPS Required**: LTI requires HTTPS in production
2. **JWT Verification**: All LTI messages are verified using JWT
3. **State Validation**: OAuth state parameter prevents CSRF attacks
4. **Token Expiration**: Access tokens expire and must be refreshed
5. **Key Storage**: Store private keys securely (use environment variables or key management service)

## Troubleshooting

### "Invalid issuer" Error
- Check that `LTI_ISSUER` matches your Canvas instance URL
- Verify Canvas is sending the correct issuer in the JWT

### "JWT verification failed"
- Ensure your public key is correctly configured in Canvas
- Check that the JWKS endpoint is accessible
- Verify the key ID (kid) matches

### "Grade passback failed"
- Ensure Assignment and Grade Services is enabled in Developer Key
- Check that the access token is valid
- Verify the line item (assignment) ID is correct

### "Session not found"
- LTI sessions are stored in memory (not persistent)
- In production, use Redis or database for session storage
- Sessions expire after a period of inactivity

## Production Deployment

### Required Changes

1. **Session Storage**: Replace in-memory storage with Redis or database
2. **Key Management**: Use a secure key management service (AWS KMS, Azure Key Vault, etc.)
3. **HTTPS**: Ensure SSL certificate is valid
4. **Error Handling**: Add comprehensive error logging and monitoring
5. **Rate Limiting**: Implement rate limiting for LTI endpoints

### Example Redis Session Storage

```python
import redis
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Store session
redis_client.setex(f"lti_session:{session_id}", 3600, json.dumps(session_data))

# Retrieve session
session_data = json.loads(redis_client.get(f"lti_session:{session_id}"))
```

## Comparison: API Key vs LTI

| Feature | API Key | LTI |
|---------|---------|-----|
| Authentication | Manual API key entry | Automatic SSO |
| User Context | Manual user lookup | Automatic from Canvas |
| Grade Posting | Manual API calls | Automatic grade passback |
| Security | API key in settings | OAuth 2.0 + JWT |
| User Experience | Separate login | Seamless Canvas integration |
| Setup Complexity | Simple | More complex |

## Next Steps

1. **Complete LTI Setup**: Follow all steps above
2. **Test Integration**: Launch from Canvas and test grade passback
3. **Update Frontend**: Add LTI session handling in frontend
4. **Deploy to Production**: Configure HTTPS and secure key storage
5. **Monitor**: Set up logging and monitoring for LTI endpoints

## References

- [Canvas LTI Documentation](https://canvas.instructure.com/doc/api/file.tools_intro.html)
- [LTI 1.3 Specification](https://www.imsglobal.org/spec/lti/v1p3/)
- [LTI Advantage Services](https://www.imsglobal.org/spec/lti/v1p3/adv/)
- [Canvas Developer Keys](https://canvas.instructure.com/doc/api/file.developer_keys.html)

