const { parseEvent, parseTicks } = require("@laihoe/demoparser2");
const readline = require("readline");
const { generate } = require("./ai");

const demoPath = "resource/demo.dem";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function ask(question) {
    return new Promise(resolve => {
        rl.question(question, answer => resolve(answer));
    });
}

async function main() {

    const deaths = parseEvent(demoPath, "player_death");

    const ticks = parseTicks(demoPath, [
        "X",
        "Y",
        "yaw",
        "name",
        "tick"
    ]);

    // =========================
    // PLAYERS LIST
    // =========================

    const allPlayers = [...new Set(ticks.map(t => t.name))]
        .filter(Boolean)
        .sort();

    console.log("\n=== PLAYERS ===");
    allPlayers.forEach((p, i) => {
        console.log(`${i + 1}. ${p}`);
    });
    console.log("================\n");

    const selectedPlayersInput = await ask(
        "Enter player names separated by comma (leave empty for all): "
    );

    rl.close();

    const selectedPlayers = selectedPlayersInput
        .split(",")
        .map(p => p.trim())
        .filter(Boolean);

    let filteredDeaths = deaths;

    if (selectedPlayers.length > 0) {
        filteredDeaths = deaths.filter(d =>
            selectedPlayers.includes(d.user_name)
        );
    }

    // =========================
    // SORT TICKS
    // =========================

    ticks.sort((a, b) => a.tick - b.tick);

    // =========================
    // INDEX
    // =========================

    const ticksByPlayer = new Map();

    for (const t of ticks) {
        if (!ticksByPlayer.has(t.name)) {
            ticksByPlayer.set(t.name, []);
        }
        ticksByPlayer.get(t.name).push(t);
    }

    // =========================
    // HELPERS
    // =========================

    function tickToTime(tick, tickRate = 64) {
        const totalSeconds = tick / tickRate;
        const m = Math.floor(totalSeconds / 60);
        const s = Math.floor(totalSeconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    function angleToTarget(player, target) {
        const dx = target.X - player.X;
        const dy = target.Y - player.Y;

        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        let diff = angle - player.yaw;
        diff = ((diff + 180) % 360) - 180;

        return Math.abs(diff);
    }

    function didCheckAngle(playerTicks, target) {
        const MAX_ANGLE = 25;

        for (const t of playerTicks) {
            if (angleToTarget(t, target) < MAX_ANGLE) {
                return true;
            }
        }
        return false;
    }

    // =========================
    // BUILD MISTAKES ONLY
    // =========================

    const mistakes = [];

    const WINDOW_TICKS = 10 * 64;

    for (const death of filteredDeaths) {

        const deathTick = death.tick;

        const victimName = death.user_name;
        const killerName = death.attacker_name;

        const victimTicksAll = ticksByPlayer.get(victimName);
        const killerTicksAll = ticksByPlayer.get(killerName);

        if (!victimTicksAll || !killerTicksAll) continue;

        const killerTick = killerTicksAll.find(t =>
            t.tick >= deathTick - 5 &&
            t.tick <= deathTick + 5
        );

        if (!killerTick) continue;

        const startTick = Math.max(0, deathTick - WINDOW_TICKS);

        const windowTicks = victimTicksAll.filter(t =>
            t.tick >= startTick && t.tick <= deathTick
        );

        if (!windowTicks.length) continue;

        const checked = didCheckAngle(windowTicks, killerTick);

        // 🔥 ONLY REAL MISTAKES
        if (!checked) {
            mistakes.push({
                type: "did_not_clear_angle",
                victim: victimName,
                killer: killerName,
                time: tickToTime(deathTick)
            });
        }
    }

    console.table(mistakes);

    // =========================
    // AI CALL (STRICT MODE)
    // =========================

    const feedback = await generate({
        task: "CS2 angle discipline coaching",

        rules: [
            "ONLY analyze did_not_clear_angle mistakes",
            "NO general CS2 advice",
            "NO movement or economy analysis",
            "Be short and tactical"
        ],

        data: {
            totalMistakes: mistakes.length,
            samples: mistakes.slice(0, 20)
        }
    });

    console.log("\n=== AI FEEDBACK ===\n");
    console.log(feedback);
}

main();