using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace UniversitySystem.Application.Dtos.Application
{
    public class DocumentVerificationDto
    {
        public Guid Id { get; set; }
        public string AppNo { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? PermanentAddress { get; set; }
        public Guid? CategoryId { get; set; }
        public Guid? AcademicYearId { get; set; }
        public Guid? DegreeId { get; set; }
        public Guid? CourseId { get; set; }
        public Guid? BatchId { get; set; }
        public string? PreviousRegistrationNo { get; set; }
        public Guid? VerificationId { get; set; }
        public string? VerificationStatus { get; set; }
        public string? VerificationRemark { get; set; }
        public int? Installment { get; set; }
        public bool? FeesEnabled { get; set; }
        public bool? PostPaymentEdit { get; set; }
        public string? VerificationInsertBy { get; set; }
        public string? VerificationUpdateBy { get; set; }
        public int PreferenceCount { get; set; } = 1;
        public bool IsAppFeePaid { get; set; }
        public bool IsAdmissionFeePaid { get; set; }
    }
}