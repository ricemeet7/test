const boardElement = document.getElementById('board');
const blackScoreEl = document.getElementById('blackScore');
const whiteScoreEl = document.getElementById('whiteScore');
const difficultySelect = document.getElementById('difficulty');
const newGameBtn = document.getElementById('newGame');

let board;
let currentPlayer; // 1 = black (human), -1 = white (AI)
let gameOver = false;

const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
];

const weights = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [10, -2, 5, 1, 1, 5, -2, 10],
    [5, -2, 1, 0, 0, 1, -2, 5],
    [5, -2, 1, 0, 0, 1, -2, 5],
    [10, -2, 5, 1, 1, 5, -2, 10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10, 5, 5, 10, -20, 100]
];

function init() {
    newGameBtn.addEventListener('click', newGame);
    difficultySelect.addEventListener('change', () => {});
    createBoardUI();
    newGame();
}

function createBoardUI() {
    boardElement.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', () => handleCellClick(r, c));
            boardElement.appendChild(cell);
        }
    }
}

function newGame() {
    board = Array.from({ length: 8 }, () => Array(8).fill(0));
    board[3][3] = board[4][4] = -1;
    board[3][4] = board[4][3] = 1;
    currentPlayer = 1;
    gameOver = false;
    render();
}

function render() {
    const cells = boardElement.children;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = cells[r * 8 + c];
            cell.innerHTML = '';
            cell.classList.remove('valid-move', 'disabled');
            const value = board[r][c];
            if (value !== 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece', value === 1 ? 'black' : 'white');
                cell.appendChild(piece);
                cell.classList.add('disabled');
            }
        }
    }
    updateScore();
    if (!gameOver && currentPlayer === 1) {
        showValidMoves();
    }
}

function showValidMoves() {
    const moves = getValidMoves(board, 1);
    const cells = boardElement.children;
    moves.forEach(m => {
        cells[m.row * 8 + m.col].classList.add('valid-move');
    });
}

function handleCellClick(r, c) {
    if (gameOver || currentPlayer !== 1) return;
    const moves = getValidMoves(board, 1);
    const move = moves.find(m => m.row === r && m.col === c);
    if (!move) return;
    applyMove(board, move, 1);
    currentPlayer = -1;
    render();
    setTimeout(aiTurn, 300);
}

function aiTurn() {
    if (gameOver) return;
    const moves = getValidMoves(board, -1);
    if (moves.length === 0) {
        currentPlayer = 1;
        if (getValidMoves(board, 1).length === 0) {
            endGame();
        } else {
            render();
        }
        return;
    }
    let move;
    const difficulty = difficultySelect.value;
    if (difficulty === 'easy') {
        move = moves[Math.floor(Math.random() * moves.length)];
    } else if (difficulty === 'medium') {
        move = moves.reduce((best, m) => (m.flips.length > best.flips.length ? m : best), moves[0]);
    } else {
        move = bestMove(board, -1, 3);
    }
    applyMove(board, move, -1);
    currentPlayer = 1;
    render();
    if (getValidMoves(board, 1).length === 0) {
        currentPlayer = -1;
        if (getValidMoves(board, -1).length === 0) {
            endGame();
        } else {
            setTimeout(aiTurn, 300);
        }
    }
}

function getValidMoves(b, player) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (b[r][c] !== 0) continue;
            const flips = [];
            for (const [dr, dc] of directions) {
                const line = [];
                let nr = r + dr, nc = c + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === -player) {
                    line.push([nr, nc]);
                    nr += dr;
                    nc += dc;
                }
                if (line.length && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === player) {
                    flips.push(...line);
                }
            }
            if (flips.length) moves.push({ row: r, col: c, flips });
        }
    }
    return moves;
}

function applyMove(b, move, player) {
    b[move.row][move.col] = player;
    move.flips.forEach(([r, c]) => b[r][c] = player);
}

function updateScore() {
    let black = 0, white = 0;
    for (const row of board) {
        for (const cell of row) {
            if (cell === 1) black++;
            else if (cell === -1) white++;
        }
    }
    blackScoreEl.textContent = black;
    whiteScoreEl.textContent = white;
}

function endGame() {
    gameOver = true;
    updateScore();
    const black = parseInt(blackScoreEl.textContent);
    const white = parseInt(whiteScoreEl.textContent);
    let message = 'Draw!';
    if (black > white) message = 'You win!';
    else if (white > black) message = 'AI wins!';
    alert(message);
}

function cloneBoard(b) {
    return b.map(row => row.slice());
}

function evaluate(b) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (b[r][c] !== 0) {
                score += b[r][c] * (10 + weights[r][c]);
            }
        }
    }
    return score;
}

function minimax(b, depth, player, alpha, beta) {
    const moves = getValidMoves(b, player);
    if (depth === 0 || moves.length === 0) {
        return evaluate(b) * player;
    }
    if (player === -1) { // AI maximizing
        let maxEval = -Infinity;
        for (const move of moves) {
            const newBoard = cloneBoard(b);
            applyMove(newBoard, move, player);
            const eval = minimax(newBoard, depth - 1, -player, alpha, beta);
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else { // minimizing opponent
        let minEval = Infinity;
        for (const move of moves) {
            const newBoard = cloneBoard(b);
            applyMove(newBoard, move, player);
            const eval = minimax(newBoard, depth - 1, -player, alpha, beta);
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function bestMove(b, player, depth) {
    const moves = getValidMoves(b, player);
    let best = moves[0];
    let bestScore = -Infinity;
    for (const move of moves) {
        const newBoard = cloneBoard(b);
        applyMove(newBoard, move, player);
        const score = minimax(newBoard, depth - 1, -player, -Infinity, Infinity);
        if (score > bestScore) {
            bestScore = score;
            best = move;
        }
    }
    return best;
}

init();
