# Institution Auto-Detection Feature

## Overview

Students (and all users) can now login using their college email ID, and the system will automatically detect and assign them to the correct institution based on their email domain.

## How It Works

### 1. **Registration**
- When a user registers with a college email (e.g., `student@mit.edu`)
- The system automatically detects the institution from the email domain
- If an institution with domain `mit.edu` exists, the user is automatically assigned to it
- The institution is shown to the user during registration

### 2. **Login**
- When a user logs in with their college email
- If they don't have an institution assigned, the system:
  - Detects the institution from email domain
  - Automatically assigns them to the institution
  - Adds them as an institution member
  - Updates institution statistics

### 3. **Email Domain Matching**
The system matches email domains in the following ways:
- **Exact match**: `student@mit.edu` matches institution with domain `mit.edu`
- **Subdomain match**: `student.mit.edu` matches institution with domain `mit.edu`
- **Base domain match**: Falls back to matching base domain parts

## Setup Instructions

### For Administrators

1. **Create Institutions with Email Domains**
   ```bash
   POST /api/institutions
   {
     "name": "Massachusetts Institute of Technology",
     "code": "MIT",
     "domain": "mit.edu",  # Important: Set the email domain
     "allow_self_registration": true,
     "allowed_roles": ["teacher", "student", "grader"]
   }
   ```

2. **Verify Domain Configuration**
   - Make sure the `domain` field is set correctly
   - Use the exact domain format (e.g., `mit.edu`, not `@mit.edu`)

### For Students

1. **Register with College Email**
   - Use your college email address (e.g., `john@mit.edu`)
   - The system will automatically detect your institution
   - You'll see a message: "Institution detected: MIT"

2. **Login**
   - Simply login with your college email and password
   - Your institution will be automatically assigned if not already set

## API Endpoints

### Detect Institution from Email
```
GET /api/institutions/detect/email/{email}
```
**Public endpoint** - No authentication required

**Response:**
```json
{
  "id": "institution_id",
  "name": "Massachusetts Institute of Technology",
  "code": "MIT",
  "domain": "mit.edu",
  ...
}
```

## Frontend Components

### InstitutionDetector Component
Automatically detects and displays institution from email input:

```tsx
<InstitutionDetector 
  email={emailValue} 
  showAlert={true}
  onInstitutionDetected={(inst) => console.log(inst)}
/>
```

**Features:**
- Real-time detection as user types email
- Shows detected institution with chip/badge
- Debounced API calls (500ms delay)
- Handles errors gracefully

## Benefits

1. **Seamless Experience**: Students don't need to manually select their college
2. **Automatic Assignment**: Institution membership is automatic
3. **Domain Validation**: Ensures users belong to the correct institution
4. **Reduced Errors**: No manual selection means fewer mistakes

## Example Flow

1. Student enters email: `john@mit.edu`
2. System detects: Institution "MIT" with domain `mit.edu`
3. Shows message: "Institution detected: Massachusetts Institute of Technology"
4. Student completes registration
5. Student is automatically assigned to MIT institution
6. On login, institution is confirmed/updated if needed

## Troubleshooting

**Institution not detected?**
- Check if institution exists with correct domain
- Verify domain format (should be `mit.edu`, not `@mit.edu`)
- Check institution status is "active"

**Email domain doesn't match?**
- Contact admin to add your institution
- Or register without institution (can be added later)

**Subdomain emails?**
- System supports subdomains (e.g., `student.mit.edu` matches `mit.edu`)
- If not working, contact admin to configure domain matching

