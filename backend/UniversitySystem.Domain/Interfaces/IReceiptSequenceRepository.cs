using System;
using System.Threading.Tasks;

public interface IReceiptSequenceRepository
{
    Task<ReceiptSequence?> GetByYearAsync(string year);
    Task<ReceiptSequence> CreateAsync(ReceiptSequence entity);
    Task UpdateAsync(ReceiptSequence entity);
}