using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos.Application
{
    public class DocumentCoordinatorDto
    {
        public Guid Id { get; set; }

        public Guid LoginId { get; set; }

        public Guid? DegreeTypeId { get; set; }

        public Guid DegreeId { get; set; }

        public Guid CourseId { get; set; }

        public string? CoordinatorName { get; set; }

        public string? Username { get; set; }

        public string? DegreeName { get; set; }

        public string? CourseName { get; set; }

        public bool Status { get; set; }
    }
}
