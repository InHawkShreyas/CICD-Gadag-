using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public class FeePaymentReportData
{
    public byte[]? LogoBytes { get; set; }
    public string AcademicYear { get; set; } = "";
    public string? DegreeName { get; set; }
    public string? CourseName { get; set; }
    public string? CategoryFilter { get; set; }
    public string? StatusFilter { get; set; }
    public string? FeeTypeFilter { get; set; }
    public string GeneratedBy { get; set; } = "";
    public string ReportTitle { get; set; } = "Fee Payment Report";
    public int TotalApplications { get; set; }
    public decimal TotalCollected { get; set; }
    public decimal TotalPending { get; set; }
    public List<FeeStructureRow> FeeStructures { get; set; } = new();
    public List<FeeCollectionRow> Collections { get; set; } = new();
}

public class FeeStructureRow
{
    public string FeeName { get; set; } = "";
    public decimal TotalAmount { get; set; }
    public string? Category { get; set; }
    public string? DegreeName { get; set; }
    public string? CourseName { get; set; }
    public string? AcademicYear { get; set; }
    public bool IsActive { get; set; } = true;
    public bool DeductionYn { get; set; }
    public List<FeeParticularsRow> Particulars { get; set; } = new();
}

public class FeeParticularsRow
{
    public string? ParticularName { get; set; }
    public decimal Amount { get; set; }
}

public class FeeCollectionRow
{
    public int Sl { get; set; }
    public string? AppNo { get; set; }
    public string Name { get; set; } = "";
    public string? FeeType { get; set; }
    public decimal FeeStructureAmount { get; set; }   
    public decimal PlatformFee { get; set; }           
    public decimal PaidAmount { get; set; }
    public decimal Balance { get; set; }               
    public string? PaymentDate { get; set; }
    public string Status { get; set; } = "Pending";
    public string? TransactionId { get; set; }
    public string? OrderId { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? Email { get; set; }
    public string? Mobile { get; set; }
    public string? SettlementDate { get; set; }
    public string? SettlementId { get; set; }
}

public class FeePaymentReport : IDocument
{
    private readonly FeePaymentReportData _data;

    private const string Ink = "#130000";
    private const string Muted = "#555555";
    private const string RuleColor = "#820000";
    private const string BorderCol = "#BBBBBB";
    private const string HeaderBg = "#F5F0F0";
    private const string BlueColor = "#1E3A5F";
    private const string GreenColor = "#166534";
    private const string AmberColor = "#92400E";
    private const string RedColor = "#991B1B";

    public FeePaymentReport(FeePaymentReportData data) => _data = data;
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
    private bool IsCertificateCourse =>
    _data.DegreeName?.Contains("Certificate", StringComparison.OrdinalIgnoreCase) == true;

    private static bool IsSuccess(string? status) =>
        status?.ToLower() is "success" or "sucess" or "paid";

    private static string StatusColor(string? status)
    {
        if (IsSuccess(status)) return GreenColor;
        return status?.ToLower() switch
        {
            "pending" => AmberColor,
            "failed" => RedColor,
            _ => "#374151"
        };
    }

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

    private static string Rs(decimal v) => $"₹{v:N2}";


    private bool IsApplicationFeeReport =>
        _data.FeeTypeFilter?.Contains("Application", StringComparison.OrdinalIgnoreCase) == true ||
        (_data.Collections.Any() &&
         _data.Collections.All(c =>
             c.FeeType?.Contains("Application", StringComparison.OrdinalIgnoreCase) == true));

    private bool IsAdmissionFeeReport =>
        _data.FeeTypeFilter?.Contains("Admission", StringComparison.OrdinalIgnoreCase) == true ||
        (_data.Collections.Any() &&
         _data.Collections.All(c =>
             c.FeeType?.Contains("Admission", StringComparison.OrdinalIgnoreCase) == true));

    public void Compose(IDocumentContainer container)
    {
        bool isAppFee = IsApplicationFeeReport;
        bool isAdmFee = IsAdmissionFeeReport;
        bool isMixed = !isAppFee && !isAdmFee; // both types present

        decimal totalPaid = _data.Collections.Where(c => IsSuccess(c.Status)).Sum(c => c.PaidAmount);
        decimal totalBalance = _data.Collections.Sum(c => c.Balance);
        int paidCount = _data.Collections.Count(c => IsSuccess(c.Status));

        decimal sectionTotalPaid = _data.Collections.Sum(c => c.PaidAmount);
        decimal sectionTotalBalance = _data.Collections.Sum(c => c.Balance);

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
                                text.Span(_data.TotalApplications.ToString())
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

                    StatBox("Applications", _data.TotalApplications.ToString(), Ink);
                    statsRow.ConstantItem(3);
                    StatBox("Total Collected", Rs(totalPaid), GreenColor);
                    statsRow.ConstantItem(3);

                    if (isAdmFee || isMixed)
                    {
                        StatBox("Balance Pending", Rs(totalBalance), RedColor);
                    }
                    else
                    {
                        // Application fee — show platform fee total instead
                        decimal totalPlatformFee = _data.Collections.Sum(c => c.PlatformFee);
                        StatBox("Platform Fees", Rs(totalPlatformFee), AmberColor);
                    }
                });

             
                SectionHeader(col, "1. Fee Payment Register",
                    $"Total: {_data.Collections.Count}");

                
                if (isAppFee)
                {
                    col.Item().PaddingBottom(8).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(22);    // Sl
                            c.ConstantColumn(60);    // App No
                            c.RelativeColumn(2.5f);  // Name
                            c.ConstantColumn(52);    // Amount
                            c.ConstantColumn(52);    // Platform Fee
                            c.ConstantColumn(52);    // Paid Amount
                            c.RelativeColumn(1.8f);  // Receipt No
                            c.ConstantColumn(50);    // Date
                            c.ConstantColumn(48);    // Status
                        });

                        void CH(string txt, bool last = false)
                        {
                            table.Cell().Background(RuleColor)
                                .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                                .Padding(4).AlignCenter()
                                .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
                        }

                        CH("Sl."); CH("App No"); CH("Applicant Name");
                        CH("Amount"); CH("Platform Fee"); CH("Paid Amount");
                        CH("Receipt No"); CH("Date"); CH("Status", last: true);

                        decimal grandAmount = 0m;
                        decimal grandPlatformFee = 0m;
                        decimal grandPaid = 0m;

                        foreach (var r in _data.Collections)
                        {
                            bool alt = r.Sl % 2 == 0;
                            string rowBg = alt ? "#FFF8F8" : "#FFFFFF";
                            string sc = StatusColor(r.Status);
                            string appNo = r.AppNo ?? "—";

                            grandAmount += r.FeeStructureAmount;
                            grandPlatformFee += r.PlatformFee;
                            grandPaid += r.PaidAmount;

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
                                .Text(r.Name).Bold().FontSize(7.5f).FontColor(Ink);

                            DC(r.FeeStructureAmount > 0 ? Rs(r.FeeStructureAmount) : "—", Ink, bold: true);
                            DC(r.PlatformFee > 0 ? Rs(r.PlatformFee) : "—", AmberColor, bold: true);
                            DC(r.PaidAmount > 0 ? Rs(r.PaidAmount) : "—", GreenColor, bold: true);

                            table.Cell().Background(rowBg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(r.ReceiptNumber ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();

                            table.Cell().Background(rowBg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(r.PaymentDate ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();

                            DC(r.Status, sc, bold: true, last: true);
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

                        CT(""); CT(""); CT("TOTAL");
                        CT(Rs(grandAmount), Ink);
                        CT(Rs(grandPlatformFee), AmberColor);
                        CT(Rs(grandPaid), GreenColor);
                        CT(""); CT(""); CT($"{paidCount} Paid", GreenColor, last: true);
                    });
                }


                else if (isAdmFee)
                {
                    col.Item().PaddingBottom(8).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
  {
      c.ConstantColumn(22);    // Sl
      c.ConstantColumn(60);    // App No
      c.RelativeColumn(2.5f);  // Name
      c.ConstantColumn(55);    // Amount
      c.ConstantColumn(55);    // Paid Amount
      c.ConstantColumn(55);    // Balance
      c.RelativeColumn(1.8f);  // Receipt No
      c.ConstantColumn(50);    // Date
      c.ConstantColumn(48);    // Status
  });

                        void CH(string txt, bool last = false)
                        {
                            table.Cell().Background(RuleColor)
                                .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                                .Padding(4).AlignCenter()
                                .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
                        }

                        CH("Sl."); CH("App No"); CH("Applicant Name");
                        CH("Amount"); CH("Paid Amount"); CH("Balance");
                        CH("Receipt No"); CH("Date"); CH("Status", last: true);

                        decimal grandAmount = 0m;
                        decimal grandPaid = 0m;
                        decimal grandBalance = 0m;

                        foreach (var r in _data.Collections)
                        {
                            bool alt = r.Sl % 2 == 0;
                            string rowBg = alt ? "#FFF8F8" : "#FFFFFF";
                            string sc = StatusColor(r.Status);
                            string appNo = r.AppNo ?? "—";

                            grandAmount += r.FeeStructureAmount;
                            grandPaid += r.PaidAmount;
                            grandBalance += r.Balance;

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

                            // Name — left-aligned
                            table.Cell().Background(rowBg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignMiddle()
                                .Text(r.Name).Bold().FontSize(7.5f).FontColor(Ink);

                            DC(r.FeeStructureAmount > 0 ? Rs(r.FeeStructureAmount) : "—", Ink, bold: true);
                            DC(r.PaidAmount > 0 ? Rs(r.PaidAmount) : "—", GreenColor, bold: true);
                            DC(r.Balance > 0 ? Rs(r.Balance) : "—",
                                r.Balance > 0 ? RedColor : Muted, bold: true);

                            table.Cell().Background(rowBg)
        .BorderBottom(0.5f).BorderColor(BorderCol)
        .BorderRight(0.5f).BorderColor(BorderCol)
        .Padding(4).AlignCenter().AlignMiddle()
        .Text(r.ReceiptNumber ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();

                            table.Cell().Background(rowBg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(r.PaymentDate ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();

                            DC(r.Status, sc, bold: true, last: true);
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

                        CT(""); CT(""); CT("TOTAL");
                        CT(Rs(grandAmount), Ink);
                        CT(Rs(grandPaid), GreenColor);
                        CT(Rs(grandBalance), RedColor);
                        CT(""); CT(""); CT($"{paidCount} Paid", GreenColor, last: true);
                    });
                }


                else
                {
                    col.Item().PaddingBottom(8).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(22);    // Sl
                            c.ConstantColumn(58);    // App No
                            c.RelativeColumn(2f);    // Name
                            c.RelativeColumn(1.2f);  // Fee Type
                            c.ConstantColumn(50);    // Amount
                            c.ConstantColumn(50);    // Paid Amount
                            c.ConstantColumn(50);    // Balance
                            c.RelativeColumn(1.6f);  // Receipt No
                            c.ConstantColumn(46);    // Date
                            c.ConstantColumn(46);    // Status
                        });

                        void CH(string txt, bool last = false)
                        {
                            table.Cell().Background(RuleColor)
                                .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                                .Padding(4).AlignCenter()
                                .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
                        }

                        CH("Sl."); CH("App No"); CH("Applicant Name"); CH("Fee Type");
                        CH("Amount"); CH("Paid Amt"); CH("Balance");
                        CH("Receipt No"); CH("Date"); CH("Status", last: true);

                        decimal grandPaid = 0m;
                        decimal grandBalance = 0m;

                        foreach (var r in _data.Collections)
                        {
                            bool alt = r.Sl % 2 == 0;
                            string rowBg = alt ? "#FFF8F8" : "#FFFFFF";
                            string sc = StatusColor(r.Status);
                            string appNo = r.AppNo ?? "—";

                            grandPaid += r.PaidAmount;
                            grandBalance += r.Balance;

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
                                .Text(r.Name).Bold().FontSize(7.5f).FontColor(Ink);

                            DC(!string.IsNullOrWhiteSpace(r.FeeType) ? r.FeeType : "—", Muted);
                            DC(r.FeeStructureAmount > 0 ? Rs(r.FeeStructureAmount) : "—", Ink, bold: true);
                            DC(r.PaidAmount > 0 ? Rs(r.PaidAmount) : "—", GreenColor, bold: true);
                            DC(r.Balance > 0 ? Rs(r.Balance) : "—",
                                r.Balance > 0 ? RedColor : Muted, bold: true);

                            table.Cell().Background(rowBg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(r.ReceiptNumber ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();

                            table.Cell().Background(rowBg)
                                .BorderBottom(0.5f).BorderColor(BorderCol)
                                .BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().AlignMiddle()
                                .Text(r.PaymentDate ?? "—").FontSize(6.5f).FontColor(Muted).AlignCenter();

                            DC(r.Status, sc, bold: true, last: true);
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
                        CT(""); CT(Rs(grandPaid), GreenColor);
                        CT(Rs(grandBalance), RedColor);
                        CT(""); CT(""); CT($"{paidCount} Paid", GreenColor, last: true);
                    });
                }


                SectionHeader(col, "2. Fee Payment Status Summary");

                var statusGroups = _data.Collections
                    .GroupBy(c => c.Status, StringComparer.OrdinalIgnoreCase)
                    .OrderBy(g => g.Key)
                    .ToList();

                col.Item().PaddingBottom(10).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(1.5f);
                        c.RelativeColumn(1f);
                        c.RelativeColumn(1.5f);
                        c.RelativeColumn(1.5f);
                    });

                    void SH(string txt, bool last = false)
                    {
                        table.Cell().Background(BlueColor)
                            .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f).FontColor("#FFFFFF").AlignCenter();
                    }
                    SH("Status"); SH("Count"); SH("Paid Amount"); SH("Balance", last: true);

                    int sRow = 0;
                    foreach (var g in statusGroups)
                    {
                        bool alt = sRow++ % 2 == 0;
                        string bg = alt ? "#F0F4FF" : "#FFFFFF";
                        string sc = StatusColor(g.Key);
                        decimal gPaid = g.Sum(x => x.PaidAmount);
                        decimal gBal = g.Sum(x => x.Balance);

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(g.Key).Bold().FontSize(7.5f).FontColor(sc).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(g.Count().ToString()).Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(Rs(gPaid)).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(gBal > 0 ? Rs(gBal) : "—")
                            .Bold().FontSize(7.5f)
                            .FontColor(gBal > 0 ? RedColor : Muted).AlignCenter();
                    }

                    void ST(string txt, string? color = null, bool last = false)
                    {
                        table.Cell().Background(HeaderBg)
                            .BorderTop(1f).BorderColor(Ink)
                            .BorderRight(last ? 0f : 0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f).FontColor(color ?? Ink).AlignCenter();
                    }
                    ST("TOTAL");
                    ST(_data.TotalApplications.ToString());
                    ST(Rs(sectionTotalPaid), GreenColor);
                    ST(Rs(sectionTotalBalance), RedColor, last: true);
                });


                SectionHeader(col, "3. Fee Type Summary");

                var feeTypeGroups = _data.Collections
                    .GroupBy(c => string.IsNullOrWhiteSpace(c.FeeType) ? "Unknown" : c.FeeType,
                        StringComparer.OrdinalIgnoreCase)
                    .OrderBy(g => g.Key)
                    .ToList();

                col.Item().PaddingBottom(10).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(2f);
                        c.RelativeColumn(1f);
                        c.RelativeColumn(1.5f);
                        c.RelativeColumn(1.5f);
                    });

                    void FH(string txt, bool last = false)
                    {
                        table.Cell().Background(BlueColor)
                            .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                            .Padding(4).AlignCenter()
                            .Text(txt).Bold().FontSize(7.5f).FontColor("#FFFFFF").AlignCenter();
                    }
                    FH("Fee Type"); FH("Count"); FH("Paid Amount"); FH("Balance", last: true);

                    int fRow = 0;
                    foreach (var g in feeTypeGroups)
                    {
                        bool alt = fRow++ % 2 == 0;
                        string bg = alt ? "#F0F4FF" : "#FFFFFF";
                        decimal gPaid = g.Sum(x => x.PaidAmount);
                        decimal gBal = g.Sum(x => x.Balance);

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
                            .BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(Rs(gPaid)).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();

                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter()
                            .Text(gBal > 0 ? Rs(gBal) : "—")
                            .Bold().FontSize(7.5f)
                            .FontColor(gBal > 0 ? RedColor : Muted).AlignCenter();
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
                    FT(_data.TotalApplications.ToString());
                    FT(Rs(sectionTotalPaid), GreenColor);
                    FT(Rs(sectionTotalBalance), RedColor, last: true);
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