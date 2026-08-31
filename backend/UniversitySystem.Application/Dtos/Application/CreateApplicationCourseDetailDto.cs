using System;
using System.Collections.Generic;

public class CreateApplicationCourseDetailDto
{
    public Guid ApplicationId { get; set; }
    public string? ApplicationNo { get; set; }
    public bool? HostelFacilityYn { get; set; }
    public bool? TransportFacilityYn { get; set; }
    public Guid DegreeId { get; set; }
    public Guid CourseId { get; set; }
    public string? PreviousRegistrationNo { get; set; }
    public Guid? BatchId { get; set; }
    public Guid? BatchTypeId { get; set; }

    // ── In-service candidate details — all optional ──
    public bool? InserviceYn { get; set; }
    public string? Department { get; set; }
    public string? Designation { get; set; }
    public string? OfficeAddress { get; set; }
    public DateOnly? DateOfJoin { get; set; }
    public int? ServiceYears { get; set; }
    public string? Preference { get; set; }
}

public class CourseDegreePair
{
    public Guid DegreeId { get; set; }
    public Guid CourseId { get; set; }
    public string? Preference { get; set; }
}

public class CreateBulkApplicationCourseDetailDto
{
    public Guid ApplicationId { get; set; }
    public string? ApplicationNo { get; set; }
    public bool? HostelFacilityYn { get; set; }
    public bool? TransportFacilityYn { get; set; }
    public string? PreviousRegistrationNo { get; set; }
    public Guid? BatchId { get; set; }
    public Guid? BatchTypeId { get; set; }
    public List<CourseDegreePair> Selections { get; set; } = new();

    public bool? InserviceYn { get; set; }
    public string? Department { get; set; }
    public string? Designation { get; set; }
    public string? OfficeAddress { get; set; }
    public DateOnly? DateOfJoin { get; set; }
    public int? ServiceYears { get; set; }
    public string? Preference { get; set; }
    public bool? AcceptedYn { get; set; }
}