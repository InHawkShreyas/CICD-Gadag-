# Application Document API 

## Overview

The Application Document API is used to manage applicant documents during the admission process. It allows authorized users to upload, update, retrieve, download, and delete application documents.

**Base URL**

```
/api/application-documents
```

**Authentication**

All APIs require user authentication.

---

# 1. Upload Document

### API

```
POST /api/application-documents
```

### Description

Uploads a new document for an application.

### Request Parameters

|Parameter|Description|
|---|---|
|Application ID|Unique application identifier|
|Document Type ID|Type of document being uploaded|
|File|Document file|

### Success Response

```
Created successfully
```

---

# 2. Update Document

### API

```
PUT /api/application-documents
```

### Description

Updates an existing application document.

### Request Parameters

|Parameter|Description|
|---|---|
|Document ID|Existing document identifier|
|File|Updated document file|

### Success Response

```
Updated successfully
```

---

# 3. Get All Documents

### API

```
GET /api/application-documents
```

### Description

Retrieves all application documents available in the system.

### Response

Returns a list of uploaded documents.

---

# 4. Get Document By ID

### API

```
GET /api/application-documents/{id}
```

### Description

Retrieves details of a specific document using its unique ID.

### Path Parameter

|Parameter|Description|
|---|---|
|id|Document ID|

### Response

Returns document details.

---

# 5. Get Documents By Application ID

### API

```
GET /api/application-documents/by-app-id/{applicationId}
```

### Description

Retrieves all documents associated with a specific application.

### Path Parameter

|Parameter|Description|
|---|---|
|applicationId|Application ID|

### Response

Returns all documents uploaded for the specified application.

---

# 6. Delete Document

### API

```
DELETE /api/application-documents/{id}
```

### Description

Deletes a document permanently from the system.

### Path Parameter

|Parameter|Description|
|---|---|
|id|Document ID|

### Success Response

```
Deleted successfully
```

---

# 7. Download Document

### API

```
GET /api/application-documents/download/{id}
```

### Description

Downloads a document file using its document ID.

### Path Parameter

|Parameter|Description|
|---|---|
|id|Document ID|

### Response

Returns the document file for download.

### Error Response

```
404 Not Found
```

Returned when the document does not exist.

---

# Features

- Upload application documents.
- Update uploaded documents.
- View all documents.
- View documents by application.
- Download document files.
- Delete documents.
- Secure access through authentication.

# Conclusion

The Application Document API provides complete document management functionality for the admission system. It enables secure uploading, retrieval, updating, downloading, and deletion of applicant documents while maintaining application-wise document records.
