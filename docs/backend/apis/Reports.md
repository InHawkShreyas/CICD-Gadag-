
### ReportController Documentation

The `ReportController` is responsible for generating reports and PDFs related to applications, document verification, merit lists, fee payments, and facility reports in the admission system. It retrieves data from various services, processes it, and returns either JSON responses or PDF documents.

---

## Features

- Generate Application PDF (Student)
- Generate Application PDF (Admin)
- Document Verification List
- Document Verification PDF
- Merit List Report
- Merit List PDF
- Fee Payment Report
- Fee Payment PDF
- Facility Report List
- Facility Report PDF

---

## Dependencies

The controller uses the following services:

- `IApplicationQueryService`
- `IApplicationPhotoService`
- `IFileService`
- `ILookupService`
- `IDegreeService`
- `ICourseService`
- `IApplicationVerificationService`
- `IAcademicYearService`
- `IAdmissionFeeStructureService`
- `IFeeCollectionService`
- `ICurrentUserService`
- `IAdmittedStudentService`
- `IApplicationDocumentService`
- `IFeeCollectionManualService`

These services provide application data, photos, documents, fee details, verification status, academic years, and report information.

---

## API Endpoints

### 1. Generate My Application PDF

**Endpoint**

```
GET /api/report/application-pdf
```

**Parameters**

|Parameter|Type|Description|
|---|---|---|
|download|bool|Download PDF if true|

**Functionality**

- Retrieves logged-in user's application.
- Fetches photo and signature.
- Loads supporting documents.
- Generates application PDF using QuestPDF.
- Returns PDF file.

---

### 2. Generate Application PDF (Admin)

**Endpoint**

```
GET /api/report/application-pdf-admin
```

**Parameters**

|Parameter|Type|
|---|---|
|appNo|string|
|download|bool|

**Functionality**

- Retrieves application using Application Number.
- Loads applicant details, photo, signature, and documents.
- Generates PDF report.

---

### 3. Document Verification List

**Endpoint**

```
GET /api/report/document-verification-list
```

**Filters**

- Degree
- Course
- Academic Year
- Category
- Seat Type
- Karnataka Type
- Status

**Returns**

```
{  "sl": 1,  "appNo": "2627AHP00001",  "name": "Student Name",  "category": "GM",  "seatType": ["Rural"],  "karnataka": "KA",  "status": "Verified"}
```

---

### 4. Document Verification PDF

**Endpoint**

```
GET /api/report/document-verification-pdf
```

**Functionality**

- Generates PDF report of document verification records.
- Supports filtering by category, seat type, status, degree, course, and academic year.

---

### 5. Merit List

**Endpoint**

```
GET /api/report/merit-list
```

**Functionality**

- Calculates merit score.
- Adds bonus marks for:
    - Rural
    - Kannada Medium
    - NCC
    - Defence

**Merit Score Formula**

```
Merit Score = Percentage + Bonus Points
```

**Returns**

- Karnataka Merit List
- Hyderabad Karnataka Merit List
- Non-Karnataka Merit List
- Omnibus Merit List

---

### 6. Merit List PDF

**Endpoint**

```
GET /api/report/merit-list-pdf
```

**Functionality**

- Generates Provisional Merit List PDF.
- Calculates seat allocation.
- Generates category-wise cutoff.
- Produces allocation summary.

---

### 7. Fee Payment List

**Endpoint**

```
GET /api/report/fee-payment-list
```

**Filters**

- Degree
- Course
- Academic Year
- Category
- Fee Type
- Status

**Returns**

```
{  "summary": {    "totalApplications": 100,    "totalCollected": 500000,    "totalPending": 25000  }}
```

**Includes**

- Application Fee
- Admission Fee
- Paid Amount
- Balance Amount
- Settlement Details

---

### 8. Fee Payment PDF

**Endpoint**

```
GET /api/report/fee-payment-pdf
```

**Functionality**

- Generates PDF report of fee collections.
- Displays fee structures and payment details.
- Calculates collected and pending amounts.

---

### 9. Facility Report List

**Endpoint**

```
GET /api/report/facility-report-list
```

**Facility Types**

- Hostel
- Transport

**Returns**

```
{  "appNo": "2627AHP00001",  "name": "Student Name",  "gender": "Male",  "hostelFacility": true,  "transportFacility": false}
```

---

### 10. Facility Report PDF

**Endpoint**

```
GET /api/report/facility-report-pdf
```

**Functionality**

- Generates Hostel/Transport facility reports.
- Provides gender-wise statistics.
- Provides category-wise breakdown.

---

## Helper Methods

### NormalizeCategory()

Converts category names into standardized format.

Example:

```
2A → IIA2B → IIB3A → IIIA3B → IIIB
```

---

### ResolveQualifyingPercentage()

Determines qualifying examination percentage.

Supports:

- PUC
- HSC
- 12th
- Intermediate
- Diploma

Returns the highest applicable percentage.

---

### DetermineStudentType()

Determines applicant type:

|Type|Value|
|---|---|
|Karnataka|KA|
|Hyderabad Karnataka|HK|
|Non-Karnataka|NK|

---

### PassesKarnatakaFilter()

Checks whether the applicant matches selected Karnataka filters.

---

## Error Handling

All endpoints use `try-catch` blocks.

Example Response:

```
{  "message": "Error generating PDF",  "error": "Exception message"}
```

---

## Summary

`ReportController` is the central reporting module of the admission system. It manages application reports, verification reports, merit lists, fee payment reports, and facility reports while supporting PDF generation through QuestPDF and providing filter-based reporting APIs.