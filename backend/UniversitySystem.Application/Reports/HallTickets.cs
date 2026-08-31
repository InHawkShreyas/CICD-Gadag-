using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public class HallTicketData
{
    public string RegistrationNumber { get; set; } = "";
    public string CandidateName { get; set; } = "";
    public string Semester { get; set; } = "";
    public string Examination { get; set; } = "UG Examination, March/April - 2026";
    public string Venue { get; set; } =
        "School Building – I, Grama Gangothri Campus\nMGRDPR University, Nagavi, Gadag – 582103";
    public string CourseName { get; set; } = "";

    public string AcademicYear { get; set; } = "";
    public string DegreeName { get; set; } = "";
    public byte[]? LogoBytes { get; set; }
    public byte[]? PhotoBytes { get; set; }
    public byte[]? RegistrarSignatureBytes { get; set; }
    public List<HallTicketSubjectRow> Subjects { get; set; } = new();
}

public class HallTicketSubjectRow
{
    public string ExamDate { get; set; } = "11-06-2026";
    public string Day { get; set; } = "Thursday";
    public string Time { get; set; } = "";
    public string PaperCode { get; set; } = "";
    public string PaperTitle { get; set; } = "";
}

public class HallTicketReport : IDocument
{
    private readonly HallTicketData _d;

    private const string Black = "#000000";
    private const string White = "#FFFFFF";
    private const string DarkGray = "#333333";
    private const string MidGray = "#666666";
    private const string LightGray = "#AAAAAA";

    private const float LogoSize = 72f;

    public HallTicketReport(HallTicketData data) => _d = data;
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        // ================= PAGE 1: HALL TICKET =================
        container.Page(page =>
        {
            page.Size(PageSizes.A4.Landscape());
            page.MarginHorizontal(32);
            page.MarginTop(24);
            page.MarginBottom(24);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(9).FontColor(Black));

            page.Content()
                .Border(1.5f).BorderColor(Black)
                .Padding(16)
                .Column(col =>
                {
                    col.Item().Row(hdr =>
                    {
                        var logoCell = hdr.ConstantItem(LogoSize).Height(LogoSize).AlignMiddle().AlignCenter();
                        if (_d.LogoBytes?.Length > 0)
                            logoCell.Image(_d.LogoBytes).FitArea();

                        hdr.RelativeItem().AlignMiddle().AlignCenter().Column(c =>
                        {
                            c.Item()
                             .Text("MAHATMA GANDHI RURAL DEVELOPMENT AND PANCHAYAT RAJ UNIVERSITY, GADAG")
                             .Bold().FontSize(11.5f).AlignCenter();

                            c.Item().PaddingTop(8)
                             .Text($"EXAMINATION ADMIT CARD - {_d.AcademicYear}")
                             .Bold()
                             .FontSize(9f)
                             .AlignCenter();
                        });

                        hdr.ConstantItem(LogoSize);
                    });

                    col.Item().PaddingTop(8).Height(2f).Background(Black);
                    col.Item().PaddingTop(3).Height(0.5f).Background(Black);
                    col.Item().PaddingBottom(12);

                    col.Item().Row(body =>
                    {
                        body.RelativeItem().Column(info =>
                        {
                            void InfoLine(string label, string value, bool multiLine = false)
                            {
                                info.Item().PaddingBottom(5).Row(r =>
                                {
                                    r.ConstantItem(170).Text(label).Bold().FontSize(9f);
                                    r.ConstantItem(14).AlignCenter().Text(":").Bold().FontSize(9f);
                                    if (multiLine)
                                    {
                                        r.RelativeItem().Column(v =>
                                        {
                                            foreach (var line in value.Split('\n'))
                                                v.Item().Text(line).FontSize(9f);
                                        });
                                    }
                                    else
                                    {
                                        r.RelativeItem().Text(value).FontSize(9f);
                                    }
                                });
                            }

                            InfoLine("Registration No.", _d.RegistrationNumber);
                            InfoLine("Name of the Candidate", _d.CandidateName);
                            bool isCertificateCourse = _d.DegreeName?.Contains("Certificate", StringComparison.OrdinalIgnoreCase) == true;
                            InfoLine(isCertificateCourse ? "Program" : "Degree", _d.DegreeName);
                            InfoLine("Course", _d.CourseName);
                            InfoLine("Semester", _d.Semester);
                            InfoLine("Examination", _d.Examination);
                            InfoLine("Venue", _d.Venue, multiLine: true);
                        });

                        body.ConstantItem(105).Height(125)
                            .Border(1f).BorderColor(Black)
                            .AlignCenter().AlignMiddle()
                            .Column(ph =>
                            {
                                if (_d.PhotoBytes?.Length > 0)
                                    ph.Item().Image(_d.PhotoBytes).FitArea();
                                else
                                    ph.Item().AlignCenter().AlignMiddle()
                                      .PaddingTop(40)
                                      .Text("Affix Photo")
                                      .FontSize(7.5f).FontColor(MidGray).Italic().AlignCenter();
                            });
                    });

                    col.Item().PaddingTop(12);

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(1.6f);   // Date & Day
                            c.RelativeColumn(2.0f);   // Time
                            c.RelativeColumn(1.1f);   // Paper Code
                            c.RelativeColumn(4.2f);   // Paper Title
                            c.RelativeColumn(1.8f);   // Invigilator's Signature
                        });

                        void CH(string txt)
                        {
                            table.Cell()
                                 .Border(0.5f).BorderColor(Black)
                                 .Padding(5)
                                 .AlignCenter()
                                 .AlignMiddle()
                                 .Text(txt)
                                 .Bold()
                                 .FontSize(8.5f)
                                 .FontColor(Black)
                                 .AlignCenter();
                        }

                        CH("Date and Day");
                        CH("Time");
                        CH("Paper Code");
                        CH("Paper Title");
                        CH("Invigilator's\nSignature");

                        foreach (var s in _d.Subjects)
                        {
                            table.Cell()
                                 .Border(0.5f).BorderColor(DarkGray)
                                 .Padding(4).AlignCenter().AlignMiddle()
                                 .Column(dc =>
                                 {
                                     dc.Item().Text(s.ExamDate).FontSize(8f).AlignCenter();
                                     dc.Item().Text(s.Day).FontSize(7.5f).FontColor(MidGray).AlignCenter();
                                 });

                            void DC(string txt, bool leftAlign = false)
                            {
                                var cell = table.Cell()
                                    .Border(0.5f).BorderColor(DarkGray)
                                    .Padding(4).AlignMiddle();

                                if (leftAlign) cell.Text(txt).FontSize(8f);
                                else cell.AlignCenter().Text(txt).FontSize(8f).AlignCenter();
                            }

                            DC(s.Time);
                            DC(s.PaperCode);
                            DC(s.PaperTitle, leftAlign: true);

                            table.Cell()
                                 .Border(0.5f).BorderColor(DarkGray)
                                 .Height(28).Padding(4);
                        }
                    });

                    col.Item().PaddingTop(50).Row(sig =>
                    {
                        sig.RelativeItem().Column(c =>
                        {
                            c.Item().Width(160).Height(0.5f).Background(Black);
                            c.Item().PaddingTop(4)
                             .Text("SIGNATURE OF THE CANDIDATE")
                             .Bold().FontSize(9f);
                        });

                        sig.RelativeItem().AlignRight().Column(c =>
                        {
                            c.Item().AlignRight().Width(120).Height(0.5f).Background(Black);
                            c.Item().PaddingTop(4).AlignRight()
                             .Text("Principal (Signature with seal)")
                             .Bold().FontSize(9f);
                        });
                    });
                });

            page.Footer().Column(foot =>
            {
                foot.Item().Height(0.5f).Background(Black);
                foot.Item().PaddingTop(2).Height(1.5f).Background(Black);
                foot.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem()
                       .Text($"Hall Ticket – {_d.Examination}")
                       .FontSize(7f).FontColor(MidGray);

                    row.RelativeItem().AlignCenter().Text(text =>
                    {
                        text.Span("Page ").FontSize(7f).FontColor(MidGray);
                        text.CurrentPageNumber().FontSize(7f).Bold().FontColor(Black);
                        text.Span(" of ").FontSize(7f).FontColor(MidGray);
                        text.TotalPages().FontSize(7f).Bold().FontColor(Black);
                    });

                    row.RelativeItem().AlignRight()
                       .Text($"Generated: {DateTime.Now:dd/MM/yyyy HH:mm}")
                       .FontSize(7f).FontColor(MidGray);
                });
            });
        });

        // ================= PAGE 2: INSTRUCTION TO CANDIDATES =================
        container.Page(page =>
        {
            page.Size(PageSizes.A4.Landscape());
            page.MarginHorizontal(32);
            page.MarginTop(24);
            page.MarginBottom(24);
            page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(9).FontColor(Black));

            page.Content()
                .Border(1.5f).BorderColor(Black)
                .Padding(16)
                .Column(inst =>
                {
                    inst.Item().PaddingBottom(12).AlignCenter()
                        .Text("INSTRUCTION TO CANDIDATES")
                        .Bold().FontSize(12f).Underline();

                    void Item(int no, Action<TextDescriptor> content)
                    {
                        inst.Item().PaddingBottom(8).Row(r =>
                        {
                            r.ConstantItem(22)
                             .Text($"{no}.")
                             .FontSize(9.5f);

                            r.RelativeItem().Text(content);
                        });
                    }

                    Item(1, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Candidates should sit in their places in the Examination Hall at least ");
                        t.Span("15 minutes before the time").Bold();
                        t.Span(" fixed for the commencement of Examination. A candidate coming half an hour late after appointed time shall not be admitted.");
                    });

                    Item(2, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Candidates shall not be allowed to leave the Examination Hall before half an hour after the starting of examination and also before half an hour prior to the completion of the Examination and a candidate who leaves the room during the period allotted for paper shall not be allowed to write the examination again.");
                    });

                    Item(3, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Candidates are prohibited from writing their names in any part of their Answer Book.");
                    });

                    Item(4, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Registration Number of the candidate must be written ");
                        t.Span("distinctly and correctly").Bold();
                        t.Span(" in the space provided for it on cover page and mark ");
                        t.Span("appropriate circle in OMR").Bold();
                        t.Span(". ");
                        t.Span("Failure to write & mark in OMR, the Registration Number as specified above, will involve in rejection of Answer Book including penalty").Bold().Italic();
                        t.Span(". ");
                        t.Span("Registration Number should not be written in any other part of Answer Book.").Bold();
                    });

                    Item(5, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Candidates should have with them on all days of Examination, their Admission Card for inspection by Room Superintendent.");
                    });

                    Item(6, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Candidates must read instructions printed on Answer Books carefully and follow them scrupulously.");
                    });

                    Item(7, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Candidates are required to write their answers either with ");
                        t.Span("Blue or Black").Bold();
                        t.Span(" Ball point pen or similar ink pen.");
                    });

                    Item(8, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Candidates will be provided only one Answer Book and no Additional Sheets will be provided.").Bold();
                    });

                    Item(9, t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(9.5f));
                        t.Span("Candidates are prohibited from bringing into Examination Hall, Pager, Mobile, Digital Diary, Electronic Organizer, any book or portion of books or notes, manuscript paper of any nature. Communicating with each other and communicating with any person outside Examination Hall is strictly prohibited. Any candidate violating the said rules shall be sent out of Examination Hall forthwith. Such candidates will not be permitted to take subsequent papers of the Examination and they are liable to be debarred from the Examination for a period prescribed under University Rules. Making special marks either in same ink or different ink in their answer booklet may amount to committing a malpractice.");
                    });

                    inst.Item().PaddingTop(40).AlignRight().Column(c =>
                    {
                        if (_d.RegistrarSignatureBytes?.Length > 0)
                        {
                            c.Item().AlignRight().Width(130).Height(45)
                             .Image(_d.RegistrarSignatureBytes).FitArea();
                        }

                        c.Item().AlignRight().Width(130).Height(0.5f).Background(Black);
                        c.Item().PaddingTop(4).AlignRight()
                         .Text("REGISTRAR")
                         .Bold().FontSize(9.5f);
                    });
                });

            page.Footer().Column(foot =>
            {
                foot.Item().Height(0.5f).Background(Black);
                foot.Item().PaddingTop(2).Height(1.5f).Background(Black);
                foot.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem()
                       .Text($"Hall Ticket – {_d.Examination}")
                       .FontSize(7f).FontColor(MidGray);

                    row.RelativeItem().AlignCenter().Text(text =>
                    {
                        text.Span("Page ").FontSize(7f).FontColor(MidGray);
                        text.CurrentPageNumber().FontSize(7f).Bold().FontColor(Black);
                        text.Span(" of ").FontSize(7f).FontColor(MidGray);
                        text.TotalPages().FontSize(7f).Bold().FontColor(Black);
                    });

                    row.RelativeItem().AlignRight()
                       .Text($"Generated: {DateTime.Now:dd/MM/yyyy HH:mm}")
                       .FontSize(7f).FontColor(MidGray);
                });
            });
        });
    }
}