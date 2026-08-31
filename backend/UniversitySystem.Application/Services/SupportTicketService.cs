using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UniversitySystem.Application.Dtos;
using UniversitySystem.Application.Interfaces;
using UniversitySystem.Domain.Entities;
using UniversitySystem.Domain.Interfaces;

namespace UniversitySystem.Application.Services
{
    public class SupportTicketService : ISupportTicketService
    {
        private readonly ISupportTicketRepository _ticketRepo;
        private readonly ISupportTicketMessageRepository _messageRepo;

        private const string StatusLookupType = "SupportStatus";
        private const string OpenStatusCode = "001";
        private const string InProgressStatusCode = "002";

        public SupportTicketService(
            ISupportTicketRepository ticketRepo,
            ISupportTicketMessageRepository messageRepo)
        {
            _ticketRepo = ticketRepo;
            _messageRepo = messageRepo;
        }

        public async Task<IEnumerable<SupportTicketDto>> GetAllAsync()
        {
            var tickets = await _ticketRepo.GetAllAsync();
            return tickets.Select(MapToDto);
        }

        public async Task<IEnumerable<SupportTicketDto>> GetByUsernameAsync(string username)
        {
            var tickets = await _ticketRepo.GetByUsernameAsync(username);
            return tickets.Select(MapToDto);
        }

        public async Task<SupportTicketDetailDto?> GetByIdAsync(Guid id)
        {
            var ticket = await _ticketRepo.GetByIdWithMessagesAsync(id);
            return ticket is null ? null : MapToDetailDto(ticket);
        }

        public async Task<SupportTicketDetailDto> CreateAsync(CreateSupportTicketDto dto)
        {
            var openStatusId = await _ticketRepo.GetLookupIdAsync(StatusLookupType, OpenStatusCode)
                ?? throw new InvalidOperationException("Open status lookup not configured.");

            var ticket = new SupportTicket
            {
                TicketNo = await GenerateNextTicketNoAsync(),
                Username = dto.Username,
                IssueId = dto.IssueId,
                StatusId = openStatusId,
                InsertBy = dto.Username,
            };

            await _ticketRepo.AddAsync(ticket);
            await _ticketRepo.SaveChangesAsync();

            var firstMessage = new SupportTicketMessage
            {
                TicketId = ticket.Id,
                SenderType = "student",
                SenderName = dto.Username,
                Message = dto.Description,
                InsertBy = dto.Username,
            };
            await _messageRepo.AddAsync(firstMessage);
            await _messageRepo.SaveChangesAsync();

            var created = await _ticketRepo.GetByIdWithMessagesAsync(ticket.Id);
            return MapToDetailDto(created!);
        }

        public async Task<SupportTicketDetailDto?> UpdateStatusAsync(Guid id, UpdateSupportTicketStatusDto dto, string performedBy)
        {
            var ticket = await _ticketRepo.GetByIdAsync(id);
            if (ticket is null) return null;

            ticket.StatusId = dto.StatusId;
            if (!string.IsNullOrWhiteSpace(dto.SolvedBy))
                ticket.SolvedBy = dto.SolvedBy;
            ticket.UpdateBy = !string.IsNullOrWhiteSpace(dto.UpdateBy) ? dto.UpdateBy : performedBy;
            ticket.UpdateOn = DateTime.UtcNow;

            _ticketRepo.Update(ticket);
            await _ticketRepo.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(dto.Solution))
            {
                var reply = new SupportTicketMessage
                {
                    TicketId = ticket.Id,
                    SenderType = "admin",
                    SenderName = dto.SolvedBy ?? performedBy,
                    Message = dto.Solution,
                    InsertBy = !string.IsNullOrWhiteSpace(dto.UpdateBy) ? dto.UpdateBy : performedBy,
                };
                await _messageRepo.AddAsync(reply);
                await _messageRepo.SaveChangesAsync();
            }

            var updated = await _ticketRepo.GetByIdWithMessagesAsync(id);
            return MapToDetailDto(updated!);
        }

        public async Task<SupportTicketMessageDto?> AddMessageAsync(CreateSupportTicketMessageDto dto, string performedBy)
        {
            var ticket = await _ticketRepo.GetByIdAsync(dto.TicketId);
            if (ticket is null) return null;

            var message = new SupportTicketMessage
            {
                TicketId = dto.TicketId,
                SenderType = dto.SenderType,
                SenderName = dto.SenderName,
                Message = dto.Message,
                InsertBy = !string.IsNullOrWhiteSpace(dto.InsertBy) ? dto.InsertBy : performedBy,
            };

            await _messageRepo.AddAsync(message);
            await _messageRepo.SaveChangesAsync();

            return new SupportTicketMessageDto
            {
                Id = message.Id,
                TicketId = message.TicketId,
                SenderType = message.SenderType,
                SenderName = message.SenderName,
                Message = message.Message,
                InsertOn = message.InsertOn,
                UpdateOn = message.UpdateOn,
                UpdatedBy = message.UpdateBy,
            };
        }

        public async Task<SupportTicketMessageDto?> UpdateMessageAsync(Guid messageId, UpdateSupportTicketMessageDto dto, string performedBy)
        {
            var message = await _messageRepo.GetByIdAsync(messageId);
            if (message is null) return null;

            message.Message = dto.Message;
            message.UpdateBy = !string.IsNullOrWhiteSpace(dto.UpdatedBy) ? dto.UpdatedBy : performedBy;
            message.UpdateOn = DateTime.UtcNow;

            _messageRepo.Update(message);
            await _messageRepo.SaveChangesAsync();

            return new SupportTicketMessageDto
            {
                Id = message.Id,
                TicketId = message.TicketId,
                SenderType = message.SenderType,
                SenderName = message.SenderName,
                Message = message.Message,
                InsertOn = message.InsertOn,
                UpdateOn = message.UpdateOn,
                UpdatedBy = message.UpdateBy,
            };
        }

        private async Task<string> GenerateNextTicketNoAsync()
        {
            const string prefix = "SUP";
            const string orgCode = "MGRDPR";
            var today = DateTime.UtcNow.ToString("yyyyMMdd");

            var lastTicketNo = await _ticketRepo.GetLastTicketNoAsync(today, orgCode);

            int nextSequence = 1;

            if (!string.IsNullOrWhiteSpace(lastTicketNo))
            {
                var sequencePart = lastTicketNo.Split('-').Last();

                if (int.TryParse(sequencePart, out int lastSequence))
                    nextSequence = lastSequence + 1;
            }

            return $"{prefix}-{today}-{orgCode}-{nextSequence:D6}";
        }

        private static SupportTicketDto MapToDto(SupportTicket t) => new()
        {
            Id = t.Id,
            TicketNo = t.TicketNo,
            Username = t.Username,
            IssueId = t.IssueId,
            IssueName = t.Issue?.Name,
            StatusId = t.StatusId,
            StatusName = t.StatusLookup?.Name,
            SolvedBy = t.SolvedBy,
            InsertOn = t.InsertOn,
            UpdateOn = t.UpdateOn,
        };

        private static SupportTicketDetailDto MapToDetailDto(SupportTicket t)
        {
            var dto = new SupportTicketDetailDto
            {
                Id = t.Id,
                TicketNo = t.TicketNo,
                Username = t.Username,
                IssueId = t.IssueId,
                IssueName = t.Issue?.Name,
                StatusId = t.StatusId,
                StatusName = t.StatusLookup?.Name,
                SolvedBy = t.SolvedBy,
                InsertOn = t.InsertOn,
                UpdateOn = t.UpdateOn,
            };
            dto.Messages = t.Messages.Select(m => new SupportTicketMessageDto
            {
                Id = m.Id,
                TicketId = m.TicketId,
                SenderType = m.SenderType,
                SenderName = m.SenderName,
                Message = m.Message,
                InsertOn = m.InsertOn,
                UpdateOn = m.UpdateOn,
                UpdatedBy = m.UpdateBy,
            }).ToList();
            return dto;
        }
    }
}