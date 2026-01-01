# Canvas API Endpoints for Student Data

This document lists Canvas LMS API endpoints that can be used to access student information, based on the official Canvas API documentation.

## References
- [Canvas Assignments API](https://canvas.instructure.com/doc/api/assignments.html#method.assignments_api.index)
- [Canvas Users API](https://canvas.instructure.com/doc/api/users.html)
- [Canvas Submissions API](https://canvas.instructure.com/doc/api/submissions.html)
- [Canvas Enrollments API](https://canvas.instructure.com/doc/api/enrollments.html)
- [Canvas Courses API](https://canvas.instructure.com/doc/api/courses.html)

---

## 1. Student List & User Information

### List Users in a Course
- **Endpoint**: `GET /api/v1/courses/:course_id/users`
- **Scope**: `url:GET|/api/v1/courses/:course_id/users`
- **Description**: Returns a paginated list of users enrolled in a specific course
- **Parameters**:
  - `enrollment_type[]=student` - Filter to only students
  - `include[]=email` - Include email addresses
  - `include[]=avatar_url` - Include avatar URLs
  - `include[]=enrollments` - Include enrollment information
  - `search_term` - Search for users by name or email
  - `user_ids[]` - Filter by specific user IDs
- **Reference**: [Users API - List users in course](https://canvas.instructure.com/doc/api/users.html#method.users.index)

### Get a Single User
- **Endpoint**: `GET /api/v1/users/:user_id`
- **Scope**: `url:GET|/api/v1/users/:id`
- **Description**: Returns user details including name, email, avatar, and profile information
- **Parameters**:
  - `include[]=avatar_url` - Include avatar URL
  - `include[]=email` - Include email address
- **Reference**: [Users API - Show user](https://canvas.instructure.com/doc/api/users.html#method.users.show)

### Get Current User Profile
- **Endpoint**: `GET /api/v1/users/self`
- **Scope**: `url:GET|/api/v1/users/self`
- **Description**: Returns the profile of the authenticated user
- **Reference**: [Users API - Show user details](https://canvas.instructure.com/doc/api/users.html#method.users.show)

### List Students in a Course (Simplified)
- **Endpoint**: `GET /api/v1/courses/:course_id/students`
- **Scope**: `url:GET|/api/v1/courses/:course_id/students`
- **Description**: Returns a paginated list of students enrolled in the course
- **Reference**: [Courses API - List students](https://canvas.instructure.com/doc/api/courses.html#method.courses.students)

---

## 2. Enrollment Information

### List Enrollments in a Course
- **Endpoint**: `GET /api/v1/courses/:course_id/enrollments`
- **Scope**: `url:GET|/api/v1/courses/:course_id/enrollments`
- **Description**: Returns enrollments for a course, including student enrollments
- **Parameters**:
  - `type[]=StudentEnrollment` - Filter to student enrollments only
  - `user_id` - Filter by specific user ID
  - `include[]=avatar_url` - Include avatar URLs
  - `include[]=group_ids` - Include group memberships
- **Reference**: [Enrollments API - List enrollments](https://canvas.instructure.com/doc/api/enrollments.html#method.enrollments_api.index)

### List Enrollments in a Section
- **Endpoint**: `GET /api/v1/sections/:section_id/enrollments`
- **Scope**: `url:GET|/api/v1/sections/:section_id/enrollments`
- **Description**: Returns enrollments for a specific section
- **Parameters**:
  - `type[]=StudentEnrollment` - Filter to student enrollments
- **Reference**: [Enrollments API - List enrollments](https://canvas.instructure.com/doc/api/enrollments.html#method.enrollments_api.index)

### Get a Single Enrollment
- **Endpoint**: `GET /api/v1/courses/:course_id/enrollments/:id`
- **Scope**: `url:GET|/api/v1/courses/:course_id/enrollments/:id`
- **Description**: Returns details of a specific enrollment
- **Reference**: [Enrollments API - Show enrollment](https://canvas.instructure.com/doc/api/enrollments.html#method.enrollments_api.show)

---

## 3. Submissions & Grades

### List Submissions for Multiple Assignments
- **Endpoint**: `GET /api/v1/courses/:course_id/students/submissions`
- **Scope**: `url:GET|/api/v1/courses/:course_id/students/submissions`
- **Description**: Returns all submissions for assignments in a course, organized by student
- **Parameters**:
  - `student_ids[]` - Filter by specific student IDs
  - `assignment_ids[]` - Filter by specific assignment IDs
  - `include[]=assignment` - Include assignment details
  - `include[]=user` - Include user information
  - `include[]=submission_comments` - Include submission comments
  - `include[]=attachments` - Include file attachments
  - `grouped` - Group submissions by student
- **Reference**: [Submissions API - List submissions for students](https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.for_students)

### List Submissions for an Assignment
- **Endpoint**: `GET /api/v1/courses/:course_id/assignments/:assignment_id/submissions`
- **Scope**: `url:GET|/api/v1/courses/:course_id/assignments/:assignment_id/submissions`
- **Description**: Returns all submissions for a specific assignment
- **Parameters**:
  - `include[]=user` - Include user information
  - `include[]=submission_comments` - Include comments
  - `include[]=attachments` - Include file attachments
  - `student_ids[]` - Filter by specific student IDs
- **Reference**: [Submissions API - List assignment submissions](https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.index)

### Get a Single Submission
- **Endpoint**: `GET /api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id`
- **Scope**: `url:GET|/api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id`
- **Description**: Returns a specific student's submission for an assignment
- **Parameters**:
  - `include[]=submission_history` - Include submission history
  - `include[]=submission_comments` - Include comments
  - `include[]=rubric_assessment` - Include rubric assessment
- **Reference**: [Submissions API - Show submission](https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.show)

### List Submissions for Multiple Students
- **Endpoint**: `GET /api/v1/courses/:course_id/students/submissions?student_ids[]=:user_id`
- **Scope**: `url:GET|/api/v1/courses/:course_id/students/submissions`
- **Description**: Returns submissions for specific students across all assignments
- **Reference**: [Submissions API - List submissions for students](https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.for_students)

---

## 4. Assignments (Student View)

### List Assignments
- **Endpoint**: `GET /api/v1/courses/:course_id/assignments`
- **Scope**: `url:GET|/api/v1/courses/:course_id/assignments`
- **Description**: Returns assignments for a course
- **Parameters**:
  - `include[]=submission` - Include submission data for the current user
  - `include[]=assignment_visibility` - Include visibility information
  - `include[]=overrides` - Include assignment overrides
  - `include[]=observed_users` - Include observed users' submissions
  - `include[]=can_edit` - Include edit permissions
  - `search_term` - Search assignments by name
  - `override_assignment_dates` - Apply assignment overrides
- **Reference**: [Assignments API - List assignments](https://canvas.instructure.com/doc/api/assignments.html#method.assignments_api.index)

### Get a Single Assignment
- **Endpoint**: `GET /api/v1/courses/:course_id/assignments/:id`
- **Scope**: `url:GET|/api/v1/courses/:course_id/assignments/:id`
- **Description**: Returns details of a specific assignment
- **Parameters**:
  - `include[]=submission` - Include submission data
  - `include[]=overrides` - Include assignment overrides
  - `include[]=observed_users` - Include observed users' submissions
  - `include[]=can_edit` - Include edit permissions
- **Reference**: [Assignments API - Show assignment](https://canvas.instructure.com/doc/api/assignments.html#method.assignments_api.show)

---

## 5. Courses (Student View)

### List Courses for a User
- **Endpoint**: `GET /api/v1/users/:user_id/courses`
- **Scope**: `url:GET|/api/v1/users/:user_id/courses`
- **Description**: Returns courses for a specific user
- **Parameters**:
  - `include[]=total_scores` - Include total scores
  - `include[]=enrollments` - Include enrollment information
  - `include[]=current_grading_period_scores` - Include grading period scores
  - `enrollment_type` - Filter by enrollment type (e.g., "student")
  - `enrollment_role` - Filter by enrollment role
- **Reference**: [Courses API - List user courses](https://canvas.instructure.com/doc/api/courses.html#method.courses.user_index)

### List Courses for Current User
- **Endpoint**: `GET /api/v1/users/self/courses`
- **Scope**: `url:GET|/api/v1/users/self/courses`
- **Description**: Returns courses for the authenticated user
- **Parameters**: Same as above
- **Reference**: [Courses API - List user courses](https://canvas.instructure.com/doc/api/courses.html#method.courses.user_index)

### Get a Single Course
- **Endpoint**: `GET /api/v1/courses/:id`
- **Scope**: `url:GET|/api/v1/courses/:id`
- **Description**: Returns course details
- **Parameters**:
  - `include[]=total_scores` - Include total scores
  - `include[]=current_grading_period_scores` - Include grading period scores
  - `include[]=term` - Include term information
  - `include[]=course_image` - Include course image
  - `include[]=syllabus_body` - Include syllabus
- **Reference**: [Courses API - Show course](https://canvas.instructure.com/doc/api/courses.html#method.courses.show)

---

## 6. Grades & Analytics

### Get Enrollment Grades (Current & Final)
- **Endpoint**: `GET /api/v1/courses/:course_id/enrollments`
- **Scope**: `url:GET|/api/v1/courses/:course_id/enrollments`
- **Description**: Returns enrollment information including grades object with:
  - `current_score` - Current numeric score
  - `final_score` - Final numeric score
  - `current_grade` - Current letter grade
  - `final_grade` - Final letter grade
  - `unposted_current_score` - Unposted current score
  - `unposted_final_score` - Unposted final score
  - `unposted_current_grade` - Unposted current grade
  - `unposted_final_grade` - Unposted final grade
- **Parameters**:
  - `user_id` - Filter by specific user ID
  - `type[]=StudentEnrollment` - Filter to student enrollments
  - `include[]=current_points` - Include current points earned
  - `include[]=final_points` - Include final points earned
- **Reference**: [Enrollments API - List enrollments](https://canvas.instructure.com/doc/api/enrollments.html#method.enrollments_api.index)

### Get Student Analytics - Assignment Data
- **Endpoint**: `GET /api/v1/courses/:course_id/analytics/users/:student_id/assignments`
- **Scope**: `url:GET|/api/v1/courses/:course_id/analytics/users/:student_id/assignments`
- **Description**: Returns assignment data for a specific student, sorted by due date, including:
  - Basic assignment information
  - Grade breakdown (student's actual grade)
  - Submission details
  - Points possible and earned
- **Reference**: [Analytics API - User assignment data](https://developerdocs.instructure.com/services/canvas/resources/analytics)

### Get Student Analytics - Activity
- **Endpoint**: `GET /api/v1/courses/:course_id/analytics/users/:student_id/activity`
- **Scope**: `url:GET|/api/v1/courses/:course_id/analytics/users/:student_id/activity`
- **Description**: Returns activity data for a student including page views, participations, and submissions
- **Reference**: [Analytics API - User activity](https://developerdocs.instructure.com/services/canvas/resources/analytics)

### Get Student Analytics - Communication
- **Endpoint**: `GET /api/v1/courses/:course_id/analytics/users/:student_id/communication`
- **Scope**: `url:GET|/api/v1/courses/:course_id/analytics/users/:student_id/communication`
- **Description**: Returns communication data for a student
- **Reference**: [Analytics API - User communication](https://developerdocs.instructure.com/services/canvas/resources/analytics)

### List Grade Change Log for a Student
- **Endpoint**: `GET /api/v1/audit/grade_change/students/:student_id`
- **Scope**: `url:GET|/api/v1/audit/grade_change/students/:student_id`
- **Description**: Returns grade change history for a student, including:
  - Previous and new grades
  - Who made the change
  - When the change was made
- **Parameters**:
  - `course_id` - Filter by course ID
  - `assignment_id` - Filter by assignment ID
  - `grader_id` - Filter by grader ID
- **Reference**: [Grade Change Log API](https://canvas.instructure.com/doc/api/grade_change_log.html)

### Get Course Grades via Submissions
- **Endpoint**: `GET /api/v1/courses/:course_id/students/submissions?student_ids[]=:user_id&include[]=assignment`
- **Scope**: `url:GET|/api/v1/courses/:course_id/students/submissions`
- **Description**: Returns all grades for a student in a course through submissions
- **Parameters**:
  - `student_ids[]` - Student ID(s) to get grades for
  - `include[]=assignment` - Include assignment details
  - `include[]=user` - Include user information
- **Reference**: [Submissions API - List submissions for students](https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.for_students)

### Get What-If Grades
- **Endpoint**: `GET /api/v1/courses/:course_id/users/:user_id/assignments`
- **Scope**: `url:GET|/api/v1/courses/:course_id/users/:user_id/assignments`
- **Description**: Returns assignments with what-if grade calculations for a student
- **Parameters**:
  - `include[]=submission` - Include submission data
  - `include[]=assignment` - Include assignment details
- **Reference**: [What-If Grades API](https://canvas.instructure.com/doc/api/what_if_grades.html)

### List Gradeable Students for an Assignment
- **Endpoint**: `GET /api/v1/courses/:course_id/assignments/:assignment_id/gradeable_students`
- **Scope**: `url:GET|/api/v1/courses/:course_id/assignments/:assignment_id/gradeable_students`
- **Description**: Returns list of students who can be graded for a specific assignment
- **Reference**: [Submissions API - List gradeable students](https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.gradeable_students)

### Get Student Course Totals
- **Endpoint**: `GET /api/v1/courses/:course_id/users/:user_id/total_scores`
- **Scope**: `url:GET|/api/v1/courses/:course_id/users/:user_id/total_scores`
- **Description**: Returns total scores for a student in a course
- **Reference**: [Courses API - Get user totals](https://canvas.instructure.com/doc/api/courses.html)

---

## 7. Activity & Engagement

### List User Page Views
- **Endpoint**: `GET /api/v1/users/:user_id/page_views`
- **Scope**: `url:GET|/api/v1/users/:user_id/page_views`
- **Description**: Returns page view history for a user
- **Parameters**:
  - `start_time` - Filter by start time
  - `end_time` - Filter by end time
- **Reference**: [Users API - List user page views](https://canvas.instructure.com/doc/api/users.html#method.page_views.index)

---

## 8. Search & Discovery

### Find Recipients
- **Endpoint**: `GET /api/v1/search/recipients`
- **Scope**: `url:GET|/api/v1/search/recipients`
- **Description**: Searches for valid recipients (users, courses, groups)
- **Parameters**:
  - `search` - Search term
  - `context` - Context to search in (e.g., course_id)
  - `type` - Type of recipient (user, course, group)
- **Reference**: [Search API - Find recipients](https://canvas.instructure.com/doc/api/search.html#method.search.recipients)

---

## Common Query Parameters

### Pagination
- `per_page` - Number of results per page (default: 50, max: 100)
- `page` - Page number

### Includes
- `include[]=avatar_url` - Include avatar URLs
- `include[]=email` - Include email addresses
- `include[]=enrollments` - Include enrollment information
- `include[]=submission` - Include submission data
- `include[]=assignment` - Include assignment details
- `include[]=user` - Include user information
- `include[]=total_scores` - Include total scores

### Filtering
- `enrollment_type[]=student` - Filter to students only
- `type[]=StudentEnrollment` - Filter to student enrollments
- `student_ids[]` - Filter by specific student IDs
- `assignment_ids[]` - Filter by specific assignment IDs
- `search_term` - Search by name or email

---

## Required Permissions/Scopes

To access student data, your Canvas API key needs the following scopes:

1. **Read Course Roster**: `url:GET|/api/v1/courses/:course_id/users`
2. **Read Enrollments**: `url:GET|/api/v1/courses/:course_id/enrollments`
3. **Read Submissions**: `url:GET|/api/v1/courses/:course_id/assignments/:assignment_id/submissions`
4. **Read Assignments**: `url:GET|/api/v1/courses/:course_id/assignments`
5. **Read User Profile**: `url:GET|/api/v1/users/:id`

---

## Example Usage

### Get All Students in a Course
```bash
GET /api/v1/courses/123/users?enrollment_type[]=student&include[]=email&include[]=avatar_url
```

### Get Student Submissions
```bash
GET /api/v1/courses/123/students/submissions?student_ids[]=456&include[]=assignment&include[]=user
```

### Get Student Grades via Enrollments (Current & Final)
```bash
GET /api/v1/courses/123/enrollments?user_id=456&type[]=StudentEnrollment&include[]=current_points&include[]=final_points
```
**Returns**: Current score, final score, current grade, final grade, and points earned

### Get Student Grades via Submissions
```bash
GET /api/v1/courses/123/students/submissions?student_ids[]=456&include[]=assignment
```
**Returns**: All assignment submissions with scores and grades

### Get Student Analytics - Assignment Data
```bash
GET /api/v1/courses/123/analytics/users/456/assignments
```
**Returns**: Comprehensive assignment data with grade breakdowns and submission details

### Get Complete Student Grade Information
```bash
GET /api/v1/courses/123/enrollments?user_id=456&type[]=StudentEnrollment
# Combined with:
GET /api/v1/courses/123/students/submissions?student_ids[]=456&include[]=assignment&include[]=user
```
**Returns**: Complete grade information including:
- Current and final scores/grades
- All assignment submissions
- Points earned vs. possible
- Submission status and dates
- Missing assignments

---

## Notes

1. **Authentication**: All endpoints require Bearer token authentication
2. **Rate Limiting**: Canvas API has rate limits - typically 300 requests per 5 minutes
3. **Permissions**: Access depends on the role of the API key owner (Teacher, TA, Designer, etc.)
4. **Pagination**: Most list endpoints support pagination with `per_page` and `page` parameters
5. **Filtering**: Use `enrollment_type[]=student` to filter to students only

---

## Key Endpoints for Student Grades Summary

### Primary Grade Endpoints (Recommended)

1. **Enrollments API** - Best for overall course grades
   - `GET /api/v1/courses/:course_id/enrollments?user_id=:student_id&type[]=StudentEnrollment`
   - Returns: `current_score`, `final_score`, `current_grade`, `final_grade`, `current_points`, `final_points`
   - **Use when**: You need the student's overall course grade

2. **Submissions API** - Best for assignment-level grades
   - `GET /api/v1/courses/:course_id/students/submissions?student_ids[]=:student_id&include[]=assignment`
   - Returns: Individual assignment scores, grades, submission status
   - **Use when**: You need detailed assignment-by-assignment grades

3. **Analytics API** - Best for comprehensive student performance
   - `GET /api/v1/courses/:course_id/analytics/users/:student_id/assignments`
   - Returns: Assignment data with grade breakdowns, submission details, sorted by due date
   - **Use when**: You need analytics and performance insights

### Grade Data Structure

**Enrollment Grades Object:**
```json
{
  "current_score": 85.5,
  "final_score": 87.2,
  "current_grade": "B",
  "final_grade": "B+",
  "current_points": 342.0,
  "final_points": 348.8,
  "unposted_current_score": 85.5,
  "unposted_final_score": 87.2
}
```

**Submission Object (with grades):**
```json
{
  "id": 12345,
  "assignment_id": 789,
  "score": 90,
  "grade": "A",
  "points_possible": 100,
  "submitted_at": "2024-01-15T10:30:00Z",
  "graded_at": "2024-01-16T14:20:00Z",
  "workflow_state": "graded",
  "late": false,
  "missing": false
}
```

## References

- [Canvas API Documentation](https://canvas.instructure.com/doc/api/index.html)
- [Canvas Assignments API](https://canvas.instructure.com/doc/api/assignments.html)
- [Canvas Users API](https://canvas.instructure.com/doc/api/users.html)
- [Canvas Submissions API](https://canvas.instructure.com/doc/api/submissions.html)
- [Canvas Enrollments API](https://canvas.instructure.com/doc/api/enrollments.html)
- [Canvas Courses API](https://canvas.instructure.com/doc/api/courses.html)
- [Canvas Analytics API](https://developerdocs.instructure.com/services/canvas/resources/analytics)
- [Canvas Grade Change Log API](https://canvas.instructure.com/doc/api/grade_change_log.html)

