using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QuestPDF.Companion;
public class DocumentVerificationReportData
{
    public List<DocumentVerificationReportRow> Rows { get; set; } = new();
    public byte[] LogoBytes { get; set; }
    public string AcademicYear { get; set; }

    
    public string? DegreeName { get; set; }
    public string? CourseName { get; set; }
    public string? AcademicYearName { get; set; }   // NEW — e.g. "2026–27"
    public string? CategoryFilter { get; set; }   // NEW — e.g. "SC, GM"
    public string? SeatTypeFilter { get; set; }   // NEW — e.g. "Rural, NCC"
    public string? KarnatakaFilter { get; set; }   // NEW — e.g. "KA, HK"
    public string? StatusFilter { get; set; }   // NEW — e.g. "Accepted"

    public string GeneratedBy { get; set; } = "";
}

public class DocumentVerificationReportRow
{
    public int Sl { get; set; }
    public string AppNo { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public List<string> SeatTypes { get; set; } = new();
    public string Karnataka { get; set; } = "";
    public string Status { get; set; } = "";
    public string? Remark { get; set; }
}

public class DocumentVerificationReport : IDocument
{
    private readonly DocumentVerificationReportData _data;

    private const string Ink = "#130000";
    private const string Muted = "#555555";
    private const string RuleColor = "#820000";
    private const string BorderCol = "#BBBBBB";

    public DocumentVerificationReport(DocumentVerificationReportData data) => _data = data;
    private bool IsCertificateCourse =>
    _data.DegreeName?.Contains("Certificate", StringComparison.OrdinalIgnoreCase) == true;

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    private static void SectionHeader(ColumnDescriptor col, string title)
    {
        col.Item().PaddingTop(10).Column(c =>
        {
            c.Item().PaddingBottom(3)
                .Text(title).Bold().FontSize(9f).FontColor(RuleColor);
            c.Item().Height(1.5f).Background(RuleColor);
        });
        col.Item().PaddingBottom(4);
    }

    private static void TableHeader(TableDescriptor table, string label, bool last = false) =>
        table.Cell()
            .BorderBottom(1.5f)
            .BorderRight(last ? 0f : 0.5f)
            .BorderColor(BorderCol)
            .PaddingVertical(4).PaddingHorizontal(4)
            .Text(label).Bold().FontSize(7.5f).FontColor(Ink);

    private static string StatusColor(string status) => status?.ToLower() switch
    {
        "accepted" => "#166534",
        "pending" => "#92400E",
        "rejected" => "#991B1B",
        _ => "#374151"
    };

    public void Compose(IDocumentContainer container)
    {



        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(32);
            page.MarginTop(18);
            page.MarginBottom(14);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(8).FontColor(Ink));

            // ── HEADER ────────────────────────────────────────────
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

                hdr.Item().PaddingTop(6).Height(1.5f).Background(Ink);
                hdr.Item().PaddingTop(2).Height(0.5f).Background(BorderCol);

                hdr.Item().PaddingTop(4).PaddingBottom(2).AlignCenter().Column(c =>
 {
     c.Item().AlignCenter()
         .Text("DOCUMENT VERIFICATION REPORT")
         .Bold().FontSize(10f).FontColor(Ink).AlignCenter();
     c.Item().AlignCenter()
         .Text($"Academic Year: {_data.AcademicYear} ")
         .FontSize(7.5f).FontColor(Muted).AlignCenter();
 });
                hdr.Item().Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(1).Height(1.5f).Background(Ink);

                // ── Info bar: Row1 Degree/Course/AcademicYear  Row2 Category/SeatType/Type/Status ──
                hdr.Item().PaddingTop(6)
                    .Border(0.75f).BorderColor(BorderCol).Background("#F5F0F0")
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
                            if (!string.IsNullOrWhiteSpace(_data.AcademicYearName))
                                Chip("Academic Year", _data.AcademicYearName);

                            row.RelativeItem();

                            row.AutoItem().Text(text =>
                            {
                                text.Span("Total: ").Bold().FontSize(7.5f).FontColor(Muted);
                                text.Span(_data.Rows.Count.ToString()).Bold().FontSize(7.5f).FontColor(RuleColor);
                            });
                        });

                        bool hasFilters =
                            !string.IsNullOrWhiteSpace(_data.CategoryFilter) ||
                            !string.IsNullOrWhiteSpace(_data.SeatTypeFilter) ||
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
                                if (!string.IsNullOrWhiteSpace(_data.SeatTypeFilter))
                                    Chip("Seat Type", _data.SeatTypeFilter);
                                if (!string.IsNullOrWhiteSpace(_data.KarnatakaFilter))
                                    Chip("Type", _data.KarnatakaFilter);
                                if (!string.IsNullOrWhiteSpace(_data.StatusFilter))
                                    Chip("Status", _data.StatusFilter);

                                row.RelativeItem();
                            });
                        }
                    });
            });

            // ── BODY ──────────────────────────────────────────────
            page.Content().PaddingTop(8).Column(col =>
            {
                // Filter summary row


                SectionHeader(col, "Document Verification List");

                // ── STATISTICS ROW ────────────────────────────────
                var accepted = _data.Rows.Count(r => r.Status?.ToLower() == "accepted");
                var pending = _data.Rows.Count(r => r.Status?.ToLower() == "pending");
                var rejected = _data.Rows.Count(r => r.Status?.ToLower() == "rejected");

                col.Item().PaddingBottom(8).Row(statsRow =>
                {
                    void StatBox(string label, string value, string color)
                    {
                        statsRow.RelativeItem().Border(0.75f).BorderColor(BorderCol)
                            .Padding(6).AlignCenter().Column(c =>
                            {
                                c.Item().Text(value).Bold().FontSize(14f).FontColor(color).AlignCenter();
                                c.Item().Text(label).FontSize(7f).FontColor(Muted).AlignCenter();
                            });
                    }

                    StatBox("Total", _data.Rows.Count.ToString(), Ink);
                    statsRow.ConstantItem(6);
                    StatBox("Accepted", accepted.ToString(), "#166534");
                    statsRow.ConstantItem(6);
                    StatBox("Pending", pending.ToString(), "#87920E");
                    statsRow.ConstantItem(6);
                    StatBox("Rejected", rejected.ToString(), "#ab1b1b");
                });

                // ── MAIN TABLE ────────────────────────────────────
                // ── STUDENT CARDS (replaces the table) ───────────────────────
                col.Item().Column(cards =>
                {
                    foreach (var r in _data.Rows)
                    {
                        cards.Item().PaddingBottom(10).Border(0.75f).BorderColor(BorderCol).Column(card =>
                        {




                            card.Item()
            .BorderBottom(1f).BorderColor(BorderCol)
            .Row(row =>
            {
                void InfoCell(string label, string? value, bool last = false)
                {
                    row.RelativeItem()
                        .BorderRight(last ? 0f : 0.5f)
                        .BorderColor(BorderCol)
                        .PaddingVertical(4).PaddingHorizontal(8)
                        .AlignMiddle()
                        .Text(text =>
                        {
                            text.Span(label + ": ").FontSize(7f).FontColor(Muted).Bold();
                            text.Span(value ?? "—").FontSize(7.5f).FontColor(Ink);
                        });
                }
                InfoCell("Sl", r.Sl.ToString());
                InfoCell("Name", r.Name);
                InfoCell("App No", r.AppNo);
                InfoCell("Category", r.Category);
                InfoCell("Karnataka", r.Karnataka);

                // Status cell — colored inline
                row.RelativeItem()
                    .PaddingVertical(4).PaddingHorizontal(8)
                    .AlignMiddle()
                    .Text(text =>
                    {
                        text.Span("Status: ").FontSize(7f).FontColor(Muted).Bold();
                        text.Span(r.Status ?? "—").FontSize(7.5f).Bold()
                            .FontColor(StatusColor(r.Status ?? ""));
                    });
            });
                            // ── ROW 3: Seat Types ─────────────────────────
                            card.Item()
     .PaddingVertical(4).PaddingHorizontal(8)
     .Row(row =>
     {
         row.AutoItem().AlignMiddle()
             .Text("Seat Types :   ")
             .FontSize(7f).FontColor(Muted).Bold();

         row.RelativeItem().AlignMiddle()
             .Text(r.SeatTypes != null && r.SeatTypes.Any(s => !string.IsNullOrWhiteSpace(s))
                 ? string.Join(" | ", r.SeatTypes.Where(s => !string.IsNullOrWhiteSpace(s)))
                 : "—")
             .FontSize(7.5f).FontColor(Ink);
     });
                        });
                    }
                });
            });

            // ── FOOTER ────────────────────────────────────────────
            page.Footer().Column(col =>
            {
                col.Item().Height(0.5f).Background(BorderCol);
                col.Item().PaddingTop(1).Height(1.5f).Background(Ink);
                col.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem()
                        .Text($"Document Verification Report – {_data.AcademicYear}")
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