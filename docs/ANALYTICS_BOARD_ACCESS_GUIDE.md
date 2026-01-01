# Analytics Board Access Guide

This guide explains where to access the Canvas Analytics Board and which user roles can view it.

## Where to Access

### Location
**Dashboard → Canvas Analytics Tab**

1. Navigate to: `/dashboard`
2. Click on the **"Canvas Analytics"** tab (second tab)
3. Select a course from the dropdown
4. View comprehensive analytics data

### URL Path
```
http://localhost:3000/dashboard
```

Then select the "Canvas Analytics" tab.

---

## User Roles & Access

### ✅ **Can Access Analytics Board**

1. **Teachers** (`role: 'teacher'`)
   - Full access to analytics for their courses
   - Can view all student data, grades, and performance metrics

2. **Admins** (`role: 'admin'`)
   - Full access to analytics for all courses
   - Can view all student data, grades, and performance metrics

3. **Graders** (`role: 'grader'`)
   - Access to analytics for courses they're assigned to
   - Can view student data and grades for grading purposes

### ❌ **Cannot Access Analytics Board**

1. **Students** (`role: 'student'`)
   - Students are automatically redirected to `/student` dashboard
   - They have their own student-specific dashboard with limited data
   - Students can only see their own grades and performance

---

## How to Access as Different Roles

### As a Teacher/Admin/Grader

1. **Login** with your credentials
2. Navigate to **Dashboard** (from navigation menu)
3. Click the **"Canvas Analytics"** tab
4. Select a course from the dropdown
5. View analytics data

### As a Student

1. **Login** with student credentials
2. You'll be automatically redirected to `/student` dashboard
3. View your own grades and performance
4. Cannot access the full analytics board

---

## What Data is Shown

### Overview Statistics
- Total students in course
- Total assignments
- Total submissions
- Graded vs. ungraded submissions
- Average, median, high, and low scores
- Grading progress percentage

### Grade Distribution
- Count of students by letter grade (A, B, C, D, F)
- Visual grade distribution chart

### Student Details
- Individual student scores and grades
- Submission counts
- Points earned vs. possible
- Average scores per student

### Assignment Analytics
- Submission rates per assignment
- Average scores per assignment
- Grading progress per assignment
- High/low scores per assignment

### Engagement Metrics
- Late submissions count
- Missing submissions count
- On-time submission rate
- Completion rate

---

## API Endpoint

**Backend Endpoint**: `GET /api/settings/canvas/data/courses/{course_id}/analytics/board`

**Access Control**: 
- Requires authentication (Bearer token)
- Restricted to: `teacher`, `admin`, `grader` roles
- Students receive 403 Forbidden error

**Example Request**:
```bash
GET /api/settings/canvas/data/courses/123/analytics/board
Authorization: Bearer <your_token>
```

---

## Testing Access

### Test as Teacher/Admin/Grader

1. Login with a teacher/admin/grader account
2. Go to Dashboard → Canvas Analytics tab
3. Select a course
4. Should see full analytics data

### Test as Student

1. Login with a student account
2. Should be redirected to `/student` dashboard
3. If you try to access `/dashboard`, you'll see a loading screen (redirecting)
4. Cannot access analytics board endpoint (403 error)

---

## Troubleshooting

### "Access denied" Error

**Cause**: Your user role doesn't have permission

**Solution**: 
- Ensure you're logged in as `teacher`, `admin`, or `grader`
- Check your user role in the database
- Contact an admin to update your role

### "Canvas API key not configured" Error

**Cause**: Canvas API key not set up

**Solution**:
1. Go to Settings
2. Configure your Canvas API key
3. Test the connection
4. Return to Dashboard → Canvas Analytics

### "Access denied to course" Error

**Cause**: Your Canvas API key doesn't have permission to access the course

**Solution**:
1. Ensure you're enrolled in the course as Teacher, TA, or Designer
2. Check Canvas API key permissions
3. Use the "Test Access" button in the Canvas Analytics tab

---

## Frontend Component

The analytics board is displayed in:
- **Component**: `frontend/src/components/dashboard/CanvasAnalyticsTab.tsx`
- **Page**: `frontend/src/pages/dashboard.tsx`
- **Tab**: "Canvas Analytics" (index 1)

---

## Backend Endpoint Details

**File**: `backend/api/settings_routes.py`
**Function**: `get_canvas_analytics_board()`
**Line**: ~1665

**Role Check**:
```python
if user.role not in ['teacher', 'admin', 'grader']:
    raise HTTPException(status_code=403, ...)
```

---

## Summary

| Role | Can Access? | Location | Notes |
|------|-------------|----------|-------|
| Teacher | ✅ Yes | `/dashboard` → Canvas Analytics tab | Full access |
| Admin | ✅ Yes | `/dashboard` → Canvas Analytics tab | Full access |
| Grader | ✅ Yes | `/dashboard` → Canvas Analytics tab | Full access |
| Student | ❌ No | Redirected to `/student` | Own dashboard only |

---

## Next Steps

1. **Login** with appropriate role (teacher/admin/grader)
2. Navigate to **Dashboard**
3. Click **"Canvas Analytics"** tab
4. Select a **course** from dropdown
5. View comprehensive **analytics data**

