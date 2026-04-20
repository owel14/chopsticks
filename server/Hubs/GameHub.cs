using Microsoft.AspNetCore.SignalR;
using ChopsticksServer.Models;
using ChopsticksServer.Services;

namespace ChopsticksServer.Hubs;

public class GameHub : Hub
{
    private readonly RoomManager _roomManager;

    public GameHub(RoomManager roomManager)
    {
        _roomManager = roomManager;
    }

    private static string SanitizeName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "Anonymous";
        var sanitized = new string(name.Trim()
            .Where(c => !char.IsControl(c))
            .Take(20)
            .ToArray())
            .Trim();
        return sanitized.Length == 0 ? "Anonymous" : sanitized;
    }

    public async Task CreateRoom(string playerName)
    {
        Room room;
        try
        {
            room = _roomManager.CreateRoom(Context.ConnectionId, SanitizeName(playerName));
        }
        catch (InvalidOperationException)
        {
            await Clients.Caller.SendAsync("Error", "Unable to create a room right now.");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, room.Code);
        await Clients.Caller.SendAsync("RoomCreated", room.Code);
    }

    public async Task JoinRoom(string roomCode, string playerName)
    {
        var room = _roomManager.JoinRoom(roomCode, Context.ConnectionId, SanitizeName(playerName));
        if (room == null)
        {
            await Clients.Caller.SendAsync("Error", "Room not found or full.");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, room.Code);

        GameStateDto? dto = null;
        string? player1ConnectionId = null;
        string? player2ConnectionId = null;
        string? player1Name = null;
        string? player2Name = null;

        lock (room.Lock)
        {
            if (room.Status == "playing" && room.Player1 != null && room.Player2 != null)
            {
                var gameState = GameLogic.CreateInitialState();
                room.GameState = gameState;
                dto = GameLogic.ToDto(gameState);
                player1ConnectionId = room.Player1.ConnectionId;
                player2ConnectionId = room.Player2.ConnectionId;
                player1Name = room.Player1.Name;
                player2Name = room.Player2.Name;
            }
        }

        if (dto != null && player1ConnectionId != null && player2ConnectionId != null)
        {
            await Clients.Client(player1ConnectionId)
                .SendAsync("GameStarted", dto, "player1", player1Name, player2Name);
            await Clients.Client(player2ConnectionId)
                .SendAsync("GameStarted", dto, "player2", player1Name, player2Name);
        }
    }

    public async Task MakeAddMove(string fromHand, string toHand)
    {
        var room = _roomManager.GetRoomByConnection(Context.ConnectionId);
        if (room == null) return;

        GameStateDto? dto = null;
        MoveInfoDto? moveInfo = null;
        string? error = null;

        lock (room.Lock)
        {
            if (room.GameState == null || room.Status != "playing" || room.GameState.IsGameOver) return;

            var player = room.GetPlayerByConnectionId(Context.ConnectionId);
            if (player == null) return;

            if (room.GameState.CurrentPlayer != player.PlayerId)
            {
                error = "It is not your turn.";
            }
            else
            {
                var newState = GameLogic.ApplyAddMove(room.GameState, player.PlayerId, fromHand, toHand);
                if (newState == null)
                {
                    error = "Invalid add move.";
                }
                else
                {
                    room.GameState = newState;

                    if (newState.IsGameOver)
                    {
                        room.Status = "gameOver";
                    }

                    dto = GameLogic.ToDto(newState);
                    moveInfo = new MoveInfoDto { Type = "add", MoverId = player.PlayerId, FromHand = fromHand, ToHand = toHand };
                }
            }
        }

        if (error != null)
        {
            await Clients.Caller.SendAsync("Error", error);
            return;
        }

        if (dto != null && moveInfo != null)
        {
            await Clients.Group(room.Code).SendAsync("GameStateUpdated", dto, moveInfo);
        }
    }

    public async Task MakeSplitMove(int newLeft, int newRight)
    {
        var room = _roomManager.GetRoomByConnection(Context.ConnectionId);
        if (room == null) return;

        GameStateDto? dto = null;
        MoveInfoDto? moveInfo = null;
        string? error = null;

        lock (room.Lock)
        {
            if (room.GameState == null || room.Status != "playing" || room.GameState.IsGameOver) return;

            var player = room.GetPlayerByConnectionId(Context.ConnectionId);
            if (player == null) return;

            if (room.GameState.CurrentPlayer != player.PlayerId)
            {
                error = "It is not your turn.";
            }
            else
            {
                var newState = GameLogic.ApplySplitMove(room.GameState, player.PlayerId, newLeft, newRight);
                if (newState == null)
                {
                    error = "Invalid split move.";
                }
                else
                {
                    room.GameState = newState;
                    dto = GameLogic.ToDto(newState);
                    moveInfo = new MoveInfoDto { Type = "split", MoverId = player.PlayerId };
                }
            }
        }

        if (error != null)
        {
            await Clients.Caller.SendAsync("Error", error);
            return;
        }

        if (dto != null && moveInfo != null)
        {
            await Clients.Group(room.Code).SendAsync("GameStateUpdated", dto, moveInfo);
        }
    }

    public async Task PlayAgain()
    {
        var room = _roomManager.GetRoomByConnection(Context.ConnectionId);
        if (room == null) return;

        GameStateDto? dto = null;
        string? player1ConnectionId = null;
        string? player2ConnectionId = null;
        string? player1Name = null;
        string? player2Name = null;

        lock (room.Lock)
        {
            if (room.GameState == null || room.Player1 == null || room.Player2 == null) return;
            if (room.Status != "gameOver") return;

            var newStarting = room.GameState.StartingPlayer == "player1" ? "player2" : "player1";
            var newState = GameLogic.CreateInitialState();
            newState.StartingPlayer = newStarting;
            newState.CurrentPlayer = newStarting;
            room.GameState = newState;
            room.Status = "playing";

            dto = GameLogic.ToDto(newState);
            player1ConnectionId = room.Player1.ConnectionId;
            player2ConnectionId = room.Player2.ConnectionId;
            player1Name = room.Player1.Name;
            player2Name = room.Player2.Name;
        }

        if (dto != null && player1ConnectionId != null && player2ConnectionId != null)
        {
            await Clients.Client(player1ConnectionId)
                .SendAsync("GameStarted", dto, "player1", player1Name, player2Name);
            await Clients.Client(player2ConnectionId)
                .SendAsync("GameStarted", dto, "player2", player1Name, player2Name);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var room = _roomManager.GetRoomByConnection(Context.ConnectionId);
        if (room != null)
        {
            string? otherConnectionId;
            lock (room.Lock)
            {
                otherConnectionId = room.GetOtherPlayer(Context.ConnectionId)?.ConnectionId;
            }

            if (otherConnectionId != null)
            {
                await Clients.Client(otherConnectionId).SendAsync("OpponentLeft");
            }
            _roomManager.RemovePlayer(room.Code, Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
