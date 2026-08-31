using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReceiptSequenceController : ControllerBase
{
    private readonly IReceiptSequenceService _service;

    public ReceiptSequenceController(IReceiptSequenceService service)
    {
        _service = service;
    }

    // ✅ Generate Receipt Number
    [HttpGet("generate")]
    public async Task<IActionResult> Generate()
    {
        var receiptNo = await _service.GenerateReceiptNumberAsync();

        return Ok(new
        {
            receiptNo
        });
    }
}