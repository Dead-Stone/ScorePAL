# Canvas Analytics Board - API Endpoints Used

This document lists all Canvas API endpoints used in the comprehensive analytics board endpoint.

## Endpoint

**Backend**: `GET /api/settings/canvas/data/courses/{course_id}/analytics/board`

**Description**: Aggregates data from multiple Canvas API endpoints to provide comprehensive analytics for a course dashboard.

---

## Canvas API Endpoints Used

### 1. Course Information
- **Endpoint**: `GET /api/v1/courses/:course_id`
- **Parameters**: 
  - `include[]=total_students`
  - `include[]=term`
  - `include[]=syllabus_body`
  - `include[]=course_image`
- **Purpose**: Get course metadata, term information, and student count
- **Reference**: [Courses API - Show course](https://canvas.instructure.com/doc/api/courses.html#method.courses.show)

### 2. Students List
- **Endpoint**: `GET /api/v1/courses/:course_id/users`
- **Parameters**:
  - `enrollment_type[]=student`
  - `per_page=100`
  - `include[]=email`
  - `include[]=avatar_url`
  - `include[]=enrollments`
- **Purpose**: Get all students enrolled in the course with their profile information
- **Reference**: [Users API - List users in course](https://canvas.instructure.com/doc/api/users.html#method.users.index)

### 3. Enrollments with Grades
- **Endpoint**: `GET /api/v1/courses/:course_id/enrollments`
- **Parameters**:
  - `type[]=StudentEnrollment`
  - `per_page=100`
  - `include[]=current_points`
  - `include[]=final_points`
- **Purpose**: Get enrollment information including current/final scores, grades, and points
- **Returns**: 
  - `current_score`, `final_score`
  - `current_grade`, `final_grade`
  - `current_points`, `final_points`
- **Reference**: [Enrollments API - List enrollments](https://canvas.instructure.com/doc/api/enrollments.html#method.enrollments_api.index)

### 4. Assignments
- **Endpoint**: `GET /api/v1/courses/:course_id/assignments`
- **Parameters**:
  - `per_page=100`
  - `include[]=submission`
- **Purpose**: Get all assignments in the course with submission data
- **Reference**: [Assignments API - List assignments](https://canvas.instructure.com/doc/api/assignments.html#method.assignments_api.index)

### 5. Student Submissions
- **Endpoint**: `GET /api/v1/courses/:course_id/students/submissions`
- **Parameters**:
  - `per_page=100`
  - `include[]=assignment`
  - `include[]=user`
- **Purpose**: Get all student submissions across all assignments
- **Returns**: Submission data with scores, grades, timestamps, and status
- **Reference**: [Submissions API - List submissions for students](https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.for_students)

### 6. Student Analytics (Optional)
- **Endpoint**: `GET /api/v1/courses/:course_id/analytics/users/:student_id/assignments`
- **Purpose**: Get detailed analytics for individual students (used in student grades endpoint)
- **Reference**: [Analytics API - User assignment data](https://developerdocs.instructure.com/services/canvas/resources/analytics)

---

## Analytics Data Provided

### Overview Statistics
- Total students
- Total assignments
- Total submissions
- Graded vs. ungraded submissions
- Average, median, high, and low scores
- Grading progress percentage

### Grade Distribution
- Count of students by letter grade (A, B, C, D, F)
- Based on percentage scores from enrollments

### Student Details (Optional)
For each student:
- Current/final scores and grades
- Points earned vs. possible
- Submission count
- Graded count
- Average score
- Total points earned

### Assignment Analytics (Optional)
For each assignment:
- Submission count
- Graded count
- Average, median, high, and low scores
- Submission rate
- Grading progress

### Submission Trends (Optional)
- Submissions by date
- Total active days
- Average submissions per day

### Engagement Metrics (Optional)
- Late submissions count
- Missing submissions count
- On-time submission rate
- Completion rate

---

## Usage Example

```bash
# Get full analytics board
GET /api/settings/canvas/data/courses/123/analytics/board

# Get analytics without student details (faster)
GET /api/settings/canvas/data/courses/123/analytics/board?include_student_details=false

# Get analytics without assignment analytics
GET /api/settings/canvas/data/courses/123/analytics/board?include_assignment_analytics=false

# Get analytics without engagement metrics
GET /api/settings/canvas/data/courses/123/analytics/board?include_engagement=false
```

---

## Response Structure

```json
{
  "status": "success",
  "analytics": {
    "course_id": 123,
    "course_info": {
      "id": 123,
      "name": "Course Name",
      "course_code": "CS101",
      "term": "Fall 2024",
      "total_students": 50,
      "workflow_state": "available"
    },
    "overview": {
      "total_students": 50,
      "total_assignments": 10,
      "total_submissions": 450,
      "graded_submissions": 400,
      "average_score": 85.5,
      "median_score": 87.0,
      "high_score": 98.0,
      "low_score": 65.0,
      "grading_progress": 88.9
    },
    "grade_distribution": {
      "A": 15,
      "B": 20,
      "C": 10,
      "D": 4,
      "F": 1
    },
    "students": [...],
    "assignments": [...],
    "submission_trends": {...},
    "engagement_metrics": {...}
  }
}
```

---

## Performance Considerations

1. **Multiple API Calls**: This endpoint makes 5-6 Canvas API calls
2. **Pagination**: Uses `per_page=100` to minimize requests
3. **Optional Data**: Use query parameters to exclude unnecessary data for faster responses
4. **Caching**: Consider implementing caching for frequently accessed courses

---

## Required Permissions

Your Canvas API key needs the following scopes:
- `url:GET|/api/v1/courses/:course_id` - Read course info
- `url:GET|/api/v1/courses/:course_id/users` - Read course roster
- `url:GET|/api/v1/courses/:course_id/enrollments` - Read enrollments
- `url:GET|/api/v1/courses/:course_id/assignments` - Read assignments
- `url:GET|/api/v1/courses/:course_id/students/submissions` - Read submissions

---

## References

- [Canvas API Documentation](https://canvas.instructure.com/doc/api/index.html)
- [Courses API](https://canvas.instructure.com/doc/api/courses.html)
- [Users API](https://canvas.instructure.com/doc/api/users.html)
- [Enrollments API](https://canvas.instructure.com/doc/api/enrollments.html)
- [Assignments API](https://canvas.instructure.com/doc/api/assignments.html)
- [Submissions API](https://canvas.instructure.com/doc/api/submissions.html)
- [Analytics API](https://developerdocs.instructure.com/services/canvas/resources/analytics)

