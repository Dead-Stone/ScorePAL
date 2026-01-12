# Student Features & Access Guide

This document outlines all features and capabilities that students should have access to in ScorePAL.

**IMPORTANT:** Students have access to **ONLY** Dashboard and Settings pages.

## 📊 **Dashboard & Overview**

### ✅ Currently Implemented

1. **Student Dashboard** (`/student` or `/dashboard/student`)
   - Personalized dashboard with overview statistics
   - Performance metrics and trends
   - Course listings
   - View own grades and feedback (within dashboard only)

2. **Statistics Cards**
   - Average Score across all assignments
   - Total Points earned vs. possible
   - Highest Score achieved
   - Performance Trend (Improving/Declining/Stable)

3. **Personalized Insights**
   - AI-generated insights based on performance
   - Trend analysis (improving/declining grades)
   - Achievement recognition (excellent work, good performance)
   - Focus area recommendations based on weaknesses

## 📝 **Grades & Results** (Within Dashboard Only)

### ✅ Currently Implemented

**Note:** Students can view grades and feedback **ONLY within the dashboard**. They cannot access the Results page (`/results`).

1. **View Own Grades** (Dashboard Only)
   - Access to all their own graded assignments
   - Score, percentage, and letter grade for each assignment
   - Grading date and timestamp
   - **Cannot click through to detailed results pages**

2. **All Grades Tab** (Dashboard Only)
   - Comprehensive table of all assignments
   - Sortable and filterable grade history
   - Assignment names and details

3. **Detailed Feedback** (Dashboard Only)
   - Overall feedback for each assignment
   - Criteria-specific feedback
   - Strengths and weaknesses identified
   - Improvement suggestions

4. **Rubric Breakdown** (Dashboard Only)
   - Detailed rubric criteria scores
   - Points awarded vs. maximum points per criterion
   - Criterion-specific feedback
   - Visual breakdown of performance by rubric component

## 📈 **Analytics & Progress**

### ✅ Currently Implemented

1. **Progress Chart**
   - Visual line/bar chart showing grade trends over time
   - Performance trajectory visualization
   - Assignment-by-assignment progress tracking

2. **Performance Statistics**
   - Grade distribution (A, B, C, D, F counts)
   - Average score calculations
   - Total points summary

3. **Trend Analysis**
   - Comparison of recent vs. previous assignments
   - Performance improvement/decline indicators
   - Visual trend indicators

## 🎓 **Courses**

### ✅ Currently Implemented

1. **My Courses View**
   - List of all enrolled courses
   - Course-specific performance data
   - Course-level statistics

2. **Course Performance** (if Canvas integrated)
   - Course grades and assignments
   - Canvas grade comparison
   - Course-specific analytics

## 🔒 **Access Restrictions**

### ❌ Students CANNOT Access:

1. **Grading Functionality**
   - Cannot grade assignments
   - Cannot access `/grade` page
   - Cannot see grading interface

2. **Results Pages**
   - Cannot access `/results` page
   - Cannot access `/results/[id]` detail pages
   - Cannot view detailed result pages (even for own results)
   - All grade viewing must be done within dashboard

3. **Rubrics Management**
   - Cannot access `/rubrics` page
   - Cannot create or edit rubrics
   - Cannot view rubric management interface

4. **Other Students' Data**
   - Cannot view other students' grades
   - Cannot access other students' results
   - Cannot see class-wide analytics (unless anonymized)

5. **Teacher/Admin Features**
   - Cannot access teacher dashboard
   - Cannot view full analytics board
   - Cannot configure Canvas API settings
   - Cannot access advanced settings

6. **System Administration**
   - Cannot manage users
   - Cannot access admin features
   - Cannot modify system settings

## 📱 **Navigation & UI**

### ✅ Currently Implemented

1. **Navigation Menu** (Limited)
   - **Dashboard** link only (main navigation)
   - **Settings** link only (in dropdown menu)
   - No access to: Grade, Results, Rubrics, Students links
   - Help/Support access (if available)
   - Logout functionality

2. **User Profile & Settings**
   - View own profile information
   - Update personal details (if allowed)
   - View account information
   - Access Settings page

## 🔐 **Security & Privacy**

### ✅ Implemented

1. **Role-Based Access Control**
   - Students can only view their own results
   - API endpoints enforce student-only access
   - Backend validates student permissions

2. **Data Privacy**
   - Students cannot see other students' data
   - Anonymized class data (if provided)
   - Secure authentication required

## 📋 **API Endpoints Available to Students**

### ✅ Currently Accessible

1. **Results API** (Backend only - for dashboard data)
   - `GET /api/results/student/{student_id}` - Get own results only (used by dashboard)
   - Note: Students cannot access results pages, but API is used to populate dashboard

2. **Analytics API** (Backend only - for dashboard data)
   - `GET /api/analytics/student/{student_id}` - Own analytics only (used by dashboard)
   - `GET /api/analytics/student/{student_id}/assignments` - Own assignment history (used by dashboard)

3. **User API**
   - `GET /auth/me` - Own profile information
   - `GET /auth/me/stats` - Own usage statistics
   - `PUT /auth/me/profile` - Update own profile (if allowed)

## 🎯 **Recommended Additional Features** (Future Enhancements)

### 💡 Potential Additions

1. **Grade Notifications**
   - Email notifications when new grades are posted
   - Push notifications for grade updates
   - Assignment deadline reminders

2. **Grade Export**
   - Download grades as PDF
   - Export to CSV/Excel
   - Print grade reports

3. **Assignment Calendar**
   - View upcoming assignments
   - Track submission deadlines
   - Calendar integration

4. **Performance Goals**
   - Set grade targets
   - Track progress toward goals
   - Goal achievement notifications

5. **Study Recommendations**
   - AI-powered study suggestions based on weaknesses
   - Recommended resources
   - Practice assignment suggestions

6. **Peer Comparison** (Anonymized)
   - See class average (anonymized)
   - Percentile ranking
   - Performance relative to class

7. **Grade History Timeline**
   - Visual timeline of all grades
   - Semester/term breakdowns
   - Year-over-year comparisons

8. **Feedback Archive**
   - Searchable feedback history
   - Tag and categorize feedback
   - Save important feedback notes

9. **Mobile App Features**
   - Mobile-optimized dashboard
   - Quick grade checks
   - Push notifications

10. **Grade Predictions**
    - Predict final grade based on current performance
    - "What if" scenarios
    - Grade calculator

## 📊 **Summary**

### ✅ What Students CAN Do:
- ✅ View their own grades and results **within dashboard only**
- ✅ See detailed feedback and rubric breakdowns **within dashboard only**
- ✅ Track performance trends and progress **within dashboard only**
- ✅ View course information **within dashboard only**
- ✅ Access personalized insights **within dashboard only**
- ✅ View statistics and analytics (own data only) **within dashboard only**
- ✅ Access **Settings** page
- ✅ Access **Dashboard** page (student-specific)

### ❌ What Students CANNOT Do:
- ❌ Access `/results` page
- ❌ Access `/results/[id]` detail pages
- ❌ Access `/rubrics` page
- ❌ Grade assignments
- ❌ View other students' grades
- ❌ Access teacher/admin features
- ❌ Modify system settings (Canvas API, etc.)
- ❌ Create or edit rubrics
- ❌ Access full analytics board
- ❌ Manage users or courses
- ❌ Navigate to any page other than Dashboard and Settings

---

**Last Updated:** Based on current implementation
**Note:** This list reflects the current state of the application. Additional features may be added in future updates.

