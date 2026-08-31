using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

// ─────────────────────────────────────────────────────────────────────────────
//  DATA MODELS
// ─────────────────────────────────────────────────────────────────────────────

public enum FacilityType { Hostel, Transport }

public class FacilityReportData
{
    public byte[]? LogoBytes { get; set; }
    public string AcademicYear { get; set; } = "";
    public string? DegreeName { get; set; }
    public string? CourseName { get; set; }
    public string? GenderFilter { get; set; }
    public string GeneratedBy { get; set; } = "";
    public FacilityType FacilityType { get; set; } = FacilityType.Hostel;
    public string? StatusFilter { get; set; }

    // All rows (hostel opted OR transport opted — controlled by FacilityType)
    public List<FacilityReportRow> Rows { get; set; } = new();

    // Summary counts
    public int TotalMale { get; set; }
    public int TotalFemale { get; set; }
    public int TotalOther { get; set; }

    // Category-wise breakdown
    public List<FacilityCategoryRow> CategoryBreakdown { get; set; } = new();
}

public class FacilityReportRow
{
    public int Sl { get; set; }
    public string AppNo { get; set; } = "";
    public string Name { get; set; } = "";
    public string? FatherName { get; set; }
    public string Gender { get; set; } = "";
    public string Category { get; set; } = "";
    public string DegreeName { get; set; } = "";
    public string CourseName { get; set; } = "";
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public bool HostelFacility { get; set; }
    public bool TransportFacility { get; set; }
    public string VerificationStatus { get; set; } = "Pending";
}

public class FacilityCategoryRow
{
    public string Category { get; set; } = "";
    public int Count { get; set; }
    public int Male { get; set; }
    public int Female { get; set; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  REPORT DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

public class FacilityReport : IDocument
{
    private readonly FacilityReportData _data;

    // ── Colours ──────────────────────────────────────────────────────────────
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

    private string AccentColor => _data.FacilityType == FacilityType.Hostel
        ? TealColor
        : BlueColor;

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

    private static string GenderColor(string? g) => (g ?? "").ToLower() switch
    {
        "male" or "m" => BlueColor,
        "female" or "f" => PurpleColor,
        _ => AmberColor,
    };

   private static string StatusColor(string? s) => (s ?? "").ToLower() switch
{
    "verified" or "approved" or "accepted" => GreenColor,
    "pending"                              => AmberColor,
    "rejected" or "denied"                 => RedColor,
    "on hold"  or "onhold"  or "hold"      => "#B45309",  // amber-700
    _                                      => "#374151",
};

    public FacilityReport(FacilityReportData data) => _data = data;
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

    // ─────────────────────────────────────────────────────────────────────────
    public void Compose(IDocumentContainer container)
    {
        bool isHostel = _data.FacilityType == FacilityType.Hostel;
        string facilityLabel = isHostel ? "Hostel" : "Transport";
        int total = _data.Rows?.Count ?? 0;
        var rows = _data.Rows ?? new List<FacilityReportRow>();

        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(28);
            page.MarginTop(16);
            page.MarginBottom(14);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(8).FontColor(Ink));

            // ── HEADER ────────────────────────────────────────────────
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
                        .Text($"{facilityLabel.ToUpper()} FACILITY — APPLICANT LIST")
                        .Bold().FontSize(10f).FontColor(Ink).AlignCenter();
                    c.Item().AlignCenter()
                        .Text($"Academic Year: {_data.AcademicYear}")
                        .FontSize(7.5f).FontColor(Muted).AlignCenter();
                });
                hdr.Item().Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(1).Height(1.5f).Background(Ink);
            });

            // ── CONTENT ───────────────────────────────────────────────
            page.Content().PaddingTop(8).Column(col =>
{
    col.Item().PaddingBottom(6)
        .Border(0.75f).BorderColor(BorderCol).Background(HeaderBg)
        .Padding(5).PaddingHorizontal(10)
        .Column(innerCol =>
        {
            // 🔹 Reusable method
            void InfoChip(RowDescriptor row, string label, string value)
            {
                row.AutoItem().PaddingRight(14).Text(text =>
                {
                    text.Span(label + ": ").Bold().FontSize(7.5f).FontColor(Muted);
                    text.Span(value ?? "").FontSize(7.5f).FontColor(Ink);
                });
            }

            // ✅ LINE 1
            innerCol.Item().Row(row =>
            {
                if (!string.IsNullOrWhiteSpace(_data.DegreeName))
                    InfoChip(row, IsCertificateCourse ? "Program" : "Degree", _data.DegreeName);

                if (!string.IsNullOrWhiteSpace(_data.CourseName))
                    InfoChip(row, "Course", _data.CourseName);

                if (!string.IsNullOrWhiteSpace(_data.AcademicYear))
                    InfoChip(row, "Academic Year", _data.AcademicYear);
            });


            innerCol.Item().PaddingTop(4).Row(row =>   // 👈 add this
  {
      if (!string.IsNullOrWhiteSpace(_data.GenderFilter))
          InfoChip(row, "Gender", _data.GenderFilter);

      if (!string.IsNullOrWhiteSpace(_data.StatusFilter))
          InfoChip(row, "Status", _data.StatusFilter);

      row.RelativeItem();

      row.AutoItem().Text(text =>
      {
          text.Span("Total Applicants: ").Bold().FontSize(7.5f).FontColor(Muted);
          text.Span(total.ToString()).Bold().FontSize(7.5f).FontColor(RuleColor);
      });
  });
        });


    // ── Summary stat boxes ────────────────────────────────
    col.Item().PaddingBottom(8).Row(statsRow =>
    {
        void StatBox(string label, string value, string color)
        {
            statsRow.RelativeItem()
                .Border(0.75f).BorderColor(BorderCol)
                .Padding(5).AlignCenter().Column(c =>
                {
                    c.Item().Text(value).Bold().FontSize(12f).FontColor(color).AlignCenter();
                    c.Item().Text(label).FontSize(6f).FontColor(Muted).AlignCenter();
                });
        }

        StatBox("Total", total.ToString(), Ink);
        statsRow.ConstantItem(3);
        StatBox("Male", _data.TotalMale.ToString(), BlueColor);
        statsRow.ConstantItem(3);
        StatBox("Female", _data.TotalFemale.ToString(), PurpleColor);
        statsRow.ConstantItem(3);
        StatBox("Other", _data.TotalOther.ToString(), AmberColor);
    });

    // ── Section header ────────────────────────────────────
    SectionHeader(col, $"1. {facilityLabel} Facility Report",
        $"Total: {total} ");

    // ── Applicant table ───────────────────────────────────
    col.Item().PaddingBottom(8).Table(table =>
    {
        table.ColumnsDefinition(c =>
        {
            c.ConstantColumn(22);    // Sl
            c.ConstantColumn(58);    // App No
            c.RelativeColumn(2f);  // Name
            c.ConstantColumn(22);    // Gender
            c.RelativeColumn(1.5f);  // Degree
            c.RelativeColumn(1.8f);  // Course
            c.ConstantColumn(58);    // Phone
            c.ConstantColumn(44);    // Status
        });

        void TH(string txt, bool last = false)
        {
            table.Cell().Background(RuleColor)
                .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                .Padding(4).AlignCenter()
                .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
        }

        TH("Sl.");
        TH("App No");
        TH("Name");
        TH("Gender");
        TH("Degree");
        TH("Course");
        TH("Phone");
        TH("Doc. Status", last: true);

        foreach (var r in rows)
        {
            bool alt = r.Sl % 2 == 0;
            string bg = alt ? "#FFF8F8" : "#FFFFFF";
            string gc = GenderColor(r.Gender);

            // Sl
            table.Cell().Background(bg)
                .BorderBottom(0.5f).BorderColor(BorderCol)
                .BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().AlignMiddle()
                .Text(r.Sl.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();

            // App No
            table.Cell().Background(bg)
                .BorderBottom(0.5f).BorderColor(BorderCol)
                .BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().AlignMiddle()
                .Text(r.AppNo ?? "—").Bold().FontSize(7f).FontColor(BlueColor).AlignCenter();

            // Name / Father
            table.Cell().Background(bg)
                .BorderBottom(0.5f).BorderColor(BorderCol)
                .BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignMiddle()
                .Column(c =>
                {
                    c.Item().Text(r.Name ?? "—").Bold().FontSize(7.5f).FontColor(Ink);

                });

            // Gender badge
            table.Cell().Background(gc)
                .BorderBottom(0.5f).BorderColor(BorderCol)
                .BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().AlignMiddle()
                .Text(!string.IsNullOrEmpty(r.Gender) ? r.Gender[..1].ToUpper() : "—")
                .Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();

            // Degree
            table.Cell().Background(bg)
                .BorderBottom(0.5f).BorderColor(BorderCol)
                .BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignMiddle()
                .Text(r.DegreeName ?? "—").FontSize(7f).FontColor(Ink);

            // Course
            table.Cell().Background(bg)
                .BorderBottom(0.5f).BorderColor(BorderCol)
                .BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignMiddle()
                .Text(r.CourseName ?? "—").FontSize(7f).FontColor(Ink);

            // Phone
            table.Cell().Background(bg)
                .BorderBottom(0.5f).BorderColor(BorderCol)
                .BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().AlignMiddle()
                .Text(r.Phone ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();

            // Doc. Status
            table.Cell().Background(bg)
                .BorderBottom(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().AlignMiddle()
                .Text(r.VerificationStatus ?? "Pending").Bold().FontSize(7f)
                .FontColor(StatusColor(r.VerificationStatus)).AlignCenter();
        }
    });



});

            // ── FOOTER ────────────────────────────────────────────────
            page.Footer().Column(col =>
            {
                col.Item().Height(0.5f).Background(BorderCol);
                col.Item().PaddingTop(1).Height(1.5f).Background(Ink);
                col.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem()
                        .Text($"{facilityLabel} Facility Report – {_data.AcademicYear}")
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
