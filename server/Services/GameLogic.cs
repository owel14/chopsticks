using ChopsticksServer.Models;

namespace ChopsticksServer.Services;

public static class GameLogic
{
    public static GameState CreateInitialState()
    {
        return new GameState
        {
            Player1 = new PlayerState { LeftHand = 1, RightHand = 1 },
            Player2 = new PlayerState { LeftHand = 1, RightHand = 1 },
            CurrentPlayer = "player2",
            StartingPlayer = "player2",
            IsGameOver = false,
            Winner = null
        };
    }

    public static GameStateDto ToDto(GameState state)
    {
        return new GameStateDto
        {
            Player1 = new PlayerStateDto { LeftHand = state.Player1.LeftHand, RightHand = state.Player1.RightHand },
            Player2 = new PlayerStateDto { LeftHand = state.Player2.LeftHand, RightHand = state.Player2.RightHand },
            CurrentPlayer = state.CurrentPlayer,
            IsGameOver = state.IsGameOver,
            Winner = state.Winner
        };
    }

    public static string? CheckWinner(GameState state)
    {
        if (state.Player1.LeftHand == 0 && state.Player1.RightHand == 0) return "player2";
        if (state.Player2.LeftHand == 0 && state.Player2.RightHand == 0) return "player1";
        return null;
    }

    public static GameState? ApplyAddMove(GameState state, string playerId, string fromHand, string toHand)
    {
        if (state.CurrentPlayer != playerId) return null;

        var attacker = playerId == "player1" ? state.Player1 : state.Player2;
        var defender = playerId == "player1" ? state.Player2 : state.Player1;

        int sourceValue = fromHand == "left" ? attacker.LeftHand : attacker.RightHand;
        int targetValue = toHand == "left" ? defender.LeftHand : defender.RightHand;

        if (sourceValue <= 0 || targetValue == 0) return null;

        int sum = sourceValue + targetValue;
        int newValue = sum >= 5 ? 0 : sum;

        var newState = state.Clone();
        var defenderNew = playerId == "player1" ? newState.Player2 : newState.Player1;

        if (toHand == "left") defenderNew.LeftHand = newValue;
        else defenderNew.RightHand = newValue;

        newState.CurrentPlayer = playerId == "player1" ? "player2" : "player1";

        var winner = CheckWinner(newState);
        if (winner != null)
        {
            newState.IsGameOver = true;
            newState.Winner = winner;
        }

        return newState;
    }

    public static GameState? ApplySplitMove(GameState state, string playerId, int newLeft, int newRight)
    {
        if (state.CurrentPlayer != playerId) return null;

        var player = playerId == "player1" ? state.Player1 : state.Player2;
        int total = player.LeftHand + player.RightHand;

        if (newLeft + newRight != total) return null;
        if (newLeft < 0 || newLeft > 4 || newRight < 0 || newRight > 4) return null;

        // Can't split to same distribution (including symmetric)
        if ((newLeft == player.LeftHand && newRight == player.RightHand) ||
            (newLeft == player.RightHand && newRight == player.LeftHand))
            return null;

        var newState = state.Clone();
        var playerNew = playerId == "player1" ? newState.Player1 : newState.Player2;
        playerNew.LeftHand = newLeft;
        playerNew.RightHand = newRight;
        newState.CurrentPlayer = playerId == "player1" ? "player2" : "player1";

        return newState;
    }
}
