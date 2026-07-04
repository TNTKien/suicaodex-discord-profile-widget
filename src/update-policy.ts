export function shouldStopAfterWidgetUpdate(
  sourceShouldStopAfterUpdate: boolean,
  updateWasSent: boolean,
): boolean {
  return sourceShouldStopAfterUpdate && updateWasSent;
}
