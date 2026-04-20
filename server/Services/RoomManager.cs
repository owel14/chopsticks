using System.Collections.Concurrent;
using System.Security.Cryptography;
using ChopsticksServer.Models;

namespace ChopsticksServer.Services;

public class RoomManager
{
    private const int CodeLength = 6;
    private const int MaxRooms = 1000;
    private static readonly TimeSpan RoomTtl = TimeSpan.FromHours(12);
    private static readonly char[] CodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();

    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private readonly ConcurrentDictionary<string, string> _connectionToRoom = new();

    public Room CreateRoom(string connectionId, string playerName)
    {
        CleanupExpiredRooms();
        RemoveExistingConnection(connectionId);

        if (_rooms.Count >= MaxRooms)
        {
            throw new InvalidOperationException("The room limit has been reached.");
        }

        for (var attempt = 0; attempt < 64; attempt++)
        {
            var room = new Room
            {
                Code = GenerateCode(),
                Player1 = new Player
                {
                    ConnectionId = connectionId,
                    Name = playerName,
                    PlayerId = "player1"
                },
                Status = "waiting",
                CreatedAt = DateTime.UtcNow
            };

            if (_rooms.TryAdd(room.Code, room))
            {
                _connectionToRoom[connectionId] = room.Code;
                return room;
            }
        }

        throw new InvalidOperationException("Unable to allocate a room code.");
    }

    public Room? JoinRoom(string? code, string connectionId, string playerName)
    {
        CleanupExpiredRooms();
        if (!TryNormalizeCode(code, out var normalizedCode)) return null;

        if (_connectionToRoom.TryGetValue(connectionId, out var existingCode))
        {
            if (existingCode == normalizedCode) return null;
            RemovePlayer(existingCode, connectionId);
        }

        if (!_rooms.TryGetValue(normalizedCode, out var room)) return null;
        if (IsExpired(room))
        {
            RemoveRoom(normalizedCode);
            return null;
        }

        lock (room.Lock)
        {
            if (room.Player1 == null || room.Player2 != null || room.Status != "waiting") return null;

            room.Player2 = new Player
            {
                ConnectionId = connectionId,
                Name = playerName,
                PlayerId = "player2"
            };
            room.Status = "playing";
        }

        _connectionToRoom[connectionId] = normalizedCode;
        return room;
    }

    public Room? GetRoomByConnection(string connectionId)
    {
        if (!_connectionToRoom.TryGetValue(connectionId, out var code)) return null;
        _rooms.TryGetValue(code, out var room);
        return room;
    }

    public void RemovePlayer(string code, string connectionId)
    {
        _connectionToRoom.TryRemove(connectionId, out _);
        if (_rooms.TryGetValue(code, out var room))
        {
            bool empty;
            lock (room.Lock)
            {
                if (room.Player1?.ConnectionId == connectionId) room.Player1 = null;
                if (room.Player2?.ConnectionId == connectionId) room.Player2 = null;
                empty = room.Player1 == null && room.Player2 == null;
            }

            if (empty) _rooms.TryRemove(code, out _);
        }
    }

    private void CleanupExpiredRooms()
    {
        foreach (var (code, room) in _rooms)
        {
            if (IsExpired(room))
            {
                RemoveRoom(code);
            }
        }
    }

    private void RemoveExistingConnection(string connectionId)
    {
        if (_connectionToRoom.TryGetValue(connectionId, out var code))
        {
            RemovePlayer(code, connectionId);
        }
    }

    private void RemoveRoom(string code)
    {
        if (!_rooms.TryRemove(code, out var room)) return;

        lock (room.Lock)
        {
            if (room.Player1 != null) _connectionToRoom.TryRemove(room.Player1.ConnectionId, out _);
            if (room.Player2 != null) _connectionToRoom.TryRemove(room.Player2.ConnectionId, out _);
        }
    }

    private static bool TryNormalizeCode(string? code, out string normalizedCode)
    {
        normalizedCode = code?.Trim().ToUpperInvariant() ?? "";
        return normalizedCode.Length == CodeLength
            && normalizedCode.All(c => CodeChars.Contains(c));
    }

    private static bool IsExpired(Room room)
    {
        return DateTime.UtcNow - room.CreatedAt > RoomTtl;
    }

    private string GenerateCode()
    {
        return new string(Enumerable.Range(0, CodeLength)
            .Select(_ => CodeChars[RandomNumberGenerator.GetInt32(CodeChars.Length)])
            .ToArray());
    }
}
