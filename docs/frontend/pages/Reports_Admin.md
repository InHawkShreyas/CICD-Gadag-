# Reports Page

## Introduction

The Reports Page provides administrators with the ability to generate, view, and download various admission-related reports. The page supports multiple report types, including Merit List, Document Verification, Fee Payment, Manual Fee Collection, Admitted Students, Hostel, and Transport reports.

The system allows users to apply filters such as Degree, Course, Academic Year, Category, Seat Type, Gender, Verification Status, and Fee Type to generate detailed reports.

---

## Main Features

### 1. Report Selection

Users can select one of the following report types:

- Merit List
    
- Document Verification
    
- Fee Payment
    
- Manual Fee Collection
    
- Admitted Students List
    
- Opted Transport
    
- Opted Hostel
    

Only one report can be generated at a time.

---

### 2. Academic Filters

The following mandatory filters are available for report generation:

- Degree
    
- Course
    
- Academic Year
    

These filters help retrieve report data specific to the selected academic criteria.

---

### 3. Advanced Filters

Additional filters are available depending on the selected report type.

#### Merit List

- Category
    
- Seat Type
    
- Student Type (KA, HK, NK)
    

#### Document Verification

- Category
    
- Seat Type
    
- Student Type
    
- Verification Status
    

#### Admitted Students

- Category
    

#### Hostel and Transport Reports

- Gender
    
- Verification Status
    

#### Fee Reports

- Fee Type
    

---

### 4. Generate Report

After selecting the required filters, users can click the **Generate Report** button.

The system:

1. Validates the selected filters.
    
2. Retrieves report data from the server.
    
3. Displays the generated report in tabular format.
    

---

### 5. Download PDF

Generated reports can be downloaded as PDF documents.

Supported reports:

- Merit List
    
- Document Verification
    
- Fee Payment
    
- Manual Fee Collection
    
- Admitted Students
    
- Hostel Report
    
- Transport Report
    

---

### 6. Reset Filters

The Reset button clears:

- Degree
    
- Course
    
- Academic Year
    
- Fee Type
    
- Applied Filters
    
- Generated Report Data
    

This allows users to generate a new report with different criteria.

---

## Report Types

### Merit List Report

Displays merit-ranked applicants.

Information displayed:

- Rank
    
- Application Number
    
- Applicant Name
    
- Father Name
    
- Category
    
- Seat Type
    
- Student Type
    
- Merit Score
    
- Percentage
    
- Bonus Points
    
- Status
    

---

### Document Verification Report

Displays document verification details.

Information displayed:

- Serial Number
    
- Application Number
    
- Applicant Name
    
- Category
    
- Seat Type
    
- Student Type
    
- Verification Status
    

---

### Fee Payment Report

Displays online fee payment information.

Information displayed:

- Application Number
    
- Applicant Name
    
- Fee Type
    
- Fee Amount
    
- Platform Fee
    
- Paid Amount
    
- Balance Amount
    
- Receipt Number
    
- Payment Date
    
- Payment Status
    
- Settlement Date
    
- Settlement ID
    

Summary information:

- Total Records
    
- Total Amount Collected
    
- Total Pending Amount
    

---

### Manual Fee Collection Report

Displays manually collected fee records.

Information displayed:

- Application Number
    
- Fee Name
    
- Amount
    
- Payment Mode
    
- Transaction ID
    
- Receipt Number
    
- Payment Date
    

Summary information:

- Total Records
    
- Total Amount Collected
    

---

### Admitted Students Report

Displays admission status of applicants.

Information displayed:

- Application Number
    
- Applicant Name
    
- Category
    
- Degree
    
- Course
    
- Admission Status
    

Summary information:

- Total Applicants
    
- Admitted Students
    
- Not Admitted Students
    

---

### Opted Hostel Report

Displays applicants who opted for hostel facilities.

Information displayed:

- Application Number
    
- Applicant Name
    
- Father Name
    
- Gender
    
- Category
    
- Degree
    
- Course
    
- Phone Number
    
- Hostel Facility Opted
    
- Verification Status
    

Summary information:

- Total Students
    
- Male Students
    
- Female Students
    
- Other Gender Students
    

---

### Opted Transport Report

Displays applicants who opted for transport facilities.

Information displayed:

- Application Number
    
- Applicant Name
    
- Father Name
    
- Gender
    
- Category
    
- Degree
    
- Course
    
- Phone Number
    
- Transport Facility Opted
    
- Verification Status
    

Summary information:

- Total Students
    
- Male Students
    
- Female Students
    
- Other Gender Students
    

---

## Process Flow

1. User opens the Reports Page.
    
2. User selects a report type.
    
3. User selects Degree, Course, and Academic Year.
    
4. User applies optional filters.
    
5. User clicks Generate Report.
    
6. System validates the selected criteria.
    
7. Report data is retrieved and displayed.
    
8. User reviews the generated report.
    
9. User may download the report as a PDF.
    
10. User may reset filters and generate another report.
    

---

## Validation Rules

### Mandatory Fields

The following fields are required:

- Degree
    
- Course
    
- Academic Year
    

### Fee Reports

For Fee Payment and Manual Fee Collection reports:

- Fee Type is mandatory.
    

If mandatory fields are not selected, the system displays an error message.

---

## User Notifications

The system displays notifications for:

### Success

- Report generated successfully
    
- PDF downloaded successfully
    

### Error

- Missing mandatory filters
    
- Report generation failure
    
- PDF download failure
    

### Information

- No records found for selected criteria
    

---

## Conclusion

The Reports Page provides a centralized reporting system for admission management. It enables administrators to generate, view, filter, and download various admission-related reports, helping streamline admission monitoring, verification, fee tracking, and facility management processes.
