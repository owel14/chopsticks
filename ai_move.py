
# Need a function that takes in the player states and return the best move for the computer
# You can either return a split move or an add move

# to return add move, return a tuple of the move type,source hand and the target hand
# For example, to add the computers left hand to the right hand of the player, return ('add', 'left', 'right')
# You cannot add to an opponents hand if they have a value of 0 and you cannot add to your opponents hand if your own hand value is 0

# to return a split move, return a tuple of the move type, your left hands new value and your right hands new value
# For example, if your hand values are [4,1], you can split into 3 and 2, return ('split', 3, 2)
# A split is invalid if the resulting hand values are symmetrical, for splitting from [0,1] to [0,1] is invalid
# A split is also invalid if the sum of the new hand values is greater than the original

# Try not to return an invalid move, otherwise an error is thrown and the computer will not make a move freezing the game

def calculate_move(player_states):

    hand_states = [[player['leftHand'], player['rightHand']] for player in player_states.values()]

    # Hand states converts the json object to a arrays
    # hand_states will look something like [[1, 2], [3, 4]]
    print(hand_states)

    # take the current state of the game and return the best possible move
    return ('add', 'left', 'right')

    
