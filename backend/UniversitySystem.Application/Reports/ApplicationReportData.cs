using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QuestPDF.Previewer;
using UniversitySystem.Application.Dtos.Application;

public class ApplicationReportData
{
    public Applications? Application { get; set; }
    public List<EducationDetail>? EducationDetails { get; set; }
    public List<ApplicationCourseDetail>? CourseDetails { get; set; }
    public List<SeatType>? SeatTypes { get; set; }

    public List<ApplicationDocumentResponseDto> Documents { get; set; } = new();
    public Dictionary<Guid, string> LookupMap { get; set; } = new();
    public Dictionary<Guid, string> DegreeMap { get; set; } = new();
    public Dictionary<Guid, string> CourseMap { get; set; } = new();
    public Dictionary<Guid, (string Description, string BatchYear)> AcademicYearMap { get; set; } = new();
    public byte[]? PhotoBytes { get; set; }
    public byte[]? SignatureBytes { get; set; }

    public byte[]? LogoBytes { get; set; }
    public string? DegreeTypeName { get; set; }

    // PG-only educational background (traditional exam levels + Degree Marks with periods)
    public List<PgEducationDetailDto>? PgEducationDetails { get; set; }
}



public class ApplicationReport : IDocument
{
    private readonly ApplicationReportData _data;

    private const string Ink = "#130000";
    private const string Muted = "#555555";
    private const string RuleColor = "#820000";
    private const string BorderCol = "#BBBBBB";
    private const string DefaultValue = "—";
    private const string DegreeMarksLevel = "Degree Marks";

    public ApplicationReport(ApplicationReportData data) => _data = data;
    private const string CurrentAcademicYear = "2026-2027";

    private const string CertificationAcademicYear = "2025-2026";

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;


    private string? LookupName(Guid? id)
    {
        if (id.HasValue && _data.LookupMap.TryGetValue(id.Value, out var name) && !string.IsNullOrWhiteSpace(name))
            return name;
        return null;
    }

    private string DegreeName(Guid? id)
    {
        if (id.HasValue && _data.DegreeMap.TryGetValue(id.Value, out var name))
            return !string.IsNullOrWhiteSpace(name) ? name : id.Value.ToString();
        return id?.ToString() ?? DefaultValue;
    }

    private bool IsPgApplication =>
    !string.IsNullOrWhiteSpace(_data.DegreeTypeName) &&
    _data.DegreeTypeName.Contains("PG", StringComparison.OrdinalIgnoreCase);

    private string CourseName(Guid? id)
    {
        if (id.HasValue && _data.CourseMap.TryGetValue(id.Value, out var name))
            return !string.IsNullOrWhiteSpace(name) ? name : id.Value.ToString();
        return id?.ToString() ?? DefaultValue;
    }

    private string AcademicYearName(Guid? id)
    {
        if (id.HasValue && _data.AcademicYearMap.TryGetValue(id.Value, out var ay))
            return !string.IsNullOrWhiteSpace(ay.Description) ? ay.Description : DefaultValue;
        return DefaultValue;
    }

    private string BatchYearLabel(Guid? id)
    {
        if (id.HasValue && _data.AcademicYearMap.TryGetValue(id.Value, out var ay))
            return !string.IsNullOrWhiteSpace(ay.BatchYear) ? ay.BatchYear : DefaultValue;
        return DefaultValue;
    }




    private string ResolvedBatchYear(Guid? batchId)
    {
        if (!batchId.HasValue)
            return "1st Year";

        var name = BatchYearLabel(batchId);
        return name != DefaultValue ? name : "1st Year";
    }

    private bool IsCertificationCourse(Guid? degreeId) =>
        DegreeName(degreeId).Contains("Certificat", StringComparison.OrdinalIgnoreCase);

    private string ResolvedBatchYearForCourse(ApplicationCourseDetail? course)
    {
        if (IsCertificationCourse(course?.DegreeId))
        {

            return CertificationAcademicYear;
        }

        return ResolvedBatchYear(course?.BatchId);
    }


    private string? BatchNumberForCourse(ApplicationCourseDetail? course)
    {
        if (!IsCertificationCourse(course?.DegreeId))
            return null;

        return LookupName(course?.BatchTypeId);
    }


    private bool IsCertificationCourseReport =>
        IsCertificationCourse(_data.CourseDetails?.FirstOrDefault()?.DegreeId);

    private List<ApplicationCourseDetail> OrderedCourseDetails =>
        _data.CourseDetails?
            .OrderBy(c => ParsePreferenceNumber(c?.Preference))
            .ToList()
        ?? new List<ApplicationCourseDetail>();

    private static int ParsePreferenceNumber(string? preference)
    {
        if (string.IsNullOrWhiteSpace(preference))
            return int.MaxValue;
        var digits = new string(preference.Where(char.IsDigit).ToArray());

        return int.TryParse(digits, out var p) ? p : int.MaxValue;
    }

    private static int TraditionalOrder(string? examLevel) => examLevel switch
    {
        "10th" => 0,
        "12th" => 1,
        "Diploma" => 2,
        "Sem 1" => 3,
        "Sem 2" => 4,
        "Sem 3" => 5,
        "Sem 4" => 6,
        "Sem 5" => 7,
        "Sem 6" => 8,
        _ => int.MaxValue
    };

    private static void SectionHeader(ColumnDescriptor col, string title)
    {
        col.Item().PaddingTop(8).Column(c =>
        {
            c.Item().PaddingBottom(3)
                .Text(title).Bold().FontSize(9f).FontColor(RuleColor);
            c.Item().Height(1.5f).Background(RuleColor);
        });
        col.Item().PaddingBottom(4);
    }

    private static void FieldRow(TableDescriptor t, string label, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return;

        var v = value;

        t.Cell()
            .BorderBottom(0.5f).BorderRight(0.5f).BorderColor(BorderCol)
            .PaddingVertical(3).PaddingHorizontal(5)
            .Text(label).FontSize(7.5f).Bold().FontColor(Ink);

        t.Cell()
            .BorderBottom(0.5f).BorderColor(BorderCol)
            .PaddingVertical(3).PaddingHorizontal(5)
            .Text(v).FontSize(7.5f).FontColor(Ink);
    }

    private static void TableHeader(TableDescriptor table, string label) =>
        table.Cell()
            .BorderBottom(1.5f).BorderRight(0.5f).BorderColor(BorderCol)
            .PaddingVertical(4).PaddingHorizontal(4)
            .Text(label).Bold().FontSize(7.5f).FontColor(Ink);

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(32);
            page.MarginTop(18);
            page.MarginBottom(14);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(8).FontColor(Ink));

            page.Header().Column(hdr =>
            {
                hdr.Item().Row(row =>
                {
                    if (_data.LogoBytes?.Length > 0)
                        row.ConstantItem(64).Height(64).AlignMiddle().Image(_data.LogoBytes).FitArea();
                    else
                        row.ConstantItem(64);

                    row.RelativeItem().AlignMiddle().AlignCenter().Column(c =>
                    {
                        c.Item().Text("Mahatma Gandhi Rural Development and Panchayat Raj University")
                            .Bold().FontSize(12f).FontColor(Ink).AlignCenter();
                        c.Item().PaddingTop(2)
                            .Text("Koushalya Vikas Bhavan, Grama Gangothri Campus, Nagavi, Gadag-582103,Karnataka, India")
                            .FontSize(7.5f).FontColor(Muted).AlignCenter();
                        c.Item().PaddingTop(1)
                            .Text("E-mail: enquiry.ksrdpru@gmail.com  |  Phone: 08372-230338")
                            .FontSize(7.5f).FontColor(Muted).AlignCenter();
                    });

                    row.ConstantItem(64);
                });

                hdr.Item().PaddingTop(6).Height(1.5f).Background(Ink);
                hdr.Item().PaddingTop(2).Height(0.5f).Background(BorderCol);

                hdr.Item().PaddingTop(4).PaddingBottom(4).AlignCenter()
      .Text(IsCertificationCourseReport
          ? $"CERTIFICATION COURSE REPORT | Academic Year : {CertificationAcademicYear}"
          : IsPgApplication
              ? $"PG APPLICATION REPORT | Academic Year : {CurrentAcademicYear}"
              : $"ADMISSION APPLICATION REPORT | Academic Year : {CurrentAcademicYear}")
      .Bold().FontSize(9.5f).FontColor(Ink).AlignCenter();

                hdr.Item().Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(2).Height(1.5f).Background(Ink);
            });


            page.Content().PaddingTop(8).Column(col =>
            {
                var app = _data.Application;


                var orderedCourses = OrderedCourseDetails;
                var firstPreferenceCourse = orderedCourses.FirstOrDefault();


                col.Item().PaddingBottom(6).Row(row =>
                {
                    row.AutoItem()
     .Border(0.75f).BorderColor(BorderCol)
     .Padding(3).PaddingHorizontal(8)
     .Text(text =>
     {
         text.Span("Batch Year: ").Bold().FontSize(8f).FontColor(Muted);
         text.Span(ResolvedBatchYearForCourse(firstPreferenceCourse))
             .Bold().FontSize(8f).FontColor(Ink);
     });

                    var batchNumber = BatchNumberForCourse(firstPreferenceCourse);
                    if (!string.IsNullOrWhiteSpace(batchNumber))
                    {
                        row.ConstantItem(8);

                        row.AutoItem()
                            .Border(0.75f).BorderColor(BorderCol)
                            .Padding(3).PaddingHorizontal(8)
                            .Text(text =>
                            {
                                text.Span("Batch Number: ").Bold().FontSize(8f).FontColor(Muted);
                                text.Span(batchNumber).Bold().FontSize(8f).FontColor(Ink);
                            });
                    }

                    row.RelativeItem();

                    row.AutoItem()
                        .Border(0.75f).BorderColor(BorderCol)
                        .Padding(3).PaddingHorizontal(8)
                        .Text(text =>
                        {
                            text.Span("Application No: ").Bold().FontSize(8f).FontColor(Muted);
                            text.Span(app?.AppNo ?? "N/A").Bold().FontSize(8f).FontColor(Ink);
                        });
                });


                SectionHeader(col, "Personal Details");

                col.Item().Row(mainRow =>
                {
                    mainRow.RelativeItem(3).Column(left =>
                    {
                        left.Item().Table(t =>
                        {
                            t.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.9f);
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.9f);
                            });

                            FieldRow(t, "Full Name", app?.Name);
                            FieldRow(t, "Application No", app?.AppNo);
                            FieldRow(t, "Academic Year", IsCertificationCourseReport ? CertificationAcademicYear : CurrentAcademicYear);
                            FieldRow(t, "Date of Birth", app?.Dob?.ToString("dd-MM-yyyy"));
                            FieldRow(t, "Gender", LookupName(app?.Gender));
                            FieldRow(t, "Email", app?.Email);
                            FieldRow(t, "Phone", app?.Phone);
                            FieldRow(t, "Aadhar No", app?.AadharNo);
                            FieldRow(t, "RD Number", app?.RdNumber);
                            FieldRow(t, "Nationality", LookupName(app?.NationalityId));
                            FieldRow(t, "Category", LookupName(app?.CategoryId));
                            FieldRow(t, "Religion", LookupName(app?.Religion));

                            FieldRow(t, "Caste", app?.Caste);
                            FieldRow(t, "Annual Income", app?.AnnualIncome?.ToString());
                            FieldRow(t, "Place of Birth", app?.PlaceOfBirth);
                            FieldRow(t, "Passport No", app?.PassportNo);
                            FieldRow(t, "Karnataka Resident", app?.KarnatakaYn == true ? "Yes" : "No");
                        });

                        left.Item().PaddingTop(4).Table(t =>
                        {
                            t.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.9f);
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.9f);
                            });

                            FieldRow(t, "Permanent Address", app?.PermanentAddress);
                            FieldRow(t, "Communication Address", app?.CommunicationAddress);
                        });
                    });

                    mainRow.ConstantItem(10);


                    mainRow.RelativeItem(0.85f).Column(right =>
                    {
                        right.Item().Border(0.75f).BorderColor(BorderCol).Column(photoBox =>
                        {
                            photoBox.Item()
                                .BorderBottom(0.75f).BorderColor(BorderCol)
                                .Padding(3).AlignCenter()
                                .Text("Photograph").Bold().FontSize(7.5f).FontColor(Muted);

                            if (_data.PhotoBytes?.Length > 0)
                                photoBox.Item().Height(78).Padding(3).Image(_data.PhotoBytes).FitArea();
                            else
                                photoBox.Item().Height(78).AlignCenter().AlignMiddle()
                                    .Text("Photo").FontSize(8).FontColor(Muted);
                        });

                        right.Item().PaddingTop(6).Border(0.75f).BorderColor(BorderCol).Column(signBox =>
                        {
                            signBox.Item()
                                .BorderBottom(0.75f).BorderColor(BorderCol)
                                .Padding(3).AlignCenter()
                                .Text("Signature").Bold().FontSize(7.5f).FontColor(Muted);

                            if (_data.SignatureBytes?.Length > 0)
                                signBox.Item().Height(40).Padding(3).Image(_data.SignatureBytes).FitArea();
                            else
                                signBox.Item().Height(40).AlignCenter().AlignMiddle()
                                    .Text("Signature").FontSize(8).FontColor(Muted);
                        });
                    });
                });


                SectionHeader(col, "Parent / Guardian Details");

                col.Item().Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(1.1f);
                        c.RelativeColumn(1.9f);
                        c.RelativeColumn(1.1f);
                        c.RelativeColumn(1.9f);
                    });

                    FieldRow(t, "Father Name", app?.FatherName);
                    FieldRow(t, "Mother Name", app?.MotherName);
                    FieldRow(t, "Father Mobile", app?.FatherNo);
                    FieldRow(t, "Mother Mobile", app?.MotherNo);
                    FieldRow(t, "Father Occupation", app?.FatherOccupation);
                    FieldRow(t, "Mother Occupation", app?.MotherOccupation);
                    FieldRow(t, "Guardian Name", app?.GuardianName);
                    FieldRow(t, "Guardian Mobile", app?.GuardianNo);
                });


                // ---- Educational Background ----
                // PG applications use the richer PgEducationDetails model (traditional exam
                // levels + a single "Degree Marks" record with sem/year periods).
                // Non-PG applications keep using the flat EducationDetails list.
                if (IsPgApplication && _data.PgEducationDetails?.Any() == true)
                {
                    var traditional = _data.PgEducationDetails
                        .Where(d => !string.Equals(d.ExamLevel, DegreeMarksLevel, StringComparison.OrdinalIgnoreCase))
                        .OrderBy(d => TraditionalOrder(d.ExamLevel))
                        .ToList();

                    var degreeMarks = _data.PgEducationDetails
                        .FirstOrDefault(d => string.Equals(d.ExamLevel, DegreeMarksLevel, StringComparison.OrdinalIgnoreCase));

                    if (traditional.Any())
                    {
                        SectionHeader(col, "Educational Background");

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(18);
                                columns.RelativeColumn(1.6f);  // Exam Level
                                columns.RelativeColumn(2.0f);  // Institute
                                columns.RelativeColumn(1.4f);  // Reg/USN No.
                                columns.ConstantColumn(34);    // Year
                                columns.ConstantColumn(48);    // Obtained
                                columns.ConstantColumn(48);    // Max Marks
                                columns.ConstantColumn(36);    // %
                            });

                            TableHeader(table, "Sl");
                            TableHeader(table, "Exam Level");
                            TableHeader(table, "Institute Name");
                            TableHeader(table, "Reg./USN No.");
                            TableHeader(table, "Year");
                            TableHeader(table, "Obtained");
                            TableHeader(table, "Max Marks");
                            TableHeader(table, "%");

                            int slno = 1;
                            foreach (var edu in traditional)
                            {
                                void Cell(string? val) =>
                                    table.Cell()
                                        .BorderBottom(0.5f).BorderRight(0.5f).BorderColor(BorderCol)
                                        .PaddingVertical(3).PaddingHorizontal(4)
                                        .Text(val ?? DefaultValue).FontSize(7.5f).FontColor(Ink);

                                Cell(slno++.ToString());
                                Cell(edu.ExamLevel);
                                Cell(edu.InstituteName);
                                Cell(edu.RegistrationNumber);
                                Cell(edu.Year?.ToString());
                                Cell(edu.ObtainedMarks?.ToString("F2"));
                                Cell(edu.MaxMarks?.ToString("F2"));
                                Cell(edu.Percentage?.ToString("F2") ?? edu.Cgpa?.ToString("F2"));
                            }
                        });
                    }

                    if (degreeMarks is not null)
                    {
                        SectionHeader(col, "Degree Marks");

                        col.Item().Table(t =>
                        {
                            t.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.9f);
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.9f);
                            });

                            FieldRow(t, "UG Subject/Degree Type", degreeMarks.UgSubject);
                            FieldRow(t, "Entry Mode", degreeMarks.EntryMode);
                            FieldRow(t, "Year Of Passing", degreeMarks.Year?.ToString());
                            FieldRow(t, "Overall %", degreeMarks.OverallPercentage?.ToString("F2"));

                            if (degreeMarks.SameInstitution == true)
                            {
                                FieldRow(t, "Institute Name", degreeMarks.InstituteName);
                                FieldRow(t, "Reg./USN No.", degreeMarks.RegistrationNumber);
                            }
                        });

                        if (degreeMarks.Periods?.Any() == true)
                        {
                            var sameInstitution = degreeMarks.SameInstitution == true;
                            var periodHeader = string.Equals(degreeMarks.EntryMode, "year", StringComparison.OrdinalIgnoreCase)
                                ? "Year"
                                : "Semester";

                            col.Item().PaddingTop(4).Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.ConstantColumn(18);   // Sl
                                    columns.RelativeColumn(1.3f); // Period
                                    if (!sameInstitution)
                                    {
                                        columns.RelativeColumn(2.2f); // Institute
                                        columns.RelativeColumn(1.5f); // Reg No
                                    }
                                    columns.ConstantColumn(45);   // SGPA
                                    columns.ConstantColumn(50);   // %
                                    columns.ConstantColumn(45);   // CGPA
                                });

                                TableHeader(table, "Sl");
                                TableHeader(table, periodHeader);
                                if (!sameInstitution)
                                {
                                    TableHeader(table, "Institute Name");
                                    TableHeader(table, "Reg./USN No.");
                                }
                                TableHeader(table, "SGPA");
                                TableHeader(table, "%");
                                TableHeader(table, "CGPA");

                                int sl = 1;
                                foreach (var period in degreeMarks.Periods.OrderBy(p => p.PeriodIndex))
                                {
                                    void Cell(string? val) =>
                                        table.Cell()
                                            .BorderBottom(0.5f).BorderRight(0.5f).BorderColor(BorderCol)
                                            .PaddingVertical(3).PaddingHorizontal(4)
                                            .Text(val ?? DefaultValue).FontSize(7.5f).FontColor(Ink);

                                    Cell(sl++.ToString());
                                    Cell(period.PeriodIndex.ToString());
                                    if (!sameInstitution)
                                    {
                                        Cell(period.InstituteName);
                                        Cell(period.RegistrationNumber);
                                    }
                                    Cell(period.Sgpa?.ToString("F2"));
                                    Cell(period.Percentage?.ToString("F2"));
                                    Cell(period.Cgpa?.ToString("F2"));
                                }
                            });
                        }
                    }
                }
                else if (_data.EducationDetails?.Any() == true)
                {
                    SectionHeader(col, "Educational Background");

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(18);
                            columns.RelativeColumn(2.2f);
                            columns.RelativeColumn(1.6f);
                            columns.ConstantColumn(34);
                            columns.ConstantColumn(48);
                            columns.ConstantColumn(48);
                            columns.ConstantColumn(36);
                        });

                        TableHeader(table, "Sl");
                        TableHeader(table, "Exam / Degree");
                        TableHeader(table, "Reg. / USN No.");
                        TableHeader(table, "Year");
                        TableHeader(table, "Obtained");
                        TableHeader(table, "Max Marks");
                        TableHeader(table, "%");

                        int slno = 1;
                        foreach (var edu in _data.EducationDetails)
                        {
                            void Cell(string? val) =>
                                table.Cell()
                                    .BorderBottom(0.5f).BorderRight(0.5f).BorderColor(BorderCol)
                                    .PaddingVertical(3).PaddingHorizontal(4)
                                    .Text(val ?? DefaultValue).FontSize(7.5f).FontColor(Ink);

                            Cell(slno++.ToString());
                            Cell(edu?.ExamName);
                            Cell(edu?.RegistrationNumber);
                            Cell(edu?.year?.ToString());
                            Cell(edu?.ObtainedMarks?.ToString("F2"));
                            Cell(edu?.MaxMarks?.ToString("F2"));
                            Cell((edu?.Percentage?.ToString("F2") ?? DefaultValue));
                        }
                    });
                }


                if (orderedCourses.Any())
                {
                    SectionHeader(col, "Applied Courses");

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(18);
                            if (IsPgApplication)
                                columns.ConstantColumn(30);   // Preference (PG only)
                            columns.RelativeColumn(2f);   // Degree
                            columns.RelativeColumn(2f);   // Course
                            columns.RelativeColumn(1.4f); // Academic Year
                            columns.RelativeColumn(1f);   // Batch Year
                            columns.ConstantColumn(42);   // Hostel
                            columns.ConstantColumn(50);   // Transport
                        });

                        TableHeader(table, "Sl");
                        if (IsPgApplication)
                            TableHeader(table, "Pref.");
                        TableHeader(table, "Degree");
                        TableHeader(table, "Course");
                        TableHeader(table, "Academic Year");
                        TableHeader(table, "Batch Year");
                        TableHeader(table, "Hostel");
                        TableHeader(table, "Transport");

                        int sl = 1;
                        foreach (var course in orderedCourses)
                        {
                            void Cell(string? val) =>
                                table.Cell()
                                    .BorderBottom(0.5f).BorderRight(0.5f).BorderColor(BorderCol)
                                    .PaddingVertical(3).PaddingHorizontal(4)
                                    .Text(val ?? DefaultValue).FontSize(7.5f).FontColor(Ink);

                            var academicYear = IsCertificationCourse(course?.DegreeId)
       ? CertificationAcademicYear
       : CurrentAcademicYear;
                            var batchYearLabel = ResolvedBatchYearForCourse(course);

                            Cell(sl++.ToString());
                            if (IsPgApplication)
                                Cell(course?.Preference ?? DefaultValue);
                            Cell(DegreeName(course?.DegreeId));
                            Cell(CourseName(course?.CourseId));
                            Cell(academicYear);
                            Cell(batchYearLabel);
                            Cell(course?.HostelFacilityYn == true ? "Yes" : "No");
                            Cell(course?.TransportFacilityYn == true ? "Yes" : "No");
                        }
                    });
                }

                var inserviceCourses = orderedCourses.Where(c => c?.InserviceYn == true).ToList();

                if (inserviceCourses.Any())
                {
                    SectionHeader(col, "In-Service Details");

                    foreach (var svc in inserviceCourses)
                    {
                        if (inserviceCourses.Count > 1)
                        {
                            col.Item().PaddingTop(2).PaddingBottom(2)
                                .Text($"Preference {svc?.Preference ?? DefaultValue} — {CourseName(svc?.CourseId)}")
                                .Bold().FontSize(7.5f).FontColor(Muted);
                        }

                        col.Item().Table(t =>
                        {
                            t.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.9f);
                                c.RelativeColumn(1.1f);
                                c.RelativeColumn(1.9f);
                            });

                            FieldRow(t, "Department", svc?.Department);
                            FieldRow(t, "Designation", svc?.Designation);
                            FieldRow(t, "Office Address", svc?.OfficeAddress);
                            FieldRow(t, "Date of Join", svc?.DateOfJoin?.ToString("dd-MM-yyyy"));
                            FieldRow(t, "Service Years", svc?.ServiceYears?.ToString());
                        });
                    }
                }


                if (_data.SeatTypes?.Any() == true)
                {
                    SectionHeader(col, "Seat Preferences");

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(18);
                            columns.RelativeColumn();
                        });

                        TableHeader(table, "Sl");
                        TableHeader(table, "Seat Type");

                        int sl = 1;
                        foreach (var seat in _data.SeatTypes)
                        {
                            var seatName = !string.IsNullOrWhiteSpace(seat?.SeatTypeName)
                                ? seat.SeatTypeName
                                : (LookupName(seat?.SeatTypeId) ?? DefaultValue);

                            table.Cell()
                                .BorderBottom(0.5f).BorderRight(0.5f).BorderColor(BorderCol)
                                .PaddingVertical(3).PaddingHorizontal(4)
                                .Text(sl++.ToString()).FontSize(7.5f).FontColor(Ink);

                            table.Cell()
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .PaddingVertical(3).PaddingHorizontal(4)
                                .Text(seatName).FontSize(7.5f).FontColor(Ink);
                        }
                    });
                }


                if (_data.Documents?.Count > 0)
                {
                    var docCount = _data.Documents.Count;

                    SectionHeader(
                        col,
                        $"Uploaded Documents ({docCount} {(docCount == 1 ? "document" : "documents")} submitted)"
                    );

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(35);
                            columns.RelativeColumn();
                        });


                        table.Cell()
                            .Border(0.5f)
                            .BorderColor(BorderCol)
                            .Background(Muted)
                            .Padding(4)
                            .AlignCenter()
                            .Text("Sl")
                            .FontColor(Colors.White)
                            .FontSize(8)
                            .SemiBold();

                        table.Cell()
                            .Border(0.5f)
                            .BorderColor(BorderCol)
                            .Background(Muted)
                            .Padding(4)
                            .AlignCenter()
                            .Text("Document Name")
                            .FontColor(Colors.White)
                            .FontSize(8)
                            .SemiBold();

                        int sl = 1;

                        foreach (var doc in _data.Documents)
                        {
                            table.Cell()
                                .Border(0.5f)
                                .BorderColor(BorderCol)
                                .PaddingVertical(4)
                                .PaddingHorizontal(4)
                                .AlignCenter()
                                .Text(sl++.ToString())
                                .FontSize(7.5f)
                                .FontColor(Ink);


                            table.Cell()
                                .Border(0.5f)
                                .BorderColor(BorderCol)
                                .PaddingVertical(4)
                                .PaddingHorizontal(6)
                                .AlignLeft()
                                .Text(doc.DocumentName ?? DefaultValue)
                                .FontSize(7.5f)
                                .FontColor(Ink);
                        }
                    });
                }


                // ---- Declaration + Signature block ----
                // Grouped into a single Column and marked .ShowEntire() so QuestPDF
                // never splits the declaration box away from the signature/place/date
                // row. If the whole block doesn't fit in the remaining space on the
                // current page, it moves together to the next page instead of
                // orphaning one part of it.
                const string DeclarationBg = "#FFFDE7";
                const string DeclarationBorder = "#E8D48A";
                const string DeclarationTitle = "#8A6D00";

                col.Item().PaddingTop(10).ShowEntire().Column(finalCol =>
                {
                    finalCol.Item()
                        .Border(0.75f).BorderColor(DeclarationBorder)
                        .Background(DeclarationBg)
                        .Padding(10)
                        .Column(decCol =>
                        {
                            decCol.Item().PaddingBottom(6)
                                .Text("DECLARATION BY THE CANDIDATE")
                                .Bold().FontSize(9f).FontColor(DeclarationTitle);

                            decCol.Item().Text(
                                    "I hereby declare that the above information furnished by me is true. " +
                                    "I have not suppressed any information. M.G.R.D.P.R University can initiate " +
                                    "action against me, if I have furnished any wrong information and also my " +
                                    "admission may be cancelled. I shall hereby undertake to fulfil 75% attendance " +
                                    "in each subject (paper) to appear for the examination as per UGC and University " +
                                    "Norms, Admission and Examination Regulations. I also know that there is no " +
                                    "provision in the University Rules to condone the shortage of attendance. " +
                                    "I shall hereby agree to the University Students Dress Code and abide by all the " +
                                    "rules and regulations of the University.")
                                .Italic().FontSize(7.5f).FontColor(Ink).LineHeight(1.3f);

                            decCol.Item().PaddingTop(8).Row(r =>
                            {
                                r.AutoItem()
                                    .Width(10).Height(10)
                                    .Border(0.75f).BorderColor(Ink);

                                r.ConstantItem(6);

                                r.AutoItem().Text(text =>
                                {
                                    text.Span("I have read and agree to the above declaration ")
                                        .FontSize(7.5f).FontColor(Ink);
                                    text.Span("*").FontSize(7.5f).FontColor(RuleColor);
                                });
                            });
                        });
                    // ---- NEW: Important Instructions (inserted here, before signature block) ----
                    const string NoteBorder = "#E8A8A8";
                    const string NoteBg = "#FDEEEE";

                    finalCol.Item().PaddingTop(8)
                        .Border(0.75f).BorderColor(NoteBorder)
                        .Background(NoteBg)
                        .Padding(10)
                        .Column(noteCol =>
                        {
                            noteCol.Item().PaddingBottom(5)
                                .Text("IMPORTANT INSTRUCTIONS")
                                .Bold().FontSize(9f).FontColor(RuleColor);
                            void Point(string text)
                            {
                                noteCol.Item().PaddingBottom(2).Row(r =>
                                {
                                    r.ConstantItem(12).Text("•").FontSize(7.5f).FontColor(Ink);
                                    r.RelativeItem().Text(text).FontSize(7.5f).FontColor(Ink).LineHeight(1.3f);
                                });
                            }
                            Point("Take a printout of this filled application form, sign it, and submit the signed hard copy at the time of admission / document verification.");
                            Point("Submit photocopies of all uploaded documents listed above along with the signed hard copy of this application form.");
                            Point("Enclose a copy of the Application Fee payment receipt along with the above documents.");
                            Point("Note that admission will be confirmed only after successful verification of all the above documents and receipts by the university.");
                        });

                    finalCol.Item().PaddingTop(14).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Applicant's Signature").FontSize(7.5f).FontColor(Muted);
                            c.Item().PaddingTop(14).Width(110).Height(0.75f).Background(Ink);
                        });

                        row.RelativeItem().AlignCenter().Column(c =>
                        {
                            c.Item().Text("Place").FontSize(7.5f).FontColor(Muted);
                            c.Item().PaddingTop(14).Width(80).Height(0.75f).Background(Ink);
                        });

                        row.RelativeItem().AlignRight().Column(c =>
                        {
                            c.Item().Text("Date").FontSize(7.5f).FontColor(Muted);
                            c.Item().PaddingTop(14).Width(80).Height(0.75f).Background(Ink);
                        });
                    });
                });
            });


            page.Footer().Column(col =>
            {
                col.Item().Height(0.5f).Background(BorderCol);
                col.Item().PaddingTop(1).Height(1.5f).Background(Ink);
                col.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem()
                        .Text(_data.Application?.AppNo ?? "N/A")
                        .FontSize(7.5f).FontColor(Muted);

                    row.RelativeItem().AlignCenter().Text(text =>
                    {
                        text.Span("Page ").FontSize(7.5f).FontColor(Muted);
                        text.CurrentPageNumber().FontSize(7.5f).Bold().FontColor(Ink);
                        text.Span(" of ").FontSize(7.5f).FontColor(Muted);
                        text.TotalPages().FontSize(7.5f).Bold().FontColor(Ink);
                    });

                    row.RelativeItem().AlignRight()
                        .Text($"Generated: {DateTime.Now:dd/MM/yyyy HH:mm}")
                        .FontSize(7.5f).FontColor(Muted);
                });
            });
        });
    }
}