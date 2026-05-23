const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const suits = ["C", "D", "H", "S"];
const cardImageBasePath = "img/cards/";
const dealerCardBackImage = cardImageBasePath + "Red_back.jpg";
const startingBankroll = 100;
const handBet = 10;
let bankroll = startingBankroll;
let currentRound = null;

function createDeck() {
    const deck = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({
                rank: rank,
                suit: suit,
                image: cardImageBasePath + rank + suit + ".jpg"
            });
        }
    }

    return shuffle(deck);
}

function shuffle(deck) {
    for (let index = deck.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const currentCard = deck[index];
        deck[index] = deck[swapIndex];
        deck[swapIndex] = currentCard;
    }

    return deck;
}

function drawCard(deck) {
    return deck.pop();
}

function getCardValue(rank) {
    if (rank === "A") {
        return 11;
    }

    if (rank === "K" || rank === "Q" || rank === "J") {
        return 10;
    }

    return Number(rank);
}

function evaluateDealerHand(hand) {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
        total += getCardValue(card.rank);

        if (card.rank === "A") {
            aces += 1;
        }
    }

    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }

    return {
        total: total,
        isBlackjack: hand.length === 2 && total === 21,
        isBust: total > 21
    };
}

function evaluatePlayerHand(hand, aceChoices) {
    let total = 0;
    let hasAceValuedAtEleven = false;

    for (let index = 0; index < hand.length; index += 1) {
        const card = hand[index];

        if (card.rank === "A") {
            const aceValue = aceChoices[index] || 1;
            total += aceValue;

            if (aceValue === 11) {
                hasAceValuedAtEleven = true;
            }
        } else {
            total += getCardValue(card.rank);
        }
    }

    return {
        total: total,
        isBlackjack: hand.length === 2 && total === 21 && hasAceValuedAtEleven,
        isBust: total > 21
    };
}

function createAceControl(index, aceNumber, aceChoices) {
    const wrapper = document.createElement("div");
    wrapper.className = "ace-control";

    const label = document.createElement("label");
    label.setAttribute("for", "aceChoice" + index);
    label.textContent = "Ace " + aceNumber + ":";

    const select = document.createElement("select");
    select.id = "aceChoice" + index;

    const optionEleven = document.createElement("option");
    optionEleven.value = "11";
    optionEleven.textContent = "11";

    const optionOne = document.createElement("option");
    optionOne.value = "1";
    optionOne.textContent = "1";

    select.appendChild(optionEleven);
    select.appendChild(optionOne);
    select.value = String(aceChoices[index] || 1);
    select.disabled = !currentRound || currentRound.phase !== "playerTurn";
    select.addEventListener("change", function (event) {
        currentRound.playerAceChoices[index] = Number(event.target.value);
        updateRoundDisplay();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    return wrapper;
}

function renderHand(elementId, hand, options = {}) {
    const container = document.getElementById(elementId);
    container.innerHTML = "";
    const hideSecondCard = Boolean(options.hideSecondCard);
    const aceChoices = options.aceChoices || {};
    const showAceControls = Boolean(options.showAceControls);
    let aceCount = 0;

    for (let index = 0; index < hand.length; index += 1) {
        const card = hand[index];
        const slot = document.createElement("div");
        slot.className = "card-slot";
        const image = document.createElement("img");

        if (hideSecondCard && index === 1) {
            image.src = dealerCardBackImage;
            image.alt = "Face-down dealer card";
        } else {
            image.src = card.image;
            image.alt = card.rank + " of " + card.suit;
        }

        slot.appendChild(image);

        if (showAceControls && card.rank === "A") {
            aceCount += 1;
            slot.appendChild(createAceControl(index, aceCount, aceChoices));
        }

        container.appendChild(slot);
    }
}

function setScore(elementId, label, total, state) {
    const score = document.getElementById(elementId);
    let text = label + " Total: " + total;

    if (state.isBlackjack) {
        text += " (Blackjack)";
    } else if (state.isBust) {
        text += " (Bust)";
    }

    score.textContent = text;
}

function setDealerScore(round, dealerState) {
    if (round.phase === "playerTurn") {
        const visibleTotal = getCardValue(round.dealerHand[0].rank);
        document.getElementById("dealerScore").textContent = "Dealer Showing: " + visibleTotal;
        return;
    }

    setScore("dealerScore", "Dealer", dealerState.total, dealerState);
}

function setControlsDisabledState(round) {
    const hitButton = document.getElementById("hitButton");
    const stayButton = document.getElementById("stayButton");
    const isPlayerTurn = Boolean(round) && round.phase === "playerTurn";

    hitButton.disabled = !isPlayerTurn;
    stayButton.disabled = !isPlayerTurn;
}

function updateBankrollDisplay(round) {
    const bankrollStatus = document.getElementById("bankrollStatus");
    const currentBet = round ? round.bet : handBet;
    bankrollStatus.textContent = "Bankroll: $" + bankroll + " | Current Bet: $" + currentBet;
}

function determineWinner(playerState, dealerState) {
    if (playerState.isBlackjack && dealerState.isBlackjack) {
        return {
            headline: "Push",
            details: "Both player and dealer have blackjack."
        };
    }

    if (playerState.isBlackjack) {
        return {
            headline: "Player wins with Blackjack",
            details: "A natural 21 beats any non-blackjack dealer hand."
        };
    }

    if (dealerState.isBlackjack) {
        return {
            headline: "Dealer wins with Blackjack",
            details: "The dealer opened with a natural 21."
        };
    }

    if (playerState.isBust && dealerState.isBust) {
        return {
            headline: "Push",
            details: "Both hands busted."
        };
    }

    if (playerState.isBust) {
        return {
            headline: "Dealer wins",
            details: "Player busted by going over 21."
        };
    }

    if (dealerState.isBust) {
        return {
            headline: "Player wins",
            details: "Dealer busted by going over 21."
        };
    }

    if (playerState.total > dealerState.total) {
        return {
            headline: "Player wins",
            details: "Player finished closer to 21."
        };
    }

    if (dealerState.total > playerState.total) {
        return {
            headline: "Dealer wins",
            details: "Dealer finished closer to 21."
        };
    }

    return {
        headline: "Push",
        details: "Both hands finished with the same total."
    };
}

function settleBet(round, result) {
    if (round.isSettled) {
        return;
    }

    if (result.headline === "Player wins" || result.headline === "Player wins with Blackjack") {
        bankroll += round.bet;
    } else if (result.headline === "Dealer wins" || result.headline === "Dealer wins with Blackjack") {
        bankroll -= round.bet;
    }

    round.isSettled = true;
}

function autoStayIfPlayerHas21(playerState) {
    if (currentRound && currentRound.phase === "playerTurn" && playerState.total === 21 && !playerState.isBust) {
        stayPlayer();
        return true;
    }

    return false;
}

function updateRoundDisplay() {
    if (!currentRound) {
        return;
    }

    const playerState = evaluatePlayerHand(currentRound.playerHand, currentRound.playerAceChoices);
    const dealerState = evaluateDealerHand(currentRound.dealerHand);

    if (autoStayIfPlayerHas21(playerState)) {
        return;
    }

    renderHand("playerCards", currentRound.playerHand, {
        aceChoices: currentRound.playerAceChoices,
        showAceControls: true
    });
    renderHand("dealerCards", currentRound.dealerHand, {
        hideSecondCard: currentRound.phase === "playerTurn"
    });
    setScore("playerScore", "Player", playerState.total, playerState);
    setDealerScore(currentRound, dealerState);
    setControlsDisabledState(currentRound);
    updateBankrollDisplay(currentRound);

    if (currentRound.phase === "playerTurn") {
        if (playerState.isBust) {
            document.getElementById("winningScore").textContent = "Dealer wins";
            document.getElementById("roundDetails").textContent = "Player busted by going over 21.";
            currentRound.phase = "finished";
            settleBet(currentRound, {
                headline: "Dealer wins"
            });
            setControlsDisabledState(currentRound);
            renderHand("playerCards", currentRound.playerHand, {
                aceChoices: currentRound.playerAceChoices,
                showAceControls: true
            });
            updateBankrollDisplay(currentRound);
        } else {
            document.getElementById("winningScore").textContent = "Player turn";
            document.getElementById("roundDetails").textContent = "Choose ace values if needed, then hit for another card or stay.";
        }

        return;
    }

    const result = determineWinner(playerState, dealerState);
    settleBet(currentRound, result);
    document.getElementById("winningScore").textContent = result.headline;
    document.getElementById("roundDetails").textContent = result.details;
    updateBankrollDisplay(currentRound);
}

function dealRound() {
    if (bankroll < handBet) {
        document.getElementById("winningScore").textContent = "Out of money";
        document.getElementById("roundDetails").textContent = "You need at least $10 to start another hand.";
        updateBankrollDisplay(currentRound);
        return;
    }

    const deck = createDeck();
    const playerHand = [drawCard(deck), drawCard(deck)];
    const dealerHand = [drawCard(deck), drawCard(deck)];
    const playerAceChoices = {};

    for (let index = 0; index < playerHand.length; index += 1) {
        if (playerHand[index].rank === "A") {
            playerAceChoices[index] = 1;
        }
    }

    const openingPlayerState = evaluatePlayerHand(playerHand, playerAceChoices);
    const openingDealerState = evaluateDealerHand(dealerHand);

    currentRound = {
        deck: deck,
        playerHand: playerHand,
        dealerHand: dealerHand,
        playerAceChoices: playerAceChoices,
        phase: openingPlayerState.isBlackjack || openingDealerState.isBlackjack ? "finished" : "playerTurn",
        bet: handBet,
        isSettled: false
    };

    updateRoundDisplay();
}

function hitPlayer() {
    if (!currentRound || currentRound.phase !== "playerTurn") {
        return;
    }

    currentRound.playerHand.push(drawCard(currentRound.deck));

    const newCardIndex = currentRound.playerHand.length - 1;
    if (currentRound.playerHand[newCardIndex].rank === "A") {
        currentRound.playerAceChoices[newCardIndex] = 1;
    }

    updateRoundDisplay();
}

function stayPlayer() {
    if (!currentRound || currentRound.phase !== "playerTurn") {
        return;
    }

    currentRound.phase = "dealerTurn";

    let dealerState = evaluateDealerHand(currentRound.dealerHand);
    while (dealerState.total < 17) {
        currentRound.dealerHand.push(drawCard(currentRound.deck));
        dealerState = evaluateDealerHand(currentRound.dealerHand);
    }

    currentRound.phase = "finished";
    updateRoundDisplay();
}

document.getElementById("dealButton").addEventListener("click", dealRound);
document.getElementById("hitButton").addEventListener("click", hitPlayer);
document.getElementById("stayButton").addEventListener("click", stayPlayer);
