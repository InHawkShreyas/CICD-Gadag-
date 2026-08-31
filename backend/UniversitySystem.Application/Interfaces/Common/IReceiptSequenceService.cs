public interface IReceiptSequenceService
{
    Task<string> GenerateReceiptNumberAsync();
}