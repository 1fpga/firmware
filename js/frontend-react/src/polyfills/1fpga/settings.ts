/**
 * Font size options for the UI.
 */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Date and time format options for the toolbar.
 */
export type DateTimeFormat = 'default' | 'short' | 'timeOnly' | 'hidden';

const settings = {
  fontSize: 'medium' as FontSize,
  dateTimeFormat: 'default' as DateTimeFormat,
  showFps: false,
  invertToolbar: false,
  timeZone: 'Default TimeZone',
};

export function fontSize(): FontSize {
  return settings.fontSize;
}

export function setFontSize(fontSize: FontSize): void {
  settings.fontSize = fontSize;
}

export function datetimeFormat(): DateTimeFormat {
  return settings.dateTimeFormat;
}

export function setDatetimeFormat(format: DateTimeFormat): void {
  settings.dateTimeFormat = format;
}

export function showFps(): boolean {
  return settings.showFps;
}

export function setShowFps(show: boolean): void {
  settings.showFps = show;
}

export function invertToolbar(): boolean {
  return settings.invertToolbar;
}

export function setInvertToolbar(invert: boolean): void {
  settings.invertToolbar = invert;
}

/**
 * Ping the NTP server and update the current time.
 * @param tz The timezone to use, or null to use the system timezone.
 * @param updateTz Whether to update the timezone as well.
 */
export function updateDateTime(tz?: string, updateTz?: boolean): void {}

/**
 * Get a list of all available timezones.
 */
export function listTimeZones(): string[] {
  return ['TimeZone 1', 'TimeZone 2', 'TimeZone 3', 'TimeZone 4', 'TimeZone 5'];
}

/**
 * Get the timezone to use.
 */
export function getTimeZone(): string | null {
  return settings.timeZone;
}

/**
 * Set the timezone to use.
 * @param timeZone The timezone to use, or null to not change the system time zone.
 */
export function setTimeZone(timeZone: string): void {
  settings.timeZone = timeZone;
}

/**
 * Manually set the date and time.
 * @param dateTime The date and time to set.
 */
export function setDateTime(dateTime: Date): void {
  console.log(`set dateTime: ${dateTime}`);
}
