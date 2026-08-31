# Course API

- Base route: `api/courses`

Endpoints:
- `POST /api/courses` — Create a course. Accepts `CreateCourseDto`.
- `GET /api/courses` — Get all courses.
- `GET /api/courses/by-degree/{degreeId}` — Get courses by degree ID.
- `GET /api/courses/{id}` — Get course by ID.
- `PUT /api/courses` — Update course. Accepts `UpdateCourseDto`.
- `DELETE /api/courses/{id}` — Delete course.
