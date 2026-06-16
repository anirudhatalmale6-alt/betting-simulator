import prisma from './prisma';

interface PropTemplate {
  category: string;
  description: string;
  line?: number;
  type: 'over_under' | 'yes_no';
  prob?: number;
}

const SPORT_PROPS: Record<string, PropTemplate[]> = {
  baseball: [
    { category: 'Game Props', description: 'Total Runs', line: 8.5, type: 'over_under', prob: 0.48 },
    { category: 'Game Props', description: 'Run Scored in 1st Inning', type: 'yes_no', prob: 0.47 },
    { category: 'Game Props', description: 'Run Scored in 2nd Inning', type: 'yes_no', prob: 0.40 },
    { category: 'Game Props', description: 'Run Scored in 3rd Inning', type: 'yes_no', prob: 0.38 },
    { category: 'Game Props', description: 'Run Scored in 4th Inning', type: 'yes_no', prob: 0.36 },
    { category: 'Game Props', description: 'Run Scored in 5th Inning', type: 'yes_no', prob: 0.35 },
    { category: 'Game Props', description: 'Will There Be a Home Run', type: 'yes_no', prob: 0.70 },
    { category: 'Game Props', description: 'Will There Be a Grand Slam', type: 'yes_no', prob: 0.03 },
    { category: 'Game Props', description: 'Total Hits', line: 16.5, type: 'over_under', prob: 0.50 },
    { category: 'Game Props', description: 'Total Errors', line: 1.5, type: 'over_under', prob: 0.38 },
    { category: 'Pitcher Props', description: 'Home Pitcher Strikeouts', line: 5.5, type: 'over_under', prob: 0.52 },
    { category: 'Pitcher Props', description: 'Away Pitcher Strikeouts', line: 5.5, type: 'over_under', prob: 0.50 },
    { category: 'Pitcher Props', description: 'Home Pitcher Earned Runs', line: 3.5, type: 'over_under', prob: 0.35 },
    { category: 'Batter Props', description: 'Home Leadoff Hitter - Hit in 1st At Bat', type: 'yes_no', prob: 0.26 },
    { category: 'Batter Props', description: 'Total Home Runs in Game', line: 1.5, type: 'over_under', prob: 0.40 },
    { category: 'First/Last', description: 'Home Team Scores First', type: 'yes_no', prob: 0.52 },
    { category: 'First/Last', description: 'Game Goes to Extra Innings', type: 'yes_no', prob: 0.08 },
  ],
  basketball: [
    { category: 'Game Props', description: 'Total Points', line: 220.5, type: 'over_under', prob: 0.50 },
    { category: 'Game Props', description: 'Point Spread', line: 5.5, type: 'over_under', prob: 0.48 },
    { category: 'Game Props', description: '1st Quarter Total', line: 55.5, type: 'over_under', prob: 0.50 },
    { category: 'Game Props', description: '1st Half Total', line: 112.5, type: 'over_under', prob: 0.50 },
    { category: 'Game Props', description: 'Will There Be Overtime', type: 'yes_no', prob: 0.06 },
    { category: 'Game Props', description: '3rd Quarter Total', line: 54.5, type: 'over_under', prob: 0.50 },
    { category: 'Player Props', description: 'Home Star Points', line: 27.5, type: 'over_under', prob: 0.48 },
    { category: 'Player Props', description: 'Home Star Rebounds', line: 8.5, type: 'over_under', prob: 0.45 },
    { category: 'Player Props', description: 'Home Star Assists', line: 7.5, type: 'over_under', prob: 0.44 },
    { category: 'Player Props', description: 'Away Star Points', line: 25.5, type: 'over_under', prob: 0.50 },
    { category: 'Player Props', description: 'Away Star Rebounds', line: 7.5, type: 'over_under', prob: 0.48 },
    { category: 'Player Props', description: 'Any Player Triple Double', type: 'yes_no', prob: 0.10 },
    { category: 'First/Last', description: 'Home Team Scores First', type: 'yes_no', prob: 0.52 },
    { category: 'First/Last', description: 'First Basket is 3-Pointer', type: 'yes_no', prob: 0.30 },
  ],
  americanfootball: [
    { category: 'Game Props', description: 'Total Points', line: 45.5, type: 'over_under', prob: 0.50 },
    { category: 'Game Props', description: 'Point Spread', line: 3.5, type: 'over_under', prob: 0.48 },
    { category: 'Game Props', description: '1st Half Total', line: 23.5, type: 'over_under', prob: 0.50 },
    { category: 'Game Props', description: '1st Quarter Total', line: 10.5, type: 'over_under', prob: 0.42 },
    { category: 'Game Props', description: 'Will There Be Overtime', type: 'yes_no', prob: 0.05 },
    { category: 'Game Props', description: 'Both Teams Score 20+', type: 'yes_no', prob: 0.35 },
    { category: 'Player Props', description: 'Home QB Passing Yards', line: 265.5, type: 'over_under', prob: 0.48 },
    { category: 'Player Props', description: 'Home QB Passing TDs', line: 1.5, type: 'over_under', prob: 0.55 },
    { category: 'Player Props', description: 'Away QB Passing Yards', line: 245.5, type: 'over_under', prob: 0.50 },
    { category: 'Player Props', description: 'Home RB Rushing Yards', line: 75.5, type: 'over_under', prob: 0.48 },
    { category: 'Player Props', description: 'Any Player Scores 2+ TDs', type: 'yes_no', prob: 0.35 },
    { category: 'Scoring Props', description: 'First Score is Touchdown', type: 'yes_no', prob: 0.55 },
    { category: 'Scoring Props', description: 'First Score is Field Goal', type: 'yes_no', prob: 0.40 },
    { category: 'Scoring Props', description: 'Will There Be a Safety', type: 'yes_no', prob: 0.02 },
  ],
  icehockey: [
    { category: 'Game Props', description: 'Total Goals', line: 5.5, type: 'over_under', prob: 0.48 },
    { category: 'Game Props', description: '1st Period Total Goals', line: 1.5, type: 'over_under', prob: 0.42 },
    { category: 'Game Props', description: '2nd Period Total Goals', line: 1.5, type: 'over_under', prob: 0.44 },
    { category: 'Game Props', description: 'Both Teams Score in 1st Period', type: 'yes_no', prob: 0.25 },
    { category: 'Game Props', description: 'Both Teams Score in 2nd Period', type: 'yes_no', prob: 0.28 },
    { category: 'Game Props', description: 'Will There Be Overtime', type: 'yes_no', prob: 0.23 },
    { category: 'Game Props', description: 'Total Shots on Goal', line: 58.5, type: 'over_under', prob: 0.50 },
    { category: 'Player Props', description: 'Home Star Points', line: 1.5, type: 'over_under', prob: 0.30 },
    { category: 'Player Props', description: 'Away Star Points', line: 1.5, type: 'over_under', prob: 0.28 },
    { category: 'Player Props', description: 'Home Goalie Saves', line: 27.5, type: 'over_under', prob: 0.50 },
    { category: 'First/Last', description: 'Home Team Scores First', type: 'yes_no', prob: 0.52 },
    { category: 'First/Last', description: 'Scoreless 1st Period', type: 'yes_no', prob: 0.30 },
  ],
  soccer: [
    { category: 'Game Props', description: 'Total Goals', line: 2.5, type: 'over_under', prob: 0.48 },
    { category: 'Game Props', description: 'Both Teams to Score', type: 'yes_no', prob: 0.50 },
    { category: 'Game Props', description: '1st Half Total Goals', line: 1.5, type: 'over_under', prob: 0.35 },
    { category: 'Game Props', description: 'Both Teams Score in 1st Half', type: 'yes_no', prob: 0.22 },
    { category: 'Game Props', description: 'Clean Sheet Home Team', type: 'yes_no', prob: 0.30 },
    { category: 'Game Props', description: 'Clean Sheet Away Team', type: 'yes_no', prob: 0.35 },
    { category: 'Game Props', description: 'Total Corners', line: 9.5, type: 'over_under', prob: 0.50 },
    { category: 'Game Props', description: 'Total Cards', line: 3.5, type: 'over_under', prob: 0.48 },
    { category: 'Game Props', description: 'Will There Be a Red Card', type: 'yes_no', prob: 0.08 },
    { category: 'Game Props', description: 'Will There Be a Penalty', type: 'yes_no', prob: 0.12 },
    { category: 'Player Props', description: 'Home Star Anytime Goalscorer', type: 'yes_no', prob: 0.30 },
    { category: 'Player Props', description: 'Away Star Anytime Goalscorer', type: 'yes_no', prob: 0.25 },
    { category: 'Player Props', description: 'Home Star Shots on Target', line: 1.5, type: 'over_under', prob: 0.40 },
    { category: 'First/Last', description: 'Home Team Scores First', type: 'yes_no', prob: 0.45 },
    { category: 'First/Last', description: 'Goal in First 10 Minutes', type: 'yes_no', prob: 0.15 },
    { category: 'First/Last', description: 'Goal in Last 10 Minutes', type: 'yes_no', prob: 0.30 },
  ],
  mma: [
    { category: 'Fight Props', description: 'Fight Goes the Distance', type: 'yes_no', prob: 0.35 },
    { category: 'Fight Props', description: 'Total Rounds', line: 2.5, type: 'over_under', prob: 0.45 },
    { category: 'Fight Props', description: 'Win by KO/TKO', type: 'yes_no', prob: 0.30 },
    { category: 'Fight Props', description: 'Win by Submission', type: 'yes_no', prob: 0.18 },
    { category: 'Fight Props', description: 'Win by Decision', type: 'yes_no', prob: 0.35 },
    { category: 'Fight Props', description: 'Fight Ends in Round 1', type: 'yes_no', prob: 0.20 },
  ],
  boxing: [
    { category: 'Fight Props', description: 'Fight Goes the Distance', type: 'yes_no', prob: 0.40 },
    { category: 'Fight Props', description: 'Total Rounds', line: 8.5, type: 'over_under', prob: 0.45 },
    { category: 'Fight Props', description: 'Win by KO/TKO', type: 'yes_no', prob: 0.35 },
    { category: 'Fight Props', description: 'Win by Decision', type: 'yes_no', prob: 0.40 },
    { category: 'Fight Props', description: 'Knockdown in Fight', type: 'yes_no', prob: 0.30 },
  ],
  tennis: [
    { category: 'Match Props', description: 'Total Sets', line: 2.5, type: 'over_under', prob: 0.35 },
    { category: 'Match Props', description: 'Total Games', line: 21.5, type: 'over_under', prob: 0.50 },
    { category: 'Match Props', description: 'Match Goes to Tiebreak', type: 'yes_no', prob: 0.25 },
    { category: 'Match Props', description: '1st Set Total Games', line: 10.5, type: 'over_under', prob: 0.45 },
    { category: 'Player Props', description: 'Total Aces - Player 1', line: 6.5, type: 'over_under', prob: 0.45 },
    { category: 'Player Props', description: 'Total Aces - Player 2', line: 5.5, type: 'over_under', prob: 0.48 },
  ],
  golf: [
    { category: 'Tournament Props', description: 'Winning Score Under Par', line: 14.5, type: 'over_under', prob: 0.45 },
    { category: 'Tournament Props', description: 'Will There Be a Playoff', type: 'yes_no', prob: 0.10 },
    { category: 'Tournament Props', description: 'Hole-in-One in Tournament', type: 'yes_no', prob: 0.60 },
    { category: 'Matchup Props', description: 'Player 1 Round Score', line: 70.5, type: 'over_under', prob: 0.45 },
    { category: 'Matchup Props', description: 'Player 2 Round Score', line: 71.5, type: 'over_under', prob: 0.48 },
  ],
  default: [
    { category: 'Game Props', description: 'Total Points/Goals', line: 5.5, type: 'over_under', prob: 0.50 },
    { category: 'Game Props', description: 'Home Team Wins by 5+', type: 'yes_no', prob: 0.25 },
    { category: 'Game Props', description: 'Will There Be Overtime', type: 'yes_no', prob: 0.08 },
    { category: 'First/Last', description: 'Home Team Scores First', type: 'yes_no', prob: 0.52 },
  ],
};

function getSportCategory(sportKey: string): string {
  if (sportKey.startsWith('baseball')) return 'baseball';
  if (sportKey.startsWith('basketball')) return 'basketball';
  if (sportKey.startsWith('americanfootball')) return 'americanfootball';
  if (sportKey.startsWith('icehockey')) return 'icehockey';
  if (sportKey.startsWith('soccer')) return 'soccer';
  if (sportKey.startsWith('mma')) return 'mma';
  if (sportKey.startsWith('boxing')) return 'boxing';
  if (sportKey.startsWith('tennis')) return 'tennis';
  if (sportKey.startsWith('golf')) return 'golf';
  return 'default';
}

function generateOddsFromProb(baseProb: number): [number, number] {
  const jitter = (Math.random() - 0.5) * 0.06;
  const prob = Math.max(0.02, Math.min(0.98, baseProb + jitter));
  const vig = 0.03 + Math.random() * 0.04;
  const p1 = Math.min(0.97, prob + vig / 2);
  const p2 = Math.min(0.97, (1 - prob) + vig / 2);

  function probToAmerican(p: number): number {
    if (p >= 0.5) return Math.round(-100 * p / (1 - p));
    return Math.round(100 * (1 - p) / p);
  }

  return [probToAmerican(p1), probToAmerican(p2)];
}

export async function generateMockProps(gameId: string, sportKey: string, gamePropsOnly = false) {
  const category = getSportCategory(sportKey);
  let templates = SPORT_PROPS[category] || SPORT_PROPS['default'];

  if (gamePropsOnly) {
    const gameCategories = ['Game Props', 'First/Last', 'Fight Props', 'Match Props', 'Tournament Props', 'Scoring Props'];
    templates = templates.filter(t => gameCategories.includes(t.category));
  }

  for (const template of templates) {
    const data: Record<string, unknown> = {
      gameId,
      category: template.category,
      description: template.description,
      line: template.line || null,
    };

    const prob = template.prob ?? 0.50;

    if (template.type === 'over_under') {
      const [over, under] = generateOddsFromProb(prob);
      data.overOdds = over;
      data.underOdds = under;
    } else {
      const [yes, no] = generateOddsFromProb(prob);
      data.yesOdds = yes;
      data.noOdds = no;
    }

    await prisma.propMarket.create({ data: data as Parameters<typeof prisma.propMarket.create>[0]['data'] });
  }
}
