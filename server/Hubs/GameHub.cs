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
        name = name.Trim();
        if (name.Length > 20) name = name[..20];
        return new string(name.Where(c => !char.IsControl(c)).ToArray());
    }

    public async Task CreateRoom(string playerName)
    {
        var room = _roomManager.CreateRoom(Context.ConnectionId, SanitizeName(playerName));
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

        if (room.Status == "playing" && room.Player1 != null && room.Player2 != null)
        {
            var gameState = GameLogic.CreateInitialState();
            room.GameState = gameState;
            var dto = GameLogic.ToDto(gameState);

            await Clients.Client(room.Player1.ConnectionId)
                .SendAsync("GameStarted", dto, "player1", room.Player1.Name, room.Player2.Name);
            await Clients.Client(room.Player2.ConnectionId)
                .SendAsync("GameStarted", dto, "player2", room.Player1.Name, room.Player2.Name);
        }
    }

    public async Task MakeAddMove(string fromHand, string toHand)
    {
        var room = _roomManager.GetRoomByConnection(Context.ConnectionId);
        if (room?.GameState == null) return;

        var player = room.GetPlayerByConnectionId(Context.ConnectionId);
        if (player == null) return;

        if (room.GameState.CurrentPlayer != player.PlayerId)
        {
            await Clients.Caller.SendAsync("Error", "It is not your turn.");
            return;
        }

        var newState = GameLogic.ApplyAddMove(room.GameState, player.PlayerId, fromHand, toHand);
        if (newState == null)
        {
            await Clients.Caller.SendAsync("Error", "Invalid add move.");
            return;
        }

        room.GameState = newState;

        if (newState.IsGameOver)
        {
            room.Status = "gameOver";
        }

        var moveInfo = new MoveInfoDto { Type = "add", MoverId = player.PlayerId, FromHand = fromHand, ToHand = toHand };
        await Clients.Group(room.Code).SendAsync("GameStateUpdated", GameLogic.ToDto(newState), moveInfo);
    }

    public async Task MakeSplitMove(int newLeft, int newRight)
    {
        var room = _roomManager.GetRoomByConnection(Context.ConnectionId);
        if (room?.GameState == null) return;

        var player = room.GetPlayerByConnectionId(Context.ConnectionId);
        if (player == null) return;

        if (room.GameState.CurrentPlayer != player.PlayerId)
        {
            await Clients.Caller.SendAsync("Error", "It is not your turn.");
            return;
        }

        var newState = GameLogic.ApplySplitMove(room.GameState, player.PlayerId, newLeft, newRight);
        if (newState == null)
        {
            await Clients.Caller.SendAsync("Error", "Invalid split move.");
            return;
        }

        room.GameState = newState;

        var moveInfo = new MoveInfoDto { Type = "split", MoverId = player.PlayerId };
        await Clients.Group(room.Code).SendAsync("GameStateUpdated", GameLogic.ToDto(newState), moveInfo);
    }

    public async Task PlayAgain()
    {
        var room = _roomManager.GetRoomByConnection(Context.ConnectionId);
        if (room?.GameState == null || room.Player1 == null || room.Player2 == null) return;
        if (room.Status != "gameOver") return;

        var newStarting = room.GameState.StartingPlayer == "player1" ? "player2" : "player1";
        var newState = GameLogic.CreateInitialState();
        newState.StartingPlayer = newStarting;
        newState.CurrentPlayer = newStarting;
        room.GameState = newState;
        room.Status = "playing";

        var dto = GameLogic.ToDto(newState);
        await Clients.Client(room.Player1.ConnectionId)
            .SendAsync("GameStarted", dto, "player1", room.Player1.Name, room.Player2.Name);
        await Clients.Client(room.Player2.ConnectionId)
            .SendAsync("GameStarted", dto, "player2", room.Player1.Name, room.Player2.Name);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var room = _roomManager.GetRoomByConnection(Context.ConnectionId);
        if (room != null)
        {
            var otherPlayer = room.GetOtherPlayer(Context.ConnectionId);
            if (otherPlayer != null)
            {
                await Clients.Client(otherPlayer.ConnectionId).SendAsync("OpponentLeft");
            }
            _roomManager.RemovePlayer(room.Code, Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
