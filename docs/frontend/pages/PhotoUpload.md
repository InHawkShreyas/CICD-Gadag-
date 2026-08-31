# Photo Upload Page

- Route: `/student/photos`
- Source: `frontend/web/src/features/student/photo.tsx`

Purpose:
- Upload passport photo, applicant signature and parent signature for applications.

Key behaviors:
- Sends multipart form-data to `applicationPhotoService.upload()` with fields `applicationId`, `appNo` and files `photo`, `signature`, `parentSignature`.
- Provides download endpoints for each file via `fileService` which streams binary files.

Notes:
- Endpoint responses are consumed directly and `File` responses are used to download content in the browser.
