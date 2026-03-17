namespace ChopsticksServer.Models;

public class PlayerState
{
    public int LeftHand { get; set; }
    public int RightHand { get; set; }

    public PlayerState Clone() => new() { LeftHand = LeftHand, RightHand = RightHand };
}

public class GameState
{
    public PlayerState Player1 { get; set; } = new();
    public PlayerState Player2 { get; set; } = new();
    public string CurrentPlayer { get; set; } = "player2";
    public string StartingPlayer { get; set; } = "player2";
    public bool IsGameOver { get; set; }
    public string? Winner { get; set; }

    public GameState Clone() => new()
    {
        Player1 = Player1.Clone(),
        Player2 = Player2.Clone(),
        CurrentPlayer = CurrentPlayer,
        StartingPlayer = StartingPlayer,
        IsGameOver = IsGameOver,
        Winner = Winner
    };
}

public class PlayerStateDto
{
    public int LeftHand { get; set; }
    public int RightHand { get; set; }
}

public class GameStateDto
{
    public PlayerStateDto Player1 { get; set; } = new();
    public PlayerStateDto Player2 { get; set; } = new();
    public string CurrentPlayer { get; set; } = "";
    public bool IsGameOver { get; set; }
    public string? Winner { get; set; }
}

public class MoveInfoDto
{
    public string Type { get; set; } = "";
    public string MoverId { get; set; } = "";
    public string? FromHand { get; set; }
    public string? ToHand { get; set; }
}
