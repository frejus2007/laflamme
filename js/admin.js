document.addEventListener('DOMContentLoaded', async () => {

    const modeSelect = document.getElementById('match-mode');
    const mjTeamGroup = document.getElementById('mj-team-group');
    const brPlayersGroup = document.getElementById('br-players-group');
    const playerSelect = document.getElementById('match-player');
    const btnCalculate = document.getElementById('btn-calculate');
    const simulationResult = document.getElementById('simulation-result');
    const calcPointsVal = document.getElementById('calc-points-val');
    const calcDetails = document.getElementById('calc-details');
    const addMatchForm = document.getElementById('add-match-form');

    let allPlayers = [];
    let currentCalculatedPoints = null;

    if (modeSelect) {
        // Fetch Players securely from Supabase
        try {
            if (!window.supabaseClient) throw new Error("Supabase non initialisé");
            const { data, error } = await window.supabaseClient
                .from('joueurs')
                .select('id, pseudo, specialite, grade, points, kills, record_kills, record_points');

            if (error) throw error;
            allPlayers = data || [];

            // Populate select
            playerSelect.innerHTML = '<option value="" disabled selected>Choisir un joueur...</option>';
            allPlayers.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.pseudo} (${p.specialite})`;
                opt.dataset.spec = p.specialite;
                playerSelect.appendChild(opt);
            });

        } catch (err) {
            console.error(err);
            playerSelect.innerHTML = '<option value="" disabled selected>Erreur chargement joueurs</option>';
        }

        // Auto-filter players initially
        const filterPlayers = () => {
            const mode = modeSelect.value;
            Array.from(playerSelect.options).forEach(opt => {
                if (opt.value === "") return;
                if (opt.dataset.spec === mode) {
                    opt.style.display = 'block';
                } else {
                    opt.style.display = 'none';
                }
            });
            playerSelect.value = ""; // reset selection
        };

        // Timeout to run initial filter after options are populated
        setTimeout(filterPlayers, 500);

        modeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'MJ') {
                mjTeamGroup.style.display = 'block';
                brPlayersGroup.style.display = 'none';
            } else {
                mjTeamGroup.style.display = 'none';
                brPlayersGroup.style.display = 'block';
            }
            filterPlayers();
        });

        // Compute grades helper
        const computeGrade = (points) => {
            if (points >= 1400) return 'Général';
            if (points >= 950) return 'Commandant';
            if (points >= 600) return 'Lieutenant';
            if (points >= 300) return 'Sergent';
            if (points >= 120) return 'Soldat';
            return 'Recrue';
        };

        const executeCalculation = () => {
            const mode = modeSelect.value;
            const rank = parseInt(document.getElementById('match-rank').value);
            const isMvp = document.getElementById('match-mvp').checked;
            const adminBonusStr = document.getElementById('match-admin-bonus').value;
            const adminBonus = adminBonusStr ? parseInt(adminBonusStr) : 0;

            if (!rank || rank < 1) {
                alert("Veuillez entrer un rang valide.");
                return null;
            }

            let basePoints = 0;
            let explanation = `Rang ${rank} (${mode}): `;

            if (mode === 'MJ') {
                const teamResult = document.querySelector('input[name="mj-team"]:checked').value;
                if (teamResult === 'win') {
                    if (rank === 1) basePoints = 10;
                    else if (rank === 2) basePoints = 7;
                    else if (rank === 3) basePoints = 5;
                    else if (rank === 4) basePoints = 3;
                    else if (rank === 5) basePoints = 2;
                    else basePoints = 0;
                    explanation += `${basePoints} pts (Victoire). `;
                } else {
                    if (rank === 1) basePoints = 5;
                    else if (rank === 2) basePoints = 3;
                    else if (rank === 3) basePoints = 1;
                    else if (rank === 4) basePoints = -3;
                    else if (rank === 5) basePoints = -5;
                    else basePoints = -5;
                    explanation += `${basePoints} pts (Défaite). `;
                }
            } else if (mode === 'BR') {
                const totalPlayers = parseInt(document.getElementById('br-total-players').value);
                if (!totalPlayers || rank > totalPlayers) {
                    alert("Le rang ne peut pas être supérieur au nombre de joueurs.");
                    return null;
                }
                const rawPoints = ((totalPlayers - rank + 1) / totalPlayers) * 20;
                basePoints = Math.round(rawPoints);
                explanation += `${basePoints} pts (Formule BR: ${totalPlayers} joueurs). `;
            }

            let totalPoints = basePoints;
            if (isMvp) {
                totalPoints += 5;
                explanation += " | MVP (+5) ";
            }
            if (adminBonus !== 0) {
                totalPoints += adminBonus;
                explanation += ` | Admin Bonus (${adminBonus > 0 ? '+' : ''}${adminBonus}) `;
            }

            calcPointsVal.textContent = totalPoints;
            calcDetails.textContent = explanation;
            simulationResult.style.display = 'block';

            if (totalPoints < 0) {
                simulationResult.style.borderColor = '#ff3333';
                simulationResult.style.color = '#ff3333';
                simulationResult.style.backgroundColor = 'rgba(255, 51, 51, 0.1)';
            } else {
                simulationResult.style.borderColor = '#33ff33';
                simulationResult.style.color = '#33ff33';
                simulationResult.style.backgroundColor = 'rgba(51, 255, 51, 0.1)';
            }

            currentCalculatedPoints = totalPoints;
            return totalPoints;
        };

        btnCalculate.addEventListener('click', executeCalculation);

        addMatchForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const pointsToAdd = executeCalculation();
            if (pointsToAdd === null) return;

            const playerId = playerSelect.value;
            const mode = modeSelect.value;
            const rank = parseInt(document.getElementById('match-rank').value);
            const kills = parseInt(document.getElementById('match-kills').value) || 0;
            const isMvp = document.getElementById('match-mvp').checked;

            if (!playerId) {
                alert("Veuillez sélectionner un joueur.");
                return;
            }

            const activeBtnSubmit = addMatchForm.querySelector('button[type="submit"]');
            activeBtnSubmit.disabled = true;
            activeBtnSubmit.textContent = "SAUVEGARDE EN COURS...";

            try {
                // Find matching player local state
                const player = allPlayers.find(p => p.id === playerId);
                if (!player) throw new Error("Joueur non trouvé");

                const newPointsStr = (parseInt(player.points) + pointsToAdd).toString();
                const newKillsStr = (parseInt(player.kills) + kills).toString();
                const recordPointsStr = pointsToAdd > parseInt(player.record_points) ? pointsToAdd.toString() : player.record_points;
                const recordKillsStr = kills > parseInt(player.record_kills) ? kills.toString() : player.record_kills;

                const newGrade = computeGrade(parseInt(newPointsStr));

                // Begin Database transaction via two calls
                const { error: matchError } = await window.supabaseClient.from('matchs').insert([{
                    joueur_id: playerId,
                    saison_id: "c8e10419-f55a-46da-b7a4-31ea6737f000", // Hardcoded season ID from setup_supabase.sql for now
                    mode: mode,
                    resultat: (mode === 'MJ' && document.querySelector('input[name="mj-team"]:checked').value === 'win') ? 'win' : 'loss',
                    points_gagnes: pointsToAdd,
                    kills: kills,
                    rang_final: rank,
                    est_mvp: isMvp
                }]);

                if (matchError) throw matchError;

                const { error: updateError } = await window.supabaseClient.from('joueurs').update({
                    points: newPointsStr,
                    kills: newKillsStr,
                    record_points: recordPointsStr,
                    record_kills: recordKillsStr,
                    grade: newGrade
                }).eq('id', playerId);

                if (updateError) throw updateError;

                alert("Match ajouté avec succès ! Les statitiques du joueur ont été mises à jour.");

                // Update Local state to match DB
                player.points = newPointsStr;
                player.kills = newKillsStr;
                player.record_points = recordPointsStr;
                player.record_kills = recordKillsStr;
                player.grade = newGrade;

                addMatchForm.reset();
                simulationResult.style.display = 'none';
                currentCalculatedPoints = null;

            } catch (err) {
                console.error("Erreur ajout de match:", err);
                alert("Erreur lors de l'enregistrement du match. Détail dans la console.");
            } finally {
                activeBtnSubmit.disabled = false;
                activeBtnSubmit.textContent = "VALIDER ET AJOUTER LE MATCH";
            }
        });
    }
});
