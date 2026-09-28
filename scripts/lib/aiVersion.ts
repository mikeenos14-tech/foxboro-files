// Which revision of the AI prompts and checks wrote a recap's fanTake and
// Good/Bad/Ugly. Shared by build-data.ts, which only carries AI text
// forward when it was written under the current version, and
// build-ai-recap.ts, which rewrites anything older.
//
// Carrying older text forward used to be the fallback when a rewrite
// failed — which kept text already known to be wrong on the site (the
// Week 3 recap's "the only player on either side"). Now a failed rewrite
// leaves the plain, computed recap instead.
//
// History: 2 added location, full names, scoring and benchmarks; 3 named
// each unit's owner and put ranks/EPA into words; 4 added month and
// prompt-leak checks and a larger response budget; 5 spells out each
// red-zone and third-down rate against the league norm; 6 has the AI
// write only the Take (Good/Bad/Ugly now comes from the stats) and
// gives it the kickoff time, with a time-of-day check; 7 follows the
// new player of the game (receivers, defenders, kickers, returners).
export const AI_VERSION = 7;
