# Email Setup Guide for OTP and Password Reset

This guide will help you configure email sending for ScorePAL's OTP verification and password reset features.

## Prerequisites

- A Gmail account (or any email account with SMTP support)
- For Gmail: 2-Step Verification must be enabled
- For Gmail: An App Password must be generated

## Configuration Steps

### For Gmail Users:

1. **Enable 2-Step Verification**
   - Go to your Google Account: https://myaccount.google.com/
   - Navigate to Security → 2-Step Verification
   - Follow the prompts to enable 2-Step Verification

2. **Generate an App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app and "Other (Custom name)" as the device
   - Enter "ScorePAL" as the custom name
   - Click "Generate"
   - Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

3. **Set Environment Variables**
   
   Create or update your `.env` file in the backend directory with:
   
   ```env
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   ```
   
   **Important:** 
   - Replace `your-email@gmail.com` with your actual Gmail address
   - Replace `your-16-character-app-password` with the App Password you generated (remove spaces)
   - Do NOT use your regular Gmail password

### For Other Email Providers:

#### Outlook/Hotmail:
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### Yahoo Mail:
```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

#### Custom SMTP Server:
```env
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587
SMTP_USERNAME=your-email@domain.com
SMTP_PASSWORD=your-password
```

## Verification

1. **Restart your backend server** after setting environment variables
2. **Test registration** - Try registering a new account
3. **Check logs** - Look for "Email sent successfully" in your backend logs
4. **Check email** - Verify that you receive the OTP email

## Troubleshooting

### Email not sending?

1. **Check environment variables:**
- Are variables set correctly in `.env`?
- Did you restart the server after setting them?
- Are there any typos in the email or password?

2. **Gmail-specific issues:**
   - Make sure 2-Step Verification is enabled
   - Make sure you're using an App Password, not your regular password
   - Check that "Less secure app access" is not required (App Passwords replace this)

3. **Check logs:**
   - Look for error messages in your backend logs
   - Common errors:
     - `SMTP authentication failed` → Check username/password
     - `Connection refused` → Check SMTP server and port
     - `Timeout` → Check firewall/network settings

4. **Development Mode:**
   - If you see `[DEV MODE]` in logs, email is not configured
   - The OTP code will be logged to console for testing
   - Configure SMTP settings to enable actual email sending

### Still having issues?

- Verify SMTP settings with a simple Python script:
  ```python
  import smtplib
  from email.mime.text import MIMEText
  
  msg = MIMEText("Test email")
  msg['Subject'] = 'Test'
  msg['From'] = 'your-email@gmail.com'
  msg['To'] = 'your-email@gmail.com'
  
  with smtplib.SMTP('smtp.gmail.com', 587) as server:
      server.starttls()
      server.login('your-email@gmail.com', 'your-app-password')
      server.send_message(msg)
  ```

## Security Notes

- **Never commit `.env` files** to version control
- **Use App Passwords** instead of regular passwords when possible
- **Rotate passwords** regularly
- **Keep SMTP credentials secure**

## Production Deployment

For production environments:
- Consider using a dedicated email service (SendGrid, Mailgun, AWS SES)
- Use environment variables from your hosting platform
- Set up proper error monitoring for email failures
- Consider rate limiting for email sending

