namespace UniversitySystem.Application.DTOs.FeeCollectionManualDtos;

public class FeeCollectionManualDetailDto
{
    public Guid Id { get; set; }

    public string ParticularName { get; set; } = string.Empty;

    public decimal ParticularAmt { get; set; }
}