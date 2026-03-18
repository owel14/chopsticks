using System.Collections.Concurrent;
using ChopsticksServer.Models;

namespace ChopsticksServer.Services;

public class RoomManager
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private readonly ConcurrentDictionary<string, string> _connectionToRoom = new();
    private static readonly Random _random = new();

    public Room CreateRoom(string connectionId, string playerName)
    {
        var code = GenerateCode();
        var room = new Room
        {
            Code = code,
            Player1 = new Player
            {
                ConnectionId = connectionId,
                Name = playerName,
                PlayerId = "player1"
            },
            Status = "waiting"
        };

        _rooms[code] = room;
        _connectionToRoom[connectionId] = code;
        return room;
    }

    public Room? JoinRoom(string code, string connectionId, string playerName)
    {
        code = code.ToUpper();
        if (!_rooms.TryGetValue(code, out var room)) return null;

        lock (room.Lock)
        {
            if (room.Player2 != null) return null;

            room.Player2 = new Player
            {
                ConnectionId = connectionId,
                Name = playerName,
                PlayerId = "player2"
            };
            room.Status = "playing";
        }

        _connectionToRoom[connectionId] = code;
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

    private string GenerateCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        string code;
        do
        {
            code = new string(Enumerable.Range(0, 6)
                .Select(_ => chars[_random.Next(chars.Length)])
                .ToArray());
        } while (_rooms.ContainsKey(code));
        return code;
    }
}
