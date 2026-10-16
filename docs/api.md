# CodeArena — REST API Documentation

This document describes the CodeArena REST API endpoints, standard response contracts, error formats, and database schemas.

## Base URL
- Development: `http://localhost:5000/api`
- Production: `https://api.codearena.example.com/api`

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation",
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 12,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters or payload",
    "details": [
      {
        "field": "limit",
        "message": "Limit must be an integer between 1 and 50"
      }
    ]
  }
}
```

---

## 1. System Health & Diagnostics

### Check System & Database Health
- **Endpoint**: `GET /api/health`
- **Access**: Public
- **Description**: Returns server status, uptime, current environment, and database connectivity.

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "CodeArena API",
    "version": "1.0.0",
    "environment": "development",
    "uptimeSeconds": 142,
    "timestamp": "2026-10-16T12:00:00.000Z",
    "database": {
      "status": "connected",
      "readyState": 1,
      "databaseName": "codearena"
    }
  },
  "message": "System diagnostics retrieved successfully"
}
```

---

## 2. Problems Catalogue

### List Problems
- **Endpoint**: `GET /api/problems`
- **Access**: Public
- **Query Parameters**:
  - `page` (integer, optional, default: 1, min: 1)
  - `limit` (integer, optional, default: 10, min: 1, max: 50)
  - `difficulty` (string, optional: `Easy`, `Medium`, `Hard`)
  - `topic` (string, optional, max: 100 chars, e.g. `Dynamic Programming`)
  - `search` (string, optional, max: 100 chars, searches problem title)
- **Security**:
  - Automatically restricted to `publicationStatus: 'published'`.
  - Private judge test cases (`judgeTestCases`) are excluded from output projection.
  - Arbitrary client MongoDB query objects are rejected.

#### Example Request:
```bash
GET /api/problems?difficulty=Easy&topic=Arrays%20%26%20Hashing&page=1&limit=10
```

#### Response: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "67104b2c...",
      "title": "Two Sum",
      "slug": "two-sum",
      "difficulty": "Easy",
      "topics": ["Arrays & Hashing", "Hash Table"],
      "description": "Given an array of integers nums...",
      "constraints": ["2 <= nums.length <= 10^4"],
      "examples": [
        {
          "input": "nums = [2,7,11,15], target = 9",
          "output": "[0,1]",
          "explanation": "Because nums[0] + nums[1] == 9, return [0, 1]."
        }
      ],
      "starterCode": {
        "javascript": "function twoSum(nums, target) { ... }",
        "python": "class Solution: ...",
        "cpp": "class Solution { ... }",
        "java": "class Solution { ... }"
      },
      "acceptanceRate": 52.4,
      "submissionCount": 1420,
      "acceptedCount": 744,
      "createdAt": "2026-10-16T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "message": "Problems retrieved successfully"
}
```

---

### Get Problem by Slug
- **Endpoint**: `GET /api/problems/:slug`
- **Access**: Public
- **URL Parameters**:
  - `slug` (string, required, lowercase alphanumeric with hyphens, 2-100 characters)

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "67104b2c...",
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "topics": ["Arrays & Hashing", "Hash Table"],
    "description": "Given an array of integers nums...",
    "constraints": ["2 <= nums.length <= 10^4"],
    "examples": [...],
    "starterCode": { ... },
    "acceptanceRate": 52.4
  },
  "message": "Problem details retrieved successfully"
}
```

#### Error Response: `404 Not Found` (if problem does not exist or is an unpublished draft)
```json
{
  "success": false,
  "error": {
    "code": "PROBLEM_NOT_FOUND",
    "message": "Problem not found with slug: 'non-existent-problem'"
  }
}
```

---

## 3. Authentication & Authorization

Authentication is managed using secure HTTP-only cookies (`codearena_token`), SameSite protection, and double-submit Anti-CSRF validation.

### Register User
- **Endpoint**: `POST /api/auth/register`
- **Rate Limit**: 30 requests per 15 minutes per IP
- **Access**: Public
- **Sets Cookie**: `codearena_token` (HttpOnly, SameSite, 7 days) and `codearena_csrf`

#### Request Payload
```json
{
  "name": "Ada Lovelace",
  "username": "adalovelace",
  "email": "ada@example.com",
  "password": "Password123!"
}
```

#### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "67104b2c...",
      "name": "Ada Lovelace",
      "username": "adalovelace",
      "email": "ada@example.com",
      "role": "user",
      "avatarUrl": "",
      "createdAt": "2026-10-16T12:00:00.000Z"
    },
    "csrfToken": "a3f5c1..."
  },
  "message": "User registered successfully"
}
```

---

### Login User
- **Endpoint**: `POST /api/auth/login`
- **Rate Limit**: 30 requests per 15 minutes per IP
- **Access**: Public
- **Sets Cookie**: `codearena_token` (HttpOnly, SameSite, 7 days)

#### Request Payload
```json
{
  "email": "ada@example.com",
  "password": "Password123!"
}
```
*(Note: The `email` field also accepts a `username`)*

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "67104b2c...",
      "name": "Ada Lovelace",
      "username": "adalovelace",
      "email": "ada@example.com",
      "role": "user"
    },
    "csrfToken": "a3f5c1..."
  },
  "message": "Signed in successfully"
}
```

#### Error Response: `401 Unauthorized` (Generic message for security)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### Logout & Revoke Session
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Authenticated or unauthenticated
- **Description**: Marks persistent session as revoked in the database and clears authentication cookies.

#### Response: `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Signed out successfully"
}
```

---

### Get Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Access**: Requires active authenticated cookie session
- **Description**: Restores user identity on application mount or page refresh.

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "67104b2c...",
      "name": "Ada Lovelace",
      "username": "adalovelace",
      "email": "ada@example.com",
      "role": "user",
      "avatarUrl": "",
      "createdAt": "2026-10-16T12:00:00.000Z"
    }
  },
  "message": "Current authenticated user retrieved successfully"
}
```

---

### Admin Authorization Check
- **Endpoint**: `GET /api/auth/admin-check`
- **Access**: Protected (Requires `role: 'admin'`)
- **Description**: Server-side role verification check.

#### Response: `200 OK` (Admin user)
```json
{
  "success": true,
  "data": {
    "authorized": true,
    "role": "admin",
    "adminUser": "admin"
  },
  "message": "Admin authorization verified"
}
```

#### Error Response: `403 Forbidden` (Regular user)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Forbidden: You do not have permission to access this resource."
  }
}
```

---

## 4. Submissions & Sandboxed Execution

### Run Sample Test Cases
- **Endpoint**: `POST /api/submissions/run`
- **Access**: Protected (Authentication required)
- **Description**: Executes user code against public sample test cases without recording a permanent submission.
- **Request Body**:
```json
{
  "problemId": "670ff13...",
  "language": "javascript",
  "sourceCode": "function twoSum(nums, target) { ... }"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "Accepted",
    "total": 2,
    "passed": 2,
    "failed": 0,
    "executionTime": 0.042,
    "memory": 14200,
    "results": [
      {
        "testCaseIndex": 0,
        "input": "nums = [2,7,11,15], target = 9",
        "expectedOutput": "[0,1]",
        "actualOutput": "[0,1]",
        "passed": true,
        "executionTime": 0.038,
        "memory": 13900,
        "status": "Accepted",
        "errorMessage": null
      }
    ]
  }
}
```

---

### Submit Solution for Full Judging
- **Endpoint**: `POST /api/submissions`
- **Access**: Protected (Authentication required, Rate limited: 20/min)
- **Description**: Judges user code against all test cases (both public samples and trusted database hidden test cases). Updates problem solve counts and user progress idempotently upon first Accepted result. Hidden test inputs and expected outputs are never exposed in the response.
- **Request Body**:
```json
{
  "problemId": "670ff13...",
  "language": "python",
  "sourceCode": "class Solution:\n    def twoSum(self, nums, target):\n        ..."
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "6710fa9...",
    "problemId": "670ff13...",
    "language": "python",
    "status": "Accepted",
    "totalTestCases": 5,
    "passedTestCases": 5,
    "executionTime": 0.056,
    "memory": 14500,
    "errorDetails": null,
    "createdAt": "2026-10-16T13:30:00.000Z"
  },
  "message": "Submission evaluated successfully"
}
```

---

### Get Authenticated User Submissions History
- **Endpoint**: `GET /api/submissions/me?problemId=670ff13...&page=1&limit=20`
- **Access**: Protected (Authentication required)
- **Description**: Retrieves paginated submission history for the authenticated user, optionally filtered by problem ID.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "6710fa9...",
      "problemId": {
        "_id": "670ff13...",
        "title": "Two Sum",
        "slug": "two-sum",
        "difficulty": "Easy"
      },
      "language": "python",
      "status": "Accepted",
      "totalTestCases": 5,
      "passedTestCases": 5,
      "executionTime": 0.056,
      "memory": 14500,
      "createdAt": "2026-10-16T13:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### Get Submission Details by ID
- **Endpoint**: `GET /api/submissions/:id`
- **Access**: Protected (Owner or Admin only)
- **Description**: Returns detailed submission record. Prohibits unauthorized users from accessing private submissions.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "6710fa9...",
    "userId": "67104b2...",
    "problemId": "670ff13...",
    "language": "python",
    "sourceCode": "class Solution: ...",
    "status": "Accepted",
    "totalTestCases": 5,
    "passedTestCases": 5,
    "executionTime": 0.056,
    "memory": 14500,
    "errorDetails": null,
    "createdAt": "2026-10-16T13:30:00.000Z"
  }
}
```

---

## 5. User Progress, Bookmarks & Profile

### Get User Progress & Analytics
- **Endpoint**: `GET /api/users/me/progress`
- **Access**: Protected (Authentication required)
- **Description**: Returns live aggregated metrics including unique problems solved by difficulty, overall acceptance rate, topic-wise progress breakdown, real daily submission activity (past 90 days), recent submissions, and bookmarked counts.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSolved": 12,
      "totalProblems": 50,
      "solvedPercentage": 24.0,
      "difficultyStats": {
        "easy": { "solved": 8, "total": 20 },
        "medium": { "solved": 3, "total": 20 },
        "hard": { "solved": 1, "total": 10 }
      },
      "submissions": {
        "total": 25,
        "accepted": 15,
        "acceptanceRate": 60.0,
        "formula": "(acceptedSubmissions / totalSubmissions) * 100"
      },
      "bookmarkedCount": 4
    },
    "topicProgress": [
      { "topic": "Arrays", "solved": 5, "total": 10, "percentage": 50 },
      { "topic": "Dynamic Programming", "solved": 1, "total": 8, "percentage": 13 }
    ],
    "activity": [
      { "date": "2026-10-15", "count": 4, "accepted": 3 },
      { "date": "2026-10-16", "count": 2, "accepted": 1 }
    ],
    "recentSubmissions": [
      {
        "_id": "6710fa9...",
        "problemId": {
          "_id": "670ff13...",
          "title": "Two Sum",
          "slug": "two-sum",
          "difficulty": "Easy"
        },
        "language": "javascript",
        "status": "Accepted",
        "executionTimeMs": 42,
        "createdAt": "2026-10-16T13:30:00.000Z"
      }
    ]
  }
}
```

---

### Get User Bookmarks
- **Endpoint**: `GET /api/users/me/bookmarks?page=1&limit=20`
- **Access**: Protected (Authentication required)
- **Description**: Retrieves paginated list of bookmarked problems for the authenticated user, annotated with solved status.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "bookmarkId": "6711ab3...",
      "bookmarkedAt": "2026-10-16T14:00:00.000Z",
      "problem": {
        "_id": "670ff13...",
        "title": "Two Sum",
        "slug": "two-sum",
        "difficulty": "Easy",
        "topics": ["Arrays", "Hash Table"],
        "status": "Solved",
        "isBookmarked": true
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### Bookmark a Problem
- **Endpoint**: `POST /api/users/me/bookmarks/:problemId`
- **Access**: Protected (Authentication + CSRF required)
- **Description**: Idempotently creates a bookmark for the specified problem.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "bookmarked": true,
    "problemId": "670ff13...",
    "bookmarkId": "6711ab3..."
  },
  "message": "Problem bookmarked successfully"
}
```

---

### Remove a Bookmark
- **Endpoint**: `DELETE /api/users/me/bookmarks/:problemId`
- **Access**: Protected (Authentication + CSRF required)
- **Description**: Idempotently deletes a problem bookmark.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "bookmarked": false,
    "problemId": "670ff13..."
  },
  "message": "Bookmark removed successfully"
}
```

---

### Toggle a Bookmark
- **Endpoint**: `POST /api/users/me/bookmarks/:problemId/toggle`
- **Access**: Protected (Authentication + CSRF required)
- **Description**: Toggles bookmark state (creates if absent, removes if present).
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "bookmarked": true,
    "problemId": "670ff13...",
    "bookmarkId": "6711ab3..."
  },
  "message": "Problem bookmarked"
}
```

---

### Get User Profile
- **Endpoint**: `GET /api/users/me/profile`
- **Access**: Protected (Authentication required)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "67104b2...",
    "username": "alex_coder",
    "email": "alex@codearena.dev",
    "name": "Alex Chen",
    "role": "user",
    "bio": "Software engineer preparing for full-stack systems and algorithmic interviews.",
    "targetRole": "Full-Stack Software Engineer",
    "createdAt": "2026-10-15T12:00:00.000Z"
  }
}
```

---

### Update User Profile
- **Endpoint**: `PUT /api/users/me/profile`
- **Access**: Protected (Authentication + CSRF required)
- **Request Body**:
```json
{
  "name": "Alex Chen",
  "bio": "Building scalable platforms with Node.js and React",
  "targetRole": "Senior Systems Engineer"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "67104b2...",
    "username": "alex_coder",
    "name": "Alex Chen",
    "bio": "Building scalable platforms with Node.js and React",
    "targetRole": "Senior Systems Engineer"
  },
  "message": "Profile updated successfully"
}
```

---

## 6. Administrative & Content Management Endpoints

All endpoints in this section require active authentication and role-based authorization:
- **Role Requirement**: `role: "admin"`
- **CSRF Token**: Required for mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) via `x-csrf-token` header or custom AJAX header.

---

### List All Admin Problems (Including Drafts)
- **Endpoint**: `GET /api/problems/admin/all`
- **Access**: Admin Only
- **Description**: Returns all problem records including unpublished drafts and archives, annotated with live submission counts.

#### Response: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "670ff13a...",
      "title": "Two Sum",
      "slug": "two-sum",
      "difficulty": "Easy",
      "topics": ["Arrays & Hashing", "Hash Table"],
      "publicationStatus": "published",
      "totalSubmissions": 1420,
      "createdAt": "2026-10-15T10:00:00.000Z"
    }
  ],
  "message": "Admin problems retrieved successfully"
}
```

---

### Get Problem Details with Judge Test Cases
- **Endpoint**: `GET /api/problems/admin/:id`
- **Access**: Admin Only
- **Description**: Fetches complete problem definition including starter templates and private `judgeTestCases` for administrative editing.

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "670ff13a...",
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "topics": ["Arrays & Hashing"],
    "description": "Given an array of integers...",
    "constraints": ["2 <= nums.length <= 10^4"],
    "examples": [
      { "input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "..." }
    ],
    "starterCode": {
      "javascript": "function twoSum(nums, target) {}",
      "python": "class Solution: ...",
      "cpp": "...",
      "java": "..."
    },
    "judgeTestCases": [
      { "input": "[2,7,11,15]\n9", "expectedOutput": "[0,1]", "isHidden": false },
      { "input": "[3,2,4]\n6", "expectedOutput": "[1,2]", "isHidden": true }
    ],
    "publicationStatus": "published",
    "totalSubmissions": 1420
  },
  "message": "Admin problem details retrieved successfully"
}
```

---

### Create Practice Problem
- **Endpoint**: `POST /api/problems`
- **Access**: Admin Only
- **Request Body**:
```json
{
  "title": "Binary Target Search",
  "slug": "binary-target-search",
  "difficulty": "Easy",
  "topics": ["Binary Search", "Arrays & Hashing"],
  "description": "Given a sorted array of distinct integers...",
  "constraints": ["1 <= nums.length <= 10^4"],
  "examples": [
    { "input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4" }
  ],
  "starterCode": {
    "javascript": "function search(nums, target) {}",
    "python": "class Solution: ...",
    "cpp": "...",
    "java": "..."
  },
  "judgeTestCases": [
    { "input": "[-1,0,3,5,9,12]\n9", "expectedOutput": "4", "isHidden": false },
    { "input": "[5]\n5", "expectedOutput": "0", "isHidden": true }
  ],
  "publicationStatus": "published"
}
```
- **Response**: `201 Created`
- **Audit**: Generates a `CREATE_PROBLEM` event in `AuditLog`.

---

### Update Practice Problem
- **Endpoint**: `PUT /api/problems/:id`
- **Access**: Admin Only
- **Description**: Updates problem metadata, statement, starter templates, and judge test cases.
- **Response**: `200 OK`
- **Audit**: Generates an `UPDATE_PROBLEM` event in `AuditLog`.

---

### Toggle or Set Publication Status
- **Endpoint**: `PATCH /api/problems/:id/publication`
- **Access**: Admin Only
- **Request Body**:
```json
{
  "publicationStatus": "published"
}
```
- **Allowed Statuses**: `published`, `draft`, `archived`
- **Response**: `200 OK`
- **Audit**: Generates a `TOGGLE_PUBLICATION` event in `AuditLog`.

---

### Delete Practice Problem (With Submission Safeguard)
- **Endpoint**: `DELETE /api/problems/:id`
- **Query Parameters**:
  - `force` (optional, boolean): If `true`, confirms permanent deletion even if user submissions exist.
- **Access**: Admin Only
- **Behavior**:
  - If the problem has **zero** submissions: Deletes problem, bookmarks, and progress records immediately.
  - If the problem has **one or more** submissions and `force != true`: Returns `409 Conflict` with `PROBLEM_HAS_SUBMISSIONS` error, instructing the admin to archive instead or pass `force=true`.
  - If `force=true`: Deletes problem, bookmarks, progress records, and associated submission records.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "670ff13a...",
    "submissionsDeleted": 0
  },
  "message": "Problem deleted successfully"
}
```
- **Audit**: Generates a `DELETE_PROBLEM` event in `AuditLog`.

---

### Administrative Activity & Audit Logs
- **Endpoint**: `GET /api/problems/admin/audit-logs`
- **Access**: Admin Only
- **Query Parameters**:
  - `page` (optional, integer $\ge 1$, default: 1)
  - `limit` (optional, integer $1 \le \text{limit} \le 100$, default: 20)
- **Description**: Returns paginated audit events for administrative operations (`CREATE_PROBLEM`, `UPDATE_PROBLEM`, `TOGGLE_PUBLICATION`, `DELETE_PROBLEM`, `CREATE_ADMIN`).

#### Response: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "6711ab3c...",
      "action": "CREATE_PROBLEM",
      "targetType": "Problem",
      "targetId": "6711ab3b...",
      "targetTitle": "Binary Target Search",
      "adminId": "67104b2c...",
      "adminUsername": "admin",
      "details": {
        "slug": "binary-target-search",
        "difficulty": "Easy",
        "publicationStatus": "published",
        "testCasesCount": 4
      },
      "ipAddress": "127.0.0.1",
      "createdAt": "2026-10-16T15:20:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 15,
    "totalPages": 1
  },
  "message": "Audit logs retrieved successfully"
}
```

