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

            // Populate initial state will be handled by filterPlayers
        } catch (err) {
            console.error(err);
            playerSelect.innerHTML = '<option value="" disabled selected>Erreur chargement joueurs</option>';
        }

        // Auto-filter players robustly by rebuilding the options
        const filterPlayers = () => {
            const mode = modeSelect.value;
            playerSelect.innerHTML = '<option value="" disabled selected>Choisir un joueur...</option>';
            
            allPlayers.forEach(p => {
                // If mode is selected, filter. If not, don't show or show all (let's filter if mode is selected)
                if (mode && p.specialite !== mode) return;
                
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.pseudo} (${p.specialite})`;
                opt.dataset.spec = p.specialite;
                playerSelect.appendChild(opt);
            });
            
            playerSelect.value = ""; // reset selection
            document.getElementById('match-player-spec').value = ""; // reset spec field
        };

        // Timeout to run initial filter after options are populated
        setTimeout(filterPlayers, 500);
        // --- SESSION STATE ---
        let currentSessionPlayers = [];
        let currentSessionConfig = null;

        // UI Elements
        const matchConfigCard = document.getElementById('match-config-card');
        const playerEntryCard = document.getElementById('player-entry-card');
        const sessionSummaryCard = document.getElementById('session-summary-card');
        
        const modeSelect = document.getElementById('match-mode');
        const mjTeamGroup = document.getElementById('mj-team-group');
        const brSettingsGroup = document.getElementById('br-settings-group');
        const sessionModeLabel = document.getElementById('session-mode-label');
        const btnStartSession = document.getElementById('btn-start-session');
        const btnCancelSession = document.getElementById('btn-cancel-session');
        const addPlayerForm = document.getElementById('add-player-form');
        const playersTableBody = document.querySelector('#session-players-table tbody');
        const calcPreview = document.getElementById('calc-preview');
        const btnSubmitSession = document.getElementById('btn-submit-session');
        const btnAutoMvp = document.getElementById('btn-auto-mvp');
        const sessionErrors = document.getElementById('session-errors');

        // Toggle Config visibility
        modeSelect.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (mode === 'MJ') {
                mjTeamGroup.style.display = 'block';
                brSettingsGroup.style.display = 'none';
            } else {
                mjTeamGroup.style.display = 'none';
                brSettingsGroup.style.display = 'block';
            }
            filterPlayers();
        });

        // Start Session
        btnStartSession.addEventListener('click', () => {
            const mode = modeSelect.value;
            if (!mode) return alert("Veuillez choisir un mode de jeu.");
            
            let config = { mode };
            if (mode === 'MJ') {
                config.teamResult = document.querySelector('input[name="mj-team"]:checked').value;
            } else {
                config.brType = document.getElementById('br-match-type').value;
                config.brSlots = parseInt(document.getElementById('br-slots').value);
                if (!config.brSlots) return alert("Veuillez entrer le nombre de slots.");
                document.getElementById('br-top50-indicator').style.display = 'block';
                document.getElementById('br-top50-indicator').innerHTML = `Top 50% = Rang 1 à ${Math.ceil(config.brSlots/2)}`;
            }

            currentSessionConfig = config;
            currentSessionPlayers = [];
            
            sessionModeLabel.textContent = mode;
            matchConfigCard.style.display = 'none';
            playerEntryCard.style.display = 'block';
            sessionSummaryCard.style.display = 'block';
            
            // Reconfigure player entry fields based on mode
            const intraRankGroup = document.getElementById('br-intra-rank-group');
            const matchRank = document.getElementById('match-rank');
            const mjMalusGroup = document.getElementById('mj-malus-group');
            const labelRangDesc = document.getElementById('label-rang-desc');
            
            if (mode === 'MJ') {
                if(intraRankGroup) intraRankGroup.style.display = 'none';
                if(mjMalusGroup) mjMalusGroup.style.display = 'inline-flex';
                if(matchRank) matchRank.max = '5';
                labelRangDesc.textContent = "(de 1 à 5)";
            } else {
                if(intraRankGroup) intraRankGroup.style.display = 'block';
                if(mjMalusGroup) mjMalusGroup.style.display = 'none';
                if(matchRank) matchRank.removeAttribute('max');
                labelRangDesc.textContent = `(de 1 à ${config.brSlots})`;
            }
            renderSessionTable();
            previewCalculation();
        });

        // Cancel Session
        btnCancelSession.addEventListener('click', () => {
            if(currentSessionPlayers.length > 0) {
                if(!confirm("Êtes-vous sûr de vouloir annuler ? Les joueurs ajoutés seront perdus.")) return;
            }
            currentSessionConfig = null;
            currentSessionPlayers = [];
            addPlayerForm.reset();
            calcPreview.innerHTML = '<span style="color:#aaa;">Sélectionnez un joueur et remplissez les infos pour voir le calcul...</span>';
            
            matchConfigCard.style.display = 'block';
            playerEntryCard.style.display = 'none';
            sessionSummaryCard.style.display = 'none';
        });

        // "N'a pas joué" toggle logic
        document.getElementById('match-not-played').addEventListener('change', (e) => {
            if(e.target.checked) {
                if (currentSessionConfig && currentSessionConfig.mode === 'MJ') {
                    document.getElementById('match-rank').value = 4;
                    document.getElementById('match-kills').value = 0;
                    document.getElementById('match-malus-5e').checked = false;
                    document.getElementById('match-mvp').checked = false;
                }
            }
            previewCalculation();
        });

        // Auto Preview trigger
        const inputsToWatch = ['match-player', 'match-rank', 'br-intra-rank', 'match-kills', 'match-mvp', 'match-malus-5e', 'match-admin-bonus'];
        inputsToWatch.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('input', previewCalculation);
                el.addEventListener('change', previewCalculation);
            }
        });

        // The Core Logic Engine
        function computePlayerPoints(data, config) {
            const { mode } = config;
            let result = {
                base: 0, kills: 0, mvp: 0, malus: 0, intra: 0, admin: data.admin,
                gameplay: 0, final: 0, logs: []
            };

            if (mode === 'MJ') {
                const tr = config.teamResult;
                const r = data.rank;
                const k = data.kills;
                
                // Base
                if (tr === 'win') {
                    if (r === 1) result.base = 15; else if (r === 2) result.base = 12; else if (r === 3) result.base = 9; else if (r === 4) result.base = 6; else result.base = 4;
                } else {
                    if (r === 1) result.base = 10; else if (r === 2) result.base = 8; else if (r === 3) result.base = 6; else if (r === 4) result.base = 3; else result.base = 0;
                }
                
                // Malus
                if (tr === 'loss' && r === 4) result.malus += 1;
                if (data.isMj5eTwice) result.malus += 2;
                
                // Kills
                let kp = 0;
                let tk = k;
                if (tk > 0) { const t = Math.min(tk, 10); kp += t * 0.5; tk -= t; }
                if (tk > 0) { const t = Math.min(tk, 10); kp += t * 0.3; tk -= t; }
                if (tk > 0) { kp += tk * 0.1; }
                kp = Math.min(kp, 6);
                if (k >= 50) kp += 2; else if (k >= 30) kp += 1;
                kp = Math.min(kp, 8);
                
                if (result.base > 0) {
                     const limit = result.base * 0.5;
                     if (kp > limit) { kp = limit; result.logs.push(`⚠️ Kills capés à 50% de la base (${limit})`); }
                } else {
                     kp = 0;
                }
                result.kills = kp;
                
                // MVP
                if (data.isMvp) result.mvp = 5;

            } else if (mode === 'BR') {
                const r = data.rank;
                const ir = data.intraRank;
                const k = data.kills;
                const slots = config.brSlots;
                const type = config.brType;

                // Base
                result.base = Math.round(((slots - r + 1) / slots) * 12);

                // Intra
                if (type === 'Duo') {
                    if (ir === 1) result.intra = 3; else if (ir === 2) result.intra = 0;
                } else if (type === 'Squad') {
                    if (ir === 1) result.intra = 4; else if (ir === 2) result.intra = 2; else if (ir === 3) result.intra = 0; else if (ir >= 4) result.intra = -2;
                }

                // Malus
                const isBot30 = r > (slots * 0.7);
                if (isBot30) result.malus += 2;
                const maxI = type === 'Solo' ? 1 : (type === 'Duo' ? 2 : 4);
                if (isBot30 && ir >= maxI) result.malus += 2; // Dernier joueur mauvaise team

                // Kills
                let kp = k * 0.7;
                kp = Math.min(kp, 6);
                if (k >= 15) kp += 3; else if (k >= 10) kp += 2; else if (k >= 5) kp += 1;
                kp = Math.min(kp, 9);
                
                if (r > Math.ceil(slots / 2)) {
                    kp = kp / 2;
                    kp = Math.min(kp, 4);
                    result.logs.push(`⚠️ Équipe hors top 50%, kills ÷2 et cap réduits.`);
                }
                result.kills = parseFloat(kp.toFixed(2));

                // MVP
                if (data.isMvp) {
                    if (type === 'Duo') result.mvp = 4; else if (type === 'Squad') result.mvp = 5;
                }
            }

            result.gameplay = result.base + result.intra + result.kills + result.mvp - result.malus;
            if (result.gameplay > 33) {
                result.gameplay = 33;
                result.logs.push(`🔥 Cap Gameplay de 33 points atteint.`);
            }
            
            result.final = Math.round(result.gameplay + result.admin);
            return result;
        }

        const computeGrade = (points) => {
            if (points >= 1400) return 'Général';
            if (points >= 950) return 'Commandant';
            if (points >= 600) return 'Lieutenant';
            if (points >= 300) return 'Sergent';
            if (points >= 120) return 'Soldat';
            return 'Recrue';
        };

        function previewCalculation() {
            if (!currentSessionConfig) return;
            const rank = parseInt(document.getElementById('match-rank').value);
            if (!rank || rank < 1) {
                calcPreview.innerHTML = '<span style="color:#aaa;">En attente de rang valide...</span>';
                return;
            }

            const data = {
                rank: rank,
                intraRank: parseInt(document.getElementById('br-intra-rank').value) || 1,
                kills: parseInt(document.getElementById('match-kills').value) || 0,
                isMvp: document.getElementById('match-mvp').checked,
                isMj5eTwice: document.getElementById('match-malus-5e') ? document.getElementById('match-malus-5e').checked : false,
                admin: parseInt(document.getElementById('match-admin-bonus').value) || 0,
                notPlayed: document.getElementById('match-not-played').checked
            };

            const res = computePlayerPoints(data, currentSessionConfig);
            
            let html = `<div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">`;
            html += `<div><strong>Base :</strong> ${res.base} pts</div>`;
            if (currentSessionConfig.mode === 'BR' && res.intra !== 0) html += `<div><strong>Intra :</strong> ${res.intra > 0 ? '+'+res.intra : res.intra}</div>`;
            html += `<div><strong>Kills :</strong> +${res.kills}</div>`;
            if (res.mvp > 0) html += `<div><strong>MVP :</strong> <span class="bonus">+${res.mvp}</span></div>`;
            if (res.malus > 0) html += `<div><strong>Malus :</strong> <span class="malus">-${res.malus}</span></div>`;
            if (res.admin !== 0) html += `<div><strong>Admin :</strong> <span style="color:#33aaff;">${res.admin > 0 ? '+'+res.admin : res.admin}</span></div>`;
            html += `</div>`;
            
            html += `<hr style="border-color:#555; margin: 10px 0;">`;
            html += `<div style="display:flex; justify-content:space-between; align-items:center;">`;
            html += `<div>Total Gameplay : <strong style="color:var(--flame-yellow);">${res.gameplay} <small>/33</small></strong></div>`;
            html += `<div style="font-size:1.2rem;">FINAL : <strong style="color:#33ff33;">${res.final} pts</strong></div>`;
            html += `</div>`;

            if (res.logs.length > 0) {
                html += `<div style="margin-top:10px; font-size:0.85rem; color:#ffaa00;">${res.logs.join('<br>')}</div>`;
            }

            calcPreview.innerHTML = html;
        }

        // Add Player to temporary list
        addPlayerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const playerId = document.getElementById('match-player').value;
            if (!playerId) return alert("Veuillez sélectionner un joueur.");
            
            // Check for duplicates
            if (currentSessionPlayers.some(p => p.playerId === playerId)) {
                return alert("Ce joueur est déjà dans la session actuelle.");
            }

            const data = {
                playerId: playerId,
                rank: parseInt(document.getElementById('match-rank').value),
                intraRank: parseInt(document.getElementById('br-intra-rank').value) || 1,
                kills: parseInt(document.getElementById('match-kills').value) || 0,
                isMvp: document.getElementById('match-mvp').checked,
                isMj5eTwice: document.getElementById('match-malus-5e') ? document.getElementById('match-malus-5e').checked : false,
                admin: parseInt(document.getElementById('match-admin-bonus').value) || 0,
                notPlayed: document.getElementById('match-not-played').checked
            };

            const computed = computePlayerPoints(data, currentSessionConfig);
            
            // Find player info
            const pInfo = allPlayers.find(p => p.id === playerId);
            const playerEntry = { ...data, computed, pseudo: pInfo.pseudo, originalPoints: pInfo.points };
            
            currentSessionPlayers.push(playerEntry);
            
            // Reset form
            addPlayerForm.reset();
            document.getElementById('match-player').value = "";
            calcPreview.innerHTML = '<span style="color:#aaa;">Sélectionnez un joueur et remplissez les infos pour voir le calcul...</span>';
            
            renderSessionTable();
        });

        window.removeSessionPlayer = (index) => {
            currentSessionPlayers.splice(index, 1);
            renderSessionTable();
        };

        function renderSessionTable() {
            playersTableBody.innerHTML = '';
            
            // Sort by total points descending
            currentSessionPlayers.sort((a,b) => b.computed.final - a.computed.final);

            currentSessionPlayers.forEach((p, idx) => {
                let brWarning = "";
                if (currentSessionConfig.mode === 'BR') {
                    if (p.rank > Math.ceil(currentSessionConfig.brSlots / 2)) {
                        brWarning = `<span title="Hors top 50%" style="color:#ff3333; font-size:12px;">🔴</span> `;
                    } else {
                        brWarning = `<span title="Dans top 50%" style="color:#33ff33; font-size:12px;">🟢</span> `;
                    }
                }
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.pseudo} ${p.notPlayed ? '<small style="color:#aaa;">(Non joué)</small>' : ''}</td>
                    <td>${brWarning}${p.rank}${currentSessionConfig.mode === 'BR' && p.intraRank > 1 ? '<sup style="color:#aaa;">('+p.intraRank+'e)</sup>' : ''}</td>
                    <td>${p.kills}</td>
                    <td>${p.computed.base}</td>
                    <td class="malus">${p.computed.malus > 0 ? '-'+p.computed.malus : ''}</td>
                    <td class="bonus">${p.computed.mvp > 0 ? '⭐' : ''}</td>
                    <td>${p.computed.admin !== 0 ? p.computed.admin : ''}</td>
                    <td style="font-weight:bold; color:#33ff33;">${p.computed.final}</td>
                    <td><button type="button" class="btn btn-outline btn-small" style="padding:2px 8px; font-size:0.7rem; border-color:#ff3333; color:#ff3333;" onclick="removeSessionPlayer(${idx})">X</button></td>
                `;
                playersTableBody.appendChild(tr);
            });
            
            if (currentSessionPlayers.length === 0) {
                playersTableBody.innerHTML = '<tr><td colspan="9" style="color:#aaa;">Aucun joueur ajouté.</td></tr>';
            }
        }

        // Auto MVP Feature
        btnAutoMvp.addEventListener('click', () => {
            if (currentSessionPlayers.length === 0) return alert("Ajoutez d'abord des joueurs au match.");
            
            // Reset all MVP checked
            currentSessionPlayers.forEach(p => p.isMvp = false);
            
            // Recompute to find max score without MVP
            currentSessionPlayers.forEach(p => p.computed = computePlayerPoints(p, currentSessionConfig));
            
            let bestPlayerIndex = -1;
            let maxVal = -1;
            
            currentSessionPlayers.forEach((p, idx) => {
                const val = p.computed.base + p.computed.kills;
                // Constraints
                let canBeMvp = true;
                if (currentSessionConfig.mode === 'BR') {
                     if (currentSessionConfig.brType === 'Solo') canBeMvp = false;
                     if (p.intraRank > 1) canBeMvp = false;
                }
                
                if (canBeMvp && val > maxVal) {
                    maxVal = val;
                    bestPlayerIndex = idx;
                }
            });
            
            if (bestPlayerIndex !== -1) {
                currentSessionPlayers[bestPlayerIndex].isMvp = true;
                currentSessionPlayers[bestPlayerIndex].computed = computePlayerPoints(currentSessionPlayers[bestPlayerIndex], currentSessionConfig);
                renderSessionTable();
                alert(`⭐ MVP auto-attribué à : ${currentSessionPlayers[bestPlayerIndex].pseudo}`);
            } else {
                alert("Aucun joueur éligible au MVP selon les règles actuelles.");
            }
        });

        // Submit the entire session
        btnSubmitSession.addEventListener('click', async () => {
            if (currentSessionPlayers.length === 0) return alert("Le match est vide. Ajoutez des joueurs d'abord.");
            
            const mvps = currentSessionPlayers.filter(p => p.isMvp);
            if (mvps.length > 1) {
                if(!confirm("⚠️ Attention : plusieurs joueurs sont marqués comme MVP. Confirmer cet envoi ?")) return;
            }
            
            sessionErrors.style.display = 'none';
            btnSubmitSession.disabled = true;
            btnSubmitSession.textContent = "SAUVEGARDE EN COURS...";

            try {
                const { data: seasonData, error: seasonError } = await window.supabaseClient
                    .from('saisons')
                    .select('id')
                    .eq('est_active', true)
                    .limit(1);
                    
                if (seasonError || !seasonData || seasonData.length === 0) {
                    throw new Error("Aucune saison active trouvée. Créez-en une dans Gestion Saisons.");
                }
                const activeSeasonId = seasonData[0].id;
                
                const cMode = currentSessionConfig.mode;
                const matchInserts = [];
                const playerUpdates = [];

                currentSessionPlayers.forEach(p => {
                    matchInserts.push({
                        joueur_id: p.playerId,
                        saison_id: activeSeasonId,
                        mode: cMode,
                        est_victoire: cMode === 'MJ' ? (currentSessionConfig.teamResult === 'win') : null,
                        format_br: cMode === 'BR' ? currentSessionConfig.brType : null,
                        slots_br: cMode === 'BR' ? currentSessionConfig.brSlots : null,
                        intra_rank_br: cMode === 'BR' ? p.intraRank : null,
                        bonus_admin: p.admin,
                        points_gagnes: p.computed.final,
                        kills: p.kills,
                        rang: p.rank,
                        est_mvp: p.isMvp
                    });
                    
                    const pInfo = allPlayers.find(ap => ap.id === p.playerId);
                    if (pInfo) {
                        const newPoints = (parseInt(pInfo.points) || 0) + p.computed.final;
                        const newKills = (parseInt(pInfo.kills) || 0) + p.kills;
                        const newRecordPoints = p.computed.final > (parseInt(pInfo.record_points) || 0) ? p.computed.final : (parseInt(pInfo.record_points) || 0);
                        const newRecordKills = p.kills > (parseInt(pInfo.record_kills) || 0) ? p.kills : (parseInt(pInfo.record_kills) || 0);
                        const newGrade = computeGrade(newPoints);
                        
                        pInfo.points = newPoints;
                        pInfo.kills = newKills;
                        pInfo.record_points = newRecordPoints;
                        pInfo.record_kills = newRecordKills;
                        pInfo.grade = newGrade;
                        
                        playerUpdates.push({
                            id: p.playerId,
                            data: {
                                points: newPoints,
                                kills: newKills,
                                record_points: newRecordPoints,
                                record_kills: newRecordKills,
                                grade: newGrade
                            }
                        });
                    }
                });

                const { error: insError } = await window.supabaseClient.from('matchs').insert(matchInserts);
                if (insError) throw insError;

                const updatePromises = playerUpdates.map(pu => 
                    window.supabaseClient.from('joueurs').update(pu.data).eq('id', pu.id)
                );
                
                await Promise.all(updatePromises);

                alert("✅ Match complet enregistré avec succès !");
                
                currentSessionConfig = null;
                currentSessionPlayers = [];
                matchConfigCard.style.display = 'block';
                playerEntryCard.style.display = 'none';
                sessionSummaryCard.style.display = 'none';

            } catch (err) {
                console.error("Erreur save globale:", err);
                sessionErrors.textContent = "Erreur: " + err.message;
                sessionErrors.style.display = 'block';
            } finally {
                btnSubmitSession.disabled = false;
                btnSubmitSession.textContent = "VALIDER LE MATCH COMPLET";
            }
        });

    }
});
