public interface IPhonePeService
{
    Task<string> GetAccessTokenAsync();
    Task<PhonePeCreateResponse> CreatePaymentAsync(PhonePeCreateRequest req);
    Task<PhonePeVerifyResponse> VerifyPaymentAsync(string merchantTransactionId);
    Task StartOrderPolling(string merchantOrderId);
}