using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UniversitySystem.Application.Dtos
{
    public class CreateDocumentCoordinatorDto
    {
        [Required]
        public Guid LoginId { get; set; }

        public Guid? DegreeTypeId { get; set; }

        [Required]
        public Guid DegreeId { get; set; }

        [Required]
        public Guid CourseId { get; set; }
    }
}
