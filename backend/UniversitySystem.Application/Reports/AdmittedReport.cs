using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;



public class AdmittedStudentReportData
{
    public byte[]? LogoBytes { get; set; }
    public string AcademicYear { get; set; } = "";
    public string? DegreeName { get; set; }
    public string? CourseName { get; set; }
    public string? CategoryFilter { get; set; }
    public string? KarnatakaFilter { get; set; }
    public string? StatusFilter { get; set; }
    public string GeneratedBy { get; set; } = "";
    public string ReportTitle { get; set; } = "Admitted Students Report";

    public List<AdmittedStudentReportRow> Rows { get; set; } = new();

    public int TotalAdmitted { get; set; }
    public int TotalNotAdmitted { get; set; }

    public List<AdmittedCategoryBreakdownRow> CategoryBreakdown { get; set; } = new();
}

public class AdmittedStudentReportRow
{
    public int Sl { get; set; }
    public Guid ApplicationId { get; set; }
    public string ApplicationNo { get; set; } = "";
    public string Name { get; set; } = "";
    public string FatherName { get; set; } = "";
    public string Gender { get; set; } = "";
    public string Category { get; set; } = "";
    public string DegreeName { get; set; } = "";
    public string CourseName { get; set; } = "";
    public string? Phone { get; set; }
    public bool AdmitYn { get; set; }
    public string? Remarks { get; set; }
    public string VerificationStatus { get; set; } = "Pending";
    public string Karnataka { get; set; } = "KA";
    public DateTime InsertOn { get; set; }
}

public class AdmittedCategoryBreakdownRow
{
    public string Category { get; set; } = "";
    public int Total { get; set; }
    public int Admitted { get; set; }
    public int NotAdmitted { get; set; }
}


public class AdmittedStudentsReport : IDocument
{
    private readonly AdmittedStudentReportData _data;

    private const string Ink = "#130000";
    private const string Muted = "#555555";
    private const string RuleColor = "#820000";
    private const string BorderCol = "#BBBBBB";
    private const string HeaderBg = "#F5F0F0";
    private const string BlueColor = "#1E3A5F";
    private const string GreenColor = "#166534";
    private const string AmberColor = "#92400E";
    private const string RedColor = "#991B1B";
    private const string PurpleColor = "#7C3AED";
    private const string TealColor = "#0F766E";

    private static readonly Dictionary<string, string> CategoryColors =
        new(StringComparer.OrdinalIgnoreCase)
        {
            { "SC",    "#1E3A5F" }, { "ST",     "#166534" },
            { "Cat-I", "#7C3AED" }, { "IIA",    "#0369A1" },
            { "IIB",   "#0891B2" }, { "IIIA",   "#059669" },
            { "IIIB",  "#D97706" }, { "GM",     "#820000" },
        };

    private static string GetCategoryColor(string? cat) =>
        cat != null && CategoryColors.TryGetValue(cat, out var c) ? c : BlueColor;

    private static string StatusColor(string? s) => s?.ToLower() switch
    {
        "verified" or "approved" => GreenColor,
        "pending" => AmberColor,
        "rejected" => RedColor,
        _ => "#374151",
    };

    public AdmittedStudentsReport(AdmittedStudentReportData data) => _data = data;
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
    private bool IsCertificateCourse =>
    _data.DegreeName?.Contains("Certificate", StringComparison.OrdinalIgnoreCase) == true;

    private static void SectionHeader(ColumnDescriptor col,
        string title, string? subtitle = null)
    {
        col.Item().PaddingTop(10).Column(c =>
        {
            c.Item().Row(r =>
            {
                r.RelativeItem().PaddingBottom(3)
                    .Text(title).Bold().FontSize(9f).FontColor(RuleColor);
                if (!string.IsNullOrWhiteSpace(subtitle))
                    r.AutoItem().AlignBottom()
                        .Text(subtitle).FontSize(7f).FontColor(Muted);
            });
            c.Item().Height(1.5f).Background(RuleColor);
        });
        col.Item().PaddingBottom(4);
    }

    public void Compose(IDocumentContainer container)
    {
        int total = _data.Rows.Count;
        int admitted = _data.TotalAdmitted;
        // int notAdmitted = _data.TotalNotAdmitted;

        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(28);
            page.MarginTop(16);
            page.MarginBottom(14);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(8).FontColor(Ink));

         
            page.Header().Column(hdr =>
            {
                hdr.Item().Row(row =>
                {
                    if (_data.LogoBytes?.Length > 0)
                        row.ConstantItem(60).Height(60).AlignMiddle()
                            .Image(_data.LogoBytes).FitArea();
                    else
                        row.ConstantItem(60);

                    row.RelativeItem().AlignMiddle().AlignCenter().Column(c =>
 {
     c.Item()
         .Text("Mahatma Gandhi Rural Development and Panchayat Raj University, Gadag")
         .Bold().FontSize(11f).FontColor(Ink).AlignCenter();
     c.Item().PaddingTop(1)
         .Text("Koushalya Vikas Bhavan, Grama Gangothri Campus, Nagavi, Gadag-582103,Karnataka, India")
         .FontSize(7f).FontColor(Muted).AlignCenter();
     c.Item().PaddingTop(1)
         .Text("E-mail: enquiry.ksrdpru@gmail.com  |  Phone: 08372-230338")
         .FontSize(7f).FontColor(Muted).AlignCenter();
 });
                    row.ConstantItem(60);
                });

                hdr.Item().PaddingTop(5).Height(1.5f).Background(Ink);
                hdr.Item().PaddingTop(1).Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(4).PaddingBottom(2).AlignCenter().Column(c =>
                {
                    c.Item().AlignCenter()
                        .Text("ADMITTED STUDENTS LIST")
                        .Bold().FontSize(10f).FontColor(Ink).AlignCenter();
                    c.Item().AlignCenter()
                        .Text($"Academic Year: {_data.AcademicYear} ")
                        .FontSize(7.5f).FontColor(Muted).AlignCenter();
                });
                hdr.Item().Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(1).Height(1.5f).Background(Ink);
            });

          
            page.Content().PaddingTop(8).Column(col =>
            {
             
                col.Item().PaddingBottom(6)
                    .Border(0.75f).BorderColor(BorderCol).Background(HeaderBg)
                    .Padding(5).PaddingHorizontal(10)
                    .Column(infoCol =>
                    {
                        
                        infoCol.Item().Row(row =>
                        {
                            void Chip(string label, string value)
                            {
                                row.AutoItem().PaddingRight(14).Text(text =>
                                {
                                    text.Span(label + ": ").Bold().FontSize(7.5f).FontColor(Muted);
                                    text.Span(value).FontSize(7.5f).FontColor(Ink);
                                });
                            }

                            if (!string.IsNullOrWhiteSpace(_data.DegreeName))
                                Chip(IsCertificateCourse ? "Program" : "Degree", _data.DegreeName);
                            if (!string.IsNullOrWhiteSpace(_data.CourseName))
                                Chip("Course", _data.CourseName);
                            if (!string.IsNullOrWhiteSpace(_data.AcademicYear))
                                Chip("Academic Year", _data.AcademicYear);

                            row.RelativeItem(); 

                            row.AutoItem().Text(text =>
                            {
                                text.Span("Total: ").Bold().FontSize(7.5f).FontColor(Muted);
                                text.Span(total.ToString()).Bold().FontSize(7.5f).FontColor(RuleColor);
                            });
                        });

                 
                        bool hasFilters =
                            !string.IsNullOrWhiteSpace(_data.CategoryFilter) ||
                            !string.IsNullOrWhiteSpace(_data.KarnatakaFilter) ||
                            !string.IsNullOrWhiteSpace(_data.StatusFilter);

                        if (hasFilters)
                        {
                            infoCol.Item().PaddingTop(5).Row(row =>
                            {
                                void Chip(string label, string value)
                                {
                                    row.AutoItem().PaddingRight(14).Text(text =>
                                    {
                                        text.Span(label + ": ").Bold().FontSize(7.5f).FontColor(Muted);
                                        text.Span(value).FontSize(7.5f).FontColor(Ink);
                                    });
                                }

                                if (!string.IsNullOrWhiteSpace(_data.CategoryFilter))
                                    Chip("Category", _data.CategoryFilter);
                                if (!string.IsNullOrWhiteSpace(_data.KarnatakaFilter))
                                    Chip("Region", _data.KarnatakaFilter);
                                if (!string.IsNullOrWhiteSpace(_data.StatusFilter))
                                    Chip("Status", _data.StatusFilter);

                                row.RelativeItem();
                            });
                        }
                    });

              
                col.Item().PaddingBottom(8).Row(statsRow =>
                {
                    void StatBox(string label, string value, string color)
                    {
                        statsRow.RelativeItem()
                            .Border(0.75f).BorderColor(BorderCol)
                            .Padding(5).AlignCenter().Column(c =>
                            {
                                c.Item().Text(value).Bold().FontSize(14f).FontColor(color).AlignCenter();
                                c.Item().Text(label).FontSize(6f).FontColor(Muted).AlignCenter();
                            });
                    }

                    StatBox("Total Applicants", total.ToString(), Ink);
                    statsRow.ConstantItem(3);
                    StatBox("Admitted", admitted.ToString(), GreenColor);
                    statsRow.ConstantItem(3);
                    // StatBox("Not Admitted", notAdmitted.ToString(), RedColor);
                    // statsRow.ConstantItem(3);

                });

                
                if (_data.CategoryBreakdown.Any())
                {
                    SectionHeader(col, "1. Category-wise Breakdown",
                        $"Total categories: {_data.CategoryBreakdown.Count}");

                    col.Item().PaddingBottom(8).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(22);
                            c.RelativeColumn(2f);
                            c.RelativeColumn(1f);
                            c.RelativeColumn(1f);
                            c.RelativeColumn(1f);
                            c.RelativeColumn(1f);
                        });

                        void TH(string txt, bool last = false)
                        {
                            table.Cell().Background(RuleColor)
                                .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                                .Padding(4).AlignCenter()
                                .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
                        }
                        TH("Sl."); TH("Category"); TH("Total Applied");
                        TH("Admitted"); TH("Not Admitted"); TH("Rate (%)", last: true);

                        int catSl = 1;
                        foreach (var cat in _data.CategoryBreakdown)
                        {
                            bool alt = catSl % 2 == 0;
                            string bg = alt ? "#FFF8F8" : "#FFFFFF";
                            double catRate = cat.Total > 0
                                ? Math.Round(cat.Admitted * 100.0 / cat.Total, 1) : 0;

                            table.Cell().Background(bg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(catSl.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();

                            table.Cell().Background(bg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignMiddle()
                                .Text(cat.Category).Bold().FontSize(7f)
                                .FontColor(GetCategoryColor(cat.Category));

                            table.Cell().Background(bg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(cat.Total.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();

                            table.Cell().Background(bg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(cat.Admitted.ToString()).Bold().FontSize(7f)
                                .FontColor(GreenColor).AlignCenter();

                            table.Cell().Background(bg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(cat.NotAdmitted.ToString()).Bold().FontSize(7f)
                                .FontColor(cat.NotAdmitted > 0 ? RedColor : Muted).AlignCenter();

                            table.Cell().Background(bg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text($"{catRate}%").Bold().FontSize(7f)
                                .FontColor(catRate >= 80 ? GreenColor : catRate >= 50 ? AmberColor : RedColor)
                                .AlignCenter();

                            catSl++;
                        }
                    });
                }

              
                SectionHeader(col, "2. Admitted Students List",
                    $"Total: {total}  |  Sorted by Name");

                col.Item().PaddingBottom(8).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(25);
                        c.ConstantColumn(58);
                        c.RelativeColumn(3f);
                        c.RelativeColumn(1.4f);
                        c.RelativeColumn(1.6f);
                        c.RelativeColumn(2f);
                        c.ConstantColumn(44);
                    });

                    void TH(string txt, bool last = false)
                    {
                        table.Cell().Background(RuleColor)
                            .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
                    }
                    TH("Sl."); TH("App No"); TH("Name");
                    TH("Category"); TH("Degree"); TH("Course"); TH("Admitted", last: true);

                    foreach (var r in _data.Rows)
                    {
                        bool alt = r.Sl % 2 == 0;
                        string bg = alt ? "#FFF8F8" : "#FFFFFF";

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Text(r.Sl.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Text(r.ApplicationNo).Bold().FontSize(7f).FontColor(BlueColor).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignMiddle()
                            .Text(r.Name).Bold().FontSize(7.5f).FontColor(Ink);

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Text(r.Category).Bold().FontSize(7f)
                            .FontColor(GetCategoryColor(r.Category)).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignMiddle()
                            .Text(r.DegreeName).FontSize(7f).FontColor(Ink);

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignMiddle()
                            .Text(r.CourseName).FontSize(7f).FontColor(Ink);

                        string admitLabel = r.AdmitYn ? "Yes" : "No";
                        string admitColor = r.AdmitYn ? GreenColor : RedColor;
                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Text(admitLabel).Bold().FontSize(7f).FontColor(admitColor).AlignCenter();
                    }
                });
            });

           
            page.Footer().Column(col =>
            {
                col.Item().Height(0.5f).Background(BorderCol);
                col.Item().PaddingTop(1).Height(1.5f).Background(Ink);
                col.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem()
                        .Text($"Admitted Students Report – {_data.AcademicYear}")
                        .FontSize(7f).FontColor(Muted);
                    row.RelativeItem().AlignCenter().Text(text =>
                    {
                        text.Span("Page ").FontSize(7f).FontColor(Muted);
                        text.CurrentPageNumber().FontSize(7f).Bold().FontColor(Ink);
                        text.Span(" of ").FontSize(7f).FontColor(Muted);
                        text.TotalPages().FontSize(7f).Bold().FontColor(Ink);
                    });
                    row.RelativeItem().AlignRight()
                        .Text($"Generated: {DateTime.Now:dd/MM/yyyy HH:mm} ")
                        .FontSize(7f).FontColor(Muted);
                });
            });
        });
    }
}