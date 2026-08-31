using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FeeCollectionController : ControllerBase
{
    private readonly IFeeCollectionService _service;

    public FeeCollectionController(IFeeCollectionService service)
    {
        _service = service;
    }

    // ✅ STEP 1 — CREATE (Before payment)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFeeCollectionDto dto)
    {
        try
        {
            var result = await _service.CreateAsync(dto);

            return Ok(new
            {
                id = result.Id,
                applicationId = result.ApplicationId,
                applicationNo = result.ApplicationNo,
                name = result.Name,
                amount = result.Amount,
                platformCharges = result.PlatformCharges,
                receiptNumber = result.ReceiptNumber,
                status = result.Status
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ✅ STEP 2 — UPDATE AFTER PAYMENT
    [HttpPut("payment")]
    public async Task<IActionResult> UpdatePayment([FromBody] UpdatePaymentDto dto)
    {
        try
        {
            var result = await _service.UpdatePaymentAsync(dto);

            if (!result)
                return NotFound(new { message = "Record not found" });

            return Ok(new { success = true, message = "Payment updated successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ✅ GET BY ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var data = await _service.GetByIdAsync(id);

        if (data == null)
            return NotFound(new { message = "Record not found" });

        return Ok(data);
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _service.GetAllAsync();
        return Ok(data);
    }

    // ✅ GET BY APPLICATION ID
    [HttpGet("application/{applicationId}")]
    public async Task<IActionResult> GetByApplicationId(Guid applicationId)
    {
        var data = await _service.GetByApplicationIdAsync(applicationId);
        return Ok(data);
    }

    // ✅ GET BY RECEIPT + USER (student)
    [AllowAnonymous]
    [HttpGet("receipt/{receiptNumber}")]
    public async Task<IActionResult> GetByReceipt(string receiptNumber)
    {
        var username = User?.FindFirstValue("username");

        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        var data = await _service.GetByReceiptAndUserAsync(receiptNumber, username);

        if (data == null)
            return NotFound(new { message = "Record not found" });

        return Ok(data);
    }

    // ✅ GET BY RECEIPT (admin — no username filter)
    [HttpGet("admin/receipt/{receiptNumber}")]
    public async Task<IActionResult> GetByReceiptAdmin(string receiptNumber)
    {
        var data = await _service.GetByReceiptNumberAsync(receiptNumber);

        if (data == null)
            return NotFound(new { message = "Receipt not found" });

        return Ok(data);
    }
    // ✅ UPDATE REFUND
[HttpPut("refund")]
public async Task<IActionResult> UpdateRefund(
    [FromBody] RefundPaymentDto dto)
{
    try
    {
        var result =
            await _service.UpdateRefundAsync(dto);

        if (!result)
            return NotFound(new
            {
                message = "Record not found"
            });

        return Ok(new
        {
            success = true,
            message = "Refund updated successfully"
        });
    }
    catch (Exception ex)
    {
        return BadRequest(new
        {
            message = ex.Message
        });
    }
}
    [HttpGet("paged")]
    public async Task<ActionResult<PagedFeeCollectionResult>> GetPaged(
    [FromQuery] string? search,
    [FromQuery] List<string>? feeType,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 10)
    {
        var result = await _service.GetPagedAsync(search, feeType, page, pageSize);
        return Ok(result);
    }

    [HttpGet("fee-types")]
    public async Task<ActionResult<List<string>>> GetFeeTypes()
    {
        var types = await _service.GetFeeTypesAsync();
        return Ok(types);
    }
}