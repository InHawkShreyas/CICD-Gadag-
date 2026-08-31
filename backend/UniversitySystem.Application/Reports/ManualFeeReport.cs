using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;



public class ManualFeeReportData
{
    public byte[]? LogoBytes { get; set; }
    public string AcademicYear { get; set; } = "";
    public string? DegreeName { get; set; }
    public string? CourseName { get; set; }
    public string? CategoryFilter { get; set; }
    public string? FeeTypeFilter { get; set; }
    public string GeneratedBy { get; set; } = "";
    public string ReportTitle { get; set; } = "Manual Fee Collection Report";
    public int TotalRecords { get; set; }
    public decimal TotalCollected { get; set; }
    public List<ManualFeeCollectionRow> Collections { get; set; } = new();
}

public class ManualFeeCollectionRow
{
    public int Sl { get; set; }
    public string? AppNo { get; set; }

    public string ReceiptNo { get; set; } = "";
    public string FeeName { get; set; } = "";
    public decimal FeeAmount { get; set; }
    public string? TransactionId { get; set; }
    public string? OrderId { get; set; }
    public string? PaymentMode { get; set; }
    public string? PaymentDate { get; set; }

}

public class ManualFeePaymentReport : IDocument
{
    private readonly ManualFeeReportData _data;


    private const string Ink = "#130000";
    private const string Muted = "#555555";
    private const string RuleColor = "#820000";
    private const string BorderCol = "#BBBBBB";
    private const string HeaderBg = "#F5F0F0";
    private const string BlueColor = "#1E3A5F";
    private const string GreenColor = "#166534";
    private const string AmberColor = "#92400E";

    public ManualFeePaymentReport(ManualFeeReportData data) => _data = data;
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
    private bool IsCertificateCourse =>
    _data.DegreeName?.Contains("Certificate", StringComparison.OrdinalIgnoreCase) == true;

    private static string Rs(decimal v) => $"₹{v:N2}";

    private static void SectionHeader(ColumnDescriptor col, string title, string? subtitle = null)
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
        decimal totalCollected = _data.Collections.Sum(c => c.FeeAmount);

        container.Page(page =>
        {
            page.Size(PageSizes.A4.Landscape());
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
                        .Text(_data.ReportTitle.ToUpper())
                        .Bold().FontSize(10f).FontColor(Ink).AlignCenter();
                });
                hdr.Item().Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(1).Height(1.5f).Background(Ink);
            });

            // ── CONTENT ───────────────────────────────────────────────────────
            page.Content().PaddingTop(8).Column(col =>
            {

                col.Item().PaddingBottom(6)
                    .Border(0.75f).BorderColor(BorderCol).Background(HeaderBg)
                    .Padding(5).PaddingHorizontal(10)
                    .Column(inner =>
                    {
                        inner.Item().Row(row =>
                        {
                            void InfoChip(string label, string value)
                            {
                                row.AutoItem().PaddingRight(14).Text(text =>
                                {
                                    text.Span(label + ": ").Bold().FontSize(7.5f).FontColor(Muted);
                                    text.Span(value).FontSize(7.5f).FontColor(Ink);
                                });
                            }

                            if (!string.IsNullOrWhiteSpace(_data.DegreeName))
                                InfoChip(IsCertificateCourse ? "Program" : "Degree", _data.DegreeName);
                            if (!string.IsNullOrWhiteSpace(_data.CourseName)) InfoChip("Course", _data.CourseName);
                            if (!string.IsNullOrWhiteSpace(_data.CategoryFilter)) InfoChip("Category", _data.CategoryFilter);
                            if (!string.IsNullOrWhiteSpace(_data.AcademicYear)) InfoChip("Academic Year", _data.AcademicYear);
                            if (!string.IsNullOrWhiteSpace(_data.FeeTypeFilter)) InfoChip("Fee Type", _data.FeeTypeFilter);

                            row.RelativeItem();

                            row.AutoItem().Text(text =>
                            {
                                text.Span("Total Records: ").Bold().FontSize(7.5f).FontColor(Muted);
                                text.Span(_data.TotalRecords.ToString())
                                    .Bold().FontSize(7.5f).FontColor(RuleColor);
                            });
                        });
                    });


                col.Item().PaddingBottom(8).Row(statsRow =>
                {
                    void StatBox(string label, string value, string color)
                    {
                        statsRow.RelativeItem()
                            .Border(0.75f).BorderColor(BorderCol)
                            .Padding(5).AlignCenter().Column(c =>
                            {
                                c.Item().Text(value).Bold().FontSize(11f).FontColor(color).AlignCenter();
                                c.Item().Text(label).FontSize(6f).FontColor(Muted).AlignCenter();
                            });
                    }

                    StatBox("Total Records", _data.TotalRecords.ToString(), Ink);
                    statsRow.ConstantItem(3);
                    StatBox("Total Collected", Rs(totalCollected), GreenColor);
                });


                SectionHeader(col, "1. Manual Fee Collection Register",
                    $"Total: {_data.Collections.Count}");


                col.Item().PaddingBottom(8).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(22);    // Sl
                        c.ConstantColumn(58);    // App No

                        c.RelativeColumn(2f);    // Fee Name
                        c.ConstantColumn(56);    // Amount
                        c.ConstantColumn(50);    // Payment Mode
                        c.RelativeColumn(1.8f);  // Transaction ID
                        c.RelativeColumn(1.6f);  // Receipt No
                        c.ConstantColumn(50);    // Date
                    });


                    void CH(string txt, bool last = false)
                    {
                        table.Cell().Background(RuleColor)
                            .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
                    }

                    CH("Sl.");
                    CH("App No");

                    CH("Fee Name");
                    CH("Amount");
                    CH("Mode");
                    CH("Transaction ID");
                    CH("Receipt No");
                    CH("Date", last: true);

                    decimal grandTotal = 0m;

                    foreach (var r in _data.Collections)
                    {
                        bool alt = r.Sl % 2 == 0;
                        string rowBg = alt ? "#FFF8F8" : "#FFFFFF";
                        string appNo = r.AppNo ?? "—";

                        grandTotal += r.FeeAmount;


                        void DC(string text, string? color = null, bool bold = false, bool last = false)
                        {
                            var cell = table.Cell().Background(rowBg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(last ? 0f : 0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle();
                            var txt = cell.Text(text).FontSize(7f).FontColor(color ?? Ink).AlignCenter();
                            if (bold) txt.Bold();
                        }

                        DC(r.Sl.ToString());
                        DC(appNo, BlueColor, bold: true);


                        table.Cell().Background(rowBg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignMiddle()
                            .Text(r.FeeName).FontSize(7f).FontColor(Ink);

                        DC(r.FeeAmount > 0 ? Rs(r.FeeAmount) : "—", GreenColor, bold: true);


                        table.Cell().Background(rowBg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Text(r.PaymentMode ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();


                        table.Cell().Background(rowBg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Text(r.TransactionId ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();


                        table.Cell().Background(rowBg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Text(r.ReceiptNo).FontSize(6.5f).FontColor(Muted).AlignCenter();


                        table.Cell().Background(rowBg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Text(r.PaymentDate ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();
                    }


                    void CT(string txt, string? color = null, bool last = false)
                    {
                        table.Cell().Background(HeaderBg)
                            .BorderTop(1f).BorderColor(Ink)
                            .BorderRight(last ? 0f : 0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f)
                            .FontColor(color ?? Ink).AlignCenter();
                    }

                    CT(""); CT(""); CT("TOTAL"); CT("");
                    CT(Rs(grandTotal), GreenColor);
                    CT(""); CT(""); CT("");
                });

                SectionHeader(col, "2. Payment Mode Summary");

                var modeGroups = _data.Collections
                    .GroupBy(c => string.IsNullOrWhiteSpace(c.PaymentMode) ? "Unknown" : c.PaymentMode,
                        StringComparer.OrdinalIgnoreCase)
                    .OrderBy(g => g.Key)
                    .ToList();

                col.Item().PaddingBottom(10).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(2f);   // Mode
                        c.RelativeColumn(1f);   // Count
                        c.RelativeColumn(1.5f); // Total Amount
                    });

                    void MH(string txt, bool last = false)
                    {
                        table.Cell().Background(BlueColor)
                            .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f).FontColor("#FFFFFF").AlignCenter();
                    }
                    MH("Payment Mode"); MH("Count"); MH("Total Amount", last: true);

                    int mRow = 0;
                    foreach (var g in modeGroups)
                    {
                        bool alt = mRow++ % 2 == 0;
                        string bg = alt ? "#F0F4FF" : "#FFFFFF";
                        decimal gAmt = g.Sum(x => x.FeeAmount);

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(g.Key).Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(g.Count().ToString()).Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(Rs(gAmt)).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();
                    }


                    void MT(string txt, string? color = null, bool last = false)
                    {
                        table.Cell().Background(HeaderBg)
                            .BorderTop(1f).BorderColor(Ink)
                            .BorderRight(last ? 0f : 0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f).FontColor(color ?? Ink).AlignCenter();
                    }
                    MT("TOTAL");
                    MT(_data.TotalRecords.ToString());
                    MT(Rs(totalCollected), GreenColor, last: true);
                });


                SectionHeader(col, "3. Fee Name Summary");

                var feeNameGroups = _data.Collections
                    .GroupBy(c => string.IsNullOrWhiteSpace(c.FeeName) ? "Unknown" : c.FeeName,
                        StringComparer.OrdinalIgnoreCase)
                    .OrderBy(g => g.Key)
                    .ToList();

                col.Item().PaddingBottom(10).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(2.5f); // Fee Name
                        c.RelativeColumn(1f);   // Count
                        c.RelativeColumn(1.5f); // Total Amount
                    });

                    void FH(string txt, bool last = false)
                    {
                        table.Cell().Background(BlueColor)
                            .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f).FontColor("#FFFFFF").AlignCenter();
                    }
                    FH("Fee Name"); FH("Count"); FH("Total Amount", last: true);

                    int fRow = 0;
                    foreach (var g in feeNameGroups)
                    {
                        bool alt = fRow++ % 2 == 0;
                        string bg = alt ? "#F0F4FF" : "#FFFFFF";
                        decimal gAmt = g.Sum(x => x.FeeAmount);

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(g.Key).Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(g.Count().ToString()).Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(Rs(gAmt)).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();
                    }

                    void FT(string txt, string? color = null, bool last = false)
                    {
                        table.Cell().Background(HeaderBg)
                            .BorderTop(1f).BorderColor(Ink)
                            .BorderRight(last ? 0f : 0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f).FontColor(color ?? Ink).AlignCenter();
                    }
                    FT("TOTAL");
                    FT(_data.TotalRecords.ToString());
                    FT(Rs(totalCollected), GreenColor, last: true);
                });
            });


            page.Footer().Column(col =>
            {
                col.Item().Height(0.5f).Background(BorderCol);
                col.Item().PaddingTop(1).Height(1.5f).Background(Ink);
                col.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem()
                        .Text($"{_data.ReportTitle} – {_data.AcademicYear}")
                        .FontSize(7f).FontColor(Muted);
                    row.RelativeItem().AlignCenter().Text(text =>
                    {
                        text.Span("Page ").FontSize(7f).FontColor(Muted);
                        text.CurrentPageNumber().FontSize(7f).Bold().FontColor(Ink);
                        text.Span(" of ").FontSize(7f).FontColor(Muted);
                        text.TotalPages().FontSize(7f).Bold().FontColor(Ink);
                    });
                    row.RelativeItem().AlignRight()
                        .Text($"Generated: {DateTime.Now:dd/MM/yyyy HH:mm}")
                        .FontSize(7f).FontColor(Muted);
                });
            });
        });
    }
}