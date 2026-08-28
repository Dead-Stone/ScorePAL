# PeopleSoft/SIS Integration Guide

## Overview

The URL you provided (`https://cmsweb.cms.sjsu.edu/psp/CSJPRD/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.SSS_STUDENT_CENTER.GBL`) is San Jose State University's **PeopleSoft Campus Solutions** Student Center, which is a **Student Information System (SIS)**, not Canvas LMS.

## Key Differences: Canvas vs PeopleSoft/SIS

### Canvas LMS
- **Purpose**: Learning Management System (LMS) for course content, assignments, grades
- **API Access**: Public REST API with API keys
- **Student Data**: Course enrollments, assignments, submissions, grades
- **Access**: Students can generate their own API keys
- **Integration**: Relatively straightforward with API keys

### PeopleSoft/SIS
- **Purpose**: Student Information System for enrollment, registration, academic records
- **API Access**: Enterprise REST API (if available), typically requires institutional approval
- **Student Data**: Official enrollment records, transcripts, registration, financial aid
- **Access**: Usually requires institutional IT approval and OAuth/enterprise authentication
- **Integration**: More complex, requires institutional partnership

## Can We Access PeopleSoft?

### Challenges:

1. **Authentication Required**
   - PeopleSoft requires Okta SSO login
   - Cannot access without valid SJSU credentials
   - Web scraping is not recommended and may violate terms of service

2. **API Availability**
   - PeopleSoft Campus Solutions has REST APIs, but they're typically:
     - Behind institutional firewalls
     - Require OAuth 2.0 or enterprise authentication
     - Need institutional approval/partnership
     - May require VPN access

3. **Institutional Restrictions**
   - SJSU likely restricts API access to:
     - Authorized institutional applications
     - Approved third-party integrations
     - Internal systems only
   - Student-level API access is uncommon

4. **Data Privacy & FERPA**
   - SIS systems contain sensitive academic records
   - Access is heavily regulated (FERPA compliance)
   - Requires proper authorization and security measures

## What Would Be Needed?

### Option 1: Official Institutional Integration
1. **Contact SJSU IT Services**
   - Request API access/partnership
   - Obtain OAuth credentials
   - Get approval for integration
   - Set up secure authentication

2. **Technical Requirements**
   - OAuth 2.0 client credentials
   - API endpoint access
   - Secure token management
   - FERPA compliance measures

### Option 2: Student Portal Scraping (Not Recommended)
- ❌ **Not Recommended** - Violates terms of service
- ❌ Requires storing student credentials (security risk)
- ❌ Fragile (breaks when UI changes)
- ❌ May violate FERPA/privacy regulations
- ❌ Could result in account suspension

### Option 3: Use Canvas Instead (Recommended)
- ✅ Canvas already integrated
- ✅ Students can generate their own API keys
- ✅ No institutional approval needed
- ✅ Contains course and grade data
- ✅ More reliable and supported

## Why Canvas is Better for This Use Case

For viewing **course grades and assignments**, Canvas is the better choice because:

1. **Easier Access**: Students can generate API keys themselves
2. **Course Data**: Contains assignments, submissions, and grades
3. **Already Integrated**: We already have Canvas integration working
4. **No Institutional Approval**: No need to contact IT services
5. **Real-time Data**: Direct API access to current course information

## PeopleSoft Would Be Useful For:

- Official enrollment verification
- Transcript data
- Registration information
- Financial aid status
- Degree progress tracking

But for **course grades and assignments**, Canvas provides this data more easily.

## Recommendation

**Stick with Canvas integration** because:

1. ✅ **Already Working**: Canvas integration is implemented and functional
2. ✅ **Student Access**: Students can configure their own API keys
3. ✅ **Course Data**: Canvas has all the course/grade data you need
4. ✅ **No Approval Needed**: No institutional IT approval required
5. ✅ **Better Support**: Canvas API is well-documented and supported

## If You Still Need PeopleSoft Integration

### Steps to Request Access:

1. **Contact SJSU IT Services**
   - Email: cmshelp@sjsu.edu (from search results)
   - Phone: (408) 924-1530
   - Request: "API access for student course enrollment data"

2. **Provide Information**
   - Purpose of integration
   - Security measures you'll implement
   - FERPA compliance plan
   - Data usage and storage policies

3. **Technical Setup** (if approved)
   - OAuth 2.0 client registration
   - API endpoint documentation
   - Authentication flow implementation
   - Secure credential storage

## Current Status

**Current Implementation**: Canvas API integration ✅
- Students can connect their Canvas account
- View courses, assignments, and grades
- No institutional approval needed

**PeopleSoft Integration**: Not implemented ❌
- Would require institutional approval
- More complex authentication
- Not necessary for course/grade viewing

## Conclusion

For your use case (viewing courses and grades), **Canvas is the right choice**. PeopleSoft integration would be overkill and require significant institutional coordination. The Canvas API already provides all the course and grade data you need.

If you're missing courses in Canvas, refer to the [Canvas Courses Troubleshooting Guide](./CANVAS_COURSES_TROUBLESHOOTING.md) for solutions.


