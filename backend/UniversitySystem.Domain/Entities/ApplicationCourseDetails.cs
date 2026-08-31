using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("application_course_details", Schema = "admission")]
public class ApplicationCourseDetail : AuditBase
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("application_id")]
    public Guid ApplicationId { get; set; }

    [Column("application_no")]
    public string? ApplicationNo { get; set; }

    [Column("hostel_facility_yn")]
    public bool? HostelFacilityYn { get; set; }

    [Column("transport_facility_yn")]
    public bool? TransportFacilityYn { get; set; }

    // Changed from non-nullable Guid — the column itself allows NULL now.
    // A bare Guid can't represent "no degree selected yet" without silently
    // defaulting to 00000000-... ; Guid? is the only type that matches the
    // schema honestly.
    [Column("degree_id")]
    public Guid? DegreeId { get; set; }

    [Column("course_id")]
    public Guid? CourseId { get; set; }

    [Column("previous_registration_no")]
    public string? PreviousRegistrationNo { get; set; }

    [Column("batch_id")]
    public Guid? BatchId { get; set; }

    [Column("cc_batch_type_id")]
    public Guid? BatchTypeId { get; set; }

    [Column("inservice_yn")]
    public bool? InserviceYn { get; set; }

    [Column("department")]
    public string? Department { get; set; }

    [Column("designation")]
    public string? Designation { get; set; }

    [Column("office_address")]
    public string? OfficeAddress { get; set; }

    [Column("date_of_join")]
    public DateOnly? DateOfJoin { get; set; }

    [Column("service_years")]
    public int? ServiceYears { get; set; }

    [Column("preference")]
    public string? Preference { get; set; }

    [Column("accepted_yn")]
    public bool? AcceptedYn { get; set; }
}