using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public enum StudentType
{
    Karnataka,
    HyderabadKarnataka,
    NonKarnataka
}
public enum AllocationStatus
{
    Selected,
    Waitlisted,
    NotSelected
}



public class MeritListReportData
{
    public List<MeritListReportRow> Rows { get; set; } = new();
    public byte[]? LogoBytes { get; set; }
    public string AcademicYear { get; set; } = "";
    public string? DegreeName { get; set; }
    public string? DegreeType { get; set; }
    public string? CourseName { get; set; }
    public string? CategoryFilter { get; set; }
    public string? SeatTypeFilter { get; set; }
    public string? KarnatakaFilter { get; set; }
    public string GeneratedBy { get; set; } = "";
    public string ReportTitle { get; set; } = "Provisional  Merit List";
    public string ListType { get; set; } = "omnibus";
    public int ProgrammeIntake { get; set; } = 60;
    public bool IsCertificateCourse { get; set; }
    public bool IsPgCourse { get; set; }
    public string Preference { get; set; } = "—";
    public List<CategoryBreakdownRow> CategoryBreakdown { get; set; } = new();

    public List<MeritListReportRow> HyderabadKarnatakaRows { get; set; } = new();
    public List<MeritListReportRow> NonKarnatakaRows { get; set; } = new();


    public SeatAllocationSummary AllocationSummary { get; set; } = new();


    public List<CategoryCutoffRow> CategoryCutoffs { get; set; } = new();

    public List<CategorySeatMatrixRow> SeatMatrixBreakdown { get; set; } = new();
    public List<SupernumeraryAllotmentRow> SupernumeraryAllotments { get; set; } = new();
    public List<CertificateCutoffRow> CertificateCutoffs { get; set; } = new();
    
    public List<PgProgrammeCategoryRow> PgCategoryBreakdown { get; set; } = new();
    public List<PgKkAllotmentRow> PgKkAllotments { get; set; } = new();
    public PgPwdAllotmentRow? PgPwdAllotment { get; set; }
    public List<PgCutoffRow> PgCutoffs { get; set; } = new();

}

public class MeritListReportRow
{
    public int Rank { get; set; }
    public string AppNo { get; set; } = "";
    public string Name { get; set; } = "";
    public string Preference { get; set; } = "—";
    public string FatherName { get; set; } = "";
    public string Category { get; set; } = "";
    public List<string> SeatTypes { get; set; } = new();
    public string Qualification { get; set; } = "";
    public string Karnataka { get; set; } = "";
    public StudentType StudentType { get; set; } = StudentType.Karnataka;
    public string Gender { get; set; } = "";
    public string? Phone { get; set; }
    public float Percentage { get; set; }
    public float BonusPoints { get; set; }
    public List<string> BonusDetails { get; set; } = new();
    public float MeritScore { get; set; }
    public string Status { get; set; } = "Pending";
    public AllocationStatus AllocationStatus { get; set; } = AllocationStatus.Waitlisted;
    public string? AllocatedCategory { get; set; }

    public string? Remark { get; set; }
    public string DegreeName { get; set; } = "";
    public List<DegreePreferenceRow> DegreePreferences { get; set; } = new();
    public bool IsRural { get; set; }
    public bool IsKannadaMedium { get; set; }
    public bool IsKalyanaKarnataka { get; set; }
    public bool IsPwd { get; set; }
    public List<string> SupernumeraryQuotas { get; set; } = new();

}

public class CategorySeatMatrixRow
{
    public string Category { get; set; } = "";
    public int GeneralReserved { get; set; }
    public int GeneralFilled { get; set; }
    public int RuralReserved { get; set; }
    public int RuralFilled { get; set; }
    public int KannadaMediumReserved { get; set; }
    public int KannadaMediumFilled { get; set; }
    public int KalyanaKarnatakaReserved { get; set; }
    public int KalyanaKarnatakaFilled { get; set; }
    public int PwdReserved { get; set; }
    public int PwdFilled { get; set; }
}

public class SupernumeraryAllotmentRow
{
    public string QuotaName { get; set; } = "";
    public int ReservedSeats { get; set; }
    public int FilledSeats { get; set; }
    public List<MeritListReportRow> AllottedStudents { get; set; } = new();
}

public class DegreePreferenceRow
{
    public int Order { get; set; }
    public string DegreeName { get; set; } = "";
    public string CourseName { get; set; } = "";
    public string Status { get; set; } = "Pending";
}

public class CategoryBreakdownRow
{
    public string Category { get; set; } = "";
    public int ReservationPct { get; set; }
    public int ReservedSeats { get; set; }
    public int AppliedCount { get; set; }
    public int SelectedCount { get; set; }
    public int WaitlistCount { get; set; }
    public float CutoffScore { get; set; }
}

public class SeatAllocationSummary
{
    public int TotalIntake { get; set; } = 60;
    public int KarnatakaSeats { get; set; }
    public int HyderabadKarnatakaSeats { get; set; }
    public int NonKarnatakaSeats { get; set; }
    public int DifferentlyAbledSeats { get; set; }
    public int KarnatakaFilled { get; set; }
    public int HyderabadKarnatakaFilled { get; set; }
    public int NonKarnatakaFilled { get; set; }
}

public class CategoryCutoffRow
{
    public string Category { get; set; } = "";
    public int ReservedSeats { get; set; }
    public int FilledSeats { get; set; }
    public float HighestScore { get; set; }
    public float CutoffScore { get; set; }
    public float LowestScore { get; set; }
    public string StudentType { get; set; } = "KA";
}
public class CertificateCutoffRow
{
    public string Category { get; set; } = "";
    public string SubQuota { get; set; } = "";
    public int FilledSeats { get; set; }
    public float HighestScore { get; set; }
    public float CutoffScore { get; set; }
}
public class PgProgrammeCategoryRow
{
    public string Category { get; set; } = "";
    public int GeneralReserved { get; set; }
    public int GeneralFilled { get; set; }
    public int RuralReserved { get; set; }
    public int RuralFilled { get; set; }
    public int KannadaMediumReserved { get; set; }
    public int KannadaMediumFilled { get; set; }
}

public class PgKkAllotmentRow
{
    public string GroupName { get; set; } = "";
    public int ReservedSeats { get; set; }
    public int FilledSeats { get; set; }
    public List<MeritListReportRow> AllottedStudents { get; set; } = new();
}

public class PgPwdAllotmentRow
{
    public int ReservedSeats { get; set; }
    public int FilledSeats { get; set; }
    public List<MeritListReportRow> AllottedStudents { get; set; } = new();
}

public class PgCutoffRow
{
    public string Category { get; set; } = "";
    public int FilledSeats { get; set; }
    public float HighestScore { get; set; }
    public float CutoffScore { get; set; }
}




public class MeritListReport : IDocument
{
    private readonly MeritListReportData _data;

    private const string Ink = "#130000";
    private const string Muted = "#555555";
    private const string RuleColor = "#820000";
    private const string BorderCol = "#BBBBBB";
    private const string HeaderBg = "#F5F0F0";
    private const string GoldColor = "#B45309";
    private const string SilverColor = "#6B7280";
    private const string BronzeColor = "#92400E";
    private const string BlueColor = "#1E3A5F";
    private const string GreenColor = "#166534";
    private const string AmberColor = "#92400E";
    private const string RedColor = "#991B1B";
    private const string PurpleColor = "#7C3AED";

    private string GetKarnatakaLabel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "All";

        return value.ToUpper() switch
        {
            "KA" => "Karnataka",
            "HK" => "Hyderabad-Karnataka",
            "NK" => "Non-Karnataka",
            _ => value
        };
    }

    private static readonly Dictionary<string, string> CategoryColors =
        new(StringComparer.OrdinalIgnoreCase)
        {
            { "SC",        "#1E3A5F" }, { "ST",          "#166534" },
            { "Cat-I",     "#7C3AED" }, { "Category I",  "#7C3AED" },
            { "IIA",       "#0369A1" }, { "Category IIA","#0369A1" }, { "2A","#0369A1" },
            { "IIB",       "#0891B2" }, { "Category IIB","#0891B2" }, { "2B","#0891B2" },
            { "IIIA",      "#059669" }, { "Category IIIA","#059669"},{ "3A","#059669"  },
            { "IIIB",      "#D97706" }, { "Category IIIB","#D97706"},{ "3B","#D97706"  },
            { "GM",        "#820000" },
        };

    public MeritListReport(MeritListReportData data) => _data = data;
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    private static string GetCategoryColor(string? cat) =>
        cat != null && CategoryColors.TryGetValue(cat, out var c) ? c : BlueColor;

    private static string RankBadgeColor(int rank) => rank switch
    {
        1 => GoldColor,
        2 => SilverColor,
        3 => BronzeColor,
        _ => BlueColor
    };

    private static (string label, string color) StudentTypeInfo(StudentType t) => t switch
    {
        StudentType.HyderabadKarnataka => ("HK", PurpleColor),
        StudentType.NonKarnataka => ("NK", RedColor),
        _ => ("KA", GreenColor),
    };

    private static string AllocationColor(AllocationStatus s) => s switch
    {
        AllocationStatus.Selected => GreenColor,
        AllocationStatus.Waitlisted => AmberColor,
        AllocationStatus.NotSelected => RedColor,
        _ => Muted
    };

    private static string StatusColor(string? status) => status?.ToLower() switch
    {
        "accepted" or "verified" or "approved" => GreenColor,
        "pending" or "pending/on hold" => AmberColor,
        "rejected" => RedColor,
        _ => "#374151"
    };

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
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(28);
            page.MarginTop(16);
            page.MarginBottom(14);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(8).FontColor(Ink));

            // ── HEADER ────────────────────────────────────────────────────
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
                    c.Item().AlignCenter()
                        .Text($"Academic Year: {_data.AcademicYear}")
                        .FontSize(7.5f).FontColor(Muted).AlignCenter();
                });
                hdr.Item().Height(0.5f).Background(BorderCol);
                hdr.Item().PaddingTop(1).Height(1.5f).Background(Ink);
            });

            // ── BODY ──────────────────────────────────────────────────────
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

                            if (!_data.IsCertificateCourse && !string.IsNullOrWhiteSpace(_data.DegreeType))
                                InfoChip("Degree Type", _data.DegreeType);

                            if (!string.IsNullOrWhiteSpace(_data.DegreeName))
                                InfoChip(_data.IsCertificateCourse ? "Program" : "Degree", _data.DegreeName);

                            if (!string.IsNullOrWhiteSpace(_data.CategoryFilter))
                                InfoChip("Category", _data.CategoryFilter);

                            row.RelativeItem();

                            row.AutoItem().Text(text =>
                            {
                                text.Span("Total Intake: ").Bold().FontSize(7.5f).FontColor(Muted);
                                text.Span(_data.ProgrammeIntake.ToString()).Bold().FontSize(7.5f).FontColor(RuleColor);
                                text.Span("   ");
                                text.Span("Applications: ").Bold().FontSize(7.5f).FontColor(Muted);
                                text.Span(_data.Rows.Count.ToString()).Bold().FontSize(7.5f).FontColor(Ink);
                            });
                        });

                        if (!string.IsNullOrWhiteSpace(_data.CourseName))
                        {
                            inner.Item().PaddingTop(4).Text(text =>
                            {
                                text.Span("Course: ").Bold().FontSize(7.5f).FontColor(Muted);
                                text.Span(_data.CourseName).FontSize(7.5f).FontColor(Ink);
                            });
                        }


                        inner.Item().PaddingTop(8).Row(row =>
                        {
                            void InfoChip(string label, string value)
                            {
                                row.AutoItem().PaddingRight(14).Text(text =>
                                {
                                    text.Span(label + ": ").Bold().FontSize(7.5f).FontColor(Muted);
                                    text.Span(value).FontSize(7.5f).FontColor(Ink);
                                });
                            }

                            InfoChip("Academic Year", _data.AcademicYear ?? "All");
                            InfoChip("Seat Type", _data.SeatTypeFilter ?? "All");
                            InfoChip("Karnataka", GetKarnatakaLabel(_data.KarnatakaFilter));

                            row.RelativeItem();
                        });
                    });

                var selectedCount = _data.Rows.Count(r => r.AllocationStatus == AllocationStatus.Selected);
                var waitlistCount = _data.Rows.Count(r => r.AllocationStatus == AllocationStatus.Waitlisted);
                var notSelectedCount = _data.Rows.Count(r => r.AllocationStatus == AllocationStatus.NotSelected);

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
                    StatBox("Total", _data.Rows.Count.ToString(), Ink);
                    statsRow.ConstantItem(3);
                    StatBox("Selected", selectedCount.ToString(), GreenColor);
                    statsRow.ConstantItem(3);
                    StatBox("Waitlisted", waitlistCount.ToString(), AmberColor);
                    statsRow.ConstantItem(3);
                    StatBox("Not Sel.", notSelectedCount.ToString(), RedColor);
                    statsRow.ConstantItem(3);


                    StatBox("Intake", _data.ProgrammeIntake.ToString(), RuleColor);
                });



                int sectionNum = 1;

                if (_data.IsCertificateCourse)
                {
                    SectionHeader(col, $"{sectionNum}. Category-wise Reservation & Seat Matrix",
                        "Rural(RC) | Kannada Medium(KM) | Kalyana Karnataka(KK) | PWD");
                    RenderCertificateCourseSeatMatrix(col);
                    sectionNum++;

                    if (_data.CertificateCutoffs?.Any() == true)
                    {
                        SectionHeader(col, $"{sectionNum}. Cutoff Scores per Category & Sub-Quota",
                            "Cutoff = Lowest Merit Score of the last selected candidate in the respective Category and Sub-Quota");
                        RenderCertificateCutoffTable(col);
                        sectionNum++;
                    }

                    if (_data.SupernumeraryAllotments?.Any() == true)
                    {
                        SectionHeader(col, $"{sectionNum}. Supernumerary & Outside-Karnataka Allotments",
                            "NSS/NCC/Sports/Cultural/Defence/Transgender/Kashmiri Migrant/J&K/Foreign National/Outside Karnataka");
                        RenderSupernumeraryAllotments(col);
                        sectionNum++;
                    }
                }
                else if (_data.IsPgCourse)
                {
                    SectionHeader(col, $"{sectionNum}. Category-wise Reservation & Seat Matrix",
                        "Rural(RC) | Kannada Medium(KM)");
                    RenderPgCategorySeatMatrix(col);
                    sectionNum++;

                    if (_data.PgKkAllotments?.Any() == true)
                    {
                        SectionHeader(col, $"{sectionNum}. Kalyana Karnataka (KK) Allotments", "");
                        RenderPgKkAllotments(col);
                        sectionNum++;
                    }

                    if (_data.PgPwdAllotment != null)
                    {
                        SectionHeader(col, $"{sectionNum}. PWD Allotments", "");
                        RenderPgPwdAllotment(col);
                        sectionNum++;
                    }

                    if (_data.PgCutoffs?.Any() == true)
                    {
                        SectionHeader(col, $"{sectionNum}. Category-wise Cutoff Scores", "");
                        RenderPgCutoffTable(col);
                        sectionNum++;
                    }
                }
                else
                {
                    SectionHeader(col, $"{sectionNum}. Seat Allocation Summary",
                        " 15% Non-KA | 8% Hyderabad-KA | 5% DA");

                    var s = _data.AllocationSummary;
                    col.Item().PaddingBottom(10).Table(t =>
                    {
                        t.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(2.5f);
                            c.RelativeColumn(1f);
                            c.RelativeColumn(1f);
                            c.RelativeColumn(1f);
                            c.RelativeColumn(1f);
                        });

                        void AH(string txt, bool last = false)
                        {
                            t.Cell().Background(BlueColor)
                                .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                                .Padding(4).AlignCenter()
                                .Text(txt).Bold().FontSize(7.5f).FontColor("#FFFFFF").AlignCenter();
                        }
                        AH("Student Type"); AH("% Reserved"); AH("Seats"); AH("Filled"); AH("Vacant", last: true);

                        void AR(string type, string pct, int seats, int filled, string typeColor, bool alt)
                        {
                            string bg = alt ? "#F0F4FF" : "#FFFFFF";
                            int vacant = Math.Max(0, seats - filled);
                            t.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).Text(type).Bold().FontSize(7.5f).FontColor(typeColor);
                            t.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text(pct).FontSize(7.5f).FontColor(Ink).AlignCenter();
                            t.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text(seats.ToString()).Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();
                            t.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text(filled.ToString()).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();
                            t.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                                .Padding(4).AlignCenter().Text(vacant.ToString()).Bold().FontSize(7.5f)
                                .FontColor(vacant > 0 ? AmberColor : GreenColor).AlignCenter();
                        }

                        AR("Karnataka Students (General)", "~72%", s.KarnatakaSeats, s.KarnatakaFilled, GreenColor, false);
                        AR("Hyderabad-Karnataka Students", "8%", s.HyderabadKarnatakaSeats, s.HyderabadKarnatakaFilled, PurpleColor, true);
                        AR("Non-Karnataka Students", "15%", s.NonKarnatakaSeats, s.NonKarnatakaFilled, RedColor, false);
                        AR("Differently Abled (DA)", "5%", s.DifferentlyAbledSeats, 0, Muted, true);

                        int totalFilled = s.KarnatakaFilled + s.HyderabadKarnatakaFilled + s.NonKarnatakaFilled;
                        t.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).Text("TOTAL").Bold().FontSize(7.5f).FontColor(Ink);
                        t.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().Text("100%").Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();
                        t.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().Text(s.TotalIntake.ToString()).Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
                        t.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                            .Padding(4).AlignCenter().Text(totalFilled.ToString()).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();
                        t.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink)
                            .Padding(4).AlignCenter().Text(Math.Max(0, s.TotalIntake - totalFilled).ToString())
                            .Bold().FontSize(7.5f).FontColor(AmberColor).AlignCenter();
                    });
                    sectionNum++;

                    SectionHeader(col, $"{sectionNum}. Category-wise Reservation & Seat Matrix",
                        "Karnataka Govt. Order — SC:17% | ST:7% | Cat-I:4% | IIA:15% | IIB:4% | IIIA:4% | IIIB:5% | GM:44%");

                    if (_data.CategoryBreakdown?.Any() == true)
                    {
                        col.Item().PaddingBottom(10).Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(22);
                                c.RelativeColumn(1.8f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1.4f);
                            });

                            void CH(string txt, bool last = false)
                            {
                                table.Cell().Background(RuleColor)
                                    .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                                    .Padding(4).AlignCenter()
                                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
                            }
                            CH("Sl."); CH("Category"); CH("Res.%"); CH("Seats");
                            CH("Applied"); CH("Selected"); CH("Waitlist"); CH("Cutoff Score", last: true);

                            int sl = 1;
                            foreach (var cat in _data.CategoryBreakdown)
                            {
                                bool alt = sl % 2 == 0;
                                string bg = alt ? "#FFF8F8" : "#FFFFFF";

                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text(sl++.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).Text(cat.Category).Bold().FontSize(7.5f).FontColor(GetCategoryColor(cat.Category));
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text($"{cat.ReservationPct}%").FontSize(7f).FontColor(Ink).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text(cat.ReservedSeats.ToString()).Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text(cat.AppliedCount.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text(cat.SelectedCount.ToString()).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text(cat.WaitlistCount.ToString()).FontSize(7f).FontColor(AmberColor).AlignCenter();
                                if (cat.CutoffScore > 0)
                                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                                        .Padding(4).AlignCenter().Text($"{cat.CutoffScore:F2}%").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
                                else
                                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                                        .Padding(4).AlignCenter().Text("—").FontSize(7f).FontColor(Muted).AlignCenter();
                            }

                            int tr = _data.CategoryBreakdown.Sum(c => c.ReservedSeats);
                            int ta = _data.CategoryBreakdown.Sum(c => c.AppliedCount);
                            int ts = _data.CategoryBreakdown.Sum(c => c.SelectedCount);
                            int tw = _data.CategoryBreakdown.Sum(c => c.WaitlistCount);

                            void TC(string txt, bool last = false)
                            {
                                table.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink)
                                    .BorderRight(last ? 0f : 0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter()
                                    .Text(txt).Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();
                            }
                            TC(""); TC("TOTAL"); TC("100%"); TC(tr.ToString()); TC(ta.ToString()); TC(ts.ToString()); TC(tw.ToString()); TC("—", last: true);
                        });
                    }
                    sectionNum++;

                    if (_data.CategoryCutoffs?.Any() == true)
                    {
                        SectionHeader(col, $"{sectionNum}. Category-wise Cutoff Scores",
                            "Cutoff = Merit Score of the last selected candidate per category");

                        col.Item().PaddingBottom(10).Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.ConstantColumn(22);
                                c.RelativeColumn(2f);
                                c.RelativeColumn(1.5f);
                                c.RelativeColumn(1.2f);
                                c.RelativeColumn(1.2f);
                                c.RelativeColumn(1.4f);
                                c.RelativeColumn(1.2f);
                            });

                            void CutH(string txt, bool last = false)
                            {
                                table.Cell().Background(BlueColor)
                                    .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                                    .Padding(4).AlignCenter()
                                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
                            }
                            CutH("Sl."); CutH("Category"); CutH("Student Type");
                            CutH("Seats"); CutH("Highest"); CutH("Cutoff Score"); CutH("Lowest", last: true);

                            int csl = 1;
                            foreach (var cut in _data.CategoryCutoffs)
                            {
                                bool alt = csl % 2 == 0;
                                string bg = alt ? "#F0F4FF" : "#FFFFFF";
                                string stColor = cut.StudentType == "HK" ? PurpleColor
                                               : cut.StudentType == "NK" ? RedColor : GreenColor;

                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text(csl++.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).Text(cut.Category).Bold().FontSize(7.5f).FontColor(GetCategoryColor(cut.Category));
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text(cut.StudentType).Bold().FontSize(7.5f).FontColor(stColor).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text(cut.FilledSeats.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text($"{cut.HighestScore:F2}%").FontSize(7f).FontColor(GreenColor).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text($"{cut.CutoffScore:F2}%").Bold().FontSize(8f).FontColor(RuleColor).AlignCenter();
                                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                                    .Padding(4).AlignCenter().Text($"{cut.LowestScore:F2}%").FontSize(7f).FontColor(Muted).AlignCenter();
                            }
                        });
                        sectionNum++;
                    }
                }

                col.Item().PageBreak();
                SectionHeader(col, $"{sectionNum}. Provisional  Merit List — All Candidates",
    $"Total: {_data.Rows.Count}  |  Intake: {_data.ProgrammeIntake}");
                RenderMeritTable(col, _data.Rows.OrderBy(r => r.Rank).ToList(), showAllocationStatus: true);
                sectionNum++;

                if (_data.IsCertificateCourse)
                {
                    SectionHeader(col, $"{sectionNum}. Category-wise Allotment Lists",
                        "Every applicant grouped by category — selected candidates show their allotted quota; others are marked Not Allotted.");
                    RenderCategoryWiseStudentLists(col);
                    sectionNum++;
                }
                if (_data.IsPgCourse)
                {
                    SectionHeader(col, $"{sectionNum}. Category-wise Allotment List",
                        "Every applicant grouped by category — selected candidates show their allotted quota; others are marked Not Allotted.");
                    RenderPgCategoryWiseStudentLists(col);
                    sectionNum++;
                }

                if (_data.IsCertificateCourse || _data.IsPgCourse)
                {
                    var waitlisted = _data.Rows
                        .Where(r => r.AllocationStatus == AllocationStatus.Waitlisted)
                        .OrderBy(r => r.Rank)
                        .ToList();

                    if (waitlisted.Any())
                    {
                        SectionHeader(col, $"{sectionNum}. Waitlisted Candidates",
                            $"Candidates not allotted a seat — {waitlisted.Count} total");
                        RenderWaitlistedList(col, waitlisted);
                        sectionNum++;
                    }
                }

                // ── SIGNATURE BLOCK ──
                col.Item().PaddingTop(40).AlignRight().Column(sig =>
                {
                    sig.Item().Width(200).Height(0.75f).Background(Ink);
                    sig.Item().PaddingTop(4).AlignCenter()
                        .Text("Registrar").SemiBold().FontSize(8.5f).FontColor(Ink).AlignCenter();
                    sig.Item().AlignCenter()
                        .Text("MGRDPR University, Gadag")
                        .FontSize(7f).FontColor(Muted).AlignCenter();
                });

            });

            // ── FOOTER ────────────────────────────────────────────────────
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


    private static string PreferenceStatusColor(string status) => status?.ToLower() switch
    {
        "accepted" => GreenColor,
        "rejected" => RedColor,
        _ => AmberColor
    };

    private void RenderCertificateCourseSeatMatrix(ColumnDescriptor col)
    {
        if (_data.SeatMatrixBreakdown == null || !_data.SeatMatrixBreakdown.Any()) return;

        col.Item().PaddingBottom(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(1.2f);  // Category
                c.RelativeColumn(1.2f);  // G
                c.RelativeColumn(1.2f);  // RC
                c.RelativeColumn(1.2f);  // KM
                c.RelativeColumn(1.2f);  // KK
                c.RelativeColumn(1.2f);  // PWD
                c.RelativeColumn(1.3f);  // Total
            });

            void CH(string txt, bool last = false)
            {
                table.Cell().Background(RuleColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                    .Padding(4).AlignCenter()
                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
            }
            CH("Category"); CH("General (G)"); CH("Rural (RC)"); CH("Kannada Medium (KM)"); CH("Kalyana Karnataka (KK)"); CH("PWD"); CH("Total", last: true);

            void Cell(string reserved, string filled, string bg, bool last)
            {
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                    .BorderRight(last ? 0f : 0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Column(c =>
                    {
                        c.Item().AlignCenter().Text($"{filled} / {reserved}").Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                    });
            }

            int sl = 0;
            foreach (var row in _data.SeatMatrixBreakdown)
            {
                bool alt = sl++ % 2 == 0;
                string bg = alt ? "#FFF8F8" : "#FFFFFF";

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).Text(row.Category).Bold().FontSize(7.5f).FontColor(GetCategoryColor(row.Category));
                Cell(row.GeneralReserved.ToString(), row.GeneralFilled.ToString(), bg, false);
                Cell(row.RuralReserved.ToString(), row.RuralFilled.ToString(), bg, false);
                Cell(row.KannadaMediumReserved.ToString(), row.KannadaMediumFilled.ToString(), bg, false);
                Cell(row.KalyanaKarnatakaReserved.ToString(), row.KalyanaKarnatakaFilled.ToString(), bg, false);
                Cell(row.PwdReserved.ToString(), row.PwdFilled.ToString(), bg, false);

                int rowTotalReserved = row.GeneralReserved + row.RuralReserved + row.KannadaMediumReserved + row.KalyanaKarnatakaReserved + row.PwdReserved;
                int rowTotalFilled = row.GeneralFilled + row.RuralFilled + row.KannadaMediumFilled + row.KalyanaKarnatakaFilled + row.PwdFilled;
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Column(c =>
                    {
                        c.Item().AlignCenter().Text($"{rowTotalFilled} / {rowTotalReserved}").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
                    });
            }

            int tg = _data.SeatMatrixBreakdown.Sum(r => r.GeneralReserved);
            int tgf = _data.SeatMatrixBreakdown.Sum(r => r.GeneralFilled);
            int trc = _data.SeatMatrixBreakdown.Sum(r => r.RuralReserved);
            int trcf = _data.SeatMatrixBreakdown.Sum(r => r.RuralFilled);
            int tkm = _data.SeatMatrixBreakdown.Sum(r => r.KannadaMediumReserved);
            int tkmf = _data.SeatMatrixBreakdown.Sum(r => r.KannadaMediumFilled);
            int tkk = _data.SeatMatrixBreakdown.Sum(r => r.KalyanaKarnatakaReserved);
            int tkkf = _data.SeatMatrixBreakdown.Sum(r => r.KalyanaKarnatakaFilled);
            int tpwd = _data.SeatMatrixBreakdown.Sum(r => r.PwdReserved);
            int tpwdf = _data.SeatMatrixBreakdown.Sum(r => r.PwdFilled);

            table.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).Text("TOTAL").Bold().FontSize(7.5f).FontColor(Ink);
            Cell(tg.ToString(), tgf.ToString(), HeaderBg, false);
            Cell(trc.ToString(), trcf.ToString(), HeaderBg, false);
            Cell(tkm.ToString(), tkmf.ToString(), HeaderBg, false);
            Cell(tkk.ToString(), tkkf.ToString(), HeaderBg, false);
            Cell(tpwd.ToString(), tpwdf.ToString(), HeaderBg, false);

            int grandTotalReserved = tg + trc + tkm + tkk + tpwd;
            int grandTotalFilled = tgf + trcf + tkmf + tkkf + tpwdf;
            table.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink)
                .Padding(4).AlignCenter().Text($"{grandTotalFilled} / {grandTotalReserved}").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
        });
    }
    private void RenderCertificateCutoffTable(ColumnDescriptor col)
    {
        if (_data.CertificateCutoffs == null || !_data.CertificateCutoffs.Any()) return;

        col.Item().PaddingBottom(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(1.1f);  // Category
                c.RelativeColumn(1.8f);  // Sub-Quota
                c.RelativeColumn(0.9f);  // Filled
                c.RelativeColumn(1.1f);  // Highest
                c.RelativeColumn(1.2f);  // Cutoff
            });

            void CH(string txt, bool last = false)
            {
                table.Cell().Background(BlueColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                    .Padding(4).AlignCenter()
                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
            }
            CH("Category"); CH("Sub-Quota"); CH("Filled"); CH("Highest"); CH("Cutoff Score", last: true);

            int sl = 0;
            foreach (var row in _data.CertificateCutoffs)
            {
                bool alt = sl++ % 2 == 0;
                string bg = alt ? "#FFF8F8" : "#FFFFFF";

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).Text(row.Category).Bold().FontSize(7.5f).FontColor(GetCategoryColor(row.Category));
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).Text(row.SubQuota).FontSize(7f).FontColor(Muted);
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text(row.FilledSeats.ToString()).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text($"{row.HighestScore:F2}%").FontSize(7f).FontColor(Ink).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text($"{row.CutoffScore:F2}%").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
            }
        });
    }
    private void RenderCategoryWiseStudentLists(ColumnDescriptor col)
    {
        var categoryDisplayOrder = new[] { "GM", "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB" };

        foreach (var cat in categoryDisplayOrder)
        {
            // Every applicant recorded under this category — selected AND
            // waitlisted — so the section total matches the applicant count.
            var studentsInCategory = _data.Rows
                .Where(r => NormalizeCategory(r.Category) == NormalizeCategory(cat))
                .OrderBy(r => r.Rank)
                .ToList();

            if (!studentsInCategory.Any()) continue;

            int allottedCount = studentsInCategory.Count(r => r.AllocationStatus == AllocationStatus.Selected);

            col.Item().PaddingTop(10).Row(r =>
            {
                r.RelativeItem().Text($"Category: {cat}").Bold().FontSize(9f).FontColor(GetCategoryColor(cat));
                r.AutoItem().Text($"  ({allottedCount} allotted / {studentsInCategory.Count} total)").FontSize(8f).FontColor(Muted);
            });
            col.Item().PaddingBottom(4).Height(1f).Background(GetCategoryColor(cat));

            col.Item().PaddingBottom(10).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.ConstantColumn(18);   // Sl.
                    c.ConstantColumn(36);   // Rank (overall)
                    c.ConstantColumn(76);   // App No
                    c.RelativeColumn(2.4f); // Name
                    c.RelativeColumn(1.9f); // Allotted Under
                    c.ConstantColumn(40);   // Merit Score
                });

                void CH(string txt, bool last = false)
                {
                    table.Cell().Background(BlueColor)
                        .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                        .Padding(3).AlignCenter()
                        .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
                }
                CH("Sl."); CH("Rank"); CH("App No"); CH("Name"); CH("Allotted Under"); CH("Merit%", last: true);

                int sl = 1;
                foreach (var s in studentsInCategory)
                {
                    bool alt = sl % 2 == 0;
                    string bg = alt ? "#FFF8F8" : "#FFFFFF";

                    bool isSelected = s.AllocationStatus == AllocationStatus.Selected;
                    string subquota;
                    string subquotaColor;

                    if (isSelected && !string.IsNullOrWhiteSpace(s.AllocatedCategory))
                    {
                        var idx = s.AllocatedCategory.IndexOf(" - ", StringComparison.Ordinal);
                        string prefix = idx >= 0 ? s.AllocatedCategory.Substring(0, idx) : s.AllocatedCategory;
                        string label = idx >= 0 ? s.AllocatedCategory.Substring(idx + 3) : "";

                        subquota = string.Equals(NormalizeCategory(prefix), NormalizeCategory(cat), StringComparison.OrdinalIgnoreCase)
                            ? (string.IsNullOrEmpty(label) ? prefix : label)
                            : s.AllocatedCategory;
                        subquotaColor = Muted;
                    }
                    else
                    {
                        subquota = "Not Allotted";
                        subquotaColor = AmberColor;
                    }

                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).AlignCenter().Text(sl.ToString()).FontSize(6.5f).FontColor(Ink).AlignCenter();
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).AlignCenter().Text(s.Rank.ToString()).Bold().FontSize(7f).FontColor(RuleColor).AlignCenter();
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).AlignCenter().Text(s.AppNo).FontSize(6f).FontColor(Ink).AlignCenter();
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).Text(s.Name).Bold().FontSize(6.8f).FontColor(Ink);
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).Text(subquota).FontSize(6.3f).FontColor(subquotaColor);
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                        .Padding(3).AlignCenter().Text($"{s.MeritScore:F2}%").Bold().FontSize(6.8f).FontColor(RuleColor).AlignCenter();

                    sl++;
                }
            });
        }
    }
    private static string NormalizeCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return "";

        var value = category.ToUpper()
            .Replace("(", "")
            .Replace(")", "")
            .Replace(" ", "")
            .Replace("-", "");

        return value switch
        {
            "2A" => "IIA",
            "2B" => "IIB",
            "3A" => "IIIA",
            "3B" => "IIIB",
            _ => value
        };
    }
    private void RenderSupernumeraryAllotments(ColumnDescriptor col)
    {
        if (_data.SupernumeraryAllotments == null || !_data.SupernumeraryAllotments.Any()) return;

        col.Item().PaddingBottom(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(2.2f);  // Quota
                c.RelativeColumn(1f);    // Reserved
                c.RelativeColumn(1f);    // Filled
                c.RelativeColumn(4f);    // Allotted students
            });

            void CH(string txt, bool last = false)
            {
                table.Cell().Background(BlueColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                    .Padding(4).AlignCenter()
                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
            }
            CH("Quota"); CH("Reserved"); CH("Filled"); CH("Allotted Students (App No. — Name — Merit%)", last: true);

            int sl = 0;
            foreach (var row in _data.SupernumeraryAllotments)
            {
                bool alt = sl++ % 2 == 0;
                string bg = alt ? "#F0F4FF" : "#FFFFFF";
                bool frozen = row.FilledSeats < row.ReservedSeats;

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).Text(row.QuotaName).Bold().FontSize(7.5f).FontColor(Ink);
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text(row.ReservedSeats.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text(row.FilledSeats.ToString()).Bold().FontSize(7.5f)
                    .FontColor(frozen ? AmberColor : GreenColor).AlignCenter();

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                    .Padding(4).Column(c =>
                    {
                        if (row.AllottedStudents.Any())
                        {
                            foreach (var s in row.AllottedStudents)
                                c.Item().Text($"{s.AppNo} — {s.Name} — {s.MeritScore:F2}%").FontSize(6.8f).FontColor(Ink);
                        }
                        else
                        {
                            c.Item().Text("No eligible applicant — seat frozen").FontSize(6.8f).FontColor(Muted);
                        }
                    });
            }
        });
    }
    private void RenderPgCategorySeatMatrix(ColumnDescriptor col)
    {
        if (_data.PgCategoryBreakdown == null || !_data.PgCategoryBreakdown.Any()) return;

        col.Item().PaddingBottom(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(1.5f);  // Category
                c.RelativeColumn(1.4f);  // General
                c.RelativeColumn(1.4f);  // Rural
                c.RelativeColumn(1.6f);  // Kannada Medium
                c.RelativeColumn(1.3f);  // Total
            });

            void CH(string txt, bool last = false)
            {
                table.Cell().Background(RuleColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                    .Padding(4).AlignCenter()
                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
            }
            CH("Category"); CH("General (G)"); CH("Rural (RC)"); CH("Kannada Medium (KM)"); CH("Total", last: true);

            int sl = 0;
            foreach (var row in _data.PgCategoryBreakdown)
            {
                bool alt = sl++ % 2 == 0;
                string bg = alt ? "#FFF8F8" : "#FFFFFF";

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).Text(row.Category).Bold().FontSize(7.5f).FontColor(GetCategoryColor(row.Category));

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text($"{row.GeneralFilled} / {row.GeneralReserved}").Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text($"{row.RuralFilled} / {row.RuralReserved}").Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text($"{row.KannadaMediumFilled} / {row.KannadaMediumReserved}").Bold().FontSize(7.5f).FontColor(Ink).AlignCenter();

                int totalReserved = row.GeneralReserved + row.RuralReserved + row.KannadaMediumReserved;
                int totalFilled = row.GeneralFilled + row.RuralFilled + row.KannadaMediumFilled;
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text($"{totalFilled} / {totalReserved}").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
            }

            int tg = _data.PgCategoryBreakdown.Sum(r => r.GeneralReserved);
            int tgf = _data.PgCategoryBreakdown.Sum(r => r.GeneralFilled);
            int trc = _data.PgCategoryBreakdown.Sum(r => r.RuralReserved);
            int trcf = _data.PgCategoryBreakdown.Sum(r => r.RuralFilled);
            int tkm = _data.PgCategoryBreakdown.Sum(r => r.KannadaMediumReserved);
            int tkmf = _data.PgCategoryBreakdown.Sum(r => r.KannadaMediumFilled);

            table.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).Text("TOTAL").Bold().FontSize(7.5f).FontColor(Ink);
            table.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().Text($"{tgf} / {tg}").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
            table.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().Text($"{trcf} / {trc}").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
            table.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink).BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().Text($"{tkmf} / {tkm}").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
            table.Cell().Background(HeaderBg).BorderTop(1f).BorderColor(Ink)
                .Padding(4).AlignCenter().Text($"{tgf + trcf + tkmf} / {tg + trc + tkm}").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
        });
    }

    private void RenderPgKkAllotments(ColumnDescriptor col)
    {
        if (_data.PgKkAllotments == null || !_data.PgKkAllotments.Any()) return;

        col.Item().PaddingBottom(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(2.2f);
                c.RelativeColumn(1f);
                c.RelativeColumn(1f);
                c.RelativeColumn(4f);
            });

            void CH(string txt, bool last = false)
            {
                table.Cell().Background(BlueColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                    .Padding(4).AlignCenter()
                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
            }
            CH("KK Group"); CH("Reserved"); CH("Filled"); CH("Allotted Students (App No. — Name — Merit%)", last: true);

            int sl = 0;
            foreach (var row in _data.PgKkAllotments)
            {
                bool alt = sl++ % 2 == 0;
                string bg = alt ? "#F0F4FF" : "#FFFFFF";
                bool frozen = row.FilledSeats < row.ReservedSeats;

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).Text(row.GroupName).Bold().FontSize(7.5f).FontColor(Ink);
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text(row.ReservedSeats.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text(row.FilledSeats.ToString()).Bold().FontSize(7.5f)
                    .FontColor(frozen ? AmberColor : GreenColor).AlignCenter();

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                    .Padding(4).Column(c =>
                    {
                        if (row.AllottedStudents.Any())
                            foreach (var s in row.AllottedStudents)
                                c.Item().Text($"{s.AppNo} — {s.Name} — {s.MeritScore:F2}%").FontSize(6.8f).FontColor(Ink);
                        else
                            c.Item().Text("No eligible applicant — seat frozen").FontSize(6.8f).FontColor(Muted);
                    });
            }
        });
    }

    private void RenderPgPwdAllotment(ColumnDescriptor col)
    {
        var row = _data.PgPwdAllotment;
        if (row == null) return;

        col.Item().PaddingBottom(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(1f);
                c.RelativeColumn(1f);
                c.RelativeColumn(5f);
            });

            void CH(string txt, bool last = false)
            {
                table.Cell().Background(BlueColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                    .Padding(4).AlignCenter()
                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
            }
            CH("Reserved"); CH("Filled"); CH("Allotted Students (App No. — Name — Merit%)", last: true);

            bool frozen = row.FilledSeats < row.ReservedSeats;

            table.Cell().Background("#FFFFFF").BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().Text(row.ReservedSeats.ToString()).FontSize(7f).FontColor(Ink).AlignCenter();
            table.Cell().Background("#FFFFFF").BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().Text(row.FilledSeats.ToString()).Bold().FontSize(7.5f)
                .FontColor(frozen ? AmberColor : GreenColor).AlignCenter();
            table.Cell().Background("#FFFFFF").BorderBottom(0.5f).BorderColor(BorderCol)
                .Padding(4).Column(c =>
                {
                    if (row.AllottedStudents.Any())
                        foreach (var s in row.AllottedStudents)
                            c.Item().Text($"{s.AppNo} — {s.Name} — {s.MeritScore:F2}%").FontSize(6.8f).FontColor(Ink);
                    else
                        c.Item().Text("No eligible applicant — seat frozen").FontSize(6.8f).FontColor(Muted);
                });
        });
    }

    private void RenderPgCutoffTable(ColumnDescriptor col)
    {
        if (_data.PgCutoffs == null || !_data.PgCutoffs.Any()) return;

        col.Item().PaddingBottom(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(1.6f);
                c.RelativeColumn(1f);
                c.RelativeColumn(1.2f);
                c.RelativeColumn(1.4f);
            });

            void CH(string txt, bool last = false)
            {
                table.Cell().Background(BlueColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                    .Padding(4).AlignCenter()
                    .Text(txt).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
            }
            CH("Category"); CH("Filled"); CH("Highest"); CH("Cutoff Score", last: true);

            int sl = 0;
            foreach (var row in _data.PgCutoffs)
            {
                bool alt = sl++ % 2 == 0;
                string bg = alt ? "#FFF8F8" : "#FFFFFF";

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).Text(row.Category).Bold().FontSize(7.5f).FontColor(GetCategoryColor(row.Category));
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text(row.FilledSeats.ToString()).Bold().FontSize(7.5f).FontColor(GreenColor).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text($"{row.HighestScore:F2}%").FontSize(7f).FontColor(Ink).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().Text($"{row.CutoffScore:F2}%").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();
            }
        });
    }

    private void RenderPgCategoryWiseStudentLists(ColumnDescriptor col)
    {
        var categoryDisplayOrder = new[] { "GM", "SC", "ST", "Cat-I", "IIA", "IIB", "IIIA", "IIIB" };

        foreach (var cat in categoryDisplayOrder)
        {
            // Every applicant recorded under this category — selected AND
            // waitlisted — so the section total matches the applicant count.
            var studentsInCategory = _data.Rows
                .Where(r => NormalizeCategory(r.Category) == NormalizeCategory(cat))
                .OrderBy(r => r.Rank)
                .ToList();

            if (!studentsInCategory.Any()) continue;

            int allottedCount = studentsInCategory.Count(r => r.AllocationStatus == AllocationStatus.Selected);

            col.Item().PaddingTop(10).Row(r =>
            {
                r.RelativeItem().Text($"Category: {cat}").Bold().FontSize(9f).FontColor(GetCategoryColor(cat));
                r.AutoItem().Text($"  ({allottedCount} allotted / {studentsInCategory.Count} total)").FontSize(8f).FontColor(Muted);
            });
            col.Item().PaddingBottom(4).Height(1f).Background(GetCategoryColor(cat));

            col.Item().PaddingBottom(10).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.ConstantColumn(18);
                    c.ConstantColumn(36);
                    c.ConstantColumn(76);
                    c.RelativeColumn(2.4f);
                    c.RelativeColumn(1.9f);
                    c.ConstantColumn(40);
                });

                void CH(string txt, bool last = false)
                {
                    table.Cell().Background(BlueColor)
                        .BorderRight(last ? 0f : 0.5f).BorderColor("#112244")
                        .Padding(3).AlignCenter()
                        .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
                }
                CH("Sl."); CH("Rank"); CH("App No"); CH("Name"); CH("Allotted Under"); CH("Merit%", last: true);

                int sl = 1;
                foreach (var s in studentsInCategory)
                {
                    bool alt = sl % 2 == 0;
                    string bg = alt ? "#FFF8F8" : "#FFFFFF";

                    bool isSelected = s.AllocationStatus == AllocationStatus.Selected;
                    string allottedUnder = isSelected ? (s.AllocatedCategory ?? "—") : "Not Allotted";
                    string allottedColor = isSelected ? Muted : AmberColor;

                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).AlignCenter().Text(sl.ToString()).FontSize(6.5f).FontColor(Ink).AlignCenter();
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).AlignCenter().Text(s.Rank.ToString()).Bold().FontSize(7f).FontColor(RuleColor).AlignCenter();
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).AlignCenter().Text(s.AppNo).FontSize(6f).FontColor(Ink).AlignCenter();
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).Text(s.Name).Bold().FontSize(6.8f).FontColor(Ink);
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(3).Text(allottedUnder).FontSize(6.3f).FontColor(allottedColor);
                    table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                        .Padding(3).AlignCenter().Text($"{s.MeritScore:F2}%").Bold().FontSize(6.8f).FontColor(RuleColor).AlignCenter();

                    sl++;
                }
            });
        }
    }

    private void RenderWaitlistedList(ColumnDescriptor col, List<MeritListReportRow> waitlisted)
    {
        col.Item().PaddingBottom(10).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.ConstantColumn(18);   // Sl.
                c.ConstantColumn(36);   // Rank
                c.ConstantColumn(76);   // App No
                c.RelativeColumn(2.4f); // Name
                c.RelativeColumn(1f);   // Category
                c.ConstantColumn(40);   // Merit Score
                c.RelativeColumn(2.6f); // Remark
            });

            void CH(string txt, bool last = false)
            {
                table.Cell().Background(AmberColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#5C3A00")
                    .Padding(3).AlignCenter()
                    .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
            }
            CH("Sl."); CH("Rank"); CH("App No"); CH("Name"); CH("Category"); CH("Merit%"); CH("Remark", last: true);

            int sl = 1;
            foreach (var s in waitlisted)
            {
                bool alt = sl % 2 == 0;
                string bg = alt ? "#FFF8F0" : "#FFFFFF";

                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(3).AlignCenter().Text(sl.ToString()).FontSize(6.5f).FontColor(Ink).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(3).AlignCenter().Text(s.Rank.ToString()).Bold().FontSize(7f).FontColor(RuleColor).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(3).AlignCenter().Text(s.AppNo).FontSize(6f).FontColor(Ink).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(3).Text(s.Name).Bold().FontSize(6.8f).FontColor(Ink);
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(3).AlignCenter().Text(s.Category ?? "—").Bold().FontSize(6.8f)
                    .FontColor(GetCategoryColor(s.Category)).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(3).AlignCenter().Text($"{s.MeritScore:F2}%").Bold().FontSize(6.8f).FontColor(RuleColor).AlignCenter();
                table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(BorderCol)
                    .Padding(3).Text(string.IsNullOrWhiteSpace(s.Remark) ? "—" : s.Remark).FontSize(6.3f).FontColor(AmberColor);

                sl++;
            }
        });
    }
    private void RenderMeritTable(ColumnDescriptor col, List<MeritListReportRow> rows, bool showAllocationStatus)
    {
        col.Item().PaddingBottom(8).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.ConstantColumn(26);   // Rank
                c.ConstantColumn(44);   // App No
                c.RelativeColumn(3);    // Name / Father
                c.ConstantColumn(56);   // Phone
                c.RelativeColumn(1.2f); // Category
                c.ConstantColumn(24);   // Type KA/HK/NK
                if (_data.IsPgCourse) c.ConstantColumn(34); // Preference
                c.RelativeColumn(1.8f); // Seat Types
                c.ConstantColumn(36);   // Marks %
                c.ConstantColumn(40);   // Merit Score
                if (showAllocationStatus) c.ConstantColumn(52);
                if (showAllocationStatus) c.RelativeColumn(1.6f);
            });

            void TH(string txt, bool last = false)
            {
                table.Cell().Background(RuleColor)
                    .BorderRight(last ? 0f : 0.5f).BorderColor("#660000")
                    .Padding(4).AlignCenter()
                    .Text(txt).Bold().FontSize(6.5f).FontColor("#FFFFFF").AlignCenter();
            }
            string marksColumnLabel = _data.IsCertificateCourse ? "Diploma/12th %" : "Marks %";
            TH("Rank"); TH("App No"); TH("Name / Father"); TH("Phone"); TH("Category");
            TH("Type");
            if (_data.IsPgCourse) TH("Pref.");
            TH("Seat Types"); TH(marksColumnLabel);
            TH("Merit Score / %");
            if (showAllocationStatus) TH("Verification Status");
            if (showAllocationStatus) TH("Allocation Remarks", last: true);

            foreach (var r in rows)
            {
                bool alt = r.Rank % 2 == 0;
                string rowBg = alt ? "#FFF8F8" : "#FFFFFF";

                table.Cell().Background(RankBadgeColor(r.Rank))
                .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                .Padding(4).AlignCenter().AlignMiddle()
                .Text(r.Rank.ToString()).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();

                table.Cell().Background(rowBg)
                    .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().AlignMiddle()
                    .Text(r.AppNo ?? "—").FontSize(7f).FontColor(Ink).AlignCenter();

                table.Cell().Background(rowBg)
                    .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignMiddle()
                    .Column(c =>
                    {
                        c.Item().Text(r.Name ?? "—").Bold().FontSize(7.5f).FontColor(Ink);
                        if (!string.IsNullOrWhiteSpace(r.FatherName))
                            c.Item().Text(r.FatherName).FontSize(6.5f).FontColor(Muted);
                    });
                table.Cell().Background(rowBg)
                    .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().AlignMiddle()
                    .Text(string.IsNullOrWhiteSpace(r.Phone) ? "—" : r.Phone).FontSize(6.8f).FontColor(Ink).AlignCenter();

                table.Cell().Background(rowBg)
                    .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().AlignMiddle()
                    .Text(r.Category ?? "—").Bold().FontSize(7f)
                    .FontColor(GetCategoryColor(r.Category)).AlignCenter();

                var (stLabel, stColor) = StudentTypeInfo(r.StudentType);
                table.Cell().Background(stColor)
                    .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().AlignMiddle()
                    .Text(stLabel).Bold().FontSize(7f).FontColor("#FFFFFF").AlignCenter();
                if (_data.IsPgCourse)
                    table.Cell().Background(rowBg)
                        .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                        .Padding(4).AlignCenter().AlignMiddle()
                        .Text(r.Preference).Bold().FontSize(7f).FontColor(RuleColor).AlignCenter();

                table.Cell().Background(rowBg)
                    .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
                    .Padding(4).AlignMiddle()
                    .Text(r.SeatTypes?.Any() == true ? string.Join(", ", r.SeatTypes) : "—")
                    .FontSize(6.5f).FontColor(Muted);

                table.Cell().Background(rowBg)
    .BorderBottom(0.5f).BorderColor(BorderCol).BorderRight(0.5f).BorderColor(BorderCol)
    .Padding(4).AlignMiddle()
    .Column(c =>
    {
        c.Item().AlignCenter().Text($"{r.Percentage:F2}%").FontSize(7f).FontColor(Ink).AlignCenter();
        if (_data.IsCertificateCourse && !string.IsNullOrWhiteSpace(r.Qualification) && r.Qualification != "—")
            c.Item().AlignCenter().Text(r.Qualification).FontSize(5.5f).FontColor(Muted).AlignCenter();
    });


                table.Cell().Background(rowBg)
                    .BorderBottom(0.5f).BorderColor(BorderCol)
                    .BorderRight(showAllocationStatus ? 0.5f : 0f).BorderColor(BorderCol)
                    .Padding(4).AlignCenter().AlignMiddle()
                    .Text($"{r.MeritScore:F2}%").Bold().FontSize(7.5f).FontColor(RuleColor).AlignCenter();

                if (showAllocationStatus)
                    table.Cell().Background(rowBg)
                        .BorderBottom(0.5f).BorderColor(BorderCol)
                        .Padding(4).AlignCenter().AlignMiddle()
                        .Text(r.Status ?? "Pending")
                        .Bold().FontSize(7f)
                        .FontColor(StatusColor(r.Status)).AlignCenter();
                if (showAllocationStatus)
                    table.Cell().Background(rowBg)
                        .BorderBottom(0.5f).BorderColor(BorderCol)
                        .Padding(4).AlignMiddle()
                        .Text(string.IsNullOrWhiteSpace(r.Remark) ? "—" : r.Remark)
                        .FontSize(6.5f)
                        .FontColor(!string.IsNullOrWhiteSpace(r.Remark) ? AmberColor : Muted);
            }
        });
    }
}