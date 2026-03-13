// ==========================================
// BASE DE DONNÉES / ALGORITHMES DE POINTS
// ==========================================

/*
  Ce fichier contiendra toutes les requêtes vers la base de données (Select, Insert, Update)
  pour récupérer le classement, le profil du joueur, etc.
*/

// --- Calculateur de Points (Basé sur les règles) ---

/**
 * Calcule les points gagnés en Multijoueur
 * @param {boolean} isWin - L'équipe a gagné ?
 * @param {number} rank - Le rang du joueur dans l'équipe (1 à 5)
 * @param {boolean} isMVP - Le joueur est-il MVP ?
 * @param {number} adminBonus - Bonus spécifique de l'admin
 * @return {number} total de points gagnés
 */
function calculateMJPoints(isWin, rank, isMVP, adminBonus = 0) {
    let points = 0;

    if (isWin) {
        const winChart = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 };
        points = winChart[rank] || 0;
    } else {
        const lossChart = { 1: 5, 2: 3, 3: 1, 4: -3, 5: -5 };
        points = lossChart[rank] || 0;
    }

    if (isMVP) points += 5;
    points += Number(adminBonus);

    return points;
}

/**
 * Calcule les points gagnés en Battle Royale
 * @param {number} numPlayers - Nombre total de joueurs dans la partie
 * @param {number} rank - Rang final du joueur
 * @param {boolean} isMVP - Le joueur est-il MVP ?
 * @param {number} adminBonus - Bonus spécifique de l'admin
 * @return {number} total de points gagnés
 */
function calculateBRPoints(numPlayers, rank, isMVP, adminBonus = 0) {
    // Formule: arrondi((Nombre_joueurs − Rang + 1) / Nombre_joueurs × 20)
    let points = Math.round(((numPlayers - rank + 1) / numPlayers) * 20);

    // Un joueur ne peut pas avoir de points négatifs par le calcul de base en BR
    if (points < 0) points = 0;

    if (isMVP) points += 5;
    points += Number(adminBonus);

    return points;
}

/**
 * Détermine le grade en fonction des points totaux
 * @param {number} totalPoints 
 * @returns {string} Le grade du joueur
 */
function getGradeFromPoints(totalPoints) {
    if (totalPoints >= 1400) return "Général";
    if (totalPoints >= 950) return "Commandant";
    if (totalPoints >= 600) return "Lieutenant";
    if (totalPoints >= 300) return "Sergent";
    if (totalPoints >= 120) return "Soldat";
    return "Recrue";
}

// Exports for other scripts if modules were used
window.calculateMJPoints = calculateMJPoints;
window.calculateBRPoints = calculateBRPoints;
window.getGradeFromPoints = getGradeFromPoints;
