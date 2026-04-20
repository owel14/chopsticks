namespace ChopsticksServer.Models;

public class Player
{
    public string ConnectionId { get; set; } = "";
    public string Name { get; set; } = "";
    public string PlayerId { get; set; } = "";
}

public class Room
{
    public readonly object Lock = new();
    public string Code { get; set; } = "";
    public Player? Player1 { get; set; }
    public Player? Player2 { get; set; }
    public GameState? GameState { get; set; }
    public string Status { get; set; } = "waiting";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Player? GetPlayerByConnectionId(string connectionId)
    {
        if (Player1?.ConnectionId == connectionId) return Player1;
        if (Player2?.ConnectionId == connectionId) return Player2;
        return null;
    }

    public Player? GetOtherPlayer(string connectionId)
    {
        if (Player1?.ConnectionId == connectionId) return Player2;
        if (Player2?.ConnectionId == connectionId) return Player1;
        return null;
    }
}
