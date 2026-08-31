using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public class SelectedListReportData
{
    public List<MeritListReportRow> Rows { get; set; } = new();
    public byte[]? LogoBytes { get; set; }
    public string AcademicYear { get; set; } = "";
    public string? DegreeName { get; set; }
    public string? CourseName { get; set; }
    public string? CategoryFilter { get; set; }
    public string ReportTitle { get; set; } = "Provisional Selected List";
}

public class SelectedListReport : IDocument
{
    private readonly SelectedListReportData _data;

    private const string Ink = "#130000";
    private const string Muted = "#555555";
    private const string RuleColor = "#820000";
    private const string BorderCol = "#BBBBBB";

    public SelectedListReport(SelectedListReportData data) => _data = data;
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(28);
            page.MarginTop(16);
            page.MarginBottom(14);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(8).FontColor(Ink));

            // ── HEADER ──
            page.Header().Column(hdr =>
            {
                hdr.Item().Row(row =>
                {
                    if (_data.LogoBytes?.Length > 0)
                        row.ConstantItem(60).Height(60).AlignMiddle().Image(_data.LogoBytes).FitArea();
                    else
                        row.ConstantItem(60);

                    row.RelativeItem().AlignMiddle().AlignCenter().Column(c =>
                    {
                        c.Item().Text("Mahatma Gandhi Rural Development and Panchayat Raj University, Gadag")
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
        .Text($"PROVISIONAL MERIT/SELECTION LIST OF CANDIDATES FOR ADMISSION TO {(_data.CourseName ?? "").ToUpper()} {_data.AcademicYear}")
        .Bold().FontSize(10f).FontColor(Ink).AlignCenter();

    var subtitleParts = new List<string> { $"Academic Year: {_data.AcademicYear}" };
    // Degree line removed on request
    if (!string.IsNullOrWhiteSpace(_data.CategoryFilter)) subtitleParts.Add($"Category: {_data.CategoryFilter}");

    c.Item().AlignCenter()
        .Text(string.Join("   |   ", subtitleParts))
        .FontSize(7.5f).FontColor(Muted).AlignCenter();
});
                hdr.Item().Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(1).Height(1.5f).Background(Ink);
            });

            // ── BODY ──
            page.Content().PaddingTop(10).Column(col =>
            {
                col.Item().PaddingBottom(6).Text($"Total : {_data.Rows.Count}")
                    .Bold().FontSize(8.5f).FontColor(RuleColor);

                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(28);    // Sl.
                        c.ConstantColumn(110);   // App No
                        c.RelativeColumn(2.8f);  // Name
                        c.RelativeColumn(1.1f);  // Category
                        c.RelativeColumn(1.2f);  // Qualification
                        c.ConstantColumn(70);    // Merit Score/%
                    });

                    void TH(string txt, bool last = false)
                    {
                        table.Cell().Background(RuleColor)
                            .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f).FontColor("#FFFFFF").AlignCenter();
                    }
                    TH("Sl."); TH("App No"); TH("Name");
                    TH("Category"); TH("Qualification"); TH("Merit Score/%", last: true);

                    int sl = 1;
                    foreach (var r in _data.Rows.OrderBy(x => x.Rank))
                    {
                        bool alt = sl % 2 == 0;
                        string bg = alt ? "#FFF8F8" : "#FFFFFF";

                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
    .Padding(4).AlignCenter().Text(sl.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().Text(r.AppNo).FontSize(6.8f).FontColor(Ink).AlignCenter();
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).Text(r.Name).Bold().FontSize(7.4f).FontColor(Ink);
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().Text(r.Category).FontSize(7.2f).FontColor(Ink).AlignCenter();
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().Text(string.IsNullOrWhiteSpace(r.Qualification) ? "—" : r.Qualification)
                            .FontSize(7.2f).FontColor(Ink).AlignCenter();
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().Text($"{r.MeritScore:F2}%").Bold().FontSize(7.4f).FontColor(RuleColor).AlignCenter();

                        sl++;
                    }
                });
            });

            // ── FOOTER ──
            page.Footer().Column(col =>
            {
                col.Item().Height(0.5f).Background(BorderCol);
                col.Item().PaddingTop(1).Height(1.5f).Background(Ink);
                col.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem().Text($"{_data.ReportTitle} – {_data.AcademicYear}").FontSize(7f).FontColor(Muted);
                    row.RelativeItem().AlignCenter().Text(text =>
                    {
                        text.Span("Page ").FontSize(7f).FontColor(Muted);
                        text.CurrentPageNumber().FontSize(7f).Bold().FontColor(Ink);
                        text.Span(" of ").FontSize(7f).FontColor(Muted);
                        text.TotalPages().FontSize(7f).Bold().FontColor(Ink);
                    });
                    row.RelativeItem().AlignRight()
                        .Text($"Generated: {DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(7f).FontColor(Muted);
                });
            });
        });
    }
}