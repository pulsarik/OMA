export function callAction(callAmount: number, stack: number) {
  const normalizedCall = Math.max(callAmount, 0);
  const normalizedStack = Math.max(stack, 0);
  const amount = Math.min(normalizedCall, normalizedStack);

  return {
    amount,
    isAllIn: normalizedCall > 0 && amount === normalizedStack,
    canRaise: normalizedStack > normalizedCall,
  };
}
