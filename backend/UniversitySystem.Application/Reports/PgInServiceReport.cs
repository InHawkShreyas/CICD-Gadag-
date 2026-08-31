using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public class PgInServiceCourseGroup
{
    public string DegreeName { get; set; } = "";
    public string CourseName { get; set; } = "";
    public List<MeritListReportRow> Applicants { get; set; } = new();
}

public class PgInServiceReportData
{
    public List<PgInServiceCourseGroup> Groups { get; set; } = new();
    public byte[]? LogoBytes { get; set; }
    public string AcademicYear { get; set; } = "";
    public string? DegreeTypeName { get; set; }
    public string? CategoryFilter { get; set; }
    public string ReportTitle { get; set; } = "PG In-Service Candidates — Course-wise Merit List";
}

public class PgInServiceReport : IDocument
{
    private readonly PgInServiceReportData _data;

    private const string Ink = "#130000";
    private const string Muted = "#555555";
    private const string RuleColor = "#820000";
    private const string BorderCol = "#BBBBBB";
    private const string HeaderBg = "#F5F0F0";

    public PgInServiceReport(PgInServiceReportData data) => _data = data;
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
                    c.Item().AlignCenter().Text(_data.ReportTitle.ToUpper())
                        .Bold().FontSize(10f).FontColor(Ink).AlignCenter();

                    var subtitleParts = new List<string> { $"Academic Year: {_data.AcademicYear}" };
                    if (!string.IsNullOrWhiteSpace(_data.DegreeTypeName)) subtitleParts.Add(_data.DegreeTypeName);
                    if (!string.IsNullOrWhiteSpace(_data.CategoryFilter)) subtitleParts.Add($"Category: {_data.CategoryFilter}");

                    c.Item().AlignCenter().Text(string.Join("   |   ", subtitleParts))
                        .FontSize(7.5f).FontColor(Muted).AlignCenter();
                });
                hdr.Item().Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(1).Height(1.5f).Background(Ink);
            });

            page.Content().PaddingTop(10).Column(col =>
            {
                
                foreach (var group in _data.Groups)
                {
                    col.Item().PaddingTop(10).Row(r =>
                    {
                        r.RelativeItem().Text($"{group.DegreeName} — {group.CourseName}")
                            .Bold().FontSize(9.5f).FontColor(Ink);
                        r.AutoItem().Text($"  ({group.Applicants.Count} applicants)")
                            .FontSize(8f).FontColor(Muted);
                    });
                    col.Item().PaddingBottom(4).Height(1f).Background(RuleColor);

                    col.Item().PaddingBottom(6).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(30);
                            c.ConstantColumn(80);
                            c.RelativeColumn(2.4f);
                            c.RelativeColumn(1f);
                            c.ConstantColumn(40);
                            c.ConstantColumn(60);
                        });

                        void TH(string txt, bool last = false)
                        {
                            table.Cell().Background(RuleColor)
                                .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                                .Padding(4).AlignCenter()
                                .Text(txt).Bold().FontSize(7.5f).FontColor("#FFFFFF").AlignCenter();
                        }
                        TH("Rank"); TH("App No"); TH("Name"); TH("Category"); TH("Pref."); TH("Merit %", last: true);

                        int sl = 1;
                        foreach (var r in group.Applicants.OrderBy(x => x.Rank))
                        {
                            bool alt = sl % 2 == 0;
                            string bg = alt ? "#FFF8F8" : "#FFFFFF";

                            table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text(r.Rank.ToString()).Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
                            table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text(r.AppNo).FontSize(6.8f).FontColor(Ink).AlignCenter();
                            table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).Text(r.Name).Bold().FontSize(7.4f).FontColor(Ink);
                            table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text(r.Category).FontSize(7.2f).FontColor(Ink).AlignCenter();
                            table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text(r.Preference ?? "—").FontSize(7f).FontColor(Muted).AlignCenter();
                            table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text($"{r.MeritScore:F2}%").Bold().FontSize(7.4f).FontColor(RuleColor).AlignCenter();

                            sl++;
                        }
                    });
                }
            });

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