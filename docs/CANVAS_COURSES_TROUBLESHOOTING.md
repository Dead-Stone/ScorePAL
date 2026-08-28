# Canvas Courses Not Showing - Troubleshooting Guide

## Common Reasons Why Courses Don't Appear

Based on Canvas API documentation and common issues, here are the main reasons why you might not see your courses:

### 1. **Course State/Status**
Canvas courses can be in different states:
- **Available** - Active courses (should show)
- **Completed** - Concluded courses (may be hidden by default)
- **Created** - Courses that haven't been published yet
- **Deleted** - Removed courses (won't show)

**Solution**: The API now tries to fetch courses with `state[]=all` to include concluded courses. However, some Canvas instances may restrict access to concluded courses.

### 2. **Course Publication Status**
- **Unpublished courses** won't appear in the API response for students
- Only published courses are visible to students via the API

**Solution**: Contact your instructor to ensure the course is published.

### 3. **Enrollment Status**
- You must be **officially enrolled** as a student
- Pending enrollments may not show up immediately
- Dropped/unenrolled students won't see the course

**Solution**: Verify your enrollment status in Canvas directly.

### 4. **Course Access Period**
- Some institutions hide courses after the term ends
- Access may be restricted to the current term only
- Past/concluded courses may be archived and not accessible via API

**Solution**: Check with your institution's Canvas administrator about course access policies.

### 5. **API Key Permissions**
Your Canvas API key needs these permissions:
- `read:course` - To read course information
- `read:enrollments` - To read enrollment data
- `read:grades` - To read grade information (optional)

**Solution**: Regenerate your API key with the correct permissions in Canvas Settings > Approved Integrations.

### 6. **Canvas Instance Configuration**
- Some Canvas instances restrict API access to concluded courses
- Institution policies may limit what students can see via API
- Different Canvas versions may have different API behaviors

**Solution**: Contact your Canvas administrator if you believe this is an institutional restriction.

## What We've Fixed

### Backend Improvements
1. **Added `state[]=all` parameter** - Now tries to fetch all course states including concluded courses
2. **Fallback mechanism** - If `state[]=all` fails, tries individual states (available, completed, created)
3. **Better filtering** - Improved logic to include courses even if enrollment data is missing
4. **Enhanced logging** - Added logging to help debug course fetching issues
5. **Better error messages** - More descriptive error messages to help identify the problem

### API Endpoint Changes
The endpoint `/api/settings/canvas/data/student/courses` now:
- Attempts to fetch courses with `state[]=all` first
- Falls back to individual states if needed
- Includes concluded/completed courses when possible
- Provides better error messages and debugging info

## How to Check

### 1. Verify in Canvas Directly
- Log into Canvas web interface
- Go to "Courses" > "All Courses"
- Check if your courses appear there
- Note which courses are missing

### 2. Check API Response
The API now returns additional information:
```json
{
  "status": "success",
  "courses": [...],
  "count": 5,
  "canvas_user_id": 12345,
  "total_fetched": 5,
  "message": "Found 5 student courses. If courses are missing, they may be concluded or unpublished."
}
```

### 3. Check Backend Logs
Look for log messages like:
```
Found X courses for Canvas user Y (from Z total)
```

This helps identify if courses are being fetched but filtered out.

## Still Not Working?

### Steps to Debug:
1. **Check Canvas directly** - Do courses appear in Canvas web interface?
2. **Verify API key** - Ensure it has correct permissions
3. **Check course state** - Are courses published and available?
4. **Check enrollment** - Are you officially enrolled?
5. **Contact support** - Reach out to Canvas administrator or IT support

### API Key Permissions Required:
- ✅ Read course information
- ✅ Read enrollment information  
- ✅ Read grades (optional, for grade display)

### Alternative: Use Canvas Web Interface
If API access is restricted, you can still:
- View courses directly in Canvas
- Access grades and assignments through Canvas web interface
- Use ScorePAL for courses that are accessible via API

## Technical Details

### Canvas API Endpoint Used
```
GET /api/v1/users/{user_id}/courses
```

### Parameters Tried:
1. `state[]=all` - All course states (preferred)
2. `state[]=available&state[]=completed&state[]=created` - Individual states (fallback)
3. `include[]=total_scores` - Include grade information
4. `include[]=enrollments` - Include enrollment details
5. `per_page=100` - Fetch up to 100 courses

### Filtering Logic:
- Courses are included if:
  - User has `StudentEnrollment` type enrollment, OR
  - Enrollment data is missing but course is returned (Canvas typically only returns user's courses)

## Contact Information

If you continue to experience issues:
1. Check Canvas web interface for course visibility
2. Verify API key permissions
3. Contact your institution's Canvas administrator
4. Check Canvas API documentation for your Canvas instance version


