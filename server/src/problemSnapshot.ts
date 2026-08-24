export function diagnosticPlayerSnapshot(player: any, contribution = 0) {
  const currentStack = Number.isFinite(player.stack) ? Math.max(0, player.stack) : 0;
  const contributed = Number.isFinite(contribution) ? Math.max(0, contribution) : 0;

  return {
    id: player.id,
    name: player.name,
    isBot: Boolean(player.isBot),
    botStyle: player.isBot ? player.botStyle : undefined,
    startingStack: currentStack + contributed,
    hole: player.hole,
    folded: Boolean(player.folded),
    stack: currentStack,
  };
}
